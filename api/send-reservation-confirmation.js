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

  const { name, email, date, time, guests, alergias, lang } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const t = getEmailStrings(lang);
  const safeName = escapeHtml(String(name || '').slice(0, 100));
  const safeDate = date ? escapeHtml(String(date).slice(0, 40)) : '';
  const safeTime = time ? escapeHtml(String(time).slice(0, 20)) : '';
  const safeGuests = guests ? escapeHtml(String(guests).slice(0, 10)) : '';
  const safeAlergias = alergias ? escapeHtml(String(alergias).slice(0, 300)) : '';

  let intro = `Tu reserva para el ${safeDate} a las ${safeTime} para ${safeGuests} personas ha sido confirmada.`;
  if (safeAlergias) {
    intro += `\n\nNotas especiales: ${safeAlergias}`;
  }

  try {
    await resend.emails.send({
      from: ORDER_EMAIL_FROM,
      to: email,
      subject: 'Reserva Confirmada - Coco Víquez',
      html: renderEmailHtml({
        lang,
        heading: 'Tu reserva está confirmada',
        intro: intro,
        cliente: safeName,
        accentColor: '#F27F57',
      }),
    });
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending reservation confirmation email:', err?.message || err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
