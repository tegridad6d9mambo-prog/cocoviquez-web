const RESTAURANT_EMAIL = 'restaurantecocoviquezph@gmail.com';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xyzkvovp';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const safeDate = escapeHtml(String(date).slice(0, 40));
  const safeTime = escapeHtml(String(time || '').slice(0, 20));
  const safeGuests = escapeHtml(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtml(String(alergias || '').slice(0, 300));

  const subject = `✅ Tu solicitud de reserva fue recibida - Coco Víquez`;

  const htmlContent = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #22c55e; margin: 0; font-size: 24px; font-weight: 800;">✅ RESERVA RECIBIDA</h1>
        <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px;">COCO VÍQUEZ</p>
      </div>

      <p style="color: rgba(255,255,255,0.8); font-size: 16px;">Hola ${safeName},</p>
      <p style="color: rgba(255,255,255,0.8);">Hemos recibido tu solicitud de reserva. Aquí están los detalles:</p>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <p style="margin: 8px 0;"><strong>Fecha:</strong> ${safeDate}</p>
        <p style="margin: 8px 0;"><strong>Hora:</strong> ${safeTime}</p>
        <p style="margin: 8px 0;"><strong>Cantidad de personas:</strong> ${safeGuests}</p>
        ${safeAlergias ? `<p style="margin: 8px 0;"><strong>Notas especiales:</strong> ${safeAlergias}</p>` : ''}
      </div>

      <p style="color: rgba(255,255,255,0.8);">Nos pondremos en contacto contigo pronto para confirmar tu reserva. ¡Gracias por elegir Coco Víquez!</p>
      <p style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.5);">Este es un email automático del sistema de reservas.</p>
    </div>
  `;

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: email,
        _replyto: RESTAURANT_EMAIL,
        _subject: subject,
        name: safeName,
        message: `Confirmación de reserva\nFecha: ${safeDate}\nHora: ${safeTime}\nPersonas: ${safeGuests}`,
        html_content: htmlContent
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Formspree rejected reservation acknowledgment:', response.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Email provider rejected the request' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending reservation acknowledgment email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
