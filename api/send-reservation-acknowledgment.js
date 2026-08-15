import { Resend } from 'resend';
import { getEmailStrings, renderEmailHtml, escapeHtml } from './_lib/email-i18n.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ORDER_EMAIL_FROM = process.env.ORDER_EMAIL_FROM || 'Coco Víquez <pedidos@cocoviquez.com>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtmlLocal(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Server not configured (missing Resend API key)' });
  }

  const { name, email, date, time, guests, alergias, lang } = req.body || {};

  if (!name || !email || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const safeName = escapeHtmlLocal(String(name).slice(0, 100));
  const safeDate = escapeHtmlLocal(String(date).slice(0, 40));
  const safeTime = escapeHtmlLocal(String(time || '').slice(0, 20));
  const safeGuests = escapeHtmlLocal(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtmlLocal(String(alergias || '').slice(0, 300));

  const t = getEmailStrings(lang || 'es');

  const heading = '✅ Tu solicitud de reserva fue recibida';
  const intro = `Hemos recibido tu solicitud de reserva para el ${safeDate} a las ${safeTime} para ${safeGuests} personas. Nos pondremos en contacto contigo pronto para confirmar tu reserva. ¡Gracias por elegir Coco Víquez!`;

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
      subject: '✅ Tu solicitud de reserva fue recibida - Coco Víquez',
      html: htmlBody,
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending reservation acknowledgment email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
