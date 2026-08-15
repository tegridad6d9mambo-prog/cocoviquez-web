// Notifies the restaurant of a new reservation request.
//
// This endpoint deliberately does NOT email the customer: the frontend calls
// send-reservation-acknowledgment right after this one, and that endpoint owns
// the single customer-facing email (which doubles as their copy of the request).
// Sending from both would put two near-identical emails in the customer's inbox.

import { notifyRestaurant, escapeHtml } from './_lib/mailer.js';

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

  const safeName = escapeHtml(String(name).slice(0, 100));
  const safeEmail = escapeHtml(String(email).slice(0, 100));
  const safeDate = escapeHtml(String(date).slice(0, 40));
  const safeTime = escapeHtml(String(time || '').slice(0, 20));
  const safeGuests = escapeHtml(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtml(String(alergias || '').slice(0, 300));

  const subject = `📋 NUEVA SOLICITUD DE RESERVA - ${safeName}`;

  const htmlContent = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(242, 127, 87, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #ffd700; margin: 0; font-size: 24px; font-weight: 800;">🚨 NUEVA RESERVA EN LÍNEA</h1>
        <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px;">COCO VÍQUEZ</p>
      </div>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="color: #ffd700; margin-top: 0; font-size: 14px; font-weight: 700;">👤 DATOS DEL CLIENTE</h3>
        <p style="margin: 8px 0;"><strong>Nombre:</strong> ${safeName}</p>
        <p style="margin: 8px 0;"><strong>Email:</strong> ${safeEmail}</p>
      </div>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="color: #ffd700; margin-top: 0; font-size: 14px; font-weight: 700;">📅 DETALLES DE LA RESERVA</h3>
        <p style="margin: 8px 0;"><strong>Fecha:</strong> ${safeDate}</p>
        <p style="margin: 8px 0;"><strong>Hora:</strong> ${safeTime}</p>
        <p style="margin: 8px 0;"><strong>Personas:</strong> ${safeGuests}</p>
        ${safeAlergias ? `<p style="margin: 8px 0;"><strong>Notas:</strong> ${safeAlergias}</p>` : ''}
      </div>

      <p style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.5);">Este es un email automático del sistema de reservas.</p>
    </div>
  `;

  try {
    const result = await notifyRestaurant({
      subject,
      name: safeName,
      message: `Reserva de ${safeName}\nEmail: ${safeEmail}\nFecha: ${safeDate}\nHora: ${safeTime}\nPersonas: ${safeGuests}`,
      html: htmlContent,
      replyTo: email,
    });

    if (!result.ok) {
      return res.status(502).json({ error: result.error || 'No se pudo notificar al restaurante' });
    }

    return res.status(200).json({ sent: true, provider: result.provider });
  } catch (err) {
    console.error('Error sending reservation email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
