// Customer-facing confirmation for a delivery order. Needs Resend (Formspree can
// only deliver to the restaurant), so it returns 503 when the key is missing
// instead of reporting a success that never happened.

import { sendViaResend, resendConfigured, escapeHtml, RESTAURANT_EMAIL } from './_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, total, itemCount } = req.body || {};

  if (!name || !email) {
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
  const safeTotal = escapeHtml(String(total || '').slice(0, 20));
  const safeItemCount = escapeHtml(String(itemCount || '1').slice(0, 10));

  const htmlContent = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(242, 127, 87, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #22c55e; margin: 0; font-size: 23px; font-weight: 800;">✅ PEDIDO RECIBIDO</h1>
        <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px;">COCO VÍQUEZ</p>
      </div>

      <p style="color: rgba(255,255,255,0.85); font-size: 16px;">Hola ${safeName},</p>
      <p style="color: rgba(255,255,255,0.8);">Hemos recibido tu pedido. Esta es tu copia:</p>

      <div style="margin: 20px 0; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <p style="margin: 8px 0;"><strong>Platos:</strong> ${safeItemCount}</p>
        <p style="margin: 8px 0;"><strong>Total:</strong> ₡${safeTotal}</p>
      </div>

      <p style="color: rgba(255,255,255,0.8);">Estamos preparando tu comida y te notificaremos cuando esté lista para entrega. ¡Gracias por tu orden!</p>

      <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; font-size: 12px; color: rgba(255,255,255,0.5);">
        <p style="margin: 0;">Coco Víquez - Playa Hermosa, Guanacaste, Costa Rica</p>
        <p style="margin: 5px 0 0;">📞 +506 2672 0029 | 📧 ${RESTAURANT_EMAIL}</p>
      </div>
    </div>
  `;

  const result = await sendViaResend({
    to: email,
    subject: '✅ Tu pedido fue recibido - Coco Víquez',
    html: htmlContent,
    replyTo: RESTAURANT_EMAIL,
  });

  if (!result.ok) {
    return res.status(502).json({ error: result.error || 'No se pudo enviar el correo al cliente' });
  }

  return res.status(200).json({ sent: true, provider: result.provider });
}
