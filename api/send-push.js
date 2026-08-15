// Vercel serverless function. Called by a Supabase Database Webhook whenever a
// row changes on 'pedidos_delivery' or 'reservas'. Looks up every subscribed
// admin device in 'push_subscriptions' and sends each one a Web Push
// notification via VAPID - no third-party messaging account involved.
//
// It also doubles as the customer-facing order status emailer: when a
// 'pedidos_delivery' row transitions to 'Aceptado' or 'Listo para Recoger',
// it emails the customer (address is stored inside detalle_pedido, since the
// table has no dedicated email column) via Resend. Reusing this webhook means
// the email fires no matter which admin UI (main dashboard or /cocina)
// changed the status - the DB row change is the single source of truth.
//
// Auth: Supabase webhooks are configured to hit this URL with
// ?secret=<PUSH_TRIGGER_SECRET> appended, so random callers can't trigger
// notifications. This is a shared secret between Supabase and this function,
// not a user-facing credential.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { getEmailStrings, renderEmailHtml, escapeHtml } from './_lib/email-i18n.js';
import { sendViaResend, sendViaFormspree } from './_lib/mailer.js';

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:restaurantecocoviquezph@gmail.com', vapidPublicKey, vapidPrivateKey);
}

const supabaseAdmin = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Sending goes through _lib/mailer.js, which owns the provider choice and the
// verified sender address - see the comments there on why ORDER_EMAIL_FROM is
// not used.

function buildNotification(body) {
  const { type, table, record, old_record } = body;

  if (table === 'pedidos_delivery' && type === 'INSERT') {
    const total = record.total_pago ? `₡${Number(record.total_pago).toLocaleString('es-CR')}` : '';
    return { title: '🔔 Nuevo pedido', body: `${record.cliente || 'Cliente'} - ${total}`, url: '/', tag: 'pedido-nuevo' };
  }

  if (table === 'pedidos_delivery' && type === 'UPDATE') {
    const wasReady = (old_record?.estado || '').toLowerCase() === 'listo para recoger';
    const isReady = (record?.estado || '').toLowerCase() === 'listo para recoger';
    if (isReady && !wasReady) {
      return { title: '📦 Pedido listo para recoger', body: `Pedido #${record.id} - ${record.cliente || 'Cliente'}`, url: '/', tag: 'pedido-listo' };
    }
    return null;
  }

  if (table === 'reservas' && type === 'INSERT') {
    const fecha = record.fecha ? record.fecha.slice(0, 10).split('-').reverse().join('/') : '';
    return { title: '📅 Nueva reserva', body: `${record.cliente || 'Cliente'} - ${fecha} (${record.lugares || '?'} personas)`, url: '/', tag: 'reserva-nueva' };
  }

  return null;
}

// detalle_pedido is stored as a JSON string: { items, email, payment_method, transaction_id, idioma }
function getOrderDetalle(record) {
  try {
    return typeof record.detalle_pedido === 'string' ? JSON.parse(record.detalle_pedido) : (record.detalle_pedido || {});
  } catch {
    return {};
  }
}

