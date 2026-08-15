// Vercel serverless function, called directly from the client the moment a
// customer requests a Catering/Parrilladas/Chef/Eventos quote (via WhatsApp or
// email). Sends them an immediate "we received your request" confirmation.
//
// Unlike send-push.js, this isn't behind a Supabase Database Webhook secret,
// because service requests aren't persisted as rows anywhere (see the code
// comments in App.tsx's ServiceCard) - there's no server-side record to react
// to. The trade-off: this endpoint is reachable by anyone who can call it from
// the browser. That's an acceptable risk for what it does (sends a fixed,
// templated "thanks, we got it" email to whatever address the caller supplies -
// the same class of exposure as any public "contact us" form), but it must
// never be extended to accept free-form HTML/content from the client.

import { getEmailStrings, renderEmailHtml, escapeHtml } from './_lib/email-i18n.js';
import { sendViaResend, resendConfigured, RESTAURANT_EMAIL } from './_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, service, date, people, lang } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!service || typeof service !== 'string') {
    return res.status(400).json({ error: 'Missing service' });
  }

  if (!resendConfigured()) {
    return res.status(503).json({
      error: 'RESEND_API_KEY no está configurada en Vercel: no se puede enviar correo al cliente',
    });
  }

  const t = getEmailStrings(lang);
  const safeName = escapeHtml(String(name || '').slice(0, 100));
  const safeService = escapeHtml(String(service).slice(0, 100));
  const safeDate = date ? escapeHtml(String(date).slice(0, 40)) : '';
  const safePeople = people ? escapeHtml(String(people).slice(0, 10)) : '';

  const subject = t.serviceReceived.subject(safeService);
  const htmlContent = renderEmailHtml({
    lang,
    heading: t.serviceReceived.heading,
    intro: t.serviceReceived.intro({ service: safeService, date: safeDate, people: safePeople }),
    cliente: safeName,
    accentColor: '#F27F57',
  });

  const result = await sendViaResend({
    to: email,
    subject,
    html: htmlContent,
    replyTo: RESTAURANT_EMAIL,
  });

  if (!result.ok) {
    return res.status(502).json({ error: result.error || 'No se pudo enviar el correo al cliente' });
  }

  return res.status(200).json({ sent: true, provider: result.provider });
}
