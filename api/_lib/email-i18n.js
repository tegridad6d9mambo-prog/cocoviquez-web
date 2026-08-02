// Shared multi-language strings for customer-facing transactional emails
// (order status updates, reservation confirmations, service quote receipts).
// Files/folders under api/ prefixed with "_" are not turned into routes by
// Vercel, so this can be safely imported by the serverless functions.

export const SUPPORTED_LANGS = ['es', 'en', 'fr', 'de'];

export function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : 'es';
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const EMAIL_STRINGS = {
  es: {
    greeting: (name) => `Hola ${name || ''},`,
    footerQuestion: '¿Alguna pregunta?',
    whatsappLabel: 'WhatsApp',
    orderNumber: (id) => `Pedido #${id}`,
    orderAccepted: {
      subject: '✅ Tu pedido en Coco Víquez fue aceptado',
      heading: '¡Pedido Aceptado! ✅',
      intro: 'Ya recibimos y confirmamos tu pedido. Nuestro equipo lo está preparando con cariño. Te avisaremos por aquí en cuanto salga para tu entrega.',
    },
    orderOnTheWay: {
      subject: '🛵 ¡Tu pedido está listo y va en camino!',
      heading: '¡Va en camino! 🛵',
      intro: 'Tu pedido ya está listo y va saliendo para tu entrega. ¡Gracias por elegir Coco Víquez!',
    },
    reservationConfirmed: {
      subject: '✅ Tu reserva en Coco Víquez fue confirmada',
      heading: '¡Reserva Confirmada! ✅',
      intro: ({ lugares, fecha, hora }) => `Confirmamos tu mesa para ${lugares} persona(s) el ${fecha}${hora ? ` a las ${hora}` : ''}. ¡Te esperamos en Playa Hermosa!`,
    },
    serviceReceived: {
      subject: (service) => `✅ Recibimos tu solicitud de ${service}`,
      heading: '¡Solicitud Recibida! ✅',
      intro: ({ service, date, people }) => `Recibimos tu solicitud para el servicio de "${service}"${date ? ` el ${date}` : ''}${people ? ` para ${people} persona(s)` : ''}. Nuestro equipo revisará disponibilidad y se pondrá en contacto contigo pronto.`,
    },
  },
  en: {
    greeting: (name) => `Hi ${name || ''},`,
    footerQuestion: 'Any questions?',
    whatsappLabel: 'WhatsApp',
    orderNumber: (id) => `Order #${id}`,
    orderAccepted: {
      subject: '✅ Your order at Coco Víquez was accepted',
      heading: 'Order Accepted! ✅',
      intro: "We've received and confirmed your order. Our team is preparing it with care. We'll let you know as soon as it's out for delivery.",
    },
    orderOnTheWay: {
      subject: '🛵 Your order is ready and on its way!',
      heading: "It's on its way! 🛵",
      intro: 'Your order is ready and heading out for delivery. Thank you for choosing Coco Víquez!',
    },
    reservationConfirmed: {
      subject: '✅ Your reservation at Coco Víquez was confirmed',
      heading: 'Reservation Confirmed! ✅',
      intro: ({ lugares, fecha, hora }) => `Your table for ${lugares} guest(s) on ${fecha}${hora ? ` at ${hora}` : ''} is confirmed. We look forward to seeing you in Playa Hermosa!`,
    },
    serviceReceived: {
      subject: (service) => `✅ We received your ${service} request`,
      heading: 'Request Received! ✅',
      intro: ({ service, date, people }) => `We received your request for "${service}"${date ? ` on ${date}` : ''}${people ? ` for ${people} guest(s)` : ''}. Our team will check availability and reach out to you soon.`,
    },
  },
  fr: {
    greeting: (name) => `Bonjour ${name || ''},`,
    footerQuestion: 'Une question ?',
    whatsappLabel: 'WhatsApp',
    orderNumber: (id) => `Commande #${id}`,
    orderAccepted: {
      subject: '✅ Votre commande chez Coco Víquez a été acceptée',
      heading: 'Commande Acceptée ! ✅',
      intro: 'Nous avons bien reçu et confirmé votre commande. Notre équipe la prépare avec soin. Nous vous préviendrons dès qu\'elle partira en livraison.',
    },
    orderOnTheWay: {
      subject: '🛵 Votre commande est prête et en route !',
      heading: 'En route ! 🛵',
      intro: 'Votre commande est prête et part en livraison. Merci d\'avoir choisi Coco Víquez !',
    },
    reservationConfirmed: {
      subject: '✅ Votre réservation chez Coco Víquez a été confirmée',
      heading: 'Réservation Confirmée ! ✅',
      intro: ({ lugares, fecha, hora }) => `Votre table pour ${lugares} personne(s) le ${fecha}${hora ? ` à ${hora}` : ''} est confirmée. Nous avons hâte de vous accueillir à Playa Hermosa !`,
    },
    serviceReceived: {
      subject: (service) => `✅ Nous avons reçu votre demande pour ${service}`,
      heading: 'Demande Reçue ! ✅',
      intro: ({ service, date, people }) => `Nous avons reçu votre demande pour le service « ${service} »${date ? ` le ${date}` : ''}${people ? ` pour ${people} personne(s)` : ''}. Notre équipe vérifiera la disponibilité et vous contactera bientôt.`,
    },
  },
  de: {
    greeting: (name) => `Hallo ${name || ''},`,
    footerQuestion: 'Fragen?',
    whatsappLabel: 'WhatsApp',
    orderNumber: (id) => `Bestellung #${id}`,
    orderAccepted: {
      subject: '✅ Deine Bestellung bei Coco Víquez wurde angenommen',
      heading: 'Bestellung Angenommen! ✅',
      intro: 'Wir haben deine Bestellung erhalten und bestätigt. Unser Team bereitet sie mit Sorgfalt zu. Wir melden uns, sobald sie zur Lieferung unterwegs ist.',
    },
    orderOnTheWay: {
      subject: '🛵 Deine Bestellung ist fertig und unterwegs!',
      heading: 'Unterwegs! 🛵',
      intro: 'Deine Bestellung ist fertig und macht sich auf den Weg zu dir. Danke, dass du dich für Coco Víquez entschieden hast!',
    },
    reservationConfirmed: {
      subject: '✅ Deine Reservierung bei Coco Víquez wurde bestätigt',
      heading: 'Reservierung Bestätigt! ✅',
      intro: ({ lugares, fecha, hora }) => `Dein Tisch für ${lugares} Person(en) am ${fecha}${hora ? ` um ${hora}` : ''} ist bestätigt. Wir freuen uns auf dich in Playa Hermosa!`,
    },
    serviceReceived: {
      subject: (service) => `✅ Wir haben deine Anfrage für ${service} erhalten`,
      heading: 'Anfrage Erhalten! ✅',
      intro: ({ service, date, people }) => `Wir haben deine Anfrage für den Service "${service}"${date ? ` am ${date}` : ''}${people ? ` für ${people} Person(en)` : ''} erhalten. Unser Team prüft die Verfügbarkeit und meldet sich bald bei dir.`,
    },
  },
};

export function getEmailStrings(lang) {
  return EMAIL_STRINGS[normalizeLang(lang)];
}

export function renderEmailHtml({ lang, heading, intro, cliente, footerLine, accentColor = '#F27F57' }) {
  const t = getEmailStrings(lang);
  return `
    <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255, 215, 0, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
        <p style="color: ${accentColor}; margin: 0 0 5px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">COCO VÍQUEZ</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">${heading}</h1>
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9);">${t.greeting(cliente)}</p>
      <p style="font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9);">${intro}</p>
      ${footerLine ? `<p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 10px;">${footerLine}</p>` : ''}
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 13px; color: rgba(255,255,255,0.6);">
        <p style="margin: 4px 0;">${t.footerQuestion}</p>
        <p style="margin: 4px 0;">📞 <a href="tel:+50626720029" style="color: #F27F57; text-decoration: none;">+506 2672 0029</a> · 💬 <a href="https://wa.me/50689020888" style="color: #25D366; text-decoration: none;">${t.whatsappLabel}</a></p>
      </div>
    </div>
  `;
}
