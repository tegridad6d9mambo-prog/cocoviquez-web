// Read-only diagnostic for the email setup. Sends nothing.
//
// Exists because "no llegó el correo" has several indistinguishable causes:
// missing key, restricted key, unverified domain, or a from-address whose domain
// is not the verified one. This reports all of them in one call.
//
// Safe to expose: never returns the API key, only whether one is present, the
// from-address (which appears in every email anyway), and what Resend reports
// about the account's domains. GET-only and side-effect free.

const RESEND_DOMAINS_ENDPOINT = 'https://api.resend.com/domains';

// Resend can only send from a domain verified via DNS. Free providers can never
// be verified, so a sender on one of these is always a misconfiguration.
const FREE_MAIL_DOMAINS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'icloud.com', 'aol.com'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const from = process.env.MAIL_FROM || 'Coco Víquez <reservas@send.cocoviquez.com>';
  const match = from.match(/<([^>]+)>/);
  const fromAddress = match ? match[1] : from;
  const fromDomain = (fromAddress.split('@')[1] || '').toLowerCase();

  const report = {
    resendKeyPresent: Boolean(process.env.RESEND_API_KEY),
    senderVar: process.env.MAIL_FROM ? 'MAIL_FROM' : 'valor por defecto en el codigo (MAIL_FROM no esta definida)',
    fromAddress,
    fromDomain,
    // Surfaced only to explain why it is ignored - it is a Gmail address.
    orderEmailFromIgnorada: process.env.ORDER_EMAIL_FROM ? true : false,
  };

  if (FREE_MAIL_DOMAINS.includes(fromDomain)) {
    report.verdict = `REMITENTE INVALIDO: ${fromDomain} es un proveedor gratuito y Resend nunca puede enviar desde ahi. Hay que usar una direccion de un dominio propio verificado.`;
    return res.status(200).json(report);
  }

  if (!report.resendKeyPresent) {
    report.verdict = 'FALTA RESEND_API_KEY: no se puede enviar correo al cliente';
    return res.status(200).json(report);
  }

  try {
    const response = await fetch(RESEND_DOMAINS_ENDPOINT, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const raw = await response.text();

    if (!response.ok) {
      // A key scoped to "Sending access" is rejected here but works fine for
      // sending - it must not be reported as invalid.
      const restricted = /restricted/i.test(raw);
      report.domainsLookup = restricted
        ? 'no consultable: la key esta limitada a envio (correcto para produccion)'
        : `Resend respondio ${response.status}`;
      report.verdict = restricted
        ? 'KEY OK PERO NO PUEDO LISTAR DOMINIOS con una key de solo envio. Verificar en el panel de Resend que el dominio del remitente este verificado.'
        : (response.status === 401
            ? 'LA RESEND_API_KEY ES INVALIDA O FUE REVOCADA'
            : `No se pudo consultar los dominios en Resend (${response.status})`);
      return res.status(200).json(report);
    }

    const body = JSON.parse(raw);
    const domains = (body.data || []).map(d => ({ name: d.name, status: d.status }));
    report.domains = domains;

    const usable = domains.find(
      d => d.status === 'verified' && (fromDomain === d.name.toLowerCase() || fromDomain.endsWith('.' + d.name.toLowerCase()))
    );
    const verified = domains.filter(d => d.status === 'verified').map(d => d.name);

    if (!domains.length) {
      report.verdict = 'NO HAY NINGUN DOMINIO EN RESEND: hay que agregarlo y verificarlo con registros DNS';
    } else if (usable) {
      report.verdict = `LISTO: ${fromDomain} esta verificado, el correo al cliente deberia salir`;
    } else if (verified.length) {
      report.verdict = `EL REMITENTE NO COINCIDE: se enviaria desde ${fromDomain} pero lo verificado es ${verified.join(', ')}. Ajustar MAIL_FROM a una direccion de esos dominios.`;
    } else {
      report.verdict = `DOMINIO SIN VERIFICAR: ${domains.map(d => `${d.name} (${d.status})`).join(', ')}. Faltan los registros DNS.`;
    }

    return res.status(200).json(report);
  } catch (err) {
    report.verdict = 'Error consultando Resend: ' + (err?.message || 'desconocido');
    return res.status(200).json(report);
  }
}
