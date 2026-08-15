// Shared email transport for the /api endpoints.
//
// Two providers, used for different jobs:
//
//   Resend    - can send to ANY recipient, so it is the only way to reach the
//               customer's own inbox. Needs RESEND_API_KEY plus a verified
//               sending domain (see MAIL_FROM below).
//   Formspree - sends only to the address configured on the Formspree form, i.e.
//               the restaurant. Kept as the fallback for the restaurant
//               notification so a booking is never lost if Resend is
//               unconfigured or over quota.
//
// Called via the REST API rather than the `resend` SDK on purpose: it keeps the
// payload shape explicit (the SDK renamed reply_to -> replyTo between majors)
// and makes these functions testable by stubbing global.fetch.

export const RESTAURANT_EMAIL = 'restaurantecocoviquezph@gmail.com';
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xyzkvovp';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Must be an address on a domain verified in Resend, or Resend rejects the send.
//
// Deliberately does NOT fall back to the project's existing ORDER_EMAIL_FROM:
// that variable holds a @gmail.com address, and Resend can only send from a
// domain you have verified via DNS - never from a free mail provider. Falling
// back to it would fail every send with a 403.
const MAIL_FROM = process.env.MAIL_FROM || 'Coco Víquez <reservas@send.cocoviquez.com>';

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends to an arbitrary recipient. Returns { ok, provider, error }. */
export async function sendViaResend({ to, subject, html, replyTo }) {
  if (!resendConfigured()) {
    return { ok: false, provider: 'resend', error: 'RESEND_API_KEY no está configurada en Vercel' };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject,
        html,
        reply_to: replyTo || RESTAURANT_EMAIL,
      }),
    });

    if (!response.ok) {
      // Resend reports a verification/quota problem in the body; surfacing it is
      // what turns "no llegó el correo" into an actionable message.
      const detail = await response.text();
      console.error('Resend rejected the email:', response.status, detail.slice(0, 400));
      return { ok: false, provider: 'resend', status: response.status, error: `Resend respondió ${response.status}` };
    }

    return { ok: true, provider: 'resend' };
  } catch (err) {
    console.error('Network error calling Resend:', err?.message);
    return { ok: false, provider: 'resend', error: err?.message || 'Error de red' };
  }
}

/** Sends to the restaurant only - Formspree ignores any recipient we pass. */
export async function sendViaFormspree({ subject, name, message, html, replyTo }) {
  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: RESTAURANT_EMAIL,
        _replyto: replyTo || RESTAURANT_EMAIL,
        _subject: subject,
        name,
        message,
        html_content: html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Formspree rejected the email:', response.status, detail.slice(0, 400));
      return { ok: false, provider: 'formspree', status: response.status, error: `Formspree respondió ${response.status}` };
    }

    return { ok: true, provider: 'formspree' };
  } catch (err) {
    console.error('Network error calling Formspree:', err?.message);
    return { ok: false, provider: 'formspree', error: err?.message || 'Error de red' };
  }
}

/**
 * Restaurant notification: Resend first (so it arrives from the verified domain),
 * Formspree as a safety net. Only fails if both providers fail.
 */
export async function notifyRestaurant({ subject, name, message, html, replyTo }) {
  if (resendConfigured()) {
    const viaResend = await sendViaResend({ to: RESTAURANT_EMAIL, subject, html, replyTo });
    if (viaResend.ok) return viaResend;
    console.warn('Resend failed for the restaurant notification, falling back to Formspree');
  }
  return sendViaFormspree({ subject, name, message, html, replyTo });
}

export function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}
