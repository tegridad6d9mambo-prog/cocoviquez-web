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

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const safeName = escapeHtml(String(name || '').slice(0, 100));
  const safeDate = escapeHtml(String(date || '').slice(0, 40));
  const safeTime = escapeHtml(String(time || '').slice(0, 20));
  const safeGuests = escapeHtml(String(guests || '1').slice(0, 10));
  const safeAlergias = escapeHtml(String(alergias || '').slice(0, 300));

  const htmlBody = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(242, 127, 87, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #F27F57; margin: 0; font-size: 24px; font-weight: 800;">📋 COPIA DE TU SOLICITUD DE RESERVA</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 10px 0 0; font-size: 12px;">Esta es una copia de lo que fue enviado a Coco Víquez</p>
      </div>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="color: #F27F57; margin-top: 0; font-size: 14px; font-weight: 700;">👤 TUS DATOS</h3>
        <p style="margin: 8px 0;"><strong>Nombre:</strong> ${safeName}</p>
        <p style="margin: 8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      </div>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="color: #F27F57; margin-top: 0; font-size: 14px; font-weight: 700;">📅 DETALLES DE TU RESERVA</h3>
        <p style="margin: 8px 0;"><strong>Fecha:</strong> ${safeDate}</p>
        <p style="margin: 8px 0;"><strong>Hora:</strong> ${safeTime}</p>
        <p style="margin: 8px 0;"><strong>Cantidad de Personas:</strong> ${safeGuests}</p>
      </div>

      ${safeAlergias ? `
      <div style="margin-bottom: 25px; background-color: rgba(255, 182, 46, 0.1); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 182, 46, 0.3); border-left: 4px solid rgba(255, 182, 46, 0.8);">
        <h3 style="color: #FFB62E; margin-top: 0; font-size: 14px; font-weight: 700;">⚠️ NOTAS / ALERGIAS</h3>
        <p style="margin: 8px 0; color: rgba(255,255,255,0.9);">${safeAlergias}</p>
      </div>
      ` : ''}

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <h3 style="color: #F27F57; margin-top: 0; font-size: 14px; font-weight: 700;">✅ PRÓXIMOS PASOS</h3>
        <ol style="margin: 8px 0; padding-left: 20px; color: rgba(255,255,255,0.8);">
          <li style="margin: 5px 0;">El restaurante revisará tu solicitud</li>
          <li style="margin: 5px 0;">Recibirás un email de confirmación o rechazo</li>
          <li style="margin: 5px 0;">Si es confirmada, aparecerá en tu historial de reservas</li>
        </ol>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: rgba(255,255,255,0.5);">
        <p style="margin: 0;">Coco Víquez - Restaurante en Playa Hermosa, Guanacaste</p>
        <p style="margin: 5px 0 0;">📞 +506 2672 0029 | 📧 restaurantecocoviquezph@gmail.com</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: email,
        _replyto: 'restaurantecocoviquezph@gmail.com',
        _subject: '📋 Copia de tu solicitud de reserva - Coco Víquez',
        name: safeName,
        message: `Copia de tu reserva\nFecha: ${safeDate}\nHora: ${safeTime}\nPersonas: ${safeGuests}`,
        html_content: htmlBody
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Formspree rejected reservation copy:', response.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Email provider rejected the request' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending reservation copy email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
