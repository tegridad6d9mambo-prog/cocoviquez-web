// The single customer-facing email for a reservation request: confirms we got it
// AND serves as their copy of exactly what was sent to the restaurant.
//
// Requires Resend, because Formspree can only deliver to the restaurant's own
// address. Without RESEND_API_KEY this returns 503 rather than pretending to have
// sent something - the frontend treats a failure here as non-fatal (it only logs
// a warning), so the reservation itself still completes.

import { sendViaResend, resendConfigured, escapeHtml, RESTAURANT_EMAIL } from './_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, date, time, guests, alergias } = req.body || {};

  if (!name || !email || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!resendConfigured()) {
    return res.status(503).json({
      error: 'RESEND_API_KEY no está configurada en Vercel: no se puede enviar correo al cliente',
    });
  }

  const safeName = escapeHtml(String(name).slice(0, 100));
  const safeEmail = escapeHtml(String(email).slice(0, 100));
  const safeDate = escapeHtml(String(date).slice(0, 40));
  const safeTime = escapeHtml(String(time || '').slice(0, 20));
  const safeGuests = escapeHtml(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtml(String(alergias || '').slice(0, 300));

  const htmlContent = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(242, 127, 87, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #22c55e; margin: 0; font-size: 23px; font-weight: 800;">✅ RECIBIMOS TU SOLICITUD</h1>
        <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px;">COCO VÍQUEZ</p>
      </div>

      <p style="color: rgba(255,255,255,0.85); font-size: 16px;">Hola ${safeName},</p>
      <p style="color: rgba(255,255,255,0.8);">Esta es tu copia de la solicitud de reserva que enviaste al restaurante:</p>

      <div style="margin: 20px 0; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <p style="margin: 8px 0;"><strong>A nombre de:</strong> ${safeName}</p>
        <p style="margin: 8px 0;"><strong>Correo:</strong> ${safeEmail}</p>
        <p style="margin: 8px 0;"><strong>Fecha:</strong> ${safeDate}</p>
        <p style="margin: 8px 0;"><strong>Hora:</strong> ${safeTime}</p>
        <p style="margin: 8px 0;"><strong>Cantidad de personas:</strong> ${safeGuests}</p>
        ${safeAlergias ? `<p style="margin: 8px 0;"><strong>Notas especiales:</strong> ${safeAlergias}</p>` : ''}
      </div>

      <p style="color: rgba(255,255,255,0.8);">Nos pondremos en contacto contigo para confirmar la disponibilidad. ¡Gracias por elegir Coco Víquez!</p>

      <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; font-size: 12px; color: rgba(255,255,255,0.5);">
        <p style="margin: 0;">Coco Víquez - Playa Hermosa, Guanacaste, Costa Rica</p>
        <p style="margin: 5px 0 0;">📞 +506 2672 0029 | 📧 ${RESTAURANT_EMAIL}</p>
        <p style="margin: 8px 0 0;">Puedes responder a este correo para comunicarte con el restaurante.</p>
      </div>
    </div>
  `;

  const result = await sendViaResend({
    to: email,
    subject: '✅ Copia de tu solicitud de reserva - Coco Víquez',
    html: htmlContent,
    replyTo: RESTAURANT_EMAIL,
  });

  if (!result.ok) {
    return res.status(502).json({ error: result.error || 'No se pudo enviar el correo al cliente' });
  }

  return res.status(200).json({ sent: true, provider: result.provider });
}
