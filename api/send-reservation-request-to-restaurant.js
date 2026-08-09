import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ORDER_EMAIL_FROM = process.env.ORDER_EMAIL_FROM || 'Coco Víquez <pedidos@cocoviquez.com>';
const RESTAURANT_EMAIL = 'restaurantecocoviquezph@gmail.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!resend) {
    console.error('RESEND API KEY NOT CONFIGURED');
    return res.status(500).json({ error: 'Server not configured (missing Resend API key)' });
  }

  const { name, email, date, time, guests, alergias } = req.body || {};

  console.log('Sending reservation request to restaurant:', { name, email, date, time, guests });

  if (!name || !email || !date) {
    console.error('Missing required fields:', { name, email, date });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const subject = `📋 NUEVA SOLICITUD DE RESERVA - ${name}`;

  let body = `
NUEVA SOLICITUD DE RESERVA

Nombre: ${name}
Email del Cliente: ${email}
Fecha: ${date}
Hora: ${time || 'No especificada'}
Número de Personas: ${guests || '1'}
${alergias ? `\nNotas/Alergias: ${alergias}` : ''}

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
            <p style="margin: 8px 0;"><strong>Nombre:</strong> ${name}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #F27F57;">${email}</a></p>
            <p style="margin: 8px 0;"><strong>Fecha Solicitada:</strong> ${date}</p>
            <p style="margin: 8px 0;"><strong>Hora:</strong> ${time || 'No especificada'}</p>
            <p style="margin: 8px 0;"><strong>Personas:</strong> ${guests || '1'}</p>
            ${alergias ? `<p style="margin: 8px 0;"><strong>Notas Especiales:</strong> ${alergias}</p>` : ''}
          </div>

          <div style="margin: 20px 0; padding: 15px; background-color: rgba(242,127,87,0.1); border-left: 3px solid #F27F57; border-radius: 4px;">
            <p style="margin: 0; color: #F27F57; font-weight: bold;">⚠️ ACCIÓN REQUERIDA</p>
            <p style="margin: 8px 0 0 0;">Responde a este email o contacta al cliente en ${email} para confirmar la reserva.</p>
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.5);">Este es un email automático del sistema de reservas.</p>
        </div>
      `
    });

    console.log('Reservation request email sent to restaurant:', result);
    return res.status(200).json({ sent: true, result });
  } catch (err) {
    console.error('Error sending reservation request email:', {
      message: err?.message,
      error: err
    });
    return res.status(500).json({ error: 'Failed to send email', details: err?.message });
  }
}
