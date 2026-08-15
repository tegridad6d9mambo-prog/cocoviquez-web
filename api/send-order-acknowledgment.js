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

  const { name, email, total, itemCount } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const safeName = escapeHtml(String(name).slice(0, 100));
  const safeEmail = escapeHtml(String(email).slice(0, 100));
  const safeTotal = escapeHtml(String(total || '').slice(0, 20));
  const safeItemCount = escapeHtml(String(itemCount || '1').slice(0, 10));

  const subject = '✅ Tu pedido fue recibido - Coco Víquez';

  const htmlContent = `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #22c55e; margin: 0; font-size: 24px; font-weight: 800;">✅ PEDIDO RECIBIDO</h1>
        <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px;">COCO VÍQUEZ</p>
      </div>

      <p style="color: rgba(255,255,255,0.8); font-size: 16px;">Hola ${safeName},</p>
      <p style="color: rgba(255,255,255,0.8);">Hemos recibido tu pedido de ${safeItemCount} platos por un total de ₡${safeTotal}.</p>

      <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <p style="margin: 8px 0;"><strong>Cliente:</strong> ${safeName}</p>
        <p style="margin: 8px 0;"><strong>Correo:</strong> ${safeEmail}</p>
        <p style="margin: 8px 0;"><strong>Platos:</strong> ${safeItemCount}</p>
        <p style="margin: 8px 0;"><strong>Total:</strong> ₡${safeTotal}</p>
      </div>

      <p style="color: rgba(255,255,255,0.8);">Estamos preparando tu comida y te notificaremos cuando esté lista para entrega. ¡Gracias por tu orden!</p>
      <p style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.5);">Este es un email automático del sistema de pedidos.</p>
    </div>
  `;

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: safeEmail,
        _replyto: RESTAURANT_EMAIL,
        _subject: subject,
        name: safeName,
        message: `Pedido recibido\nCliente: ${safeName}\nCorreo: ${safeEmail}\nPlatos: ${safeItemCount}\nTotal: ₡${safeTotal}`,
        html_content: htmlContent
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Formspree rejected order acknowledgment:', response.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Email provider rejected the request' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Error sending order acknowledgment email:', err?.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
