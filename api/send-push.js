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
  if (table !== 'pedidos_delivery' || type !== 'UPDATE' || !resend) return;

  const prevEstado = (old_record?.estado || '').toLowerCase();
  const newEstado = (record?.estado || '').toLowerCase();
  if (prevEstado === newEstado) return;

  const detalle = getOrderDetalle(record);
  const email = detalle.email;
  if (!email) return;

  const t = getEmailStrings(detalle.idioma);

  let strings, accentColor;
  if (newEstado === 'aceptado') {
    strings = t.orderAccepted;
    accentColor = '#22c55e';
  } else if (newEstado === 'listo para recoger') {
    strings = t.orderOnTheWay;
    accentColor = '#F27F57';
  } else {
    return;
  }

  try {
    await resend.emails.send({
      from: ORDER_EMAIL_FROM,
      to: email,
      subject: strings.subject,
      html: renderEmailHtml({
        lang: detalle.idioma,
        heading: strings.heading,
        intro: strings.intro,
        cliente: escapeHtml(record.cliente || ''),
        footerLine: t.orderNumber(record.id),
        accentColor,
      }),
    });
  } catch (err) {
    console.error('Error sending customer order email:', err?.message || err);
  }
}

// Requires 'email' and 'idioma' columns on 'reservas' (added alongside this feature -
// the table originally had no way to reach the customer back).
async function sendReservationConfirmationEmail(body) {
  const { type, table, record, old_record } = body;
  if (table !== 'reservas' || type !== 'UPDATE' || !resend) return;

  const prevEstado = (old_record?.estado || '').toLowerCase();
  const newEstado = (record?.estado || '').toLowerCase();
  if (prevEstado === newEstado || newEstado !== 'confirmado') return;

  const email = record.email;
  if (!email) return;

  const t = getEmailStrings(record.idioma);
  const fecha = record.fecha ? record.fecha.slice(0, 10).split('-').reverse().join('/') : '';
  const hora = record.fecha_hora ? record.fecha_hora.slice(11, 16) : '';

  try {
    await resend.emails.send({
      from: ORDER_EMAIL_FROM,
      to: email,
      subject: t.reservationConfirmed.subject,
      html: renderEmailHtml({
        lang: record.idioma,
        heading: t.reservationConfirmed.heading,
        intro: t.reservationConfirmed.intro({ lugares: record.lugares, fecha, hora }),
        cliente: escapeHtml(record.cliente || ''),
        accentColor: '#22c55e',
      }),
    });
  } catch (err) {
    console.error('Error sending reservation confirmation email:', err?.message || err);
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
