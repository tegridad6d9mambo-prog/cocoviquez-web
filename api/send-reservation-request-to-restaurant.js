import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ORDER_EMAIL_FROM = process.env.ORDER_EMAIL_FROM || 'Coco Víquez <pedidos@cocoviquez.com>';
const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL || 'restaurantecocoviquezph@gmail.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiting (IP → timestamp of last request)
const rateLimitMap = new Map();
const RATE_LIMIT_SECONDS = 60;
const MAX_REQUESTS_PER_LIMIT = 5;

function escapeHtml(str) {
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

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const timestamps = rateLimitMap.get(key);
  const recentRequests = timestamps.filter(t => (now - t) < RATE_LIMIT_SECONDS * 1000);

  if (recentRequests.length >= MAX_REQUESTS_PER_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(key, recentRequests);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (!resend) {
    return res.status(500).json({ error: 'Server not configured (missing Resend API key)' });
  }

  const { name, email, date, time, guests, alergias } = req.body || {};

  if (!name || !email || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Escape all user inputs to prevent HTML injection
  const safeName = escapeHtml(String(name).slice(0, 100));
  const safeEmail = escapeHtml(String(email).slice(0, 100));
  const safeDate = escapeHtml(String(date).slice(0, 40));
  const safeTime = escapeHtml(String(time || '').slice(0, 20));
  const safeGuests = escapeHtml(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtml(String(alergias || '').slice(0, 300));

  const subject = `📋 NUEVA SOLICITUD DE RESERVA - ${safeName}`;

  let body = `
NUEVA SOLICITUD DE RESERVA

Nombre: ${safeName}
Email del Cliente: ${safeEmail}
Fecha: ${safeDate}
Hora: ${safeTime || 'No especificada'}
Número de Personas: ${safeGuests}
${safeAlergias ? `Notas/Alergias: ${safeAlergias}` : ''}

El cliente ha enviado esta solicitud de reserva.
Por favor, confirma con el cliente para completar la reserva.
  `;

  try {
    const result = await resend.emails.send({
      from: ORDER_EMAIL_FROM,
      to: RESTAURANT_EMAIL,
      replyTo: email,
      subject: subject,
      text: body,
      html: `
        <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F27F57; border-bottom: 2px solid #F27F57; padding-bottom: 10px;">📋 Nueva Solicitud de Reserva</h2>

          <div style="margin: 20px 0; background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <p style="margin: 8px 0;"><strong>Nombre:</strong> ${safeName}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color: #F27F57;">${safeEmail}</a></p>
            <p style="margin: 8px 0;"><strong>Fecha Solicitada:</strong> ${safeDate}</p>
            <p style="margin: 8px 0;"><strong>Hora:</strong> ${safeTime || 'No especificada'}</p>
            <p style="margin: 8px 0;"><strong>Personas:</strong> ${safeGuests}</p>
            ${safeAlergias ? `<p style="margin: 8px 0;"><strong>Notas Especiales:</strong> ${safeAlergias}</p>` : ''}
          </div>

          <div style="margin: 20px 0; padding: 15px; background-color: rgba(242,127,87,0.1); border-left: 3px solid #F27F57; border-radius: 4px;">
            <p style="margin: 0; color: #F27F57; font-weight: bold;">⚠️ ACCIÓN REQUERIDA</p>
            <p style="margin: 8px 0 0 0;">Responde a este email o contacta al cliente en ${safeEmail} para confirmar la reserva.</p>
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.5);">Este es un email automático del sistema de reservas.</p>
        </div>
      `
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending reservation request email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
