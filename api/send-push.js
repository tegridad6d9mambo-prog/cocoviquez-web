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
import { Resend } from 'resend';
import { getEmailStrings, renderEmailHtml, escapeHtml } from './_lib/email-i18n.js';

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:restaurantecocoviquezph@gmail.com', vapidPublicKey, vapidPrivateKey);
}

const supabaseAdmin = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ORDER_EMAIL_FROM = process.env.ORDER_EMAIL_FROM || 'Coco Víquez <pedidos@cocoviquez.com>';

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

  // Try Resend first if configured, otherwise use Formspree fallback
  if (resend) {
    try {
      await resend.emails.send({
        from: ORDER_EMAIL_FROM,
        to: email,
        subject,
        html: htmlBody,
      });
      console.log(`Order email sent via Resend (status: ${newEstado})`);
      return;
    } catch (err) {
      console.warn('Resend failed, falling back to Formspree:', err?.message);
    }
  }

  // Formspree fallback
  try {
    await fetch('https://formspree.io/f/xyzkvovp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'restaurantecocoviquezph@gmail.com',
        _replyto: email,
        _subject: subject,
        name: record.cliente || 'Cliente',
        message: `Pedido #${record.id} - ${newEstado}\n\nCliente: ${record.cliente}\nEmail: ${email}`,
        html_content: htmlBody,
      })
    });
    console.log(`Order email sent via Formspree (status: ${newEstado})`);
  } catch (err) {
    console.error('Error sending customer order email (both methods failed):', err?.message || err);
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

  // Try Resend first if configured, otherwise use Formspree fallback
  if (resend) {
    try {
      await resend.emails.send({
        from: ORDER_EMAIL_FROM,
        to: email,
        subject,
        html: htmlBody,
      });
      console.log(`Reservation email sent via Resend (status: ${newEstado})`);
      return;
    } catch (err) {
      console.warn('Resend failed, falling back to Formspree:', err?.message);
    }
  }

  // Formspree fallback
  try {
    await fetch('https://formspree.io/f/xyzkvovp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'restaurantecocoviquezph@gmail.com',
        _replyto: email,
        _subject: subject,
        name: record.cliente || 'Cliente',
        message: `Reserva #${record.id} - ${newEstado}\n\nCliente: ${record.cliente}\nEmail: ${email}\nFecha: ${fecha}\nHora: ${hora}\nPersonas: ${record.lugares}`,
        html_content: htmlBody,
      })
    });
    console.log(`Reservation email sent via Formspree (status: ${newEstado})`);
  } catch (err) {
    console.error('Error sending reservation email (both methods failed):', err?.message || err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.query.secret !== process.env.PUSH_TRIGGER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server not configured (missing Supabase service role key)' });
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'Server not configured (missing VAPID keys)' });
  }

  // Customer emails are best-effort and independent of the admin push notification below.
  await sendCustomerOrderEmail(req.body || {});
  await sendReservationConfirmationEmail(req.body || {});

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
