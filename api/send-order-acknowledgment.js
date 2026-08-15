import { Resend } from 'resend';
import { getEmailStrings, renderEmailHtml, escapeHtml } from './_lib/email-i18n.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ORDER_EMAIL_FROM = process.env.ORDER_EMAIL_FROM || 'Coco Víquez <pedidos@cocoviquez.com>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Server not configured (missing Resend API key)' });
  }

  const { name, email, total, itemCount, lang } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const safeName = escapeHtml(String(name).slice(0, 100));
  const safeTotal = escapeHtml(String(total).slice(0, 20));
  const safeItemCount = escapeHtml(String(itemCount || '1').slice(0, 10));

  const t = getEmailStrings(lang || 'es');

  const heading = '✅ Tu pedido fue recibido';
  const intro = `Hemos recibido tu pedido de ${safeItemCount} platos por un total de ₡${safeTotal}. Estamos preparando tu comida y te notificaremos cuando esté lista para entrega. ¡Gracias por tu orden!`;

  const htmlBody = renderEmailHtml({
    lang: lang || 'es',
    heading,
    intro,
    cliente: safeName,
    accentColor: '#22c55e',
  });

  try {
    const result = await resend.emails.send({
      from: ORDER_EMAIL_FROM,
      to: email,
      subject: '✅ Tu pedido fue recibido - Coco Víquez',
      html: htmlBody,
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending order acknowledgment email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