async function sendCustomerOrderEmail(body) {
  const { type, table, record, old_record } = body;
  if (table !== 'pedidos_delivery' || type !== 'UPDATE') return;

  const prevEstado = (old_record?.estado || '').toLowerCase();
  const newEstado = (record?.estado || '').toLowerCase();
  if (prevEstado === newEstado) return;

  const detalle = getOrderDetalle(record);
  const email = detalle.email;
  if (!email) return;

  const t = getEmailStrings(detalle.idioma);

  let subject, heading, intro, accentColor;

  if (newEstado === 'aceptado' || newEstado === 'procesando') {
    subject = '✅ Tu pedido fue aceptado - Coco Viquez';
    heading = '¡Tu pedido fue aceptado!';
    intro = 'Estamos preparando tu pedido. Te avisaremos cuando esté listo.';
    accentColor = '#22c55e';
  } else if (newEstado === 'listo para entrega' || newEstado === 'listo') {
    subject = '🚗 Tu pedido está listo para entrega - Coco Viquez';
    heading = '¡Tu pedido está listo!';
    intro = 'Tu pedido ya está preparado y listo para ser entregado. ¡En camino a tu puerta!';
    accentColor = '#F27F57';
  } else if (newEstado === 'entregado') {
    subject = '📦 Tu pedido fue entregado - Coco Viquez';
    heading = '¡Pedido entregado!';
    intro = 'Tu pedido ha sido entregado. Esperamos que disfrutes tu comida. ¡Gracias por tu compra!';
    accentColor = '#22c55e';
  } else {
    return;
  }

  let footerContent = '';
  if (newEstado === 'entregado') {
    const reviewUrl = 'https://www.google.com/maps/place/Coco+Viquez/@10.5775653,-85.6713914,768m/data=!3m1!1e3!4m18!1m9!3m8!1s0x8f9e2a1a6340a9a9:0xdb69f46dde6010cf!2sCoco+Viquez!8m2!3d10.5775653!4d-85.6713914!9m1!1b1!16s%2Fg%2F11c5bh6xbj!3m7!1s0x8f9e2a1a6340a9a9:0xdb69f46dde6010cf!8m2!3d10.5775653!4d-85.6713914!9m1!1b1!16s%2Fg%2F11c5bh6xbj?hl=es-419';
    footerContent = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 600;">¿Te gustó tu comida? ⭐</p>
        <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #FFD700; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px; padding: 12px 24px; border-radius: 8px; text-decoration: none; border: 1px solid #FFD700; box-shadow: 0 4px 12px rgba(255,215,0,0.3); font-family: sans-serif;">⭐ DÉJANOS UNA RESEÑA EN GOOGLE</a>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.5);">Tu opinión nos ayuda a mejorar</p>
      </div>
    `;
  }

  const htmlBody = renderEmailHtml({
    lang: detalle.idioma,
    heading,
    intro,
    cliente: escapeHtml(record.cliente || ''),
    footerLine: t.orderNumber(record.id),
    accentColor,
  }) + footerContent;

  // Resend is the only provider that can reach the customer. Goes through the
  // shared mailer so the sender comes from MAIL_FROM (a verified domain) rather
  // than ORDER_EMAIL_FROM, which holds a @gmail.com address Resend always
  // rejects - and so a non-2xx is actually detected: resend.emails.send()
  // resolves with {error} instead of throwing, so the previous try/catch logged
  // success and skipped the fallback even when nothing was delivered.
  const toCustomer = await sendViaResend({ to: email, subject, html: htmlBody });

  if (toCustomer.ok) {
    console.log(`Order email delivered to the customer (status: ${newEstado})`);
  } else {
    console.error(`Order email NOT delivered to the customer (status: ${newEstado}):`, toCustomer.error);
  }

  // Always notify the restaurant, whatever happened with the customer copy:
  // Formspree can only reach the restaurant's own inbox anyway.
  const toRestaurant = await sendViaFormspree({
    subject,
    name: record.cliente || 'Cliente',
    message: `Pedido #${record.id} - ${newEstado}\n\nCliente: ${record.cliente}\nEmail: ${email}`,
    html: htmlBody,
    replyTo: email,
  });

  if (!toRestaurant.ok) {
    console.error('Order notification to the restaurant failed:', toRestaurant.error);
  }
}

