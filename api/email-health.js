// Read-only diagnostic for the email setup. Sends nothing.
//
// Exists because "no llegó el correo" has too many possible causes to guess at:
// missing key, unverified domain, or a from-address on a domain that isn't the
// verified one. This reports all three at once.
//
// Safe to expose: it never returns the API key, only whether one is present, the
// from-address (which appears in every email anyway), and the domain list Resend
// reports. Kept GET-only and side-effect free.

const RESEND_DOMAINS_ENDPOINT = 'https://api.resend.com/domains';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const from =
    process.env.MAIL_FROM ||
    process.env.ORDER_EMAIL_FROM ||
    'Coco Víquez <reservas@send.cocoviquez.com>';

  // The domain part of "Name <user@domain>" is what Resend checks against its
  // verified list, so extract it and compare explicitly.
  const match = from.match(/<([^>]+)>/);
  const fromAddress = match ? match[1] : from;
  const fromDomain = (fromAddress.split('@')[1] || '').toLowerCase();

  const report = {
    resendKeyPresent: Boolean(process.env.RESEND_API_KEY),
    mailFromVarUsed: process.env.MAIL_FROM ? 'MAIL_FROM' : (process.env.ORDER_EMAIL_FROM ? 'ORDER_EMAIL_FROM' : 'valor por defecto en el codigo'),
    fromAddress,
    fromDomain,
  };

  if (!report.resendKeyPresent) {
    report.verdict = 'FALTA RESEND_API_KEY: no se puede enviar correo al cliente';
    return res.status(200).json(report);
  }

  try {
    const response = await fetch(RESEND_DOMAINS_ENDPOINT, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });

    if (!response.ok) {
      report.domainsLookup = `Resend respondio ${response.status}`;
      report.verdict = response.status === 401
        ? 'LA RESEND_API_KEY ES INVALIDA O FUE REVOCADA'
        : 'No se pudo consultar los dominios en Resend';
      return res.status(200).json(report);
    }

    const body = await response.json();
    const domains = (body.data || []).map(d => ({ name: d.name, status: d.status, region: d.region }));
    report.domains = domains;

    const usable = domains.find(
      d => d.status === 'verified' && (fromDomain === d.name.toLowerCase() || fromDomain.endsWith('.' + d.name.toLowerCase()))
    );

    if (!domains.length) {
      report.verdict = 'NO HAY NINGUN DOMINIO AGREGADO EN RESEND: agregar y verificar con DNS';
    } else if (usable) {
      report.verdict = `LISTO: ${fromDomain} esta verificado, el correo al cliente deberia salir`;
    } else {
      const verified = domains.filter(d => d.status === 'verified').map(d => d.name);
      report.verdict = verified.length
        ? `EL REMITENTE NO COINCIDE: se envia desde ${fromDomain} pero lo verificado es ${verified.join(', ')}. Ajustar MAIL_FROM a una direccion de esos dominios.`
        : `DOMINIO SIN VERIFICAR: ${domains.map(d => d.name + ' (' + d.status + ')').join(', ')}. Completar los registros DNS.`;
    }

    return res.status(200).json(report);
  } catch (err) {
    report.verdict = 'Error de red consultando Resend: ' + (err?.message || 'desconocido');
    return res.status(200).json(report);
  }
}