// Requires 'email' and 'idioma' columns on 'reservas' (added alongside this feature -
// the table originally had no way to reach the customer back).
async function sendReservationConfirmationEmail(body) {
  const { type, table, record, old_record } = body;
  if (table !== 'reservas' || type !== 'UPDATE') return;

  const prevEstado = (old_record?.estado || '').toLowerCase();
  const newEstado = (record?.estado || '').toLowerCase();
  if (prevEstado === newEstado) return;

  const email = record.email;
  if (!email) return;

  const t = getEmailStrings(record.idioma);
  const fecha = record.fecha ? record.fecha.slice(0, 10).split('-').reverse().join('/') : '';
  const hora = record.fecha_hora ? record.fecha_hora.slice(11, 16) : '';

  let subject, heading, intro, accentColor;

  if (newEstado === 'confirmado') {
    subject = '✅ Tu reserva fue confirmada - Coco Viquez';
    heading = '¡Tu reserva fue confirmada!';
    intro = `Tu reserva para ${record.lugares} persona(s) el ${fecha} a las ${hora} ha sido confirmada. Te esperamos.`;
    accentColor = '#22c55e';
  } else if (newEstado === 'cancelado') {
    subject = '❌ Tu reserva fue cancelada - Coco Viquez';
    heading = 'Reserva cancelada';
    intro = 'Lamentablemente, tu reserva ha sido cancelada. Si tienes preguntas, contáctanos.';
    accentColor = '#ef4444';
  } else {
    return;
  }

  const htmlBody = renderEmailHtml({
    lang: record.idioma,
    heading,
    intro,
    cliente: escapeHtml(record.cliente || ''),
    footerLine: `Reserva #${record.id} - ${fecha} ${hora}`,
    accentColor,
  });

  // This is the "email automático al confirmar/cancelar" the admin panel relies
  // on. Same two fixes as the order email above: a verified sender via the shared
  // mailer, and an error that is actually detected instead of silently swallowed.
  const toCustomer = await sendViaResend({ to: email, subject, html: htmlBody });

  if (toCustomer.ok) {
    console.log(`Reservation email delivered to the customer (status: ${newEstado})`);
  } else {
    console.error(`Reservation email NOT delivered to the customer (status: ${newEstado}):`, toCustomer.error);
  }

  const toRestaurant = await sendViaFormspree({
    subject,
    name: record.cliente || 'Cliente',
    message: `Reserva #${record.id} - ${newEstado}\n\nCliente: ${record.cliente}\nEmail: ${email}\nFecha: ${fecha}\nHora: ${hora}\nPersonas: ${record.lugares}`,
    html: htmlBody,
    replyTo: email,
  });

  if (!toRestaurant.ok) {
    console.error('Reservation notification to the restaurant failed:', toRestaurant.error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.query.secret !== process.env.PUSH_TRIGGER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Emails run before the push-configuration guards on purpose. They are
  // genuinely independent of Web Push, and previously a missing VAPID or Supabase
  // service-role key returned 500 here and the customer's confirmation email was
  // never sent - a push misconfiguration silently took the reservation emails
  // down with it.
  await sendCustomerOrderEmail(req.body || {});
  await sendReservationConfirmationEmail(req.body || {});

  // Push unavailable is reported as 200, not 500: this endpoint is called by a
  // Supabase Database Webhook, which retries on 5xx, and a retry would re-send
  // the emails above. The condition is logged instead.
  if (!supabaseAdmin || !vapidPublicKey || !vapidPrivateKey) {
    const missing = !supabaseAdmin ? 'SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_URL' : 'VAPID keys';
    console.error(`Web Push skipped, missing config: ${missing}. Emails were still processed.`);
    return res.status(200).json({ emailsProcessed: true, pushSkipped: missing });
  }

  const notification = buildNotification(req.body || {});
  if (!notification) {
    return res.status(200).json({ skipped: true });
  }

  const { data: subscriptions, error } = await supabaseAdmin.from('push_subscriptions').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const payload = JSON.stringify(notification);
  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Clean up subscriptions the browser has revoked/expired (410 Gone / 404 Not Found)
  const deadEndpoints = (subscriptions || [])
    .filter((sub, i) => {
      const r = results[i];
      return r.status === 'rejected' && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
    })
    .map((sub) => sub.endpoint);

  if (deadEndpoints.length > 0) {
    await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
  }

  return res.status(200).json({
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
    cleaned: deadEndpoints.length,
  });
}
