import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
import { handleServiceQuote } from './utils/serviceActions';
import { 
  Menu, 
  X, 
  MapPin, 
  Clock, 
  Phone, 
  Calendar, 
  Globe, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Star,
  Utensils, 
  Instagram,
  Facebook,
  Info,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Apple,
  Wallet,
  ChefHat,
  Heart,
  Mail,
  MessageCircle,
  Navigation,
  Lightbulb,
  Lock,
  Maximize2,
  Check,
  CheckCircle,
  ArrowUp,
  ArrowLeft,
  DollarSign,
  Package,
  TrendingUp,
  Box,
  Eye,
  EyeOff
} from 'lucide-react';

// --- Security: Input Sanitization (Anti-XSS) ---
/**
 * Sanitizes user text fields to strip HTML tags and potential script payloads,
 * acting as an Anti-XSS safeguard for database and system integrity.
 */
export const sanitizeInput = (val: string): string => {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/(javascript|onclick|onmouseover|onload|onerror|alert|script|iframe|style|prototype)\s*:/gi, '') // Strip script execution vectors
    .replace(/[{}$()]/g, '') // Strip specific template tags/characters that could cause secondary template/XSS injection
    .trim();
};

// The 'pedidos_delivery' table has no dedicated columns for items/email/payment method,
// so confirmOrder() packs them into 'detalle_pedido' as JSON: { items, email, payment_method, transaction_id }.
// This unpacks that shape for display, while staying backwards-compatible with any older
// rows where 'detalle_pedido' (or a legacy 'items' field) was just a plain items array.
const parseOrderDetails = (order: any): { items: any[]; email: string; paymentMethod: string; transactionId: string } => {
  const raw = order.items || order.detalle_pedido;
  let items: any[] = [];
  let email = order.email || '';
  let paymentMethod = order.metodo_pago || order.payment_method || '';
  let transactionId = order.transaction_id || '';

  if (raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        items = raw.split(',').map((it: string) => ({ name: it.trim(), quantity: 1, price: '' }));
        parsed = null;
      }
    }
    if (parsed) {
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (typeof parsed === 'object') {
        items = Array.isArray(parsed.items) ? parsed.items : [];
        email = email || parsed.email || '';
        paymentMethod = paymentMethod || parsed.payment_method || '';
        transactionId = transactionId || parsed.transaction_id || '';
      }
    }
  }

  return { items, email, paymentMethod: paymentMethod || 'Sinpe Móvil', transactionId };
};

// 'reservas.fecha' is a timestamptz column, so Supabase returns it as
// "2026-07-13T00:00:00+00:00", not a plain "2026-07-13" - unlike
// 'fechas_bloqueadas.fecha', which is a real date column. Slicing to the
// first 10 chars normalizes both shapes to "YYYY-MM-DD" for comparisons
// and display.
const toDateOnly = (value: string | null | undefined): string => {
  return value ? value.slice(0, 10) : '';
};

// Web Push requires the VAPID public key as a Uint8Array, not the base64url
// string it's normally shared as - this is the standard conversion for it.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Admin notification tones, synthesized with the Web Audio API instead of an
// external audio file - no CDN dependency, no licensing to track, plays
// instantly. Each note is a short sine/triangle blip with a quick fade-out.
const playTone = (notes: { freq: number; duration: number; type?: OscillatorType }[]) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    let startTime = ctx.currentTime;
    notes.forEach(({ freq, duration, type = 'sine' }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
      startTime += duration * 0.85;
    });
  } catch (e) {
    console.warn('Could not play notification tone:', e);
  }
};

// Bright ascending two-note "ding-ding" for new delivery orders - needs to
// grab kitchen attention.
const playOrderNotification = () => playTone([
  { freq: 880, duration: 0.15, type: 'sine' },
  { freq: 1175, duration: 0.28, type: 'sine' },
]);

// Softer single "ping" for new table/service reservations - lower urgency.
const playReservationNotification = () => playTone([
  { freq: 660, duration: 0.35, type: 'triangle' },
]);

// Urgent three-note descending alert for "order ready for pickup" - the
// owner needs to physically go get it and deliver it, so this one is
// deliberately the most attention-grabbing of the three.
const playReadyForPickupNotification = () => playTone([
  { freq: 1046, duration: 0.16, type: 'square' },
  { freq: 784, duration: 0.16, type: 'square' },
  { freq: 1046, duration: 0.24, type: 'square' },
]);

// --- Translations ---
const translations = {
  es: {
    nav: {
      menu: 'Menú',
      about: 'Nosotros',
      services: 'Servicios',
      location: 'Ubicación',
      galeria: 'Galería',
      reserve: 'Reservar Mesa',
      order: 'Pedir para Llevar'
    },
    hero: {
      line1: 'De nuestro servicio nace la amistad',
      line2: 'Pura vida, vida pura',
      subtitle: 'Una experiencia gastronómica de lujo en el corazón de Playa Hermosa, Guanacaste.'
    },
    about: {
      title: 'Nuestra Herencia',
      summary: 'Raíces que crecen desde Ciudad Quesada, San Carlos. Tras 23 años de lucha en su primer restaurante La Pradera, Abraham Víquez deja todo junto a su familia para emprender Restaurante Coco Víquez en Playa Hermosa, durante 13 años de esfuerzo junto a su Esposa Marjorie e hijos Sebastián, Josué, Emmanuel y quienes hoy continúan el legado de excelencia en cada plato.',
      extended: '...logran como familia dar un salto y adquieren su propio terreno en Playa Hermosa y construyen su propio nuevo Restaurante. Esta vez más grande, moderno y propio. Actualmente administrado por su fundador Abraham Víquez y su hijo Sebastián. Está ubicado en la ruta nacional 159 frente a la entrada principal de Condovac y Villas Sol. Caracterizándose por ser el único restaurante 100 % costarricense con sus sabores únicos y precios accesibles tanto para extranjeros como locales.',
      readMore: 'Seguir leyendo',
      readLess: 'Leer menos',
      tag: 'Beach Luxury Dining',
      src: "/logo/logo.png",
      features: [
        { icon: 'ChefHat', text: 'Cocina Artesanal' },
        { icon: 'MapPin', text: 'Fácil Acceso' },
        { icon: 'Heart', text: 'Legado Familiar' }
      ]
    },
    menu: {
      title: 'Menú Digital',
      breakfast: 'Desayunos',
      main: 'Almuerzos y Cenas',
      snacks: 'Snacks',
      drinks: 'Bebidas',
      items: {
        breakfast: [
          { name: 'Estilo Buffet / Buffet Style', desc: 'Podés incluir todas nuestras opciones en el buffet más una bebida: Café o un jugo natural. NO INCLUYE REPETICIÓN DE COMIDA EXTRA', price: 'Consultar' }
        ],
        main: [
          { name: 'Plato Completo (Casado)', desc: 'Elegí 1 proteína (res, pescado, pollo, cerdo) + 4 acompañamientos (arroz, frijoles, chips, ensalada) + jugo natural.', price: '₡6,800' },
          { name: 'Pasta Salsa Tomate', desc: 'Incluye pan al ajillo.', price: '₡6,500' },
          { name: 'Pasta Salsa Blanca', desc: 'Incluye pan al ajillo.', price: '₡8,000' },
          { name: 'Pasta con Camarones', desc: 'Incluye pan al ajillo.', price: '₡8,000' },
          { name: 'Ceviche Loro', desc: 'Fresco y marinado.', price: '₡8,000' },
          { name: 'Ceviche Camarón', desc: 'Fresco y marinado.', price: '₡8,000' },
          { name: 'Ceviche Mixto', desc: 'Fresco y marinado.', price: '₡8,500' },
          { name: 'Ceviche Pulpo', desc: 'Fresco y marinado.', price: '₡9,000' },
          { name: 'Ceviche Premium', desc: 'La mejor selección de mariscos.', price: '₡10,000' },
          { name: 'Sopa de Mariscos', desc: 'Tradicional y sustanciosa.', price: '₡8,000' },
          { name: 'Pescado Entero Pargo Rojo', desc: 'Fresco del día.', price: '₡10,000' },
          { name: 'Arroz con Camarón', desc: 'Arroz arreglado con mariscos frescos.', price: '₡8,000' },
          { name: 'Arroz con Calamar', desc: 'Arroz arreglado con mariscos frescos.', price: '₡8,000' },
          { name: 'Arroz con Pulpo', desc: 'Arroz arreglado con mariscos frescos.', price: '₡9,000' },
          { name: 'Arroz con Pollo', desc: 'El clásico costarricense.', price: '₡6,500' },
          { name: 'Arroz Cantones', desc: 'Estilo oriental con toque tico.', price: '₡6,500' },
          { name: 'Cordon Blue', desc: 'Incluye 2 acompañamientos.', price: '₡9,000' },
          { name: 'Filete de Pollo', desc: 'Incluye 2 acompañamientos.', price: '₡8,500' },
          { name: 'Filete de Pescado', desc: 'Incluye 2 acompañamientos.', price: '₡8,500' },
          { name: 'Parrilla', desc: 'Incluye 2 acompañamientos.', price: '₡8,000' },
          { name: 'Bistec de la Casa', desc: 'Incluye 2 acompañamientos.', price: '₡8,000' },
          { name: 'Milanesa', desc: 'Incluye 2 acompañamientos.', price: '₡8,000' },
          { name: 'Carnitas', desc: 'Incluye 2 acompañamientos.', price: '₡8,000' }
        ],
        snacks: [
          { name: 'Orden de Papas', desc: 'Papas fritas crujientes.', price: '₡3,000' },
          { name: 'Dedos de Pollo', desc: 'Acompañados de papas.', price: '₡6,500' },
          { name: 'Dedos de Pescado', desc: 'Acompañados de papas.', price: '₡6,500' },
          { name: 'Víquez Fries', desc: 'Especialidad de la casa.', price: '₡6,500' },
          { name: 'Nachos', desc: 'Con carne, queso y frijoles.', price: '₡6,500' },
          { name: 'Quesadilla', desc: 'Tortilla de harina con queso fundido.', price: '₡6,500' },
          { name: 'Pinchos', desc: 'Brochetas de carne a la parrilla.', price: '₡9,000' },
          { name: 'Taco Tico', desc: 'Repollo, carne y salsas.', price: '₡6,000' },
          { name: 'Tacos Mexicanos', desc: 'Estilo tradicional.', price: '₡8,000' },
          { name: 'Tacos de Pescado', desc: 'Fresco y crujiente.', price: '₡9,000' },
          { name: 'Tacos de Camarón', desc: 'Fresco y crujiente.', price: '₡9,000' },
          { name: '2 Chalupas', desc: 'Tortilla crujiente con carne y ensalada.', price: '₡7,000' },
          { name: 'Hamburguesa con Papas', desc: 'Carne premium.', price: '₡6,000' },
          { name: 'Quesadilla Beef Steak', desc: 'Con carne de res premium.', price: '₡7,500' }
        ],
        drinks: [
          { name: 'Agua', desc: 'Embotellada.', price: '₡1,500' },
          { name: 'Jugo Natural', desc: 'Frutas de temporada.', price: '₡1,500' },
          { name: 'Gaseosas', desc: 'Variedad de sabores.', price: '₡2,000' },
          { name: 'Café Regular', desc: 'Café de altura.', price: '₡1,500' },
          { name: 'Cappuccino / Espresso / Latte', desc: 'Preparaciones especiales.', price: '₡3,500' },
          { name: 'Cerveza Nacional', desc: 'Imperial o Pilsen.', price: '₡2,000' },
          { name: 'Cerveza Bavaria', desc: 'Premium nacional.', price: '₡3,500' },
          { name: 'Cerveza Artesanal / Internacional', desc: 'Selección especial.', price: '₡3,500' },
          { name: 'Copa de Vino', desc: 'Cabernet, Merlot, Chardonnay, Pinot Grigio, Rosé.', price: '₡4,000' },
          { name: 'Sangría', desc: 'Receta de la casa.', price: '₡5,000' }
        ]
      }
    },
    reservation: {
      title: 'Reserva tu Mesa',
      desc: 'Reserva tu mesa y déjate envolver por la frescura de nuestro entorno natural en Playa Hermosa.',
      name: 'Nombre Completo',
      email: 'Correo Electrónico',
      emailPlaceholder: 'tu@correo.com',
      date: 'Fecha',
      time: 'Hora',
      guests: 'Personas',
      guestsHint: '8+ o grupos grandes',
      send: 'Enviar Reserva',
      success: '¡Reserva enviada! (Simulado en consola)',
      hours: 'Lunes a Domingo: 7:00 AM - 9:00 PM',
      distributionLabel: 'Distribución del Restaurante',
      tableLegend: 'Distribución de Mesas',
      clickMapHint: 'Haz clic en el mapa para ampliar la vista',
      minAdvanceNotice: 'LAS RESERVAS REQUIEREN UN MÍNIMO DE 72 HORAS DE ANTICIPACIÓN',
      guestsLabel: 'Número de Personas',
      allergiesLabel: 'Alergias o Notas Especiales (Opcional)',
      allergiesPlaceholder: 'Ej: Alergia a mariscos, vegetariano, celebración de cumpleaños...',

    },
    footer: {
      rights: '© 2026 Coco Viquez. Todos los derechos reservados.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Abrir en Google Maps'
    },
    cart: {
      title: 'TU PEDIDO',
      empty: 'El carrito está vacío',
      backToMenu: 'Volver al menú',
      orderSummary: 'Resumen de Pedido',
      itemTotal: 'Total Item',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      packingFee: 'Cargo de Empaque',
      total: 'Total Final',
      deliveryDetails: 'Datos de Entrega',
      fullName: 'Nombre Completo',
      fullNamePlaceholder: 'Ej: Sasha Calero',
      email: 'Correo Electrónico',
      emailPlaceholder: 'tu@correo.com',
      confirmEmail: 'Confirmar Correo',
      confirmEmailPlaceholder: 'Confirma tu correo',
      phone: 'Número de Teléfono',
      address: 'Dirección Exacta',
      addressPlaceholder: 'Ej: Casa blanca, frente al parque, portón negro...',
      deliveryZone: 'ZONA DE ENTREGA',
      viewDeliveryMap: 'Ver Mapa de Entrega',
      locating: '⌛ Obteniendo ubicación...',
      locationSaved: '✅ Ubicación Guardada',
      shareLocation: 'COMPARTIR MI UBICACIÓN',
      selectPaymentMethod: 'Selecciona Método de Pago',
      card: 'Tarjeta',
      sinpe: 'SINPE',
      cash: 'EFECTIVO',
      payNow: 'PAGAR AHORA',
      sendOrder: 'ENVIAR PEDIDO',
      closeMapAria: 'Cerrar mapa de entrega',
      mapAlt: 'Mapa de Zonas de Entrega',
      alertInvalidEmail: 'Por favor, ingrese un correo electrónico válido.',
      alertEmailMismatch: 'Los correos electrónicos no coinciden.',
      alertInvalidPhone: 'Por favor, ingrese un número de teléfono válido para {country} ({format}).',
      alertInvalidName: 'Por favor, ingrese su nombre completo.',
      alertNoAddress: 'Por favor, comparta su ubicación o ingrese su dirección exacta.',
      geoUnsupported: "La geolocalización no está disponible en este navegador o requiere de una conexión HTTPS segura. Por favor, intente con otro navegador moderno o escriba su dirección de forma manual en el campo 'DIRECCIÓN EXACTA'.",
      geoError: 'No pudimos obtener tu GPS. Por favor, escribe tu dirección exacta abajo o copia el enlace de tu ubicación manualmente.'
    },
    calendar: {
      weekDays: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    },
    foodMenu: {
      cartHint: 'Puedes ajustar tu pedido luego en el carrito',
      extras: ['Arroz', 'Frijoles', 'Ensalada', 'Pico de Gallo', 'Chips Tortillas de Maíz', 'Tortilla Suave Harina de Maíz', 'Patacones', 'Plátano Maduro', 'Frijoles Molidos', 'Guacamole', 'Papas Fritas', 'Salsa de Nacho', 'Botella de Hot Sauce'],
      categories: [
        {
          cat: 'Desayunos', ico: '☀️',
          items: [
            { n: 'Sándwich (Carne/Pollo/Jamón)', p: 6000, d: 'Con queso y proteína a elegir 🥪', tip: 'sandwich' },
            {
              n: 'Desayuno Típico',
              p: 6000,
              d: 'Incluye café y jugo natural. Elige tus acompañamientos:',
              modal: 'acompanamiento',
              flavors: [
                'Pinto',
                'Huevos',
                'Tostadas baguette',
                'Pancake',
                'Plátano maduro',
                'Natilla',
                'Queso fresco',
                'Salchichón'
              ]
            },
            { n: 'Omelette', p: 6000, d: 'Ingredientes frescos 🍳', tip: 'omelette' }
          ]
        },
        {
          cat: 'Buffets', ico: '🍽️',
          items: [
            { n: 'Almuerzo/Cena Buffet', p: 6000, d: 'Proteína + 4 acompañamientos + Jugo natural 🥩', modal: 'buffet' },
            {
  n: 'Buffet Desayuno',
  p: 6000,
  d: 'Opciones completas + Bebida natural o Café. Elige tus acompañamientos:',
  modal: 'acompanamiento',
  flavors: [
    'Pinto',
    'Huevos',
    'Tostadas baguette',
    'Pancake',
    'Plátano maduro',
    'Natilla',
    'Queso fresco',
    'Salchichón'
  ]
 }
          ]
        },
        {
          cat: 'Pastas', ico: '🍝',
          items: [
            { n: 'Pasta Salsa de Tomate', p: 6500, d: 'Vegetariana: Con hongos, albahaca y queso parmesano. Incluye pan al ajillo 🌿', tip: 'tomato' },
            { n: 'Pasta Salsa Blanca', p: 8000, d: 'Estilo Alfredo: Con hongos y pollo o jamón. Incluye pan al ajillo 🍗', tip: 'white' },
            { n: 'Pasta con Camarones', p: 8000, d: 'Con salsa blanca y ajo. Incluye pan al ajillo 🍤' },
            { n: 'Pasta al Ajillo de Pulpo', p: 8000, d: 'Pulpo fresco al ajillo. Incluye pan al ajillo 🐙' },
            { n: 'Pasta al Ajillo de Camarón', p: 8000, d: 'Camarones al ajillo. Incluye pan al ajillo 🍤' },
            { n: 'Pasta de Camarón y Pulpo', p: 9000, d: 'Mix de mariscos al ajillo. Incluye pan al ajillo 🐙🍤' }
          ]
        },
        {
          cat: 'Arroces', ico: '🍚',
          items: [
            { n: 'Arroz con Camarón', p: 8000, d: 'Clásico con camarones frescos 🍤', tip: 'rice' },
            { n: 'Arroz con Pollo', p: 6500, d: 'Receta tradicional tica 🥥', tip: 'rice' },
            { n: 'Arroz Cantones', p: 6500, d: 'Estilo oriental con carnes 🍚', tip: 'rice' },
            { n: 'Arroz Mixto Mariscos', p: 9000, d: 'Pulpo, calamar y camarón 🥣', tip: 'rice' }
          ]
        },
        {
          cat: 'Mariscos', ico: '🐟',
          items: [
            { n: 'Ceviche de Pescado (Loro)', p: 8000, d: 'Cocinada al momento. 🍋', modal: 'ceviche' },
            { n: 'Ceviche de Camarón', p: 8000, d: 'Camarones frescos. 🍤', modal: 'ceviche' },
            { n: 'Ceviche Mixto', p: 8500, d: 'Pescado y camarón. 🐟🍤', modal: 'ceviche' },
            { n: 'Ceviche de Pulpo', p: 9000, d: 'Pulpo tierno. 🐙', modal: 'ceviche' },
            { n: 'Ceviche Premium', p: 10000, d: 'Loro, Camarón y Pulpo. 🏆', modal: 'ceviche' },
            { n: 'Sopa de Mariscos', p: 8000, d: 'Incluye arroz. 🥣', modal: 'sopa' },
            { n: 'Camarón al Ajillo', p: 9000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Pescado Entero (Pargo Rojo)', p: 10000, d: 'Frito. 🐟', modal: 'acompañamientos' },
            { n: 'Tacos de Pulpo', p: 8000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Pulpo (Parrilla o Ajillo)', p: 9000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Camarones Empanizados', p: 8000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Quesadilla de Camarón', p: 7500, d: '🧀🍤' }
          ]
        },
        {
          cat: 'Snacks', ico: '🍟',
          items: [
            { n: 'Orden de Papas Fritas', p: 3000, d: 'Clásicas y crujientes. 🍟' },
            { n: 'Dedos de Pescado o Pollo', p: 6500, d: 'Incluye 2 acompañamientos a elegir. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Víquez Fries', p: 6500, d: 'Papas con carne o pollo mechado, pico de gallo y queso. 🧀' },
            { n: 'Nachos', p: 6500, d: 'Con frijoles molidos, queso fundido y pico de gallo. 🧀' },
            { n: 'Quesadilla', p: 6500, d: 'Tortilla de harina con queso derretido. 🧀' },
            { n: 'Pinchos - Skewers', p: 9000, d: 'Brochetas de carne y vegetales a la parrilla. 🥩🍢' },
            { n: 'Taco Tico', p: 6000, d: 'Frito, relleno de carne. Estilo tradicional. 🇨🇷' },
            { n: 'Tacos Mexicanos', p: 8000, d: '3 Tacos suaves con carne, cebolla y cilantro. 🇲🇽' },
            { n: 'Tacos de Pescado o Camarón', p: 9000, d: '2 tacos con guarnición y aderezo especial. 🐟' },
            { n: '2 Chalupas', p: 7000, d: 'Tortilla frita con frijoles, carne, repollo y salsas. 🌮' },
            { n: 'Hamburguesa con Papas (Cheese Burger)', p: 6000, d: 'Carne, queso y papas fritas. 🍔' },
            { n: 'Hamburguesa Regular', p: 6000, d: 'Sencilla, con sabor tradicional. 🍔' },
            { n: 'Hamburguesa de Pollo', p: 6000, d: 'Con filet de pollo empanizado o a la parrilla. 🍗' },
            { n: 'Quesadilla de Beef Steak', p: 7500, d: 'Tortilla de harina con carne asada y queso. 🥩' }
          ]
        },
        {
          cat: 'Especialidades', ico: '🥩',
          items: [
            { n: 'Cordon Blue', p: 8000, d: 'Pollo relleno de jamón y queso empanizado. Incluye 2 acompañamientos. 🍗', modal: 'acompañamientos' },
            { n: 'Filet de Pollo / Pescado', p: 8500, d: 'A la plancha o al ajillo. Incluye 2 acompañamientos. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Carne o Pollo a la Parrilla', p: 8000, d: 'Corte premium a la brasa. Incluye 2 acompañamientos. 🥩🔥', modal: 'acompañamientos' },
            { n: 'Bistec Casa', p: 8000, d: 'Receta tradicional de la casa. Incluye 2 acompañamientos. 🥩', modal: 'acompañamientos' },
            { n: 'Milanesa de Pollo o Carne', p: 8000, d: 'Empanizado crujiente. Incluye 2 acompañamientos. 🥩🍗', modal: 'acompañamientos' },
            { n: 'Carnitas', p: 8000, d: 'Fajitas de carne salteadas a la parrilla. Incluye 2 acompañamientos. 🥩', modal: 'acompañamientos' },
            { n: 'Chifrijo', p: 8000, d: 'Capa de arroz, frijoles tiernos, chicharrón y pico de gallo. (Preguntar disponibilidad) 🥣' }
          ]
        },
        {
          cat: 'Bebidas', ico: '🍹',
          items: [
            { tipo: 'header', n: 'REFRESCOS Y CAFÉ ☕' },
            { n: 'Botella de Agua 700ml', p: 2000, d: 'Agua purificada.' },
            { n: 'Fresco Natural del Día', p: 2000, d: 'Jugo natural preparado al momento.' },
            { n: 'Sodas - Gaseosa', p: 2000, d: 'Variedad de sabores.', modal: 'sabor', flavors: ['Fanta Naranja', 'Fanta Uva', 'Ginger Ale', 'Fanta Kolita', 'Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Monster', 'Tropical Melocotón', 'Tropical Blanco', 'Pepsi', 'Pepsi Zero', 'Root Beer', 'Gatorade'] },
            { n: 'Batido Mixto', p: 4000, d: 'Smoothies de frutas naturales.', modal: 'sabor', flavors: ['Mango', 'Fresa', 'Piña', 'Mixto'], bases: ['Agua', 'Leche'], baseLabel: 'Elige la base (obligatorio):' },
            { n: 'Café Britt Especial', p: 3500, d: 'Capuccino, Espresso, Latte o Café Frío.', modal: 'sabor', flavors: ['Capuccino', 'Espresso', 'Latte', 'Café Frío'] },
            { tipo: 'header', n: 'CERVEZAS 🍺' },
            { n: 'Cerveza Nacional', p: 2000, d: 'Imperial (Light, Ultra, Silver) o Pilsen.', modal: 'sabor', flavors: ['Imperial', 'Imperial Light', 'Imperial Ultra', 'Imperial Silver', 'Pilsen'] },
            { n: 'Cerveza Premium / Artesanal', p: 3500, d: 'Bavaria, Heineken, Corona o Artesanal (IPA/Lager).', modal: 'sabor', flavors: ['Bavaria', 'Heineken', 'Corona', 'Artesanal IPA', 'Artesanal Lager'] },
            { tipo: 'header', n: 'VINOS Y LICORES 🍷' },
            { n: 'Copa de Vino Seleccionada', p: 4000, d: 'Merlot, Cabernet, Sauvignon Blanc, Chardonnay.', modal: 'sabor', flavors: ['Merlot', 'Cabernet', 'Sauvignon Blanc', 'Chardonnay'] },
            { n: 'Sangría', p: 5000, d: 'Receta de la casa.' },
            { n: 'Cocktails', p: 5500, d: 'Margarita Picante, Margarita Tradicional o Vodka y Arándanos.', modal: 'sabor', flavors: ['Margarita Picante', 'Margarita Tradicional', 'Vodka y Arándanos'] },
            { n: 'Seltzer', p: 3500, d: 'Adán y Eva.', modal: 'sabor', flavors: ['Frutos rojos', 'Maracuyá'] },
            { n: 'Whisky Old Parr', p: 4000, d: 'Servido solo o en las rocas.' },
            { n: 'Cacique Botella Regular', p: 10000, d: 'Guaro nacional — botella.' },
            { n: 'Cacique Chiliguarro', p: 15000, d: 'Guaro nacional con receta chiliguarro.' }
          ]
        }
      ],
      chefTips: {
        tomato: "💡 Tip del Chef: Para esta receta italiana mediterránea, te recomendamos acompañarla con una fresca 'Ensalada' o añadir una 'Botella de Hot Sauce' si buscas un toque picante balanceado.",
        white: "💡 Tip del Chef: La cremosidad de la salsa blanca combina de forma excelente con el pan de ajo incluido, pero si deseas un contraste fresco, una porción de 'Ensalada' es el balance ideal.",
        sandwich: "💡 Tip del Chef: ¡Potencia tu sándwich! Un extra de 'Papas Fritas' dentro o al lado, combinado con 'Salsa de Nacho', eleva por completo la experiencia urbana de este plato.",
        omelette: "💡 Tip del Chef: Para un desayuno o brunch redondo, te sugerimos acompañar tu omelette con extras tradicionales como 'Patacones' o 'Frijoles Molidos'.",
        rice: "💡 Tip del Chef: Los arroces costeros brillan más cuando añades la textura crujiente de los 'Patacones' o el dulzor del 'Plátano Maduro'.",
        default: "💡 Tip del Chef: ¡Dale un toque especial a tu elección agregando 'Pico de Gallo' fresco o 'Plátano Maduro' para un balance dulce-salado perfecto!"
      },
      chooseFlavor: 'Elige tus sabores y cantidades:',
      chooseQtyLabel: '¿Cuántas unidades quieres?',
      chooseSide: 'Elige tu acompañamiento:',
      cevicheSides: ['Chips de Maíz', 'Patacones con Pico de Gallo'],
      chooseSoupBase: 'Elige la base de tu sopa:',
      soupBases: ['Base en Agua', 'Base en Crema'],
      chooseSides2: 'Selecciona exactamente 2 acompañamientos:',
      sideOptions: ['Arroz', 'Frijoles', 'Puré', 'Papas Fritas', 'Ensalada', 'Patacones', 'Vegetales'],
      chooseProteinLabel: 'Elige tu proteína (obligatorio):',
      proteinOptions: ['Cerdo', 'Pollo', 'Res', 'Pescado'],
      chooseSides4Label: 'Elige tus acompañamientos (hasta 4):',
      chooseSidesBreakfastLabel: 'Elige tus acompañamientos (obligatorio):',
      chooseEggStyleLabel: '¿Cómo quieres el huevo? (obligatorio)',
      eggStyles: ['Frito', 'Revuelto'],
      buffetSideOptions: ['Arroz', 'Frijoles', 'Tortillas Tostadas', 'Puré / Yuca / Vegetales'],
      addExtrasLabel: 'Añadir Extras (Opcional)',
      extrasPriceLabel: '— ₡2,500 / $5.00 c/u:',
      chefTipButton: 'Tip de Chef',
      chefTipHeader: 'Recomendación del Chef',
      confirmAddButton: 'Confirmar y Agregar al Carrito ✅',
      packingFeeNotice: 'Se cobra ₡500 por platillo empacado (o $1.00).'
    },
    testimonials: {
      title: 'Testimonios',
      googleReview: 'Dejar una reseña en Google',
      tripadvisorReview: 'Dejar una reseña en TripAdvisor',
      items: [
        { 
          name: 'Kevin', 
          photo: "/kevin review.png", 
          text: 'Nos detuvimos en Coco Víquez para almorzar antes de ir a Playa Buena... ¡Todo estuvo delicioso!' 
        },
        { 
          name: 'Jen Sharp Photo', 
          photo: "/Jen review.png", 
          text: 'Se veía adorable desde la carretera. Ambiente perfecto con una brisa encantadora y un servicio amable.' 
        },
        { 
          name: 'Keith Earl', 
          photo: "/Keith review.png", 
          text: '¡La comida fue excelente, los precios fueron geniales! Me encantó el ambiente informal al aire libre.' 
        },
        { 
          name: 'Agamb', 
          photo: "/Agamb Review.png", 
          text: '¡La mejor comida en Playa Hermosa! El servicio fue de primera y el ambiente es increíble.' 
        },
        { 
          name: 'Daniela', 
          photo: "/Daniela review.png", 
          text: 'Una joya escondida. Los sabores típicos de Costa Rica son auténticos y deliciosos.' 
        },
        { 
          name: 'Emily', 
          photo: "/Emily review.png", 
          text: 'Precios geniales y comida aún mejor. Nos encantó el ambiente al aire libre.' 
        },
        { 
          name: 'Roberto', 
          photo: "/Roberto review.png", 
          text: 'El lugar perfecto para una cena familiar. ¡Muy recomendado!' 
        }
      ]
    },
    services: {
      title: 'Nuestros Servicios Especiales',
      cta: 'Consultar por WhatsApp',
      reserveNote: '(Reserve con 50% de adelanto)',
      eventDate: 'Fecha del Evento:',
      peopleCount: 'Cantidad de Personas:',
      checkAvailability: 'Consultar Disponibilidad',
      requestQuote: 'Solicitar Cotización',
      waMessage: '¡Hola! Me gustaría consultar disponibilidad para {service} el día {date} para {people} personas.',
      emailSubject: 'Cotización: {service} - {date}',
      emailBody: 'Hola Sebastián, me gustaría solicitar una cotización para el servicio de {service} el día {date} para {people} personas. Quedo atento a su respuesta.',
      disclaimer: 'Sujeto a confirmación de disponibilidad por parte de la administración. Se requiere el 50% de adelanto para bloquear la fecha.',
      nameLabel: 'Nombre Completo',
      namePlaceholder: 'Tu nombre completo',
      emailLabel: 'Correo Electrónico',
      emailPlaceholder: 'ejemplo@correo.com',
      datePlaceholder: 'Selecciona una fecha...',
      backLabel: 'Volver',
      items: [
        { 
          id: 'catering',
          name: 'Catering Service', 
          desc: 'Servicio profesional para tus eventos con el sello de Coco Víquez.',
          icon: 'ChefHat'
        },
        { 
          id: 'parrilladas',
          name: 'Parrilladas', 
          desc: 'Disfruta de las mejores carnes asadas directamente en tu locación.',
          icon: 'Flame'
        },
        { 
          id: 'eventos',
          name: 'Eventos Privados', 
          desc: 'Celebra tus fechas especiales con nosotros. Reservación total disponible para bodas y eventos. Requiere anticipación mínima de 7 días hasta 3 meses.',
          icon: 'PartyPopper',
          cta: 'Consultar Disponibilidad'
        },
        { 
          id: 'chef',
          name: 'Chef Personal', 
          desc: 'Llevamos la alta cocina a la comodidad de tu casa para una experiencia privada.',
          icon: 'CookingPot'
        },
        { 
          id: 'clase',
          name: 'Clases de Cocina Típica', 
          desc: 'Aprende a hacer Tortillas, Gallo Pinto y Arroz con Pollo. Capacidad: 5 a 15 personas. Precio: $30 (15,000 colones) por persona. Reserva con el 50% de adelanto.',
          icon: 'CookingPot',
          cta: 'Reservar Clase'
        },
        { 
          id: 'fonda',
          name: 'Fonda masiva', 
          desc: 'Alimentación de calidad para proyectos de construcción y grupos grandes.',
          icon: 'Truck'
        },
        { 
          id: 'turismo',
          name: 'Turismo y Excursiones', 
          desc: 'Alimentación de calidad para grupos turísticos y excursiones. Menús prácticos y deliciosos para viajeros nacionales e internacionales.',
          icon: 'Bus',
          cta: 'Cotizar para Grupos'
        }
      ]
    }
  },
  en: {
    nav: {
      menu: 'Menu',
      about: 'About Us',
      services: 'Services',
      location: 'Location',
      galeria: 'Gallery',
      reserve: 'Book a Table',
      order: 'Order Takeaway'
    },
    hero: {
      line1: 'From our service, friendship is born',
      line2: 'Pura vida, vida pura',
      subtitle: 'A luxury dining experience in the heart of Playa Hermosa, Guanacaste.'
    },
    about: {
      title: 'Our Heritage',
      summary: 'Roots growing from Ciudad Quesada, San Carlos. After 23 years of struggle at their first restaurant La Pradera, Abraham Víquez leaves everything with his family to start Coco Víquez Restaurant in Playa Hermosa, during 13 years of effort alongside his wife Marjorie and sons Sebastián, Josué, Emmanuel, and those who today continue the legacy of excellence in every dish.',
      extended: '...they manage as a family to take a leap and acquire their own land in Playa Hermosa and build their own new Restaurant. This time larger, more modern and their own. Currently managed by its founder Abraham Víquez and his son Sebastián. It is located on national route 159 in front of the main entrance of Condovac and Villas Sol. Characterized by being the only 100% Costa Rican restaurant with its unique flavors and accessible prices for both foreigners and locals.',
      readMore: 'Read more',
      readLess: 'Read less',
      src: "/logo/logo.png",
      features: [
        { icon: 'ChefHat', text: 'Artisan Cuisine' },
        { icon: 'MapPin', text: 'Easy Access' },
        { icon: 'Heart', text: 'Family Legacy' }
      ]
    },
    menu: {
      title: 'Digital Menu',
      breakfast: 'Breakfast',
      main: 'Lunch & Dinner',
      snacks: 'Snacks',
      drinks: 'Drinks',
      items: {
        breakfast: [
          { name: 'Buffet Style', desc: 'You can include all our options in the buffet plus a drink: Coffee or a natural juice. NO EXTRA FOOD REFILL INCLUDED', price: 'Inquire' }
        ],
        main: [
          { name: 'Full Plate (Casado)', desc: 'Choose 1 protein (beef, fish, chicken, pork) + 4 sides (rice, beans, chips, salad) + natural juice.', price: '₡6,800' },
          { name: 'Tomato Sauce Pasta', desc: 'Includes garlic bread.', price: '₡6,500' },
          { name: 'White Sauce Pasta', desc: 'Includes garlic bread.', price: '₡8,000' },
          { name: 'Shrimp Pasta', desc: 'Includes garlic bread.', price: '₡8,000' },
          { name: 'Parrot Fish Ceviche', desc: 'Fresh and marinated.', price: '₡8,000' },
          { name: 'Shrimp Ceviche', desc: 'Fresh and marinated.', price: '₡8,000' },
          { name: 'Mixed Ceviche', desc: 'Fresh and marinated.', price: '₡8,500' },
          { name: 'Octopus Ceviche', desc: 'Fresh and marinated.', price: '₡9,000' },
          { name: 'Premium Ceviche', desc: 'The best seafood selection.', price: '₡10,000' },
          { name: 'Seafood Soup', desc: 'Traditional and hearty.', price: '₡8,000' },
          { name: 'Whole Red Snapper', desc: 'Fresh catch of the day.', price: '₡10,000' },
          { name: 'Shrimp Rice', desc: 'Seasoned rice with fresh seafood.', price: '₡8,000' },
          { name: 'Squid Rice', desc: 'Seasoned rice with fresh seafood.', price: '₡8,000' },
          { name: 'Octopus Rice', desc: 'Seasoned rice with fresh seafood.', price: '₡9,000' },
          { name: 'Chicken Rice', desc: 'The Costa Rican classic.', price: '₡6,500' },
          { name: 'Cantonese Rice', desc: 'Oriental style with a Tico touch.', price: '₡6,500' },
          { name: 'Cordon Blue', desc: 'Includes 2 sides.', price: '₡9,000' },
          { name: 'Chicken Fillet', desc: 'Includes 2 sides.', price: '₡8,500' },
          { name: 'Fish Fillet', desc: 'Includes 2 sides.', price: '₡8,500' },
          { name: 'Grill', desc: 'Includes 2 sides.', price: '₡8,000' },
          { name: 'House Steak', desc: 'Includes 2 sides.', price: '₡8,000' },
          { name: 'Milanesa', desc: 'Includes 2 sides.', price: '₡8,000' },
          { name: 'Carnitas', desc: 'Includes 2 sides.', price: '₡8,000' }
        ],
        snacks: [
          { name: 'French Fries', desc: 'Crispy fries.', price: '₡3,000' },
          { name: 'Chicken Fingers', desc: 'Served with fries.', price: '₡6,500' },
          { name: 'Fish Fingers', desc: 'Served with fries.', price: '₡6,500' },
          { name: 'Víquez Fries', desc: 'House specialty.', price: '₡6,500' },
          { name: 'Nachos', desc: 'With meat, cheese, and beans.', price: '₡6,500' },
          { name: 'Quesadilla', desc: 'Flour tortilla with melted cheese.', price: '₡6,500' },
          { name: 'Skewers', desc: 'Grilled meat skewers.', price: '₡9,000' },
          { name: 'Taco Tico', desc: 'Cabbage, meat, and sauces.', price: '₡6,000' },
          { name: 'Mexican Tacos', desc: 'Traditional style.', price: '₡8,000' },
          { name: 'Fish Tacos', desc: 'Fresh and crispy.', price: '₡9,000' },
          { name: 'Shrimp Tacos', desc: 'Fresh and crispy.', price: '₡9,000' },
          { name: '2 Chalupas', desc: 'Crispy tortilla with meat and salad.', price: '₡7,000' },
          { name: 'Burger with Fries', desc: 'Premium beef.', price: '₡6,000' },
          { name: 'Beef Steak Quesadilla', desc: 'With premium beef.', price: '₡7,500' }
        ],
        drinks: [
          { name: 'Water', desc: 'Bottled.', price: '₡1,500' },
          { name: 'Natural Juice', desc: 'Seasonal fruits.', price: '₡1,500' },
          { name: 'Sodas', desc: 'Variety of flavors.', price: '₡2,000' },
          { name: 'Regular Coffee', desc: 'Highland coffee.', price: '₡1,500' },
          { name: 'Cappuccino / Espresso / Latte', desc: 'Special preparations.', price: '₡3,500' },
          { name: 'National Beer', desc: 'Imperial or Pilsen.', price: '₡2,000' },
          { name: 'Bavaria Beer', desc: 'Premium national.', price: '₡3,500' },
          { name: 'Craft / International Beer', desc: 'Special selection.', price: '₡3,500' },
          { name: 'Glass of Wine', desc: 'Cabernet, Merlot, Chardonnay, Pinot Grigio, Rosé.', price: '₡4,000' },
          { name: 'Sangría', desc: 'House recipe.', price: '₡5,000' }
        ]
      }
    },
    reservation: {
      title: 'Book Your Table',
      desc: 'Book your table and let yourself be enveloped by the freshness of our natural environment in Playa Hermosa.',
      name: 'Full Name',
      email: 'Email',
      emailPlaceholder: 'you@email.com',
      date: 'Date',
      time: 'Time',
      guests: 'Guests',
      guestsHint: '8+ or large groups',
      send: 'Send Reservation',
      success: 'Reservation sent! (Simulated in console)',
      hours: 'Monday to Sunday: 7:00 AM - 9:00 PM',
      distributionLabel: 'Restaurant Layout',
      tableLegend: 'Table Layout',
      clickMapHint: 'Click the map to enlarge the view',
      minAdvanceNotice: 'RESERVATIONS REQUIRE A MINIMUM OF 72 HOURS NOTICE',
      guestsLabel: 'Number of Guests',
      allergiesLabel: 'Allergies or Special Notes (Optional)',
      allergiesPlaceholder: 'e.g., Shellfish allergy, vegetarian, birthday celebration...'
    },
    footer: {
      rights: '© 2026 Coco Viquez. All rights reserved.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Open in Google Maps'
    },
    cart: {
      title: 'YOUR ORDER',
      empty: 'Your cart is empty',
      backToMenu: 'Back to menu',
      orderSummary: 'Order Summary',
      itemTotal: 'Item Total',
      subtotal: 'Subtotal',
      shipping: 'Delivery',
      packingFee: 'Packing Fee',
      total: 'Final Total',
      deliveryDetails: 'Delivery Details',
      fullName: 'Full Name',
      fullNamePlaceholder: 'E.g: Sasha Calero',
      email: 'Email',
      emailPlaceholder: 'you@email.com',
      confirmEmail: 'Confirm Email',
      confirmEmailPlaceholder: 'Confirm your email',
      phone: 'Phone Number',
      address: 'Exact Address',
      addressPlaceholder: 'E.g: White house, across from the park, black gate...',
      deliveryZone: 'DELIVERY ZONE',
      viewDeliveryMap: 'View Delivery Map',
      locating: '⌛ Getting location...',
      locationSaved: '✅ Location Saved',
      shareLocation: 'SHARE MY LOCATION',
      selectPaymentMethod: 'Select Payment Method',
      card: 'Card',
      sinpe: 'SINPE',
      cash: 'CASH',
      payNow: 'PAY NOW',
      sendOrder: 'SEND ORDER',
      closeMapAria: 'Close delivery map',
      mapAlt: 'Delivery Zone Map',
      alertInvalidEmail: 'Please enter a valid email address.',
      alertEmailMismatch: 'The email addresses do not match.',
      alertInvalidPhone: 'Please enter a valid phone number for {country} ({format}).',
      alertInvalidName: 'Please enter your full name.',
      alertNoAddress: 'Please share your location or enter your exact address.',
      geoUnsupported: "Geolocation is not available in this browser or requires a secure HTTPS connection. Please try another modern browser or type your address manually in the 'EXACT ADDRESS' field.",
      geoError: "We couldn't get your GPS location. Please type your exact address below or paste your location link manually."
    },
    calendar: {
      weekDays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    foodMenu: {
      cartHint: 'You can adjust your order later in the cart',
      extras: ['Rice', 'Beans', 'Salad', 'Pico de Gallo', 'Corn Tortilla Chips', 'Soft Flour Tortilla', 'Patacones (Fried Plantain)', 'Sweet Plantain', 'Refried Beans', 'Guacamole', 'French Fries', 'Nacho Sauce', 'Bottle of Hot Sauce'],
      categories: [
        {
          cat: 'Breakfast', ico: '☀️',
          items: [
            { n: 'Sandwich (Beef/Chicken/Ham)', p: 6000, d: 'With cheese and protein of your choice 🥪', tip: 'sandwich' },
            {
              n: 'Traditional Breakfast',
              p: 6000,
              d: 'Includes coffee and fresh juice. Choose your sides:',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Eggs',
                'Baguette Toast',
                'Pancake',
                'Sweet Plantain',
                'Sour Cream',
                'Fresh Cheese',
                'Sausage'
              ]
            },
            { n: 'Omelette', p: 6000, d: 'Fresh ingredients 🍳', tip: 'omelette' }
          ]
        },
        {
          cat: 'Buffets', ico: '🍽️',
          items: [
            { n: 'Lunch/Dinner Buffet', p: 6000, d: 'Protein + 4 side dishes + Fresh juice 🥩', modal: 'buffet' },
            {
              n: 'Breakfast Buffet',
              p: 6000,
              d: 'Full options + Fresh drink or Coffee. Choose your sides:',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Eggs',
                'Baguette Toast',
                'Pancake',
                'Sweet Plantain',
                'Sour Cream',
                'Fresh Cheese',
                'Sausage'
              ]
            }
          ]
        },
        {
          cat: 'Pasta', ico: '🍝',
          items: [
            { n: 'Tomato Sauce Pasta', p: 6500, d: 'Vegetarian: With mushrooms, basil and parmesan cheese. Includes garlic bread 🌿', tip: 'tomato' },
            { n: 'White Sauce Pasta', p: 8000, d: 'Alfredo style: With mushrooms and chicken or ham. Includes garlic bread 🍗', tip: 'white' },
            { n: 'Shrimp Pasta', p: 8000, d: 'With white sauce and garlic. Includes garlic bread 🍤' },
            { n: 'Garlic Octopus Pasta', p: 8000, d: 'Fresh octopus in garlic sauce. Includes garlic bread 🐙' },
            { n: 'Garlic Shrimp Pasta', p: 8000, d: 'Garlic shrimp. Includes garlic bread 🍤' },
            { n: 'Shrimp and Octopus Pasta', p: 9000, d: 'Garlic seafood mix. Includes garlic bread 🐙🍤' }
          ]
        },
        {
          cat: 'Rice', ico: '🍚',
          items: [
            { n: 'Shrimp Rice', p: 8000, d: 'Classic with fresh shrimp 🍤', tip: 'rice' },
            { n: 'Chicken Rice', p: 6500, d: 'Traditional Costa Rican recipe 🥥', tip: 'rice' },
            { n: 'Cantonese Rice', p: 6500, d: 'Asian style with meats 🍚', tip: 'rice' },
            { n: 'Mixed Seafood Rice', p: 9000, d: 'Octopus, squid and shrimp 🥣', tip: 'rice' }
          ]
        },
        {
          cat: 'Seafood', ico: '🐟',
          items: [
            { n: 'Fish Ceviche (Parrotfish)', p: 8000, d: 'Prepared fresh on the spot. 🍋', modal: 'ceviche' },
            { n: 'Shrimp Ceviche', p: 8000, d: 'Fresh shrimp. 🍤', modal: 'ceviche' },
            { n: 'Mixed Ceviche', p: 8500, d: 'Fish and shrimp. 🐟🍤', modal: 'ceviche' },
            { n: 'Octopus Ceviche', p: 9000, d: 'Tender octopus. 🐙', modal: 'ceviche' },
            { n: 'Premium Ceviche', p: 10000, d: 'Parrotfish, Shrimp and Octopus. 🏆', modal: 'ceviche' },
            { n: 'Seafood Soup', p: 8000, d: 'Includes rice. 🥣', modal: 'sopa' },
            { n: 'Garlic Shrimp', p: 9000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Whole Fish (Red Snapper)', p: 10000, d: 'Fried. 🐟', modal: 'acompañamientos' },
            { n: 'Octopus Tacos', p: 8000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Octopus (Grilled or Garlic)', p: 9000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Breaded Shrimp', p: 8000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Shrimp Quesadilla', p: 7500, d: '🧀🍤' }
          ]
        },
        {
          cat: 'Snacks', ico: '🍟',
          items: [
            { n: 'Order of French Fries', p: 3000, d: 'Classic and crispy. 🍟' },
            { n: 'Fish or Chicken Fingers', p: 6500, d: 'Includes 2 side dishes of your choice. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Víquez Fries', p: 6500, d: 'Fries with shredded beef or chicken, pico de gallo and cheese. 🧀' },
            { n: 'Nachos', p: 6500, d: 'With refried beans, melted cheese and pico de gallo. 🧀' },
            { n: 'Quesadilla', p: 6500, d: 'Flour tortilla with melted cheese. 🧀' },
            { n: 'Pinchos - Skewers', p: 9000, d: 'Grilled meat and vegetable skewers. 🥩🍢' },
            { n: 'Taco Tico', p: 6000, d: 'Fried, filled with beef. Traditional style. 🇨🇷' },
            { n: 'Mexican Tacos', p: 8000, d: '3 soft tacos with beef, onion and cilantro. 🇲🇽' },
            { n: 'Fish or Shrimp Tacos', p: 9000, d: '2 tacos with side and special dressing. 🐟' },
            { n: '2 Chalupas', p: 7000, d: 'Fried tortilla with beans, beef, cabbage and sauces. 🌮' },
            { n: 'Burger with Fries (Cheeseburger)', p: 6000, d: 'Beef, cheese and french fries. 🍔' },
            { n: 'Regular Burger', p: 6000, d: 'Simple, with traditional flavor. 🍔' },
            { n: 'Chicken Burger', p: 6000, d: 'With breaded or grilled chicken fillet. 🍗' },
            { n: 'Beef Steak Quesadilla', p: 7500, d: 'Flour tortilla with grilled steak and cheese. 🥩' }
          ]
        },
        {
          cat: 'Specialties', ico: '🥩',
          items: [
            { n: 'Cordon Bleu', p: 8000, d: 'Breaded chicken stuffed with ham and cheese. Includes 2 side dishes. 🍗', modal: 'acompañamientos' },
            { n: 'Chicken / Fish Fillet', p: 8500, d: 'Grilled or garlic style. Includes 2 side dishes. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Grilled Beef or Chicken', p: 8000, d: 'Premium cut, chargrilled. Includes 2 side dishes. 🥩🔥', modal: 'acompañamientos' },
            { n: 'House Steak', p: 8000, d: 'Traditional house recipe. Includes 2 side dishes. 🥩', modal: 'acompañamientos' },
            { n: 'Chicken or Beef Milanese', p: 8000, d: 'Crispy breaded. Includes 2 side dishes. 🥩🍗', modal: 'acompañamientos' },
            { n: 'Carnitas', p: 8000, d: 'Grilled sautéed beef fajitas. Includes 2 side dishes. 🥩', modal: 'acompañamientos' },
            { n: 'Chifrijo', p: 8000, d: 'Layers of rice, tender beans, pork rinds and pico de gallo. (Ask for availability) 🥣' }
          ]
        },
        {
          cat: 'Drinks', ico: '🍹',
          items: [
            { tipo: 'header', n: 'SODAS & COFFEE ☕' },
            { n: '700ml Bottled Water', p: 2000, d: 'Purified water.' },
            { n: 'Fresh Juice of the Day', p: 2000, d: 'Natural juice made to order.' },
            { n: 'Sodas - Soft Drinks', p: 2000, d: 'Variety of flavors.', modal: 'sabor', flavors: ['Fanta Orange', 'Fanta Grape', 'Ginger Ale', 'Fanta Kolita', 'Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Monster', 'Tropical Peach', 'Tropical White', 'Pepsi', 'Pepsi Zero', 'Root Beer', 'Gatorade'] },
            { n: 'Mixed Smoothie', p: 4000, d: 'Natural fruit smoothies.', modal: 'sabor', flavors: ['Mango', 'Strawberry', 'Pineapple', 'Mixed'], bases: ['Water', 'Milk'], baseLabel: 'Choose base (required):' },
            { n: 'Special Britt Coffee', p: 3500, d: 'Cappuccino, Espresso, Latte or Iced Coffee.', modal: 'sabor', flavors: ['Cappuccino', 'Espresso', 'Latte', 'Iced Coffee'] },
            { tipo: 'header', n: 'BEERS 🍺' },
            { n: 'National Beer', p: 2000, d: 'Imperial (Light, Ultra, Silver) or Pilsen.', modal: 'sabor', flavors: ['Imperial', 'Imperial Light', 'Imperial Ultra', 'Imperial Silver', 'Pilsen'] },
            { n: 'Premium / Craft Beer', p: 3500, d: 'Bavaria, Heineken, Corona or Craft (IPA/Lager).', modal: 'sabor', flavors: ['Bavaria', 'Heineken', 'Corona', 'Craft IPA', 'Craft Lager'] },
            { tipo: 'header', n: 'WINES & SPIRITS 🍷' },
            { n: 'Selected Glass of Wine', p: 4000, d: 'Merlot, Cabernet, Sauvignon Blanc, Chardonnay.', modal: 'sabor', flavors: ['Merlot', 'Cabernet', 'Sauvignon Blanc', 'Chardonnay'] },
            { n: 'Sangria', p: 5000, d: 'House recipe.' },
            { n: 'Cocktails', p: 5500, d: 'Spicy Margarita, Traditional Margarita or Vodka and Cranberry.', modal: 'sabor', flavors: ['Spicy Margarita', 'Traditional Margarita', 'Vodka and Cranberry'] },
            { n: 'Seltzer', p: 3500, d: 'Adán y Eva.', modal: 'sabor', flavors: ['Adán y Eva'] },
            { n: 'Old Parr Whisky', p: 4000, d: 'Served neat or on the rocks.' },
            { n: 'Cacique Regular Bottle', p: 10000, d: 'National guaro — full bottle.' },
            { n: 'Cacique Chiliguarro', p: 15000, d: 'National guaro with chiliguarro recipe.' }
          ]
        }
      ],
      chefTips: {
        tomato: "💡 Chef's Tip: For this Italian Mediterranean recipe, we recommend pairing it with a fresh 'Salad' or adding a 'Bottle of Hot Sauce' for a balanced spicy kick.",
        white: "💡 Chef's Tip: The creaminess of the white sauce pairs excellently with the included garlic bread, but for a fresh contrast, a side of 'Salad' is the ideal balance.",
        sandwich: "💡 Chef's Tip: Power up your sandwich! An extra of 'French Fries' inside or on the side, combined with 'Nacho Sauce', completely elevates this dish's street-food experience.",
        omelette: "💡 Chef's Tip: For a well-rounded breakfast or brunch, we suggest pairing your omelette with traditional extras like 'Patacones' or 'Refried Beans'.",
        rice: "💡 Chef's Tip: Coastal rice dishes shine even more when you add the crunchy texture of 'Patacones' or the sweetness of 'Sweet Plantain'.",
        default: "💡 Chef's Tip: Give your choice a special touch by adding fresh 'Pico de Gallo' or 'Sweet Plantain' for a perfect sweet-savory balance!"
      },
      chooseFlavor: 'Choose your flavors and quantities:',
      chooseQtyLabel: 'How many units would you like?',
      chooseSide: 'Choose your side:',
      cevicheSides: ['Corn Chips', 'Patacones with Pico de Gallo'],
      chooseSoupBase: 'Choose your soup base:',
      soupBases: ['Water-Based', 'Cream-Based'],
      chooseSides2: 'Select exactly 2 side dishes:',
      sideOptions: ['Rice', 'Beans', 'Mashed Potatoes', 'French Fries', 'Salad', 'Patacones', 'Vegetables'],
      chooseProteinLabel: 'Choose your protein (required):',
      proteinOptions: ['Pork', 'Chicken', 'Beef', 'Fish'],
      chooseSides4Label: 'Choose your side dishes (up to 4):',
      chooseSidesBreakfastLabel: 'Choose your sides (required):',
      chooseEggStyleLabel: 'How would you like your eggs? (required)',
      eggStyles: ['Fried', 'Scrambled'],
      buffetSideOptions: ['Rice', 'Beans', 'Toasted Tortillas', 'Mashed Potatoes / Yuca / Vegetables'],
      addExtrasLabel: 'Add Extras (Optional)',
      extrasPriceLabel: '— ₡2,500 / $5.00 each:',
      chefTipButton: "Chef's Tip",
      chefTipHeader: "Chef's Recommendation",
      confirmAddButton: 'Confirm and Add to Cart ✅',
      packingFeeNotice: 'A packing fee of ₡500 (or $1.00) is charged per dish.'
    },
    testimonials: {
      title: 'Testimonials',
      googleReview: 'Leave a Google Review',
      tripadvisorReview: 'Leave a TripAdvisor Review',
      items: [
        { 
          name: 'Kevin', 
          photo: "/kevin review.png", 
          text: 'We stopped at Coco Viquez for lunch before we hit Playa Buena... Everything was delicious!' 
        },
        { 
          name: 'Jen Sharp Photo', 
          photo: "/Jen review.png", 
          text: 'It looked adorable from the road. Perfect atmosphere with a lovely breeze and friendly service.' 
        },
        { 
          name: 'Keith Earl', 
          photo: "/Keith review.png", 
          text: 'Food was excellent, prices were great! Loved the open air, casual atmosphere.' 
        },
        { 
          name: 'Agamb', 
          photo: "/Agamb Review.png", 
          text: 'Best food in Playa Hermosa! The service was top notch and the atmosphere is incredible.' 
        },
        { 
          name: 'Daniela', 
          photo: "/Daniela review.png", 
          text: 'A hidden gem. The typical Costa Rican flavors are authentic and delicious.' 
        },
        { 
          name: 'Emily', 
          photo: "/Emily review.png", 
          text: 'Great prices and even better food. We loved the open-air vibe.' 
        },
        { 
          name: 'Roberto', 
          photo: "/Roberto review.png", 
          text: 'The perfect spot for a family dinner. Highly recommended!' 
        }
      ]
    },
    services: {
      title: 'Our Special Services',
      cta: 'Inquire via WhatsApp',
      reserveNote: '(Reserve with 50% deposit)',
      eventDate: 'Event Date:',
      peopleCount: 'Number of People:',
      checkAvailability: 'Check Availability',
      requestQuote: 'Request Quote',
      waMessage: 'Hello! I would like to check availability for {service} on {date} for {people} people.',
      emailSubject: 'Quote: {service} - {date}',
      emailBody: 'Hello Sebastian, I would like to request a quote for the {service} service on {date} for {people} people. I look forward to your response.',
      disclaimer: 'Subject to availability confirmation by the administration. A 50% deposit is required to block the date.',
      nameLabel: 'Full Name',
      namePlaceholder: 'Your full name',
      emailLabel: 'Email',
      emailPlaceholder: 'example@email.com',
      datePlaceholder: 'Select a date...',
      backLabel: 'Back',
      items: [
        { 
          id: 'catering',
          name: 'Catering Service', 
          desc: 'Professional service for your events with the Coco Víquez seal.',
          icon: 'ChefHat'
        },
        { 
          id: 'parrilladas',
          name: 'Barbecues', 
          desc: 'Enjoy the best grilled meats directly at your location.',
          icon: 'Flame'
        },
        { 
          id: 'eventos',
          name: 'Private Events', 
          desc: 'Celebrate your special dates with us. Total reservation available for weddings and events. Requires minimum notice of 7 days up to 3 months.',
          icon: 'PartyPopper',
          cta: 'Check Availability'
        },
        { 
          id: 'chef',
          name: 'Personal Chef', 
          desc: 'We bring haute cuisine to the comfort of your home for a private experience.',
          icon: 'CookingPot'
        },
        { 
          id: 'clase',
          name: 'Typical Cooking Classes', 
          desc: 'Learn to make Tortillas, Gallo Pinto and Arroz with Chicken. Capacity: 5 to 15 people. Price: $30 (15,000 colones) per person. Reserve with 50% advance.',
          icon: 'CookingPot',
          cta: 'Reserve Class'
        },
        { 
          id: 'fonda',
          name: 'Massive Canteen', 
          desc: 'Quality food for construction projects and large groups.',
          icon: 'Truck'
        },
        { 
          id: 'turismo',
          name: 'Tourism & Excursions', 
          desc: 'Quality food for tourist groups and excursions. Practical and delicious menus for national and international travelers.',
          icon: 'Bus'
        }
      ]
    }
  },
  fr: {
    nav: {
      menu: 'Menu',
      about: 'À propos',
      services: 'Services',
      location: 'Emplacement',
      galeria: 'Galerie',
      reserve: 'Réserver',
      order: 'Commander'
    },
    hero: {
      line1: 'De notre service naît l\'amitié',
      line2: 'Pura vida, vida pura',
      subtitle: 'Une expérience gastronomique de luxe au cœur de Playa Hermosa, Guanacaste.'
    },
    about: {
      title: 'Notre Héritage',
      summary: 'Des racines qui poussent depuis Ciudad Quesada, San Carlos. Après 23 ans de lutte dans son premier restaurant La Pradera, Abraham Víquez quitte tout avec sa famille pour fonder le restaurant Coco Víquez à Playa Hermosa, pendant 13 ans d\'effort aux côtés de sa femme Marjorie et de ses fils Sebastián, Josué, Emmanuel et ceux qui continuent aujourd\'hui l\'héritage d\'excellence dans chaque plat.',
      extended: '...ils réussissent en famille à faire un saut et acquièrent leur propre terrain à Playa Hermosa et construisent leur propre nouveau restaurant. Cette fois plus grand, plus moderne et à eux. Actuellement géré par son fondateur Abraham Víquez et son fils Sebastián. Il est situé sur la route nationale 159 en face de l\'entrée principale de Condovac et Villas Sol. Caractérisé par le fait d\'être le seul restaurant 100 % costaricien avec ses saveurs uniques et ses prix accessibles tant pour les étrangers que pour les locaux.',
      readMore: 'Lire la suite',
      readLess: 'Lire moins',
      tag: 'Beach Luxury Dining',
      src: "/logo/logo.png",
      features: [
        { icon: 'ChefHat', text: 'Cuisine Artisanale' },
        { icon: 'MapPin', text: 'Facile d’Accès' },
        { icon: 'Heart', text: 'Héritage Familial' }
      ]
    },
    menu: {
      title: 'Menu Numérique',
      breakfast: 'Petit-déjeuner',
      main: 'Déjeuner & Dîner',
      snacks: 'Snacks',
      drinks: 'Boissons',
      items: {
        breakfast: [
          { name: 'Style Buffet', desc: 'Vous pouvez inclure toutes nos options dans le buffet plus une boisson : café ou jus naturel. NE COMPREND PAS DE RECHARGE DE NOURRITURE SUPPLÉMENTAIRE', price: 'Consulter' }
        ],
        main: [
          { name: 'Assiette Complète (Casado)', desc: 'Choisissez 1 protéine (bœuf, poisson, poulet, porc) + 4 accompagnements (riz, haricots, chips, salade) + jus naturel.', price: '₡6,800' },
          { name: 'Pâtes Sauce Tomate', desc: 'Comprend du pain à l\'ail.', price: '₡6,500' },
          { name: 'Pâtes Sauce Blanche', desc: 'Comprend du pain à l\'ail.', price: '₡8,000' },
          { name: 'Pâtes aux Crevettes', desc: 'Comprend du pain à l\'ail.', price: '₡8,000' },
          { name: 'Ceviche Loro', desc: 'Frais et mariné.', price: '₡8,000' },
          { name: 'Ceviche de Crevettes', desc: 'Frais et mariné.', price: '₡8,000' },
          { name: 'Ceviche Mixte', desc: 'Frais et mariné.', price: '₡8,500' },
          { name: 'Ceviche de Poulpe', desc: 'Frais et mariné.', price: '₡9,000' },
          { name: 'Ceviche Premium', desc: 'La meilleure sélection de fruits de mer.', price: '₡10,000' },
          { name: 'Soupe de Fruits de Mer', desc: 'Traditionnelle et copieuse.', price: '₡8,000' },
          { name: 'Poisson Entier (Vivaneau Rouge)', desc: 'Pêche fraîche du jour.', price: '₡10,000' },
          { name: 'Riz aux Crevettes', desc: 'Riz préparé avec des fruits de mer frais.', price: '₡8,000' },
          { name: 'Riz aux Calamars', desc: 'Riz préparé avec des fruits de mer frais.', price: '₡8,000' },
          { name: 'Riz au Poulpe', desc: 'Riz préparé avec des fruits de mer frais.', price: '₡9,000' },
          { name: 'Riz au Poulet', desc: 'Le classique costaricien.', price: '₡6,500' },
          { name: 'Riz Cantonais', desc: 'Style oriental avec une touche tica.', price: '₡6,500' },
          { name: 'Cordon Bleu', desc: 'Comprend 2 accompagnements.', price: '₡9,000' },
          { name: 'Filet de Poulet', desc: 'Comprend 2 accompagnements.', price: '₡8,500' },
          { name: 'Filet de Poisson', desc: 'Comprend 2 accompagnements.', price: '₡8,500' },
          { name: 'Grillade', desc: 'Comprend 2 accompagnements.', price: '₡8,000' },
          { name: 'Bifteck de la Maison', desc: 'Comprend 2 accompagnements.', price: '₡8,000' },
          { name: 'Milanaise', desc: 'Comprend 2 accompagnements.', price: '₡8,000' },
          { name: 'Carnitas', desc: 'Comprend 2 accompagnements.', price: '₡8,000' }
        ],
        snacks: [
          { name: 'Portion de Frites', desc: 'Frites croustillantes.', price: '₡3,000' },
          { name: 'Bâtonnets de Poulet', desc: 'Accompagnés de frites.', price: '₡6,500' },
          { name: 'Bâtonnets de Poisson', desc: 'Accompagnés de frites.', price: '₡6,500' },
          { name: 'Frites Víquez', desc: 'Spécialité de la maison.', price: '₡6,500' },
          { name: 'Nachos', desc: 'Avec viande, fromage et haricots.', price: '₡6,500' },
          { name: 'Quesadilla', desc: 'Tortille de farine avec fromage fondu.', price: '₡6,500' },
          { name: 'Brochettes', desc: 'Brochettes de viande grillée.', price: '₡9,000' },
          { name: 'Taco Tico', desc: 'Chou, viande et sauces.', price: '₡6,000' },
          { name: 'Tacos Mexicains', desc: 'Style traditionnel.', price: '₡8,000' },
          { name: 'Tacos de Poisson', desc: 'Frais et croustillant.', price: '₡9,000' },
          { name: 'Tacos de Crevettes', desc: 'Frais et croustillant.', price: '₡9,000' },
          { name: '2 Chalupas', desc: 'Tortille croustillante avec viande et salade.', price: '₡7,000' },
          { name: 'Burger avec Frites', desc: 'Bœuf premium.', price: '₡6,000' },
          { name: 'Quesadilla au Bœuf', desc: 'Avec bœuf premium.', price: '₡7,500' }
        ],
        drinks: [
          { name: 'Eau', desc: 'En bouteille.', price: '₡1,500' },
          { name: 'Jus Naturel', desc: 'Fruits de saison.', price: '₡1,500' },
          { name: 'Sodas', desc: 'Variété de saveurs.', price: '₡2,000' },
          { name: 'Café Régulier', desc: 'Café d\'altitude.', price: '₡1,500' },
          { name: 'Cappuccino / Espresso / Latte', desc: 'Préparations spéciales.', price: '₡3,500' },
          { name: 'Bière Nationale', desc: 'Imperial ou Pilsen.', price: '₡2,000' },
          { name: 'Bière Bavaria', desc: 'Premium nationale.', price: '₡3,500' },
          { name: 'Bière Artisanale / Internationale', desc: 'Sélection spéciale.', price: '₡3,500' },
          { name: 'Verre de Vin', desc: 'Cabernet, Merlot, Chardonnay, Pinot Grigio, Rosé.', price: '₡4,000' },
          { name: 'Sangria', desc: 'Recette de la maison.', price: '₡5,000' }
        ]
      }
    },
    reservation: {
      title: 'Réservez votre Table',
      desc: 'Réservez votre table et laissez-vous envelopper par la fraîcheur de notre environnement naturel à Playa Hermosa.',
      name: 'Nom Complet',
      email: 'E-mail',
      emailPlaceholder: 'vous@email.com',
      date: 'Date',
      time: 'Heure',
      guests: 'Personnes',
      guestsHint: '8+ ou grands groupes',
      send: 'Envoyer la Réservation',
      success: 'Réservation envoyée ! (Simulé en console)',
      hours: 'Lundi à Dimanche : 7h00 - 21h00',
      distributionLabel: 'Plan du Restaurant',
      tableLegend: 'Plan des Tables',
      clickMapHint: 'Cliquez sur la carte pour agrandir la vue',
      minAdvanceNotice: 'LES RÉSERVATIONS NÉCESSITENT UN PRÉAVIS MINIMUM DE 72 HEURES',
      guestsLabel: 'Nombre de Personnes',
      allergiesLabel: 'Allergies ou Notes Spéciales (Optionnel)',
      allergiesPlaceholder: 'Ex : Allergie aux fruits de mer, végétarien, célébration d\'anniversaire...'
    },
    footer: {
      rights: '© 2026 Coco Viquez. Tous droits réservés.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Ouvrir dans Google Maps'
    },
    cart: {
      title: 'VOTRE COMMANDE',
      empty: 'Votre panier est vide',
      backToMenu: 'Retour au menu',
      orderSummary: 'Résumé de la Commande',
      itemTotal: 'Total Article',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      packingFee: 'Frais d\'Emballage',
      total: 'Total Final',
      deliveryDetails: 'Détails de Livraison',
      fullName: 'Nom Complet',
      fullNamePlaceholder: 'Ex : Sasha Calero',
      email: 'E-mail',
      emailPlaceholder: 'vous@email.com',
      confirmEmail: "Confirmer l'E-mail",
      confirmEmailPlaceholder: 'Confirmez votre e-mail',
      phone: 'Numéro de Téléphone',
      address: 'Adresse Exacte',
      addressPlaceholder: 'Ex : Maison blanche, en face du parc, portail noir...',
      deliveryZone: 'ZONE DE LIVRAISON',
      viewDeliveryMap: 'Voir la Carte de Livraison',
      locating: '⌛ Localisation en cours...',
      locationSaved: '✅ Position Enregistrée',
      shareLocation: 'PARTAGER MA POSITION',
      selectPaymentMethod: 'Choisissez un Mode de Paiement',
      card: 'Carte',
      sinpe: 'SINPE',
      cash: 'ESPÈCES',
      payNow: 'PAYER MAINTENANT',
      sendOrder: 'ENVOYER LA COMMANDE',
      closeMapAria: 'Fermer la carte de livraison',
      mapAlt: 'Carte des Zones de Livraison',
      alertInvalidEmail: 'Veuillez saisir une adresse e-mail valide.',
      alertEmailMismatch: 'Les adresses e-mail ne correspondent pas.',
      alertInvalidPhone: 'Veuillez saisir un numéro de téléphone valide pour {country} ({format}).',
      alertInvalidName: 'Veuillez saisir votre nom complet.',
      alertNoAddress: 'Veuillez partager votre position ou saisir votre adresse exacte.',
      geoUnsupported: "La géolocalisation n'est pas disponible sur ce navigateur ou nécessite une connexion HTTPS sécurisée. Veuillez essayer un autre navigateur moderne ou saisir votre adresse manuellement dans le champ 'ADRESSE EXACTE'.",
      geoError: "Nous n'avons pas pu obtenir votre position GPS. Veuillez saisir votre adresse exacte ci-dessous ou coller le lien de votre position manuellement."
    },
    calendar: {
      weekDays: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    },
    foodMenu: {
      cartHint: 'Vous pourrez ajuster votre commande plus tard dans le panier',
      extras: ['Riz', 'Haricots', 'Salade', 'Pico de Gallo', 'Chips de Tortilla de Maïs', 'Tortilla Souple de Blé', 'Patacones (Banane Plantain Frite)', 'Banane Plantain Sucrée', 'Haricots Frits', 'Guacamole', 'Frites', 'Sauce Nacho', 'Bouteille de Sauce Piquante'],
      categories: [
        {
          cat: 'Petits-déjeuners', ico: '☀️',
          items: [
            { n: 'Sandwich (Bœuf/Poulet/Jambon)', p: 6000, d: 'Avec fromage et protéine au choix 🥪', tip: 'sandwich' },
            {
              n: 'Petit-déjeuner Typique',
              p: 6000,
              d: 'Inclut café et jus naturel. Choisissez vos accompagnements :',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Œufs',
                'Toast Baguette',
                'Pancake',
                'Banane Plantain Sucrée',
                'Crème Aigre',
                'Fromage Frais',
                'Saucisse'
              ]
            },
            { n: 'Omelette', p: 6000, d: 'Ingrédients frais 🍳', tip: 'omelette' }
          ]
        },
        {
          cat: 'Buffets', ico: '🍽️',
          items: [
            { n: 'Buffet Déjeuner/Dîner', p: 6000, d: 'Protéine + 4 accompagnements + Jus naturel 🥩', modal: 'buffet' },
            {
              n: 'Buffet Petit-déjeuner',
              p: 6000,
              d: 'Options complètes + Boisson naturelle ou Café. Choisissez vos accompagnements :',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Œufs',
                'Toast Baguette',
                'Pancake',
                'Banane Plantain Sucrée',
                'Crème Aigre',
                'Fromage Frais',
                'Saucisse'
              ]
            }
          ]
        },
        {
          cat: 'Pâtes', ico: '🍝',
          items: [
            { n: 'Pâtes Sauce Tomate', p: 6500, d: "Végétarien : Avec champignons, basilic et parmesan. Inclut du pain à l'ail 🌿", tip: 'tomato' },
            { n: 'Pâtes Sauce Blanche', p: 8000, d: "Style Alfredo : Avec champignons et poulet ou jambon. Inclut du pain à l'ail 🍗", tip: 'white' },
            { n: 'Pâtes aux Crevettes', p: 8000, d: "Avec sauce blanche et ail. Inclut du pain à l'ail 🍤" },
            { n: "Pâtes à l'Ail au Poulpe", p: 8000, d: "Poulpe frais à l'ail. Inclut du pain à l'ail 🐙" },
            { n: "Pâtes à l'Ail aux Crevettes", p: 8000, d: "Crevettes à l'ail. Inclut du pain à l'ail 🍤" },
            { n: 'Pâtes Crevettes et Poulpe', p: 9000, d: "Mélange de fruits de mer à l'ail. Inclut du pain à l'ail 🐙🍤" }
          ]
        },
        {
          cat: 'Riz', ico: '🍚',
          items: [
            { n: 'Riz aux Crevettes', p: 8000, d: 'Classique aux crevettes fraîches 🍤', tip: 'rice' },
            { n: 'Riz au Poulet', p: 6500, d: 'Recette traditionnelle costaricienne 🥥', tip: 'rice' },
            { n: 'Riz Cantonais', p: 6500, d: 'Style asiatique avec viandes 🍚', tip: 'rice' },
            { n: 'Riz Mixte aux Fruits de Mer', p: 9000, d: 'Poulpe, calmar et crevette 🥣', tip: 'rice' }
          ]
        },
        {
          cat: 'Fruits de mer', ico: '🐟',
          items: [
            { n: 'Ceviche de Poisson (Poisson-perroquet)', p: 8000, d: 'Préparé sur place à la minute. 🍋', modal: 'ceviche' },
            { n: 'Ceviche de Crevettes', p: 8000, d: 'Crevettes fraîches. 🍤', modal: 'ceviche' },
            { n: 'Ceviche Mixte', p: 8500, d: 'Poisson et crevette. 🐟🍤', modal: 'ceviche' },
            { n: 'Ceviche de Poulpe', p: 9000, d: 'Poulpe tendre. 🐙', modal: 'ceviche' },
            { n: 'Ceviche Premium', p: 10000, d: 'Poisson-perroquet, Crevette et Poulpe. 🏆', modal: 'ceviche' },
            { n: 'Soupe de Fruits de Mer', p: 8000, d: 'Inclut du riz. 🥣', modal: 'sopa' },
            { n: "Crevettes à l'Ail", p: 9000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Poisson Entier (Vivaneau Rouge)', p: 10000, d: 'Frit. 🐟', modal: 'acompañamientos' },
            { n: 'Tacos au Poulpe', p: 8000, d: '🐙', modal: 'acompañamientos' },
            { n: "Poulpe (Grillé ou à l'Ail)", p: 9000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Crevettes Panées', p: 8000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Quesadilla aux Crevettes', p: 7500, d: '🧀🍤' }
          ]
        },
        {
          cat: 'Snacks', ico: '🍟',
          items: [
            { n: 'Portion de Frites', p: 3000, d: 'Classiques et croustillantes. 🍟' },
            { n: 'Bâtonnets de Poisson ou Poulet', p: 6500, d: 'Inclut 2 accompagnements au choix. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Víquez Fries', p: 6500, d: 'Frites avec bœuf ou poulet effiloché, pico de gallo et fromage. 🧀' },
            { n: 'Nachos', p: 6500, d: 'Avec haricots frits, fromage fondu et pico de gallo. 🧀' },
            { n: 'Quesadilla', p: 6500, d: 'Tortilla de blé avec fromage fondu. 🧀' },
            { n: 'Pinchos - Brochettes', p: 9000, d: 'Brochettes de viande et légumes grillés. 🥩🍢' },
            { n: 'Taco Tico', p: 6000, d: 'Frit, farci de bœuf. Style traditionnel. 🇨🇷' },
            { n: 'Tacos Mexicains', p: 8000, d: '3 tacos souples avec bœuf, oignon et coriandre. 🇲🇽' },
            { n: 'Tacos au Poisson ou Crevette', p: 9000, d: '2 tacos avec accompagnement et sauce spéciale. 🐟' },
            { n: '2 Chalupas', p: 7000, d: 'Tortilla frite avec haricots, bœuf, chou et sauces. 🌮' },
            { n: 'Burger avec Frites (Cheeseburger)', p: 6000, d: 'Bœuf, fromage et frites. 🍔' },
            { n: 'Burger Classique', p: 6000, d: 'Simple, au goût traditionnel. 🍔' },
            { n: 'Burger au Poulet', p: 6000, d: 'Avec filet de poulet pané ou grillé. 🍗' },
            { n: 'Quesadilla au Bœuf', p: 7500, d: 'Tortilla de blé avec steak grillé et fromage. 🥩' }
          ]
        },
        {
          cat: 'Spécialités', ico: '🥩',
          items: [
            { n: 'Cordon Bleu', p: 8000, d: 'Poulet pané farci au jambon et fromage. Inclut 2 accompagnements. 🍗', modal: 'acompañamientos' },
            { n: 'Filet de Poulet / Poisson', p: 8500, d: "Grillé ou à l'ail. Inclut 2 accompagnements. 🐟🍗", modal: 'acompañamientos' },
            { n: 'Bœuf ou Poulet Grillé', p: 8000, d: 'Coupe premium au feu de bois. Inclut 2 accompagnements. 🥩🔥', modal: 'acompañamientos' },
            { n: 'Steak Maison', p: 8000, d: 'Recette traditionnelle de la maison. Inclut 2 accompagnements. 🥩', modal: 'acompañamientos' },
            { n: 'Milanaise de Poulet ou Bœuf', p: 8000, d: 'Panure croustillante. Inclut 2 accompagnements. 🥩🍗', modal: 'acompañamientos' },
            { n: 'Carnitas', p: 8000, d: 'Fajitas de bœuf sautées à la grillade. Inclut 2 accompagnements. 🥩', modal: 'acompañamientos' },
            { n: 'Chifrijo', p: 8000, d: 'Couches de riz, haricots tendres, couenne de porc et pico de gallo. (Demander la disponibilité) 🥣' }
          ]
        },
        {
          cat: 'Boissons', ico: '🍹',
          items: [
            { tipo: 'header', n: 'BOISSONS ET CAFÉ ☕' },
            { n: "Bouteille d'Eau 700ml", p: 2000, d: 'Eau purifiée.' },
            { n: 'Jus Frais du Jour', p: 2000, d: 'Jus naturel préparé à la commande.' },
            { n: 'Sodas - Boissons Gazeuses', p: 2000, d: 'Variété de saveurs.', modal: 'sabor', flavors: ['Fanta Orange', 'Fanta Raisin', 'Ginger Ale', 'Fanta Kolita', 'Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Monster', 'Tropical Pêche', 'Tropical Blanc', 'Pepsi', 'Pepsi Zero', 'Root Beer', 'Gatorade'] },
            { n: 'Smoothie Mixte', p: 4000, d: 'Smoothies aux fruits naturels.', modal: 'sabor', flavors: ['Mangue', 'Fraise', 'Ananas', 'Mixte'], bases: ['Eau', 'Lait'], baseLabel: 'Choisissez la base (obligatoire) :' },
            { n: 'Café Britt Spécial', p: 3500, d: 'Cappuccino, Espresso, Latte ou Café Glacé.', modal: 'sabor', flavors: ['Cappuccino', 'Espresso', 'Latte', 'Café Glacé'] },
            { tipo: 'header', n: 'BIÈRES 🍺' },
            { n: 'Bière Nationale', p: 2000, d: 'Imperial (Light, Ultra, Silver) ou Pilsen.', modal: 'sabor', flavors: ['Imperial', 'Imperial Light', 'Imperial Ultra', 'Imperial Silver', 'Pilsen'] },
            { n: 'Bière Premium / Artisanale', p: 3500, d: 'Bavaria, Heineken, Corona ou Artisanale (IPA/Lager).', modal: 'sabor', flavors: ['Bavaria', 'Heineken', 'Corona', 'Artisanale IPA', 'Artisanale Lager'] },
            { tipo: 'header', n: 'VINS ET SPIRITUEUX 🍷' },
            { n: 'Verre de Vin Sélectionné', p: 4000, d: 'Merlot, Cabernet, Sauvignon Blanc, Chardonnay.', modal: 'sabor', flavors: ['Merlot', 'Cabernet', 'Sauvignon Blanc', 'Chardonnay'] },
            { n: 'Sangria', p: 5000, d: 'Recette maison.' },
            { n: 'Cocktails', p: 5500, d: 'Margarita Épicée, Margarita Traditionnelle ou Vodka et Canneberge.', modal: 'sabor', flavors: ['Margarita Épicée', 'Margarita Traditionnelle', 'Vodka et Canneberge'] },
            { n: 'Seltzer', p: 3500, d: 'Adán y Eva.', modal: 'sabor', flavors: ['Adán y Eva'] },
            { n: 'Whisky Old Parr', p: 4000, d: 'Servi sec ou avec glaçons.' },
            { n: 'Cacique Bouteille Régulière', p: 10000, d: 'Guaro national — bouteille.' },
            { n: 'Cacique Chiliguarro', p: 15000, d: 'Guaro national avec recette chiliguarro.' }
          ]
        }
      ],
      chefTips: {
        tomato: "💡 Astuce du Chef : Pour cette recette italienne méditerranéenne, accompagnez-la d'une 'Salade' fraîche ou ajoutez une 'Bouteille de Sauce Piquante' pour une touche épicée équilibrée.",
        white: "💡 Astuce du Chef : L'onctuosité de la sauce blanche se marie parfaitement avec le pain à l'ail inclus, mais pour un contraste frais, une portion de 'Salade' est l'équilibre idéal.",
        sandwich: "💡 Astuce du Chef : Boostez votre sandwich ! Un extra de 'Frites' à l'intérieur ou à côté, combiné à la 'Sauce Nacho', sublime complètement l'expérience urbaine de ce plat.",
        omelette: "💡 Astuce du Chef : Pour un petit-déjeuner ou brunch complet, accompagnez votre omelette d'extras traditionnels comme les 'Patacones' ou les 'Haricots Frits'.",
        rice: "💡 Astuce du Chef : Les riz côtiers brillent encore plus avec la texture croustillante des 'Patacones' ou la douceur de la 'Banane Plantain Sucrée'.",
        default: "💡 Astuce du Chef : Donnez une touche spéciale à votre choix en ajoutant du 'Pico de Gallo' frais ou de la 'Banane Plantain Sucrée' pour un équilibre sucré-salé parfait !"
      },
      chooseFlavor: 'Choisissez vos saveurs et quantités :',
      chooseQtyLabel: 'Combien d\'unités voulez-vous ?',
      chooseSide: 'Choisissez votre accompagnement :',
      cevicheSides: ['Chips de Maïs', 'Patacones avec Pico de Gallo'],
      chooseSoupBase: 'Choisissez la base de votre soupe :',
      soupBases: ['Base à l\'Eau', 'Base à la Crème'],
      chooseSides2: 'Sélectionnez exactement 2 accompagnements :',
      sideOptions: ['Riz', 'Haricots', 'Purée', 'Frites', 'Salade', 'Patacones', 'Légumes'],
      chooseProteinLabel: 'Choisissez votre protéine (obligatoire) :',
      proteinOptions: ['Porc', 'Poulet', 'Bœuf', 'Poisson'],
      chooseSides4Label: 'Choisissez vos accompagnements (jusqu\'à 4) :',
      chooseSidesBreakfastLabel: 'Choisissez vos accompagnements (obligatoire) :',
      chooseEggStyleLabel: 'Comment voulez-vous les œufs ? (obligatoire)',
      eggStyles: ['Frits', 'Brouillés'],
      buffetSideOptions: ['Riz', 'Haricots', 'Tortillas Grillées', 'Purée / Yuca / Légumes'],
      addExtrasLabel: 'Ajouter des Extras (Optionnel)',
      extrasPriceLabel: '— ₡2 500 / 5,00 $ chacun :',
      chefTipButton: 'Astuce du Chef',
      chefTipHeader: 'Recommandation du Chef',
      confirmAddButton: 'Confirmer et Ajouter au Panier ✅',
      packingFeeNotice: 'Frais d\'emballage de ₡500 (ou $1.00) par plat.'
    },
    testimonials: {
      title: 'Témoignages',
      googleReview: 'Laisser un avis sur Google',
      tripadvisorReview: 'Laisser un avis sur TripAdvisor',
      items: [
        { name: 'Kevin', photo: "/kevin review.png", text: 'Nous nous sommes arrêtés chez Coco Víquez pour déjeuner avant d\'aller à Playa Buena... Tout était délicieux !' },
        { name: 'Jen Sharp Photo', photo: "/Jen review.png", text: 'C\'était adorable depuis la route. Ambiance parfaite avec une brise charmante et un service amical.' },
        { name: 'Keith Earl', photo: "/Keith review.png", text: 'La nourriture était excellente, les prix étaient super ! J\'ai adoré l\'ambiance décontractée en plein air.' },
        { name: 'Agamb', photo: "/Agamb Review.png", text: 'La meilleure nourriture à Playa Hermosa ! Le service était de premier ordre et l\'ambiance est incroyable.' },
        { name: 'Daniela', photo: "/Daniela review.png", text: 'Un joyau caché. Les saveurs typiques du Costa Rica sont authentiques et délicieuses.' },
        { name: 'Emily', photo: "/Emily review.png", text: 'Super prix et nourriture encore meilleure. Nous avons adoré l\'ambiance en plein air.' },
        { name: 'Roberto', photo: "/Roberto review.png", text: 'L\'endroit parfait pour un dîner en famille. Très recommandé !' }
      ]
    },
    services: {
      title: 'Nos Services Spéciaux',
      cta: 'Consulter par WhatsApp',
      reserveNote: '(Réservez avec un acompte de 50%)',
      eventDate: 'Date de l\'événement :',
      peopleCount: 'Nombre de personnes :',
      checkAvailability: 'Vérifier la Disponibilité',
      requestQuote: 'Demander un Devis',
      waMessage: 'Bonjour, Sebastián Víquez ! Je souhaite demander une réservation pour le service {service} le {date} pour un groupe de {people} personnes. Pourriez-vous me confirmer si vous avez de la disponibilité pour cette date ? Je suis prêt à procéder à l\'acompte de 50 %.',
      emailSubject: 'Demande de Réservation : {service}',
      emailBody: 'Bonjour Sebastián, je me renseigne sur la disponibilité du service {service} le {date} pour {people} personnes. Veuillez me confirmer la disponibilité pour effectuer l\'acompte de 50 %.',
      disclaimer: 'Sous réserve de confirmation de disponibilité par l\'administration. Un acompte de 50 % est requis pour bloquer la date.',
      nameLabel: 'Nom Complet',
      namePlaceholder: 'Votre nom complet',
      emailLabel: 'E-mail',
      emailPlaceholder: 'exemple@email.com',
      datePlaceholder: 'Sélectionnez une date...',
      backLabel: 'Retour',
      items: [
        { id: 'catering', name: 'Service Traiteur', desc: 'Service professionnel pour vos événements avec le sceau de Coco Víquez.', icon: 'ChefHat' },
        { id: 'parrilladas', name: 'Grillades', desc: 'Profitez des meilleures viandes grillées directement sur votre lieu.', icon: 'Flame' },
        { id: 'chef', name: 'Chef Personnel', desc: 'Nous apportons la haute cuisine dans le confort de votre maison pour une expérience privée.', icon: 'CookingPot' },
        { 
          id: 'clase',
          name: 'Cours de Cuisine Typique', 
          desc: 'Apprenez à faire des Tortillas, Gallo Pinto et Arroz con Pollo. Capacité : 5 à 15 personnes. Prix : 30 $ ou 15 000 colones. Réservez avec un acompte de 50%',
          icon: 'CookingPot',
          cta: 'Réserver un Cours'
        },
        { id: 'fonda', name: 'Cantine Massive', desc: 'Alimentation de qualité pour les projets de construction et les grands groupes.', icon: 'Truck' },
        { id: 'eventos', name: 'Événements Privés', desc: 'Célébrez vos dates spéciales avec nous. Réservation totale disponible pour les mariages et événements. Nécessite un préavis minimum de 7 jours à 3 mois.', icon: 'PartyPopper', cta: 'Consulter la Disponibilité' },
        { id: 'turismo', name: 'Tourisme et Excursions', desc: 'Alimentation de qualité pour les groupes touristiques et les excursions. Menus pratiques et délicieux pour les voyageurs nationaux et internationaux.', icon: 'Bus', cta: 'Devis pour Groupes' }
      ]
    }
  },
  de: {
    nav: {
      menu: 'Menü',
      about: 'Über uns',
      services: 'Services',
      location: 'Standort',
      galeria: 'Galerie',
      reserve: 'Reservieren',
      order: 'Bestellen'
    },
    hero: {
      line1: 'Aus unserem Service entsteht Freundschaft',
      line2: 'Pura vida, vida pura',
      subtitle: 'Ein luxuriöses gastronomisches Erlebnis im Herzen von Playa Hermosa, Guanacaste.'
    },
    about: {
      title: 'Unser Erbe',
      summary: 'Wurzeln, die in Ciudad Quesada, San Carlos, wachsen. Nach 23 Jahren Kampf in seinem ersten Restaurant La Pradera verlässt Abraham Víquez mit seiner Familie alles, um das Restaurant Coco Víquez in Playa Hermosa zu gründen, während 13 Jahren Anstrengung an der Seite seiner Frau Marjorie und seiner Söhne Sebastián, Josué, Emmanuel und die heute das Erbe der Exzellenz in jedem Gericht fortsetzen.',
      extended: '...es gelingt ihnen als Familie, einen Sprung zu machen und ihr eigenes Grundstück in Playa Hermosa zu erwerben und ihr eigenes neues Restaurant zu bauen. Diesmal größer, moderner und eigenständig. Derzeit von seinem Gründer Abraham Víquez und seinem Sohn Sebastián geführt. Es befindet sich an der Nationalstraße 159 gegenüber dem Haupteingang von Condovac und Villas Sol. Es zeichnet sich dadurch aus, dass es das einzige 100 % costa-ricanische Restaurant mit seinen einzigartigen Aromen und erschwinglichen Preisen sowohl für Ausländer als auch für Einheimische ist.',
      readMore: 'Weiterlesen',
      readLess: 'Weniger lesen',
      tag: 'Beach Luxury Dining',
      src: "/logo/logo.png",
      features: [
        { icon: 'ChefHat', text: 'Handwerkliche Küche' },
        { icon: 'MapPin', text: 'Leichter Zugang' },
        { icon: 'Heart', text: 'Familienerebe' }
      ]
    },
    menu: {
      title: 'Digitales Menü',
      breakfast: 'Frühstück',
      main: 'Mittag- & Abendessen',
      snacks: 'Snacks',
      drinks: 'Getränke',
      items: {
        breakfast: [
          { name: 'Buffet-Stil', desc: 'Sie können alle unsere Optionen im Buffet plus ein Getränk einschließen: Kaffee oder Natursaft. KEIN EXTRA-NACHFÜLLEN VON ESSEN INKLUSIVE', price: 'Anfragen' }
        ],
        main: [
          { name: 'Vollständiger Teller (Casado)', desc: 'Wählen Sie 1 Protein (Rind, Fisch, Hähnchen, Schwein) + 4 Beilagen (Reis, Bohnen, Chips, Salat) + Natursaft.', price: '₡6,800' },
          { name: 'Pasta Tomatensauce', desc: 'Inklusive Knoblauchbrot.', price: '₡6,500' },
          { name: 'Pasta weiße Sauce', desc: 'Inklusive Knoblauchbrot.', price: '₡8,000' },
          { name: 'Pasta mit Garnelen', desc: 'Inklusive Knoblauchbrot.', price: '₡8,000' },
          { name: 'Ceviche Loro', desc: 'Frisch und mariniert.', price: '₡8,000' },
          { name: 'Garnelen-Ceviche', desc: 'Frisch und mariniert.', price: '₡8,000' },
          { name: 'Gemischtes Ceviche', desc: 'Frisch und mariniert.', price: '₡8,500' },
          { name: 'Oktopus-Ceviche', desc: 'Frisch und mariniert.', price: '₡9,000' },
          { name: 'Premium-Ceviche', desc: 'Die beste Auswahl an Meeresfrüchten.', price: '₡10,000' },
          { name: 'Meeresfrüchtesuppe', desc: 'Traditionell und herzhaft.', price: '₡8,000' },
          { name: 'Ganzer Fisch (Roter Schnapper)', desc: 'Frischer Fang des Tages.', price: '₡10,000' },
          { name: 'Reis mit Garnelen', desc: 'Reis zubereitet mit frischen Meeresfrüchten.', price: '₡8,000' },
          { name: 'Reis mit Tintenfisch', desc: 'Reis zubereitet mit frischen Meeresfrüchten.', price: '₡8,000' },
          { name: 'Reis mit Oktopus', desc: 'Reis zubereitet mit frischen Meeresfrüchten.', price: '₡9,000' },
          { name: 'Reis mit Hähnchen', desc: 'Der costa-ricanische Klassiker.', price: '₡6,500' },
          { name: 'Kantonesischer Reis', desc: 'Orientalischer Stil mit einem Tico-Touch.', price: '₡6,500' },
          { name: 'Cordon Bleu', desc: 'Inklusive 2 Beilagen.', price: '₡9,000' },
          { name: 'Hähnchenfilet', desc: 'Inklusive 2 Beilagen.', price: '₡8,500' },
          { name: 'Fischfilet', desc: 'Inklusive 2 Beilagen.', price: '₡8,500' },
          { name: 'Grill', desc: 'Inklusive 2 Beilagen.', price: '₡8,000' },
          { name: 'Haussteak', desc: 'Inklusive 2 Beilagen.', price: '₡8,000' },
          { name: 'Milanesa', desc: 'Inklusive 2 Beilagen.', price: '₡8,000' },
          { name: 'Carnitas', desc: 'Inklusive 2 Beilagen.', price: '₡8,000' }
        ],
        snacks: [
          { name: 'Portion Pommes', desc: 'Knusprige Pommes.', price: '₡3,000' },
          { name: 'Chicken Fingers', desc: 'Serviert mit Pommes.', price: '₡6,500' },
          { name: 'Fischstäbchen', desc: 'Serviert mit Pommes.', price: '₡6,500' },
          { name: 'Víquez Pommes', desc: 'Spezialität des Hauses.', price: '₡6,500' },
          { name: 'Nachos', desc: 'Mit Fleisch, Käse und Bohnen.', price: '₡6,500' },
          { name: 'Quesadilla', desc: 'Weizentortilla mit geschmolzenem Käse.', price: '₡6,500' },
          { name: 'Spieße', desc: 'Gegrillte Fleischspieße.', price: '₡9,000' },
          { name: 'Taco Tico', desc: 'Kohl, Fleisch und Saucen.', price: '₡6,000' },
          { name: 'Mexikanische Tacos', desc: 'Traditioneller Stil.', price: '₡8,000' },
          { name: 'Fisch-Tacos', desc: 'Frisch und knusprig.', price: '₡9,000' },
          { name: 'Garnelen-Tacos', desc: 'Frisch und knusprig.', price: '₡9,000' },
          { name: '2 Chalupas', desc: 'Knusprige Tortilla mit Fleisch und Salat.', price: '₡7,000' },
          { name: 'Burger mit Pommes', desc: 'Premium-Rindfleisch.', price: '₡6,000' },
          { name: 'Rindfleisch-Quesadilla', desc: 'Mit Premium-Rindfleisch.', price: '₡7,500' }
        ],
        drinks: [
          { name: 'Wasser', desc: 'In Flaschen.', price: '₡1,500' },
          { name: 'Natursaft', desc: 'Saisonale Früchte.', price: '₡1,500' },
          { name: 'Limonaden', desc: 'Vielfalt an Geschmacksrichtungen.', price: '₡2,000' },
          { name: 'Regulärer Kaffee', desc: 'Hochlandkaffee.', price: '₡1,500' },
          { name: 'Cappuccino / Espresso / Latte', desc: 'Spezielle Zubereitungen.', price: '₡3,500' },
          { name: 'Nationales Bier', desc: 'Imperial oder Pilsen.', price: '₡2,000' },
          { name: 'Bavaria Bier', desc: 'Premium national.', price: '₡3,500' },
          { name: 'Handwerkliches / Internationales Bier', desc: 'Spezielle Auswahl.', price: '₡3,500' },
          { name: 'Glas Wein', desc: 'Cabernet, Merlot, Chardonnay, Pinot Grigio, Rosé.', price: '₡4,000' },
          { name: 'Sangria', desc: 'Hausrezept.', price: '₡5,000' }
        ]
      }
    },
    reservation: {
      title: 'Reservieren Sie Ihren Tisch',
      desc: 'Reservieren Sie Ihren Tisch und lassen Sie sich von der Frische unserer natürlichen Umgebung in Playa Hermosa einhüllen.',
      name: 'Vollständiger Name',
      email: 'E-Mail',
      emailPlaceholder: 'du@email.com',
      date: 'Datum',
      time: 'Uhrzeit',
      guests: 'Personen',
      guestsHint: '8+ oder große Gruppen',
      send: 'Reservierung Senden',
      success: 'Reservierung gesendet! (Simuliert in Konsole)',
      hours: 'Montag bis Sonntag: 7:00 - 21:00 Uhr',
      distributionLabel: 'Restaurantaufteilung',
      tableLegend: 'Tischaufteilung',
      clickMapHint: 'Klicken Sie auf die Karte, um die Ansicht zu vergrößern',
      minAdvanceNotice: 'RESERVIERUNGEN ERFORDERN MINDESTENS 72 STUNDEN VORLAUFZEIT',
      guestsLabel: 'Anzahl der Personen',
      allergiesLabel: 'Allergien oder besondere Hinweise (Optional)',
      allergiesPlaceholder: 'z.B. Meeresfrüchte-Allergie, vegetarisch, Geburtstagsfeier...'
    },
    footer: {
      rights: '© 2026 Coco Viquez. Alle Rechte vorbehalten.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'In Google Maps öffnen'
    },
    cart: {
      title: 'IHRE BESTELLUNG',
      empty: 'Ihr Warenkorb ist leer',
      backToMenu: 'Zurück zum Menü',
      orderSummary: 'Bestellübersicht',
      itemTotal: 'Artikel Gesamt',
      subtotal: 'Zwischensumme',
      shipping: 'Lieferung',
      packingFee: 'Verpackungsgebühr',
      total: 'Gesamtsumme',
      deliveryDetails: 'Lieferdetails',
      fullName: 'Vollständiger Name',
      fullNamePlaceholder: 'Z.B.: Sasha Calero',
      email: 'E-Mail',
      emailPlaceholder: 'du@email.com',
      confirmEmail: 'E-Mail Bestätigen',
      confirmEmailPlaceholder: 'Bestätigen Sie Ihre E-Mail',
      phone: 'Telefonnummer',
      address: 'Genaue Adresse',
      addressPlaceholder: 'Z.B.: Weißes Haus, gegenüber dem Park, schwarzes Tor...',
      deliveryZone: 'LIEFERZONE',
      viewDeliveryMap: 'Lieferkarte Ansehen',
      locating: '⌛ Standort wird ermittelt...',
      locationSaved: '✅ Standort Gespeichert',
      shareLocation: 'MEINEN STANDORT TEILEN',
      selectPaymentMethod: 'Zahlungsmethode Auswählen',
      card: 'Karte',
      sinpe: 'SINPE',
      cash: 'BARGELD',
      payNow: 'JETZT BEZAHLEN',
      sendOrder: 'BESTELLUNG SENDEN',
      closeMapAria: 'Lieferkarte schließen',
      mapAlt: 'Lieferzonenkarte',
      alertInvalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      alertEmailMismatch: 'Die E-Mail-Adressen stimmen nicht überein.',
      alertInvalidPhone: 'Bitte geben Sie eine gültige Telefonnummer für {country} ({format}) ein.',
      alertInvalidName: 'Bitte geben Sie Ihren vollständigen Namen ein.',
      alertNoAddress: 'Bitte teilen Sie Ihren Standort oder geben Sie Ihre genaue Adresse ein.',
      geoUnsupported: "Die Standortbestimmung ist in diesem Browser nicht verfügbar oder erfordert eine sichere HTTPS-Verbindung. Bitte versuchen Sie einen anderen modernen Browser oder geben Sie Ihre Adresse manuell im Feld 'GENAUE ADRESSE' ein.",
      geoError: "Wir konnten Ihren GPS-Standort nicht ermitteln. Bitte geben Sie unten Ihre genaue Adresse ein oder fügen Sie Ihren Standort-Link manuell ein."
    },
    calendar: {
      weekDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    },
    foodMenu: {
      cartHint: 'Du kannst deine Bestellung später im Warenkorb anpassen',
      extras: ['Reis', 'Bohnen', 'Salat', 'Pico de Gallo', 'Mais-Tortilla-Chips', 'Weiche Weizentortilla', 'Patacones (Frittierte Kochbanane)', 'Süße Kochbanane', 'Pürierte Bohnen', 'Guacamole', 'Pommes Frites', 'Nacho-Sauce', 'Flasche Hot Sauce'],
      categories: [
        {
          cat: 'Frühstück', ico: '☀️',
          items: [
            { n: 'Sandwich (Rind/Hähnchen/Schinken)', p: 6000, d: 'Mit Käse und Protein nach Wahl 🥪', tip: 'sandwich' },
            {
              n: 'Typisches Frühstück',
              p: 6000,
              d: 'Inklusive Kaffee und frischer Saft. Wähle deine Beilagen:',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Eier',
                'Baguette-Toast',
                'Pancake',
                'Süße Kochbanane',
                'Sauerrahm',
                'Frischkäse',
                'Wurst'
              ]
            },
            { n: 'Omelett', p: 6000, d: 'Frische Zutaten 🍳', tip: 'omelette' }
          ]
        },
        {
          cat: 'Buffets', ico: '🍽️',
          items: [
            { n: 'Mittag-/Abendbuffet', p: 6000, d: 'Protein + 4 Beilagen + Frischer Saft 🥩', modal: 'buffet' },
            {
              n: 'Frühstücksbuffet',
              p: 6000,
              d: 'Volle Auswahl + Frisches Getränk oder Kaffee. Wähle deine Beilagen:',
              modal: 'acompanamiento',
              flavors: [
                'Gallo Pinto',
                'Eier',
                'Baguette-Toast',
                'Pancake',
                'Süße Kochbanane',
                'Sauerrahm',
                'Frischkäse',
                'Wurst'
              ]
            }
          ]
        },
        {
          cat: 'Pasta', ico: '🍝',
          items: [
            { n: 'Pasta mit Tomatensauce', p: 6500, d: 'Vegetarisch: Mit Pilzen, Basilikum und Parmesan. Inklusive Knoblauchbrot 🌿', tip: 'tomato' },
            { n: 'Pasta mit weißer Sauce', p: 8000, d: 'Alfredo-Stil: Mit Pilzen und Hähnchen oder Schinken. Inklusive Knoblauchbrot 🍗', tip: 'white' },
            { n: 'Garnelen-Pasta', p: 8000, d: 'Mit weißer Sauce und Knoblauch. Inklusive Knoblauchbrot 🍤' },
            { n: 'Knoblauch-Oktopus-Pasta', p: 8000, d: 'Frischer Oktopus in Knoblauchsauce. Inklusive Knoblauchbrot 🐙' },
            { n: 'Knoblauch-Garnelen-Pasta', p: 8000, d: 'Knoblauch-Garnelen. Inklusive Knoblauchbrot 🍤' },
            { n: 'Garnelen-Oktopus-Pasta', p: 9000, d: 'Knoblauch-Meeresfrüchte-Mix. Inklusive Knoblauchbrot 🐙🍤' }
          ]
        },
        {
          cat: 'Reis', ico: '🍚',
          items: [
            { n: 'Garnelenreis', p: 8000, d: 'Klassiker mit frischen Garnelen 🍤', tip: 'rice' },
            { n: 'Hähnchenreis', p: 6500, d: 'Traditionelles costa-ricanisches Rezept 🥥', tip: 'rice' },
            { n: 'Kantonesischer Reis', p: 6500, d: 'Asiatischer Stil mit Fleisch 🍚', tip: 'rice' },
            { n: 'Gemischter Meeresfrüchtereis', p: 9000, d: 'Oktopus, Tintenfisch und Garnelen 🥣', tip: 'rice' }
          ]
        },
        {
          cat: 'Meeresfrüchte', ico: '🐟',
          items: [
            { n: 'Fisch-Ceviche (Papageifisch)', p: 8000, d: 'Frisch vor Ort zubereitet. 🍋', modal: 'ceviche' },
            { n: 'Garnelen-Ceviche', p: 8000, d: 'Frische Garnelen. 🍤', modal: 'ceviche' },
            { n: 'Gemischtes Ceviche', p: 8500, d: 'Fisch und Garnelen. 🐟🍤', modal: 'ceviche' },
            { n: 'Oktopus-Ceviche', p: 9000, d: 'Zarter Oktopus. 🐙', modal: 'ceviche' },
            { n: 'Premium-Ceviche', p: 10000, d: 'Papageifisch, Garnelen und Oktopus. 🏆', modal: 'ceviche' },
            { n: 'Meeresfrüchtesuppe', p: 8000, d: 'Inklusive Reis. 🥣', modal: 'sopa' },
            { n: 'Knoblauch-Garnelen', p: 9000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Ganzer Fisch (Roter Schnapper)', p: 10000, d: 'Frittiert. 🐟', modal: 'acompañamientos' },
            { n: 'Oktopus-Tacos', p: 8000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Oktopus (Gegrillt oder mit Knoblauch)', p: 9000, d: '🐙', modal: 'acompañamientos' },
            { n: 'Panierte Garnelen', p: 8000, d: '🍤', modal: 'acompañamientos' },
            { n: 'Garnelen-Quesadilla', p: 7500, d: '🧀🍤' }
          ]
        },
        {
          cat: 'Snacks', ico: '🍟',
          items: [
            { n: 'Portion Pommes Frites', p: 3000, d: 'Klassisch und knusprig. 🍟' },
            { n: 'Fisch- oder Hähnchen-Finger', p: 6500, d: 'Inklusive 2 Beilagen nach Wahl. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Víquez Fries', p: 6500, d: 'Pommes mit gezupftem Rind- oder Hähnchenfleisch, Pico de Gallo und Käse. 🧀' },
            { n: 'Nachos', p: 6500, d: 'Mit pürierten Bohnen, geschmolzenem Käse und Pico de Gallo. 🧀' },
            { n: 'Quesadilla', p: 6500, d: 'Weizentortilla mit geschmolzenem Käse. 🧀' },
            { n: 'Pinchos - Spieße', p: 9000, d: 'Gegrillte Fleisch- und Gemüsespieße. 🥩🍢' },
            { n: 'Taco Tico', p: 6000, d: 'Frittiert, gefüllt mit Rindfleisch. Traditioneller Stil. 🇨🇷' },
            { n: 'Mexikanische Tacos', p: 8000, d: '3 weiche Tacos mit Rindfleisch, Zwiebel und Koriander. 🇲🇽' },
            { n: 'Fisch- oder Garnelen-Tacos', p: 9000, d: '2 Tacos mit Beilage und besonderem Dressing. 🐟' },
            { n: '2 Chalupas', p: 7000, d: 'Frittierte Tortilla mit Bohnen, Rindfleisch, Kohl und Saucen. 🌮' },
            { n: 'Burger mit Pommes (Cheeseburger)', p: 6000, d: 'Rindfleisch, Käse und Pommes Frites. 🍔' },
            { n: 'Normaler Burger', p: 6000, d: 'Einfach, mit traditionellem Geschmack. 🍔' },
            { n: 'Hähnchen-Burger', p: 6000, d: 'Mit paniertem oder gegrilltem Hähnchenfilet. 🍗' },
            { n: 'Beefsteak-Quesadilla', p: 7500, d: 'Weizentortilla mit gegrilltem Steak und Käse. 🥩' }
          ]
        },
        {
          cat: 'Spezialitäten', ico: '🥩',
          items: [
            { n: 'Cordon Bleu', p: 8000, d: 'Paniertes Hähnchen gefüllt mit Schinken und Käse. Inklusive 2 Beilagen. 🍗', modal: 'acompañamientos' },
            { n: 'Hähnchen-/Fischfilet', p: 8500, d: 'Gegrillt oder mit Knoblauch. Inklusive 2 Beilagen. 🐟🍗', modal: 'acompañamientos' },
            { n: 'Gegrilltes Rind- oder Hähnchenfleisch', p: 8000, d: 'Premium-Cut vom Grill. Inklusive 2 Beilagen. 🥩🔥', modal: 'acompañamientos' },
            { n: 'Haus-Steak', p: 8000, d: 'Traditionelles Hausrezept. Inklusive 2 Beilagen. 🥩', modal: 'acompañamientos' },
            { n: 'Hähnchen- oder Rind-Milanese', p: 8000, d: 'Knusprig paniert. Inklusive 2 Beilagen. 🥩🍗', modal: 'acompañamientos' },
            { n: 'Carnitas', p: 8000, d: 'Gegrillte, sautierte Rindfleisch-Fajitas. Inklusive 2 Beilagen. 🥩', modal: 'acompañamientos' },
            { n: 'Chifrijo', p: 8000, d: 'Schichten aus Reis, zarten Bohnen, Schweineschwarten und Pico de Gallo. (Verfügbarkeit erfragen) 🥣' }
          ]
        },
        {
          cat: 'Getränke', ico: '🍹',
          items: [
            { tipo: 'header', n: 'GETRÄNKE & KAFFEE ☕' },
            { n: '700ml Wasserflasche', p: 2000, d: 'Gereinigtes Wasser.' },
            { n: 'Frischer Saft des Tages', p: 2000, d: 'Frisch zubereiteter Naturfruchtsaft.' },
            { n: 'Limonaden - Erfrischungsgetränke', p: 2000, d: 'Verschiedene Geschmacksrichtungen.', modal: 'sabor', flavors: ['Fanta Orange', 'Fanta Traube', 'Ginger Ale', 'Fanta Kolita', 'Coca-Cola', 'Coca-Cola Zero', 'Sprite', 'Monster', 'Tropical Pfirsich', 'Tropical Weiß', 'Pepsi', 'Pepsi Zero', 'Root Beer', 'Gatorade'] },
            { n: 'Gemischter Smoothie', p: 4000, d: 'Natürliche Frucht-Smoothies.', modal: 'sabor', flavors: ['Mango', 'Erdbeere', 'Ananas', 'Gemischt'], bases: ['Wasser', 'Milch'], baseLabel: 'Wähle die Basis (erforderlich):' },
            { n: 'Britt-Spezialkaffee', p: 3500, d: 'Cappuccino, Espresso, Latte oder Eiskaffee.', modal: 'sabor', flavors: ['Cappuccino', 'Espresso', 'Latte', 'Eiskaffee'] },
            { tipo: 'header', n: 'BIERE 🍺' },
            { n: 'Einheimisches Bier', p: 2000, d: 'Imperial (Light, Ultra, Silver) oder Pilsen.', modal: 'sabor', flavors: ['Imperial', 'Imperial Light', 'Imperial Ultra', 'Imperial Silver', 'Pilsen'] },
            { n: 'Premium-/Craft-Bier', p: 3500, d: 'Bavaria, Heineken, Corona oder Craft (IPA/Lager).', modal: 'sabor', flavors: ['Bavaria', 'Heineken', 'Corona', 'Craft IPA', 'Craft Lager'] },
            { tipo: 'header', n: 'WEINE & SPIRITUOSEN 🍷' },
            { n: 'Ausgewähltes Glas Wein', p: 4000, d: 'Merlot, Cabernet, Sauvignon Blanc, Chardonnay.', modal: 'sabor', flavors: ['Merlot', 'Cabernet', 'Sauvignon Blanc', 'Chardonnay'] },
            { n: 'Sangria', p: 5000, d: 'Hausrezept.' },
            { n: 'Cocktails', p: 5500, d: 'Scharfe Margarita, Traditionelle Margarita oder Wodka mit Cranberry.', modal: 'sabor', flavors: ['Scharfe Margarita', 'Traditionelle Margarita', 'Wodka mit Cranberry'] },
            { n: 'Seltzer', p: 3500, d: 'Adán y Eva.', modal: 'sabor', flavors: ['Adán y Eva'] },
            { n: 'Old Parr Whisky', p: 4000, d: 'Pur oder auf Eis serviert.' },
            { n: 'Cacique Reguläre Flasche', p: 10000, d: 'Einheimischer Guaro — Flasche.' },
            { n: 'Cacique Chiliguarro', p: 15000, d: 'Einheimischer Guaro nach Chiliguarro-Rezept.' }
          ]
        }
      ],
      chefTips: {
        tomato: "💡 Tipp des Chefs: Zu diesem mediterran-italienischen Rezept empfehlen wir einen frischen 'Salat' oder eine 'Flasche Hot Sauce' für eine ausgewogene Schärfe.",
        white: "💡 Tipp des Chefs: Die Cremigkeit der weißen Sauce passt hervorragend zum enthaltenen Knoblauchbrot, aber für einen frischen Kontrast ist eine Portion 'Salat' die ideale Balance.",
        sandwich: "💡 Tipp des Chefs: Pimp your Sandwich! Ein Extra 'Pommes Frites' innen oder daneben, kombiniert mit 'Nacho-Sauce', hebt das Street-Food-Erlebnis dieses Gerichts komplett an.",
        omelette: "💡 Tipp des Chefs: Für ein rundes Frühstück oder Brunch empfehlen wir, dein Omelett mit traditionellen Extras wie 'Patacones' oder 'Pürierten Bohnen' zu ergänzen.",
        rice: "💡 Tipp des Chefs: Küstenreisgerichte glänzen noch mehr mit der knusprigen Textur von 'Patacones' oder der Süße der 'Süßen Kochbanane'.",
        default: "💡 Tipp des Chefs: Verleih deiner Wahl eine besondere Note mit frischem 'Pico de Gallo' oder 'Süßer Kochbanane' für die perfekte süß-herzhafte Balance!"
      },
      chooseFlavor: 'Wähle deine Geschmacksrichtungen und Mengen:',
      chooseQtyLabel: 'Wie viele Einheiten möchtest du?',
      chooseSide: 'Wähle deine Beilage:',
      cevicheSides: ['Maischips', 'Patacones mit Pico de Gallo'],
      chooseSoupBase: 'Wähle die Basis deiner Suppe:',
      soupBases: ['Wasserbasis', 'Sahnebasis'],
      chooseSides2: 'Wähle genau 2 Beilagen aus:',
      sideOptions: ['Reis', 'Bohnen', 'Kartoffelpüree', 'Pommes Frites', 'Salat', 'Patacones', 'Gemüse'],
      chooseProteinLabel: 'Wähle dein Protein (erforderlich):',
      proteinOptions: ['Schwein', 'Hähnchen', 'Rind', 'Fisch'],
      chooseSides4Label: 'Wähle deine Beilagen (bis zu 4):',
      chooseSidesBreakfastLabel: 'Wähle deine Beilagen (erforderlich):',
      chooseEggStyleLabel: 'Wie möchtest du die Eier? (erforderlich)',
      eggStyles: ['Gebraten', 'Rührei'],
      buffetSideOptions: ['Reis', 'Bohnen', 'Geröstete Tortillas', 'Kartoffelpüree / Yuca / Gemüse'],
      addExtrasLabel: 'Extras Hinzufügen (Optional)',
      extrasPriceLabel: '— ₡2.500 / 5,00 $ pro Stück:',
      chefTipButton: 'Tipp des Chefs',
      chefTipHeader: 'Empfehlung des Chefs',
      confirmAddButton: 'Bestätigen und in den Warenkorb ✅',
      packingFeeNotice: 'Es wird eine Verpackungsgebühr von ₡500 (oder $1.00) pro Gericht berechnet.'
    },
    testimonials: {
      title: 'Testimonials',
      googleReview: 'Bewertung auf Google hinterlassen',
      tripadvisorReview: 'Bewertung auf TripAdvisor hinterlassen',
      items: [
        { name: 'Kevin', photo: "/kevin review.png", text: 'Wir hielten bei Coco Víquez zum Mittagessen an, bevor wir nach Playa Buena fuhren... Alles war köstlich!' },
        { name: 'Jen Sharp Photo', photo: "/Jen review.png", text: 'Es sah von der Straße aus bezaubernd aus. Perfekte Atmosphäre mit einer herrlichen Brise und freundlichem Service.' },
        { name: 'Keith Earl', photo: "/Keith review.png", text: 'Das Essen war ausgezeichnet, die Preise waren großartig! Ich liebte die ungezwungene Atmosphäre im Freien.' },
        { name: 'Agamb', photo: "/Agamb Review.png", text: 'Das beste Essen in Playa Hermosa! Der Service war erstklassig und die Atmosphäre ist unglaublich.' },
        { name: 'Daniela', photo: "/Daniela review.png", text: 'Ein verstecktes Juwel. Die typischen Aromen Costa Ricas sind authentisch und köstlich.' },
        { name: 'Emily', photo: "/Emily review.png", text: 'Tolle Preise und noch besseres Essen. Wir liebten die Open-Air-Stimmung.' },
        { name: 'Roberto', photo: "/Roberto review.png", text: 'Der perfekte Ort für ein Familienessen. Sehr empfehlenswert!' }
      ]
    },
    services: {
      title: 'Unsere Spezialservices',
      cta: 'Per WhatsApp anfragen',
      reserveNote: '(Reservieren mit 50% Anzahlung)',
      eventDate: 'Datum der Veranstaltung:',
      peopleCount: 'Anzahl der Personen:',
      checkAvailability: 'Verfügbarkeit prüfen',
      requestQuote: 'Angebot anfordern',
      waMessage: 'Hallo, Sebastián Víquez! Ich bin daran interessiert, eine Reservierung für den Service {service} am {date} für eine Gruppe von {people} Personen anzufragen. Könnten Sie mir bestätigen, ob Sie für dieses Datum Verfügbarkeit haben? Ich bin bereit, mit der Anzahlung von 50 % fortzufahren.',
      emailSubject: 'Reservierungsanfrage: {service}',
      emailBody: 'Hallo Sebastián, ich erkundige mich nach der Verfügbarkeit für den Service {service} am {date} für {people} Personen. Bitte bestätigen Sie die Verfügbarkeit, um die 50%ige Anzahlung zu leisten.',
      disclaimer: 'Vorbehaltlich der Verfügbarkeitsbestätigung durch die Verwaltung. Eine Anzahlung von 50 % ist erforderlich, um das Datum zu blockieren.',
      nameLabel: 'Vollständiger Name',
      namePlaceholder: 'Ihr vollständiger Name',
      emailLabel: 'E-Mail',
      emailPlaceholder: 'beispiel@email.com',
      datePlaceholder: 'Datum auswählen...',
      backLabel: 'Zurück',
      items: [
        { id: 'catering', name: 'Catering-Service', desc: 'Professioneller Service für Ihre Veranstaltungen mit dem Siegel von Coco Víquez.', icon: 'ChefHat' },
        { id: 'parrilladas', name: 'Grillabende', desc: 'Genießen Sie die besten Grillfleische direkt an Ihrem Standort.', icon: 'Flame' },
        { id: 'chef', name: 'Persönlicher Chef', desc: 'Wir bringen die Haute Cuisine in den Komfort Ihres Hauses für ein privates Erlebnis.', icon: 'CookingPot' },
        { 
          id: 'clase',
          name: 'Typische Kochkurse', 
          desc: 'Lernen Sie, Tortillas, Gallo Pinto und Arroz con Pollo zuzubereiten. Kapazität: 5 bis 15 Personen. Preis: 30 $ oder 15.000 Colones. Reservieren Sie mit 50% Anzahlung',
          icon: 'CookingPot',
          cta: 'Kurs Reservieren'
        },
        { id: 'fonda', name: 'Massive Kantine', desc: 'Qualitätsverpflegung für Bauprojekte und große Gruppen.', icon: 'Truck' },
        { id: 'eventos', name: 'Private Events', desc: 'Feiern Sie Ihre besonderen Termine mit uns. Komplette Reservierung für Hochzeiten und Events verfügbar. Erfordert eine Vorankündigung von mindestens 7 Tagen bis zu 3 Monaten.', icon: 'PartyPopper', cta: 'Verfügbarkeit prüfen' },
        { id: 'turismo', name: 'Tourismus und Ausflüge', desc: 'Qualitätsverpflegung für Touristengruppen und Ausflüge. Praktische und köstliche Menüs für nationale und internationale Reisende.', icon: 'Bus', cta: 'Angebot für Gruppen' }
      ]
    }
  }
};

const ArtisanalIcon = ({ id }: { id: string }) => {
  const images: Record<string, string> = {
    catering: '/servicios/Catering Services.jpg', // Macro close-up of buffet line
    parrilladas: '/servicios/servicio de parrilla.png', // Chef's hands grilling skewers
    eventos: '/servicios/evento.jpeg', // Candlelit table with "25" sign
    chef: '/servicios/servicio chef.jpeg', // Chef with yellow cap and denim apron
    clase: '/servicios/clase de cocina.png', // Hands mixing ingredients
    fonda: '/servicios/fonda masiva.png.png', // Massive buffet line setup
    turismo: '/servicios/turismo y excursiones.png' // Luxury tour bus
  };

  // Custom styling for specific images to ensure the best composition within the circle
  const getImgStyles = (serviceId: string) => {
    switch (serviceId) {
      case 'eventos':
        return { 
          className: 'scale-[1.8]', 
          style: { objectPosition: '72% 62%' },
          overlay: 'bg-orange-500/15 mix-blend-overlay'
        };
      case 'catering':
        return { 
          className: 'scale-150', 
          style: { objectPosition: 'center' },
          overlay: 'bg-black/5'
        };
      case 'parrilladas':
        return { 
          className: 'scale-150', 
          style: { objectPosition: 'center 40%' },
          overlay: 'bg-orange-500/5 mix-blend-overlay'
        };
      case 'chef':
        return { 
          className: 'scale-125', 
          style: { objectPosition: 'center 20%' },
          overlay: 'bg-black/5'
        };
      case 'clase':
        return { 
          className: 'scale-150', 
          style: { objectPosition: 'center' },
          overlay: 'bg-black/5'
        };
      case 'fonda':
        return { 
          className: 'scale-125', 
          style: { objectPosition: 'center' },
          overlay: 'bg-black/5'
        };
      case 'turismo':
        return { 
          className: 'scale-150', 
          style: { objectPosition: 'center' },
          overlay: 'bg-black/5'
        };
      default:
        return { 
          className: 'scale-100', 
          style: {},
          overlay: 'bg-black/5'
        };
    }
  };

  const styles = getImgStyles(id);

  return (
    <div className="w-full h-full rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white transition-transform duration-500 relative">
      <img 
        src={images[id] || images.catering} 
        alt={id} 
        className={`w-full h-full object-cover ${styles.className}`}
        style={styles.style}
        referrerPolicy="no-referrer"
      />
      {/* Professional overlay to enhance depth and match the card's mood */}
      <div className={`absolute inset-0 pointer-events-none ${styles.overlay}`} />
    </div>
  );
};

// --- Legal Modal Component ---
const LegalModal = ({ isOpen, type, onClose }: { isOpen: boolean; type: 'privacy' | 'terms' | null; onClose: () => void }) => {
  const content = {
    privacy: {
      title: "Política de Privacidad",
      text: "En Restaurante Coco Víquez, protegemos tus datos. La información recolectada mediante WhatsApp o nuestro formulario (nombre, teléfono, fecha de evento) se utiliza exclusivamente para la gestión de tus reservas y la personalización de nuestros servicios de catering. No compartimos tu información con terceros y puedes solicitar su eliminación en cualquier momento escribiéndonos directamente."
    },
    terms: {
      title: "Términos y Condiciones",
      text: "Al reservar con nosotros, aceptas que: 1. Se requiere un depósito del 50% de adelanto para bloquear la fecha de cualquiera de los servicios reservados en esta web. 2. Las cancelaciones deben realizarse con al menos 72 horas de antelación para reprogramar el depósito. 3. Los precios están sujetos a cambios según requerimientos extras del cliente."
    }
  };

  if (!type) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0A192F]/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#111D2B] w-full max-w-2xl rounded-[2.5rem] p-10 md:p-14 shadow-2xl border border-white/10 overflow-hidden"
            id="legal-modal"
          >
            {/* Dot Pattern Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F27F57 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors z-[120]"
            >
              <X size={28} />
            </button>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-sans tracking-tight uppercase">
                {type === 'terms' ? "Términos y Condiciones" : content[type].title}
              </h2>
              <div className="w-20 h-1 bg-[#F27F57] mb-10 rounded-full" />
              <p className="text-white/80 leading-relaxed text-sm md:text-lg font-light">
                {content[type].text}
              </p>
              <div className="mt-12 flex justify-end">
                <button 
                  onClick={onClose}
                  className="bg-white/5 hover:bg-white/10 text-white px-10 py-3.5 rounded-full text-sm font-bold uppercase tracking-[0.2em] transition-all border border-white/10 shadow-lg"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Table Map Component ---
const TableMap = ({
  onOpenModal,
  legendLabel = 'Distribución de Mesas'
}: {
  onOpenModal?: () => void
  legendLabel?: string
}) => {
  return (
    <div
      onClick={onOpenModal}
      className={`relative w-full bg-ocean/5 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-zoom-in`}
    >
      <img
        src="/mapa/mapa.jpg"
        alt={legendLabel}
        className="reservation-map-fluid w-full h-auto opacity-95 transition-all duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ocean/20 to-transparent pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center bg-ocean/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20">
          <Maximize2 size={32} className="text-white animate-pulse" />
        </div>
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-4 bg-ocean/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[9px] uppercase tracking-widest font-bold z-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-white/30" />
          <span>{legendLabel}</span>
        </div>
      </div>
    </div>
  );
};

// --- Map Modal Component ---
const MapModal = ({ 
  isOpen, 
  onClose
}: { 
  isOpen: boolean, 
  onClose: () => void
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-12 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10 cursor-default"
          >
            <div className="absolute top-4 right-4 z-[1010]">
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-black/60 hover:bg-[#ff8a50] text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl group border border-white/10"
                aria-label="Cerrar vista de mapa"
              >
                <X size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            <img 
              src="/mapa/mapa.jpg" 
              alt="Restaurante Coco Víquez Floor Plan - Vista Ampliada" 
              className="w-full h-auto object-contain block"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ServiceEmailParams {
  nombre: string;
  servicio: string;
  fecha: string;
  personas: string;
  emailCliente?: string;
}

export const sendServiceEmailQuote = ({ nombre, servicio, fecha, personas, emailCliente }: ServiceEmailParams) => {
  const formattedDate = fecha.includes('-') ? fecha.split('-').reverse().join('/') : fecha;
  const subject = `Reserva de ${nombre} - ${servicio}`;
  const body = `¡Hola! Mi nombre es ${nombre}.\n\nMe gustaría realizar una cotización / reserva para el servicio: ${servicio}.\nFecha solicitada: ${formattedDate}\nNúmero de personas: ${personas}.\n\n¡Quedo a la espera de su confirmación!${emailCliente ? `\n\nCorreo electrónico de contacto: ${emailCliente}` : ''}`;

  const mailtoLink = `mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  try {
    const a = document.createElement('a');
    a.href = mailtoLink;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  } catch (e) {
    window.location.href = mailtoLink;
  }
};

// Fires an immediate "we received your request" confirmation email to the customer
// (in whichever language they were browsing in) the moment they request a service
// quote — independent of the mailto:/WhatsApp channel they used to reach us, and
// independent of any admin action, since service requests aren't tracked as DB rows
// the way orders/reservations are. Best-effort: never blocks the WhatsApp/email flow.
const notifyServiceRequestReceived = ({ nombre, servicio, fecha, personas, emailCliente, lang }: ServiceEmailParams & { lang: string }) => {
  if (!emailCliente) return;
  const formattedDate = fecha && fecha.includes('-') ? fecha.split('-').reverse().join('/') : fecha;
  fetch('/api/send-service-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, email: emailCliente, service: servicio, date: formattedDate, people: personas, lang }),
  }).catch((err) => console.warn('Service confirmation email failed to send:', err));
};

// Devuelve la fecha/hora ACTUAL de Costa Rica (America/Costa_Rica, UTC-6, sin horario de
// verano) sin importar la zona horaria del dispositivo del visitante. Formateamos el
// instante actual como hora de Costa Rica y lo reinterpretamos como si fuera hora local,
// así getHours()/getFullYear()/etc. devuelven siempre los valores de Costa Rica. Compartida
// por todos los formularios de reserva (mesas, catering, eventos, clases, etc.) para que
// "hoy" y los límites de anticipación se calculen siempre igual sin importar quién visite el sitio.
const getCostaRicaNow = () => {
  const crString = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' });
  return new Date(crString);
};

const ServiceCard: React.FC<{
  item: any;
  cta: string;
  reserveNote: string;
  eventDateLabel: string;
  peopleCountLabel: string;
  checkAvailabilityLabel: string;
  requestQuoteLabel: string;
  waMessageTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  disclaimerText: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  datePlaceholder: string;
  backLabel: string;
  calendarWeekDays: string[];
  calendarMonths: string[];
  lang: string;
  onClassReserve?: () => void;
  fechasBloqueadas?: string[];
  isAdmin?: boolean;
  onToggleBlockedDate?: (dateStr: string) => Promise<void>;
  onSelectService?: (serviceName: string) => void;
  servicioTipo?: string;
}> = ({
  item,
  cta,
  reserveNote,
  eventDateLabel,
  peopleCountLabel,
  checkAvailabilityLabel,
  requestQuoteLabel,
  waMessageTemplate,
  emailSubjectTemplate,
  emailBodyTemplate,
  disclaimerText,
  nameLabel,
  namePlaceholder,
  emailLabel,
  emailPlaceholder,
  datePlaceholder,
  backLabel,
  calendarWeekDays,
  calendarMonths,
  lang,
  onClassReserve,
  fechasBloqueadas = [],
  isAdmin = false,
  onToggleBlockedDate,
  onSelectService,
  servicioTipo = item.id === 'clase' ? 'clases_cocina' : item.id
}) => {
  // 1. ESTADOS Y REFS (useState, useRef)
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPeople, setSelectedPeople] = useState('1');
  const [clientName, setClientName] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [dateError, setDateError] = useState(false);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [isMobile, setIsMobile] = useState(false);

  // Initialize as empty array to guarantee "Libre por defecto" until successfully fetched
  const [localFechasBloqueadas, setLocalFechasBloqueadas] = useState<string[]>([]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = getCostaRicaNow();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // CONSTANTS DERIVED FROM PROPS
  const isClase = item.id === 'clase' || item.name.toLowerCase().includes('cook') || item.name.toLowerCase().includes('cocina');
  const isEventos = item.id === 'eventos';
  
  const minCapacity = isClase ? 5 : 1;
  const maxCapacity = isClase ? 15 : (isEventos ? 50 : 20);

  // 2. LÓGICA Y FUNCIONES
  const getTodayISO = () => {
    const d = getCostaRicaNow();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  // Local-date formatter - never use .toISOString() for date-only math here, it
  // converts to UTC and silently shifts the date by one day in the evening for
  // any timezone behind UTC (e.g. Costa Rica, UTC-6, from ~6pm onward).
  const toLocalISO = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  const getMinDateLimit = () => {
    if (isAdmin) return getTodayISO();
    const today = getCostaRicaNow();
    if (isEventos) {
      const minDate = getCostaRicaNow();
      minDate.setDate(today.getDate() + 7);
      return toLocalISO(minDate);
    } else {
      const minDate = getCostaRicaNow();
      minDate.setDate(today.getDate() + 3);
      return toLocalISO(minDate);
    }
  };

  const getMaxDateLimit = () => {
    if (isEventos) {
      const today = getCostaRicaNow();
      const maxDate = getCostaRicaNow();
      maxDate.setMonth(today.getMonth() + 3);
      return toLocalISO(maxDate);
    }
    return undefined;
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: '', enabled: false, isPast: false, isBlocked: false });
    }
    
    const todayISO = getTodayISO();
    const minAllowed = getMinDateLimit();
    const maxAllowed = getMaxDateLimit();

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isPast = dateStr < todayISO;
      const isBlocked = localFechasBloqueadas.includes(dateStr);
      
      let isEnabled = !isPast && !isBlocked;
      if (isEnabled && !isAdmin) {
        if (isEventos) {
          isEnabled = (dateStr >= minAllowed && (!maxAllowed || dateStr <= maxAllowed));
        } else {
          isEnabled = (dateStr >= minAllowed);
        }
      }

      days.push({ dayNum: d, dateStr, enabled: isEnabled, isPast, isBlocked });
    }
    
    return days;
  };

  const changeMonth = (dir: number) => {
    setCurrentMonth(prev => {
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  };

  const updatePosition = () => {
    if (triggerRef.current && window.innerWidth > 768) {
      const rect = triggerRef.current.getBoundingClientRect();
      const top = rect.bottom + window.scrollY;
      const left = rect.left + window.scrollX;
      setPortalStyle({
        position: 'absolute',
        top: `${top + 4}px`,
        left: `${left}px`,
        width: `${rect.width}px`,
        minWidth: '280px',
        zIndex: 99999
      });
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (!date) {
      setDateError(false);
      return;
    }
    
    const todayISO = getTodayISO();
    const isPast = date < todayISO;
    const isBlocked = localFechasBloqueadas.includes(date);
    let isInvalid = false;

    if (isPast || isBlocked) {
      isInvalid = true;
    } else {
      const minAllowed = getMinDateLimit();
      const maxAllowed = getMaxDateLimit();
      if (date < minAllowed) {
        isInvalid = true;
      } else if (maxAllowed && date > maxAllowed) {
        isInvalid = true;
      }
    }

    setDateError(isInvalid);
  };

  const isDateDisabled = (day: { dayNum: number | null; dateStr: string; enabled: boolean; isPast: boolean; isBlocked: boolean }) => {
    if (day.dayNum === null) return true;
    return !day.enabled;
  };

  const handleDateClick = async (day: { dayNum: number | null; dateStr: string; enabled: boolean; isPast: boolean; isBlocked: boolean }) => {
    if (isAdmin && onToggleBlockedDate) {
      await onToggleBlockedDate(day.dateStr);
    } else {
      if (!isDateDisabled(day)) {
        handleDateChange(day.dateStr);
        setCalendarOpen(false);
      }
    }
  };

  const getMaxDate = () => {
    const d = getCostaRicaNow();
    d.setDate(d.getDate() + 90);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const formatMessage = (template: string) => {
    return template
      .replace('{service}', item.name)
      .replace('{date}', selectedDate)
      .replace('{people}', selectedPeople);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedDate) {
      alert("Por favor, selecciona una fecha antes de continuar");
      return;
    }
    if (!selectedPeople || selectedPeople === '0') {
      alert("Por favor, selecciona una cantidad de personas antes de continuar");
      return;
    }
    const sanitizedName = sanitizeInput(clientName);
    if (!sanitizedName) {
      alert("Por favor, ingresa un nombre válido.");
      return;
    }

    // Append client name nicely to the Whatsapp message
    const formattedDate = selectedDate.split('-').reverse().join('/');
    const message = `¡Hola! Mi nombre es ${sanitizedName}.\nQuiero consultar disponibilidad para: ${item.name}\nFecha: ${formattedDate}\nPersonas: ${selectedPeople}`;
    window.open(`https://wa.me/50626720029?text=${encodeURIComponent(message)}`, '_blank');

    notifyServiceRequestReceived({
      nombre: sanitizedName,
      servicio: item.name,
      fecha: selectedDate,
      personas: selectedPeople,
      emailCliente: emailCliente,
      lang
    });
  };

  const sendEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedDate) {
      alert("Por favor, selecciona una fecha antes de continuar");
      return;
    }
    if (!selectedPeople || selectedPeople === '0') {
      alert("Por favor, selecciona una cantidad de personas antes de continuar");
      return;
    }
    const sanitizedName = sanitizeInput(clientName);
    if (!sanitizedName) {
      alert("Por favor, ingresa un nombre válido.");
      return;
    }

    sendServiceEmailQuote({
      nombre: sanitizedName,
      servicio: item.name,
      fecha: selectedDate,
      personas: selectedPeople,
      emailCliente: emailCliente
    });

    notifyServiceRequestReceived({
      nombre: sanitizedName,
      servicio: item.name,
      fecha: selectedDate,
      personas: selectedPeople,
      emailCliente: emailCliente,
      lang
    });
  };

  const handleEmailRequest = (
    serviceName: any,
    clientNameArg?: string,
    clientEmailArg?: string,
    dateArg?: string,
    peopleCountArg?: string
  ) => {
    let finalServiceName = '';
    let finalClientName = '';
    let finalClientEmail = '';
    let finalDate = '';
    let finalPeopleCount = '';

    if (typeof serviceName === 'object' && serviceName !== null) {
      finalServiceName = serviceName.serviceName || '';
      finalClientName = serviceName.clientName || '';
      finalClientEmail = serviceName.clientEmail || '';
      finalDate = serviceName.date || '';
      finalPeopleCount = serviceName.peopleCount || '';
    } else {
      finalServiceName = serviceName || '';
      finalClientName = clientNameArg || '';
      finalClientEmail = clientEmailArg || '';
      finalDate = dateArg || '';
      finalPeopleCount = peopleCountArg || '';
    }

    if (!finalDate) {
      alert("Por favor, selecciona una fecha antes de continuar");
      return;
    }
    if (!finalPeopleCount || finalPeopleCount === '0') {
      alert("Por favor, selecciona una cantidad de personas antes de continuar");
      return;
    }
    const sanitizedName = sanitizeInput(finalClientName);
    if (!sanitizedName) {
      alert("Por favor, ingresa un nombre válido.");
      return;
    }
    if (!finalClientEmail) {
      alert("Por favor, ingresa un correo electrónico válido.");
      return;
    }

    // Call the centralized utility function to insert metadata into Supabase and open mailto
    handleServiceQuote({
      serviceName: finalServiceName,
      clientName: sanitizedName,
      clientEmail: finalClientEmail,
      date: finalDate,
      peopleCount: finalPeopleCount
    });
  };

  // 3. EFECTOS (useEffect)
  useEffect(() => {
    if (fechasBloqueadas) {
      setLocalFechasBloqueadas(fechasBloqueadas);
    }
  }, [fechasBloqueadas]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (calendarOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [calendarOpen]);

  useEffect(() => {
    const handleCloseCalendar = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (portalRef.current && portalRef.current.contains(target)) ||
        (calendarRef.current && calendarRef.current.contains(target))
      ) {
        return;
      }
      setCalendarOpen(false);
    };
    document.addEventListener('mousedown', handleCloseCalendar);
    return () => document.removeEventListener('mousedown', handleCloseCalendar);
  }, []);

  useEffect(() => {
    if (isFlipped) {
      if (!hasOpenedRef.current) {
        setSelectedPeople('1');
        setSelectedDate('');
        setClientName('');
        hasOpenedRef.current = true;
      }
    } else {
      hasOpenedRef.current = false;
    }
  }, [isFlipped]);

  // JSX CONFIGURATION STRINGS
  const buttonText = item.cta || cta;
  const peopleRanges = isClase 
    ? ['5', '8', '10', '12', '15']
    : ['2-10', '11-20', '21-50', '51-100', '100+'];
  const isFormValid = selectedDate !== '' && selectedPeople !== '';

  return (
    <div 
      id={`service-card-${item.id}`}
      className={`relative min-h-[420px] h-full w-full perspective-1000 transition-all duration-300 ${calendarOpen || isFlipped ? 'z-[50] scale-[1.01]' : 'z-10'}`}
    >
      <motion.div
        className="relative h-full w-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front Side - Dark Premium Style */}
        <div 
          onClick={() => {
            setIsFlipped(true);
            if (onSelectService) {
              onSelectService(item.name);
            }
          }}
          className="absolute inset-0 backface-hidden rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-sm border bg-[#0A192F] border-white/10 cursor-pointer hover:border-[#F27F57]/45 hover:shadow-[0_0_20px_rgba(242,127,87,0.15)] transition-all duration-300"
        >
          <div className="w-44 h-44 rounded-full flex items-center justify-center mb-8 relative bg-transparent overflow-hidden">
            <ArtisanalIcon id={item.id} />
          </div>
          <h3 className="text-2xl font-bold font-sans tracking-tight text-[#F9F7F2]">{item.name}</h3>
          <p className="text-sm font-light italic text-[#F27F57] mt-1">{reserveNote}</p>
          <div className="w-12 h-1 bg-black mt-4 rounded-full" />
          {item.desc && (
            <p className="text-sm font-light text-[#F9F7F2]/60 mt-4 leading-relaxed">{item.desc}</p>
          )}
        </div>

        {/* Back Side - Dark Premium Style */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 backface-hidden bg-[#0A192F] rounded-[2.5rem] p-6 flex flex-col items-center justify-center text-center shadow-xl rotate-y-180 relative overflow-visible"
        >
          {/* Close/Flip back button for touch devices */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCalendarOpen(false);
              setIsFlipped(false);
            }}
            className="absolute top-4 right-5 text-[#F27F57] hover:text-white bg-[#F27F57]/10 border border-[#F27F57]/20 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-all duration-300 z-50 hover:scale-110 active:scale-95 shadow-[0_0_8px_rgba(242,127,87,0.2)] cursor-pointer"
            title={backLabel}
          >
            ✕
          </button>

          {/* Dot Pattern Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[2.5rem]" style={{ backgroundImage: 'radial-gradient(#F27F57 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-[#F9F7F2] mb-1 titulo-servicio">{item.name}</h3>
            <p className="text-[#F9F7F2]/80 text-[10px] leading-tight mb-1">
              {item.desc}
            </p>
            <p className="text-[9px] font-light italic text-[#F27F57] mb-3">{reserveNote}</p>

            <div className="flex flex-col gap-2.5 w-full mb-3">
              <div className="text-left w-full">
                <label className="block text-[9px] uppercase tracking-widest text-[#F9F7F2]/60 mb-1 ml-1">
                  {nameLabel}
                </label>
                <input
                  type="text"
                  placeholder={namePlaceholder}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#0b131f]/60 text-white placeholder-gray-650 border border-[#F27F57]/30 focus:border-[#F27F57] rounded-lg px-3 py-1.5 text-xs shadow-[0_0_10px_rgba(242,127,87,0.05)] transition-all duration-300 outline-none nombre-input"
                />
              </div>

              <div className="text-left w-full">
                <label className="block text-[9px] uppercase tracking-widest text-[#F9F7F2]/60 mb-1 ml-1">
                  {emailLabel}
                </label>
                <input
                  type="email"
                  placeholder={emailPlaceholder}
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#0b131f]/60 text-white placeholder-gray-650 border border-[#F27F57]/30 focus:border-[#F27F57] rounded-lg px-3 py-1.5 text-xs shadow-[0_0_10px_rgba(242,127,87,0.05)] transition-all duration-300 outline-none correo-input"
                />
              </div>

              <div className="text-left relative w-full" ref={calendarRef}>
                <label className="block text-[9px] uppercase tracking-widest text-[#F9F7F2]/60 mb-1.5 ml-1">
                  {eventDateLabel}
                </label>
                
                <div 
                  ref={triggerRef}
                  className="relative cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarOpen(!calendarOpen);
                    if (onSelectService) {
                      onSelectService(item.name);
                    }
                  }}
                >
                  <input 
                    readOnly
                    type="text" 
                    value={selectedDate ? selectedDate.split('-').reverse().join('/') : ''}
                    placeholder={datePlaceholder}
                    className="w-full bg-slate-950 text-white placeholder-[#F9F7F2]/20 border border-[#F27F57]/30 group-hover:border-[#F27F57]/60 rounded-xl px-4 py-2 text-xs font-mono cursor-pointer transition-all duration-300 outline-none shadow-[0_0_15px_rgba(242,127,87,0.1)] focus:shadow-[0_0_15px_rgba(242,127,87,0.3)] h-11 fecha-input"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F27F57]/60 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                    <Calendar size={14} className="text-[#F27F57]" />
                  </div>
                </div>

                {calendarOpen && createPortal(
                  <div 
                    ref={portalRef}
                    className={
                      isMobile 
                        ? "fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[999999] p-4 text-white font-sans"
                        : "absolute z-[999999] text-white font-sans"
                    }
                    style={isMobile ? {} : portalStyle}
                    onClick={() => setCalendarOpen(false)}
                  >
                    <div 
                      className="w-full max-w-[320px] bg-slate-950 border border-[#F27F57]/30 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            changeMonth(-1);
                          }} 
                          className="text-[#F27F57] hover:text-[#ff8a50] text-sm font-bold p-1 transition-colors"
                        >
                          &lt;
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#F9F7F2]">
                          {calendarMonths[currentMonth.getMonth()].toUpperCase()}, {currentMonth.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            changeMonth(1);
                          }}
                          className="text-[#F27F57] hover:text-[#ff8a50] text-sm font-bold p-1 transition-colors"
                        >
                          &gt;
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        {calendarWeekDays.map((d, i) => <div key={i}>{d}</div>)}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {getCalendarDays().map((day, dIdx) => {
                          if (day.dayNum === null) {
                            return <div key={`empty-${dIdx}`} className="p-1.5" />;
                          }
                          const isSelected = selectedDate === day.dateStr;
                          const isBlocked = localFechasBloqueadas.includes(day.dateStr);
                          const isDisabled = isDateDisabled(day);
                          
                          return (
                            <button
                              key={`day-${day.dateStr}`}
                              type="button"
                              disabled={isDisabled && !isAdmin}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateClick(day);
                              }}
                              className={`relative p-1.5 rounded-lg font-bold text-center text-xs transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-[#F27F57] text-white shadow-[0_0_12px_rgba(242,127,87,0.4)]'
                                  : (isBlocked || day.isPast)
                                    ? isAdmin && !day.isPast
                                      ? 'text-red-400 bg-red-950/30 border border-red-500/30 hover:border-red-500/60 cursor-pointer shadow-[0_0_8px_rgba(222,60,60,0.25)]'
                                      : 'text-red-500 line-through bg-red-950/30 border border-red-900/30 shadow-[0_0_8px_rgba(222,60,60,0.25)] cursor-not-allowed opacity-60'
                                    : day.enabled
                                      ? 'text-white hover:bg-[#F27F57]/20 hover:text-[#F27F57] cursor-pointer'
                                      : 'text-gray-500 cursor-not-allowed opacity-30 font-light'
                              }`}
                              title={day.isPast ? "Fecha Pasada" : isBlocked ? "Fecha Reservada / Bloqueada" : ""}
                            >
                              <span>{day.dayNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {dateError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-0 w-full text-[8px] font-bold text-red-500 uppercase tracking-tighter bg-red-500/10 py-1.5 px-2 rounded border border-red-500/20 backdrop-blur-sm z-20 pointer-events-none"
                  >
                    {isEventos 
                      ? "EVENTOS REQUIEREN MÍNIMO 7 DÍAS Y MÁXIMO 3 MESES DE ANTICIPACIÓN"
                      : "SERVICIOS REQUIEREN MÍNIMO 3 DÍAS DE ANTICIPACIÓN"
                    }
                  </motion.div>
                )}
              </div>
              <div className="text-left">
                <label className="block text-[9px] uppercase tracking-widest text-[#F9F7F2]/60 mb-1.5 ml-1">
                  {peopleCountLabel}
                </label>
                <div className="flex items-center bg-[#0B1221] border border-[#F27F57] rounded-lg h-[46px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const val = parseInt(selectedPeople) || 1;
                      if (val > 1) {
                        setSelectedPeople((val - 1).toString());
                      }
                    }}
                    className="w-12 h-full flex items-center justify-center text-[#F27F57] hover:bg-[#F27F57]/10 transition-colors border-r border-[#F27F57]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={(parseInt(selectedPeople) || 1) <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={isClase ? 15 : undefined}
                    value={selectedPeople}
                    onChange={(e) => {
                      e.stopPropagation();
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setSelectedPeople('');
                        return;
                      }
                      let val = parseInt(valStr);
                      if (isNaN(val)) return;
                      
                      if (val < 1) {
                        val = 1;
                      }
                      if (isClase && val > 15) {
                        val = 15;
                      }
                      setSelectedPeople(val.toString());
                    }}
                    onBlur={(e) => {
                      const val = parseInt(selectedPeople) || 1;
                      setSelectedPeople(val.toString());
                    }}
                    onKeyDown={(e) => {
                      if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="flex-1 w-full bg-transparent text-center font-bold text-white text-lg outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none personas-input"
                  />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const val = parseInt(selectedPeople) || 1;
                      if (isClase) {
                        if (val < 15) {
                          setSelectedPeople((val + 1).toString());
                        }
                      } else {
                        setSelectedPeople((val + 1).toString());
                      }
                    }}
                    className="w-12 h-full flex items-center justify-center text-[#F27F57] hover:bg-[#F27F57]/10 transition-colors border-l border-[#F27F57]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={isClase && (parseInt(selectedPeople) || 1) >= 15}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mb-2">
              <button 
                id="CONSULTAR DISPONIBILIDAD"
                disabled={!selectedDate || !selectedPeople || selectedPeople === '0' || dateError}
                onClick={handleWhatsApp}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                  selectedDate && selectedPeople && selectedPeople !== '0' && !dateError
                    ? 'bg-[#25D366] text-white hover:scale-105 active:scale-95' 
                    : 'bg-[#25D366] text-white opacity-40 grayscale cursor-not-allowed'
                }`}
              >
                <MessageCircle size={14} />
                {checkAvailabilityLabel}
              </button>

              <button 
                id="SOLICITAR COTIZACIÓN"
                type="button"
                disabled={!selectedDate || !selectedPeople || selectedPeople === '0' || dateError}
                onClick={sendEmail}
                style={{ position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                  selectedDate && selectedPeople && selectedPeople !== '0' && !dateError
                    ? 'bg-[#1a2533] text-white border border-white/10 hover:bg-white hover:text-[#1a2533] hover:scale-105 active:scale-95' 
                    : 'bg-[#1a2533] text-white/40 border border-white/5 opacity-40 grayscale cursor-not-allowed'
                }`}
              >
                <Mail size={14} />
                {requestQuoteLabel}
              </button>
            </div>

            <p className="text-[8px] leading-tight text-[#F9F7F2]/50 italic">
              {disclaimerText}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// Cargo de empaque: se cobra por cada platillo (unidad), no por tipo de producto.
const PACKING_FEE_PER_DISH = 500;

interface CartItem {
  name: string;
  price: string;
  quantity: number;
  baseName?: string;
  extras?: string[];
  finalPrice?: number;
}

interface CountryConfig {
  code: string;
  prefix: string;
  name: string;
  placeholder: string;
  maxDigits: number;
  format: (digits: string) => string;
}

const countryConfigs: Record<string, CountryConfig> = {
  CR: {
    code: 'CR',
    prefix: '+506',
    name: 'Costa Rica',
    placeholder: '8888-8888',
    maxDigits: 8,
    format: (digits: string) => {
      const clean = digits.slice(0, 8);
      if (clean.length <= 4) return clean;
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
  },
  US: {
    code: 'US',
    prefix: '+1',
    name: 'Estados Unidos',
    placeholder: '(888) 888-8888',
    maxDigits: 10,
    format: (digits: string) => {
      const clean = digits.slice(0, 10);
      if (clean.length === 0) return '';
      if (clean.length <= 3) return `(${clean}`;
      if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
  },
  CA: {
    code: 'CA',
    prefix: '+1',
    name: 'Canadá',
    placeholder: '(888) 888-8888',
    maxDigits: 10,
    format: (digits: string) => {
      const clean = digits.slice(0, 10);
      if (clean.length === 0) return '';
      if (clean.length <= 3) return `(${clean}`;
      if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
  },
  FR: {
    code: 'FR',
    prefix: '+33',
    name: 'Francia',
    placeholder: '0 61 23 45 67',
    maxDigits: 9,
    format: (digits: string) => {
      const clean = digits.slice(0, 9);
      if (clean.length <= 1) return clean;
      if (clean.length <= 3) return `${clean.slice(0, 1)} ${clean.slice(1)}`;
      if (clean.length <= 5) return `${clean.slice(0, 1)} ${clean.slice(1, 3)} ${clean.slice(3)}`;
      if (clean.length <= 7) return `${clean.slice(0, 1)} ${clean.slice(1, 3)} ${clean.slice(3, 5)} ${clean.slice(5)}`;
      return `${clean.slice(0, 1)} ${clean.slice(1, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`;
    }
  },
  DE: {
    code: 'DE',
    prefix: '+49',
    name: 'Alemania',
    placeholder: '0151 1234567',
    maxDigits: 11,
    format: (digits: string) => {
      const clean = digits.slice(0, 11);
      if (clean.length <= 4) return clean;
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    }
  },
  ES: {
    code: 'ES',
    prefix: '+34',
    name: 'España',
    placeholder: '612 345 678',
    maxDigits: 9,
    format: (digits: string) => {
      const clean = digits.slice(0, 9);
      if (clean.length <= 3) return clean;
      if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
  },
  CO: {
    code: 'CO',
    prefix: '+57',
    name: 'Colombia',
    placeholder: '300 123 4567',
    maxDigits: 10,
    format: (digits: string) => {
      const clean = digits.slice(0, 10);
      if (clean.length <= 3) return clean;
      if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
  },
  NI: {
    code: 'NI',
    prefix: '+505',
    name: 'Nicaragua',
    placeholder: '8888-8888',
    maxDigits: 8,
    format: (digits: string) => {
      const clean = digits.slice(0, 8);
      if (clean.length <= 4) return clean;
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
  },
  PA: {
    code: 'PA',
    prefix: '+507',
    name: 'Panamá',
    placeholder: '8888-8888',
    maxDigits: 8,
    format: (digits: string) => {
      const clean = digits.slice(0, 8);
      if (clean.length <= 4) return clean;
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
  }
};

const Cart = ({ items, onUpdate, onRemove, onConfirm, isOpen, setIsOpen, t }: {
  items: CartItem[];
  onUpdate: (name: string, delta: number) => void;
  onRemove: (name: string) => void;
  onConfirm: (location: string | null, address: string, paymentMethod: 'card' | 'sinpe' | 'cash', email: string, phone: string, name: string, deliveryFee: number) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  t: typeof translations['es'];
}) => {
  const ct = t.cart;
  const [location, setLocation] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sinpe' | 'cash'>('card');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('CR');
  const currentCountryConfig = countryConfigs[selectedCountry] || countryConfigs.CR;
  const countryCode = currentCountryConfig.prefix;
  const [deliveryZone, setDeliveryZone] = useState('hermosa');
  const [deliveryFee, setDeliveryFee] = useState(2500);
  const [isDeliveryMapOpen, setIsDeliveryMapOpen] = useState(false);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  const zones = [
    { value: 'hermosa', label: 'Playa Hermosa — $5 / ₡2,500', fee: 2500 },
    { value: 'panama', label: 'Playa Panamá — $15 / ₡7,500', fee: 7500 },
    { value: 'coco', label: 'Playas del Coco — $15 / ₡7,500', fee: 7500 },
    { value: 'ocotal', label: 'Playa Ocotal — $18 / ₡9,000', fee: 9000 },
    { value: 'sardinal', label: 'Sardinal — $18 / ₡9,000', fee: 9000 }
  ];

  const isEmailValid = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const isFormValid = isEmailValid(email) && 
                     email === confirmEmail && 
                     phone.replace(/\D/g, '').length === currentCountryConfig.maxDigits && 
                     name.length > 2 &&
                     (location !== null || address.length > 5) && 
                     !isLocating;

  const subtotal = items.reduce((acc, item) => {
    const price = item.finalPrice || parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
    return acc + (price * item.quantity);
  }, 0);

  const dishCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const packingFee = dishCount * PACKING_FEE_PER_DISH;

  const totalNumeric = subtotal + deliveryFee + packingFee;

  const handleGetLocation = () => {
    // 1. COMPROBACIÓN DE COMPATIBILIDAD Y HTTPS:
    if (!navigator.geolocation) {
      alert(ct.geoUnsupported);
      return;
    }

    // 2. LÓGICA DE GEOLOCALIZACIÓN CON TIMEOUT:
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        // 4. ALMACENAMIENTO DE RESULTADO EXITOSO EN VARIABLE GLOBAL Y ESTADO:
        (window as any).userLatitude = latitude;
        (window as any).userLongitude = longitude;
        setLocation(mapsUrl);
        
        // Limpiamos cualquier enlace previo del input de dirección para permitir señas naturales libres de estorbos visuales
        setAddress(prev => {
          return prev
            .replace(/https:\/\/www\.google\.com\/maps\?q=[-0-9.,]+/g, '')
            .replace(/📍 (Mi )?[uU]bicación:[^\n]*/g, '')
            .trim();
        });
        setIsLocating(false);
      },
      (error) => {
        // 3. MANEJO DE ERRORES Y PLAN B (FALLBACK):
        setIsLocating(false);
        alert(ct.geoError);
        setTimeout(() => {
          if (addressInputRef.current) {
            addressInputRef.current.focus();
          }
        }, 100);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-[60] bg-[#F27F57] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group ${items.length > 0 ? 'animate-jump' : ''}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ShoppingCart size={28} />
        {items.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-white text-[#F27F57] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-[#F27F57]">
            {items.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        )}
      </motion.button>

      {/* Modal Overlay with Blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] overflow-hidden"
            style={{ 
              position: 'fixed', 
              top: '0', 
              left: '0', 
              width: '100vw', 
              height: '100vh', 
              backgroundColor: 'rgba(0, 0, 0, 0.7)', 
              zIndex: 99999, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-950 text-white rounded-2xl border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] flex flex-col overflow-hidden custom-scrollbar"
              style={{ 
                position: 'relative', 
                margin: '0 auto', 
                width: '100%', 
                maxWidth: '500px', 
                maxHeight: '85vh',
                borderRadius: '12px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Header */}
              <div className="p-6 bg-white/[0.02] flex justify-between items-center border-b border-white/5 sticky top-0 bg-slate-950/90 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-[#F27F57]" />
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">{ct.title}</h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center hover:text-[#F27F57] transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Stacked Scrollable Body */}
              <div 
                className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar"
                style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}
              >
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 py-20 space-y-4">
                    <Utensils size={64} />
                    <p className="font-bold uppercase tracking-widest text-sm">{ct.empty}</p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-[#F27F57] text-xs font-bold underline underline-offset-4"
                    >
                      {ct.backToMenu}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    
                    {/* Resumen section first to show details clearly */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#F27F57] flex items-center gap-3">
                        <span className="w-6 h-[1px] bg-[#F27F57]/30"></span>
                        {ct.orderSummary}
                      </h3>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {items.map((item) => {
                          const cleanName = item.name
                            .replace(/,\s*Extra:\s*[^,)]+/g, '')
                            .replace(/\(\s*Extra:\s*[^,)]+\)/g, '')
                            .replace(/\(\s*Extra:\s*[^,)]+,\s*/g, '(')
                            .replace(/\(\s*\)/g, '')
                            .trim();

                          const finalPriceVal = item.finalPrice || parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
                          const numExtras = item.extras?.length || 0;
                          const basePriceVal = Math.max(0, finalPriceVal - numExtras * 2500);
                          
                          return (
                            <div key={item.name} className="flex flex-col gap-2.5 bg-white/[0.02] p-4 rounded-xl border border-white/5 group hover:bg-white/5 transition-all">
                              <div className="flex items-start gap-3 w-full">
                                <div className="w-8 h-8 rounded-lg bg-[#F27F57]/10 flex items-center justify-center text-[#F27F57] font-black text-xs shrink-0 mt-0.5">
                                  {item.quantity}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {/* 1. REESTRUCTURACIÓN: Nombre plato (Izq) y Precio Base (Der) */}
                                  <div className="flex justify-between items-baseline gap-2">
                                    <p className="text-sm font-bold text-white tracking-tight">{cleanName}</p>
                                    <p className="text-xs text-white/50 font-mono shrink-0">₡{basePriceVal.toLocaleString()}</p>
                                  </div>
                                  
                                  {/* 2. LISTADO INDIVIDUAL DE EXTRAS CON PRECIO */}
                                  {item.extras && item.extras.length > 0 && (
                                    <div className="mt-2 space-y-1.5 pl-3 border-l border-white/10">
                                      {item.extras.map((extra) => (
                                        <div key={extra} className="flex justify-between items-center text-[11px] text-white/40">
                                          <span>• {extra}</span>
                                          <span className="font-mono text-white/30">+₡2,500</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 3. TOTALIZADOR DEL PRODUCTO */}
                                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.04]">
                                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{ct.itemTotal}</span>
                                    <span className="text-xs font-mono font-black text-[#FFD700]">
                                      ₡{(finalPriceVal * item.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Control Buttons (Increment/Decrement and Remove) */}
                              <div className="flex justify-end items-center gap-3 shrink-0 pt-0.5">
                                <div className="flex items-center bg-[#0A192F]/50 rounded-lg border border-white/10 overflow-hidden">
                                  <button onClick={() => onUpdate(item.name, -1)} className="p-1.5 hover:bg-white/5 hover:text-[#F27F57] cursor-pointer"><Minus size={12} /></button>
                                  <button onClick={() => onUpdate(item.name, 1)} className="p-1.5 hover:bg-white/5 hover:text-[#F27F57] border-l border-white/10 cursor-pointer"><Plus size={12} /></button>
                                </div>
                                <button onClick={() => onRemove(item.name)} className="text-white/20 hover:text-red-400 p-1.5 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                        <div className="flex justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                          <span>{ct.subtotal}</span>
                          <span className="text-white">₡{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                          <span>{ct.shipping}</span>
                          <span className="text-white">₡{deliveryFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                          <span>{ct.packingFee} ({dishCount}x ₡{PACKING_FEE_PER_DISH.toLocaleString()})</span>
                          <span className="text-white">₡{packingFee.toLocaleString()}</span>
                        </div>
                        <div className="h-[1px] bg-white/5 my-2"></div>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F27F57]">{ct.total}</span>
                          <span className="text-3xl font-black text-[#FFD700] leading-none font-mono tracking-tighter italic">
                            ₡{totalNumeric.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Form section second */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#F27F57] flex items-center gap-3">
                        <span className="w-6 h-[1px] bg-[#F27F57]/30"></span>
                        {ct.deliveryDetails}
                      </h3>

                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{ct.fullName}</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${name && name.length < 3 ? 'border-red-500/50' : 'border-white/10'}`}
                            placeholder={ct.fullNamePlaceholder}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{ct.email}</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${email && !isEmailValid(email) ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder={ct.emailPlaceholder}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{ct.confirmEmail}</label>
                            <input
                              type="email"
                              value={confirmEmail}
                              onChange={(e) => setConfirmEmail(e.target.value)}
                              className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${confirmEmail && email !== confirmEmail ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder={ct.confirmEmailPlaceholder}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{ct.phone}</label>
                          <div className="flex gap-2">
                            <select 
                              value={selectedCountry}
                              onChange={(e) => {
                                setSelectedCountry(e.target.value);
                                setPhone('');
                              }}
                              className="bg-[#112240] border border-white/10 rounded-xl p-3 text-xs md:text-sm focus:border-[#F27F57] outline-none transition-all text-white"
                            >
                              <option value="CR">🇨🇷 Costa Rica (CR +506)</option>
                              <option value="US">🇺🇸 Estados Unidos (US +1)</option>
                              <option value="CA">🇨🇦 Canadá (CA +1)</option>
                              <option value="FR">🇫🇷 Francia (FR +33)</option>
                              <option value="DE">🇩🇪 Alemania (DE +49)</option>
                              <option value="ES">🇪🇸 España (ES +34)</option>
                              <option value="CO">🇨🇴 Colombia (CO +57)</option>
                              <option value="NI">🇳🇮 Nicaragua (NI +505)</option>
                              <option value="PA">🇵🇦 Panamá (PA +507)</option>
                            </select>
                            <input 
                              type="tel"
                              value={phone}
                              onChange={(e) => {
                                const inputVal = e.target.value;
                                const rawDigits = inputVal.replace(/\D/g, '');
                                const slicedDigits = rawDigits.slice(0, currentCountryConfig.maxDigits);
                                const formatted = currentCountryConfig.format(slicedDigits);
                                setPhone(formatted);
                              }}
                              className={`flex-1 bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${phone && phone.replace(/\D/g, '').length < currentCountryConfig.maxDigits ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder={currentCountryConfig.placeholder}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{ct.address}</label>
                          <textarea
                            ref={addressInputRef}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all resize-none h-24 ${address && address.length < 5 ? 'border-red-500/50' : 'border-white/10'}`}
                            placeholder={ct.addressPlaceholder}
                          />
                        </div>

                        {/* Dropdown de Zonas de Entrega */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                              {ct.deliveryZone}
                            </label>
                            <button
                              type="button"
                              id="btn-open-map"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setIsDeliveryMapOpen(true);
                              }}
                              className="text-[#FFD700] hover:text-[#ffea70] text-[10px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              🗺️ {ct.viewDeliveryMap}
                            </button>
                          </div>
                          <select
                            value={deliveryZone}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              setDeliveryZone(selectedVal);
                              const zoneNode = zones.find(z => z.value === selectedVal);
                              if (zoneNode) {
                                setDeliveryFee(zoneNode.fee);
                              }
                            }}
                            className="w-full bg-[#112240] border border-white/10 rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all text-white"
                          >
                            {zones.map((zone) => (
                              <option key={zone.value} value={zone.value} className="bg-[#0A192F] text-white">
                                {zone.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button 
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all ${location ? 'bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-[#112240] text-white/70 hover:bg-white/5 border border-white/10 hover:text-white'}`}
                        >
                          <MapPin size={16} />
                          {isLocating ? ct.locating : location ? ct.locationSaved : ct.shareLocation}
                        </button>
                      </div>
                    </div>

                    {/* Payment & Checkout Buttons */}
                    <div className="space-y-6 pt-2 border-t border-white/5">
                      {/* Payment Toggle */}
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 text-center mb-1">{ct.selectPaymentMethod}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setPaymentMethod('card')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'card' ? 'bg-[#F27F57] border-[#F27F57] text-white shadow-[0_0_20px_rgba(242,127,87,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <CreditCard size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">{ct.card}</span>
                          </button>
                          <button
                            onClick={() => setPaymentMethod('sinpe')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'sinpe' ? 'bg-[#25D366] border-[#25D366] text-white shadow-[0_0_20px_rgba(37,211,102,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <Smartphone size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">{ct.sinpe}</span>
                          </button>
                          <button
                            onClick={() => setPaymentMethod('cash')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'cash' ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <Wallet size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">{ct.cash}</span>
                          </button>
                        </div>
                      </div>

                      <button
                        id="btn-enviar-pedido"
                        onClick={() => {
                          if (!isEmailValid(email)) { alert(ct.alertInvalidEmail); return; }
                          if (email !== confirmEmail) { alert(ct.alertEmailMismatch); return; }
                          const rawLength = phone.replace(/\D/g, '').length;
                          if (rawLength !== currentCountryConfig.maxDigits) {
                            alert(ct.alertInvalidPhone.replace('{country}', currentCountryConfig.name).replace('{format}', currentCountryConfig.placeholder));
                            return;
                          }
                          if (name.length < 3) { alert(ct.alertInvalidName); return; }
                          if (!location && address.length < 5) { alert(ct.alertNoAddress); return; }
                          onConfirm(location, address, paymentMethod, email, countryCode + ' ' + phone, name, deliveryFee);
                        }}
                        disabled={!isFormValid}
                        className="w-full bg-white text-[#0A192F] py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#F27F57] hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group flex items-center justify-center gap-3"
                      >
                        {paymentMethod === 'card' ? (
                          <CreditCard size={18} />
                        ) : paymentMethod === 'cash' ? (
                          <Wallet size={18} />
                        ) : (
                          <MessageCircle size={18} />
                        )}
                        {paymentMethod === 'sinpe' ? ct.payNow : ct.sendOrder}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery Map Modal */}
      <AnimatePresence>
        {isDeliveryMapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDeliveryMapOpen(false)}
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#0A192F] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 p-2 cursor-default"
            >
              <div className="absolute top-4 right-4 z-[10010]">
                <button 
                  onClick={() => setIsDeliveryMapOpen(false)}
                  className="w-10 h-10 bg-black/60 hover:bg-[#ff8a50] text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl group border border-white/10"
                  aria-label={ct.closeMapAria}
                >
                  <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <img
                src="/delivery-map.png"
                alt={ct.mapAlt}
                className="w-full h-auto object-contain rounded-2xl block"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const LanguageSelector = ({ currentLang, onLangChange, openUpward = false }: { currentLang: string, onLangChange: (lang: any) => void, openUpward?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w40/es.png', short: 'ES' },
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/us.png', short: 'EN' },
    { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w40/fr.png', short: 'FR' },
    { code: 'de', name: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png', short: 'DE' },
  ];

  const currentLanguage = languages.find(l => l.code === currentLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`lang-selector-container ${openUpward ? 'opens-upward' : ''} ${isOpen ? 'active' : ''}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 group ${
          isOpen ? 'border-[#F27F57] bg-[#F27F57]/10 text-[#F27F57]' : 'border-white/20 text-white hover:border-[#F27F57] hover:text-[#F27F57]'
        }`}
      >
        <Globe size={14} className={`${isOpen ? 'rotate-12 text-[#F27F57]' : 'group-hover:rotate-12'} transition-transform`} />
        <span className="text-[12px] font-bold tracking-widest flex items-center gap-2">
          {currentLanguage.short}
          <img 
            src={currentLanguage.flag} 
            alt={currentLanguage.name} 
            className="flag-circular"
            referrerPolicy="no-referrer"
          />
        </span>
      </button>

      <div className="dropdown-menu">
        <ul className="py-2 bg-[#0D1721]/85 backdrop-blur-[10px] rounded-[12px] border border-[#F27F57]/30">
          {languages.map((lang, index) => (
            <li key={lang.code}>
              <motion.button
                initial={false}
                animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                transition={{ delay: isOpen ? index * 0.1 : 0, duration: 0.2 }}
                onClick={() => {
                  onLangChange(lang.code);
                  setIsOpen(false);
                }}
                className={`lang-item ${currentLang === lang.code ? 'selected' : ''}`}
              >
                <span>{lang.name}</span>
                <img 
                  src={lang.flag} 
                  alt={lang.name} 
                  className="flag-circular"
                  referrerPolicy="no-referrer"
                />
              </motion.button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// --- Sea Foam Particles Component ---
const SeaFoam = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas!.width) this.x = 0;
        if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        if (this.y < 0) this.y = canvas!.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />;
};

// --- Cooking Class Modal ---
const ClassModal = ({ isOpen, onClose, minAdvanceNoticeText = 'LAS RESERVAS REQUIEREN UN MÍNIMO DE 72 HORAS DE ANTICIPACIÓN' }: { isOpen: boolean; onClose: () => void; minAdvanceNoticeText?: string }) => {
  const [formData, setFormData] = useState({
    name: '',
    guests: '5',
    date: '',
    time: '10:00'
  });

  const minDate = getCostaRicaNow();
  minDate.setDate(minDate.getDate() + 3);
  // Local-date format, not .toISOString() - that converts to UTC and shifts the
  // date by one day in the evening for timezones behind UTC (e.g. Costa Rica).
  const minDateStr = `${minDate.getFullYear()}-${(minDate.getMonth() + 1).toString().padStart(2, '0')}-${minDate.getDate().toString().padStart(2, '0')}`;

  const [dateError, setDateError] = useState(false);

  const handleDateChange = (date: string) => {
    setFormData({...formData, date});
    if (!date) {
      setDateError(false);
      return;
    }
    const selected = new Date(date);
    const minAllowed = new Date(minDateStr);
    if (selected < minAllowed) {
      setDateError(true);
    } else {
      setDateError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, guests, date, time } = formData;
    const sanitizedName = sanitizeInput(name);
    try {
      if (supabase) {
        const classTime = time || '10:00';
        const { error } = await supabase
          .from('reservas')
          .insert([{
            cliente: sanitizedName,
            servicio_cotizado: 'Clase de Cocina Típica',
            fecha: date,
            fecha_hora: `${date}T${classTime}:00`,
            lugares: parseInt(guests) || 5,
            estado: 'pendiente'
          }]);
        if (error) {
          console.error("Error inserting class booking into Supabase:", error.message);
        }
      }
    } catch (err) {
      console.error("Failed to insert class booking in Supabase:", err);
    }
    const message = `¡Hola! Quiero reservar una Clase de Cocina Típica:\n\nNombre: ${sanitizedName}\nPersonas: ${guests}\nFecha: ${date}\nHora: ${time}`;
    window.open(`https://wa.me/50689020888?text=${encodeURIComponent(message)}`, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-ocean/90 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-ocean/40 hover:text-coral transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#FFF5F0] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#F27F57]/20 text-coral">
                <ChefHat size={32} />
              </div>
              <h3 className="text-2xl font-bold text-ocean">Reservar Clase</h3>
              <p className="text-ocean/60 text-sm mt-2">Vive una experiencia gastronómica auténtica.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ocean/40">Nombre Completo</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-sand/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-coral transition-all outline-none"
                  placeholder="Tu nombre..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ocean/40">Personas (5-15)</label>
                  <input 
                    required
                    type="number"
                    min="5"
                    max="15"
                    value={formData.guests}
                    onChange={(e) => setFormData({...formData, guests: e.target.value})}
                    className="w-full bg-sand/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-coral transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ocean/40">Hora (10am-4pm)</label>
                  <select 
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-sand/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-coral transition-all outline-none"
                  >
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ocean/40">Fecha (Anticipación 3 días)</label>
                <div className="relative">
                  <input 
                    required
                    type="date"
                    min={minDateStr}
                    value={formData.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {
                        console.error("showPicker click error:", err);
                      }
                    }}
                    onFocus={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {
                        console.error("showPicker focus error:", err);
                      }
                    }}
                    className={`w-full bg-sand/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-coral transition-all outline-none cursor-pointer ${dateError ? 'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : ''}`}
                  />
                  {dateError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-8 left-0 w-full text-[8px] font-bold text-red-500 uppercase tracking-tighter bg-red-50 py-1 px-2 rounded border border-red-200 text-center z-10"
                    >
                      {minAdvanceNoticeText}
                    </motion.div>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                disabled={dateError || !formData.date || !formData.name}
                className="w-full bg-coral text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-ocean transition-all shadow-lg mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                Confirmar por WhatsApp
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TripAdvisorIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3.2c-4.8 0-8.8 3.9-8.8 8.8 0 4.8 3.9 8.8 8.8 8.8 4.8 0 8.8-3.9 8.8-8.8 0-4.8-3.9-8.8-8.8-8.8zm-4.4 11.2c-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4zm4.4 4c-2.2 0-4-1.8-4-4h8c0 2.2-1.8 4-4 4zm4.4-4c-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4z"/>
  </svg>
);

const PackingFeeNotice = ({ text }: { text: string }) => (
  <div className="px-4 md:px-6 pt-4">
    <style>{`
      @keyframes packingFeePulse {
        0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(249,255,0,0.6), 0 0 16px rgba(249,255,0,0.35); }
        50% { opacity: 0.75; text-shadow: 0 0 16px rgba(249,255,0,0.9), 0 0 28px rgba(249,255,0,0.55); }
      }
      .packing-fee-notice {
        animation: packingFeePulse 2s ease-in-out infinite;
      }
    `}</style>
    <p
      className="packing-fee-notice text-center text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wide sm:tracking-wider break-words"
      style={{ color: '#F9FF00' }}
    >
      {text}
    </p>
  </div>
);

const HorizontalTabsMenu = ({ onAdd, t }: {
  onAdd: (item: any) => void;
  t: typeof translations['es'];
}) => {
  const fm = t.foodMenu;
  const menuData = fm.categories;
  const extrasList = fm.extras;
  const cartHint = fm.cartHint;
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItemForModal, setSelectedItemForModal] = useState<any>(null);
  const [modalOptions, setModalOptions] = useState<any>({});
  const [isChefTipOpen, setIsChefTipOpen] = useState(false);

  const getChefTip = (item: any) => {
    if (!item) return "";
    return fm.chefTips[item.tip as keyof typeof fm.chefTips] || fm.chefTips.default;
  };

  const isDrinksTab = activeTab === menuData.length - 1;

  const handleAddToCartClick = (item: any) => {
    // Todos los items ahora abren un modal:
    // - si el item ya tiene modal (ceviche, sopa, buffet, sabor, etc.), se usa ese
    // - si NO tiene modal, se usa 'cantidad' — un mini modal solo con contador +/-
    const modalToUse = item.modal || 'cantidad';
    // isDrink: se propaga para que la sección de extras (guacamole, papas, etc.)
    // NO aparezca en items de bebidas — no tiene sentido ofrecer extras a una botella
    // de agua, whisky, cacique o fresco natural.
    setSelectedItemForModal({ ...item, category: menuData[activeTab].cat, modal: modalToUse, isDrink: isDrinksTab });
    setModalOptions({ sides: [], extras: [], qty: 1 });
    setIsChefTipOpen(false);

    // scroll suave al inicio del contenedor del menú
    setTimeout(() => {
      const menuSection = document.getElementById('menu');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const confirmAndAdd = () => {
    if (selectedItemForModal.modal === 'sabor') {
      const flavorQty = modalOptions.flavorQty || {};
      const itemPrice = typeof selectedItemForModal.p === 'number' ? selectedItemForModal.p : 0;
      const baseSuffix = modalOptions.base ? ` - ${modalOptions.base}` : '';
      Object.entries(flavorQty).forEach(([flavor, qty]) => {
        for (let i = 0; i < (qty as number); i++) {
          onAdd({ name: `${selectedItemForModal.n} (${flavor}${baseSuffix})`, price: `₡${itemPrice.toLocaleString()}` });
        }
      });
      setSelectedItemForModal(null);
      setIsChefTipOpen(false);
      return;
    }

    let finalName = selectedItemForModal.n;
    const options = [];

    if (selectedItemForModal.modal === 'ceviche') {
      if (modalOptions.side) options.push(modalOptions.side);
    } else if (selectedItemForModal.modal === 'sopa') {
      if (modalOptions.base) options.push(modalOptions.base);
    } else if (selectedItemForModal.modal === 'acompañamientos') {
      if (modalOptions.sides) options.push(...modalOptions.sides);
    } else if (selectedItemForModal.modal === 'buffet') {
      if (modalOptions.protein) options.push(modalOptions.protein);
      if (modalOptions.sides) options.push(...modalOptions.sides);
    } else if (selectedItemForModal.modal === 'acompanamiento') {
      // Buffet Desayuno / Desayuno Típico: los acompañamientos elegidos son informativos,
      // no cambian el precio. Si eligió "Huevos", se agrega el estilo entre paréntesis.
      if (modalOptions.sides) {
        const eggOption = (selectedItemForModal.flavors || []).find((opt: string) =>
          /^(huevos|eggs|œufs|oeufs|eier)$/i.test(opt.trim())
        );
        modalOptions.sides.forEach((side: string) => {
          if (side === eggOption && modalOptions.eggStyle) {
            options.push(`${side} (${modalOptions.eggStyle})`);
          } else {
            options.push(side);
          }
        });
      }
    }
    // 'cantidad' — sin personalización propia, solo extras (que se procesan abajo).

    if (modalOptions.extras && modalOptions.extras.length > 0) {
      options.push(...modalOptions.extras.map((e: string) => `Extra: ${e}`));
    }

    if (options.length > 0) {
      finalName += ` (${options.join(', ')})`;
    }

    const itemBasePrice = typeof selectedItemForModal.p === 'number' ? selectedItemForModal.p : 0;
    const numExtras = (modalOptions.extras || []).length;
    const itemTotalPrice = itemBasePrice + numExtras * 2500;

    // Cantidad seleccionada en el modal (aplica a ceviche, sopa, acompañamientos, acompanamiento, cantidad).
    // Buffet queda excluido para evitar pedidos idénticos accidentales (cada persona
    // suele querer proteína distinta).
    const supportsQty = ['ceviche', 'sopa', 'acompañamientos', 'acompanamiento', 'cantidad'].includes(selectedItemForModal.modal);
    const qty = supportsQty ? Math.max(1, parseInt(modalOptions.qty, 10) || 1) : 1;

    for (let i = 0; i < qty; i++) {
      onAdd({
        name: finalName,
        price: `₡${itemTotalPrice.toLocaleString()}`,
        baseName: selectedItemForModal.n,
        extras: modalOptions.extras || [],
        finalPrice: itemTotalPrice
      });
    }
    setSelectedItemForModal(null);
    setIsChefTipOpen(false);
  };

  const toggleAcompañamiento = (side: string) => {
    setModalOptions((prev: any) => {
      const currentSides = prev.sides || [];
      if (currentSides.includes(side)) {
        return { ...prev, sides: currentSides.filter((s: string) => s !== side) };
      }
      if (currentSides.length < 2) {
        return { ...prev, sides: [...currentSides, side] };
      }
      return prev;
    });
  };

  const toggleBuffetSide = (side: string) => {
    setModalOptions((prev: any) => {
      const currentSides = prev.sides || [];
      if (currentSides.includes(side)) {
        return { ...prev, sides: currentSides.filter((s: string) => s !== side) };
      }
      if (currentSides.length < 4) {
        return { ...prev, sides: [...currentSides, side] };
      }
      return prev;
    });
  };

  const isBuffetSelectionIncomplete = selectedItemForModal?.modal === 'buffet' &&
    (!modalOptions.protein || (modalOptions.sides || []).length === 0);

  const setFlavorQty = (flavor: string, delta: number) => {
    setModalOptions((prev: any) => {
      const current = prev.flavorQty || {};
      const newQty = Math.max(0, (current[flavor] || 0) + delta);
      const updated = { ...current, [flavor]: newQty };
      if (newQty === 0) delete updated[flavor];
      return { ...prev, flavorQty: updated };
    });
  };

  const isFlavorSelectionIncomplete = selectedItemForModal?.modal === 'sabor' && (
    Object.values(modalOptions.flavorQty || {}).reduce((a: number, b: any) => a + b, 0) === 0 ||
    (Array.isArray(selectedItemForModal?.bases) && selectedItemForModal.bases.length > 0 && !modalOptions.base)
  );

  // Buffet Desayuno / Desayuno Típico: al menos un acompañamiento debe estar marcado,
  // y SI eligió "Huevos" también debe elegir cómo los quiere (frito o revuelto).
  const isAcompanamientoSelectionIncomplete = (() => {
    if (selectedItemForModal?.modal !== 'acompanamiento') return false;
    if ((modalOptions.sides || []).length === 0) return true;
    const eggOption = (selectedItemForModal.flavors || []).find((opt: string) =>
      /^(huevos|eggs|œufs|oeufs|eier)$/i.test(opt.trim())
    );
    const isEggSelected = eggOption && (modalOptions.sides || []).includes(eggOption);
    if (isEggSelected && !modalOptions.eggStyle) return true;
    return false;
  })();

  // Toggle simple (marcar/desmarcar) para acompañamientos del buffet desayuno — sin límite.
  const toggleAcompanamiento = (side: string) => {
    setModalOptions((prev: any) => {
      const currentSides = prev.sides || [];
      if (currentSides.includes(side)) {
        return { ...prev, sides: currentSides.filter((s: string) => s !== side) };
      }
      return { ...prev, sides: [...currentSides, side] };
    });
  };

  // Cada extra puede repetirse N veces en el array — así se soportan múltiples unidades
  // del mismo extra (ej: 2 guacamoles = ['Guacamole', 'Guacamole']). El precio total se
  // sigue calculando como `.length * 2500`, así que no hay que tocar el resto del cálculo.
  const incrementExtra = (extra: string) => {
    setModalOptions((prev: any) => {
      const currentExtras = prev.extras || [];
      return { ...prev, extras: [...currentExtras, extra] };
    });
  };

  const decrementExtra = (extra: string) => {
    setModalOptions((prev: any) => {
      const currentExtras = prev.extras || [];
      const idx = currentExtras.indexOf(extra);
      if (idx === -1) return prev;
      const next = [...currentExtras];
      next.splice(idx, 1);
      return { ...prev, extras: next };
    });
  };

  return (
    <div className="bg-[#121621]/75 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/[0.08] relative min-h-[550px]">
      <AnimatePresence mode="wait">
        {selectedItemForModal ? (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6 md:p-8 flex flex-col min-h-[550px] w-full bg-[#121212]/95 rounded-[2.5rem] overflow-hidden"
          >
            {/* Force scrollbar styles physically inline */}
            <style>{`
              .tu-contenedor-de-extras::-webkit-scrollbar {
                width: 6px !important;
              }
              .tu-contenedor-de-extras::-webkit-scrollbar-track {
                background: transparent !important;
              }
              .tu-contenedor-de-extras::-webkit-scrollbar-thumb {
                background-color: #ffd200 !important;
                border-radius: 10px !important;
              }
            `}</style>

            {/* Back Button & Header */}
            <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-white/5 shrink-0">
              <button
                onClick={() => { setSelectedItemForModal(null); setIsChefTipOpen(false); }}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#F27F57] hover:text-white transition-all cursor-pointer bg-[#F27F57]/10 px-4 py-2.5 rounded-xl border border-[#F27F57]/20 self-start hover:bg-[#F27F57]/20"
              >
                <ArrowLeft size={14} strokeWidth={2.5} />
                Volver al Menú
              </button>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-grow min-w-0 pr-4">
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter mb-1.5 leading-tight">
                    {selectedItemForModal.n}
                  </h3>
                  {selectedItemForModal.d && (
                    <p className="text-white/40 text-[13px] leading-relaxed italic font-medium">
                      {selectedItemForModal.d}
                    </p>
                  )}
                </div>
                
                <div className="bg-[#FFD700]/10 px-4 py-2 rounded-2xl border border-[#FFD700]/20 self-start shrink-0 flex items-center justify-center transition-all duration-300">
                  <span className="text-[#FFD700] font-mono font-black text-lg whitespace-nowrap tracking-tighter">
                    {(() => {
                      const basePrice = typeof selectedItemForModal.p === 'number' ? selectedItemForModal.p : 0;
                      if (selectedItemForModal.modal === 'sabor') {
                        // Cada sabor tiene su propio contador — sumamos todos
                        const totalQty = Object.values(modalOptions.flavorQty || {}).reduce((a: number, b: any) => a + b, 0) as number;
                        const currentTotal = basePrice * Math.max(1, totalQty);
                        return `₡${currentTotal.toLocaleString()}`;
                      }
                      // Modales con cantidad al final (ceviche, sopa, acompañamientos, cantidad):
                      // precio por unidad = base + extras, y luego × cantidad total
                      const numExtras = (modalOptions.extras || []).length;
                      const perUnit = basePrice + numExtras * 2500;
                      const supportsQty = ['ceviche', 'sopa', 'acompañamientos', 'acompanamiento', 'cantidad'].includes(selectedItemForModal.modal);
                      const qty = supportsQty ? Math.max(1, parseInt(modalOptions.qty, 10) || 1) : 1;
                      return `₡${(perUnit * qty).toLocaleString()}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Customization Container */}
            <div
              className="space-y-5 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar tu-contenedor-de-extras flex-grow min-h-0 py-2 pb-6"
            >
              {selectedItemForModal.modal === 'ceviche' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseSide}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fm.cevicheSides.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setModalOptions({ ...modalOptions, side: opt })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group text-xs ${
                          modalOptions.side === opt 
                            ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/15' 
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <span className="font-bold">{opt}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${modalOptions.side === opt ? 'border-black' : 'border-white/20 group-hover:border-white/40'}`}>
                          {modalOptions.side === opt && <div className="w-2 h-2 bg-black rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedItemForModal.modal === 'sopa' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseSoupBase}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fm.soupBases.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setModalOptions({ ...modalOptions, base: opt })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group text-xs ${
                          modalOptions.base === opt 
                            ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/15' 
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <span className="font-bold">{opt}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${modalOptions.base === opt ? 'border-black' : 'border-white/20 group-hover:border-white/40'}`}>
                          {modalOptions.base === opt && <div className="w-2 h-2 bg-black rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedItemForModal.modal === 'acompañamientos' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseSides2}</p>
                    <span className="text-[10px] font-black text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-0.5 rounded-full">{(modalOptions.sides || []).length}/2</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {fm.sideOptions.map((opt) => {
                      const isSelected = (modalOptions.sides || []).includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleAcompañamiento(opt)}
                          className={`p-2.5 rounded-xl border text-center transition-all text-xs font-semibold leading-tight min-h-[44px] flex items-center justify-center break-words ${
                            isSelected 
                              ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedItemForModal.modal === 'buffet' && (
                <>
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseProteinLabel}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {fm.proteinOptions.map((opt) => {
                        const isSelected = modalOptions.protein === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setModalOptions({ ...modalOptions, protein: opt })}
                            className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                              isSelected
                                ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/15'
                                : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseSides4Label}</p>
                      <span className="text-[10px] font-black text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-0.5 rounded-full">{(modalOptions.sides || []).length}/4</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {fm.buffetSideOptions.map((opt) => {
                        const isSelected = (modalOptions.sides || []).includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleBuffetSide(opt)}
                            className={`p-2.5 rounded-xl border text-center transition-all text-xs font-semibold leading-tight min-h-[44px] flex items-center justify-center break-words ${
                              isSelected
                                ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20'
                                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Buffet Desayuno: lista de acompañamientos marcables (múltiples, sin límite).
                  Precio fijo del buffet, los sides son solo informativos para cocina. */}
              {selectedItemForModal.modal === 'acompanamiento' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseSidesBreakfastLabel || 'Elige tus acompañamientos:'}</p>
                    <span className="text-[10px] font-black text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-0.5 rounded-full">{(modalOptions.sides || []).length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(selectedItemForModal.flavors || []).map((opt: string) => {
                      const isSelected = (modalOptions.sides || []).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleAcompanamiento(opt)}
                          className={`p-2.5 rounded-xl border text-center transition-all text-xs font-semibold leading-tight min-h-[44px] flex items-center justify-center break-words ${
                            isSelected
                              ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20'
                              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-selección: estilo del huevo — obligatorio si "Huevos" está marcado.
                      Detecta cualquier item de la lista que sea "Huevos" en su idioma. */}
                  {(() => {
                    const eggOption = (selectedItemForModal.flavors || []).find((opt: string) =>
                      /^(huevos|eggs|œufs|oeufs|eier)$/i.test(opt.trim())
                    );
                    const isEggSelected = eggOption && (modalOptions.sides || []).includes(eggOption);
                    if (!isEggSelected) return null;
                    return (
                      <div className="space-y-2 pt-3 mt-1 border-t border-white/10">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseEggStyleLabel || '¿Cómo quieres el huevo? (obligatorio)'}</p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {(fm.eggStyles || ['Frito', 'Revuelto']).map((style: string) => {
                            const isSelected = modalOptions.eggStyle === style;
                            return (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setModalOptions({ ...modalOptions, eggStyle: style })}
                                className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                                  isSelected
                                    ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/15'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                                }`}
                              >
                                {style}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedItemForModal.modal === 'sabor' && (
                <div className="space-y-3 min-h-[280px]">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseFlavor}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(selectedItemForModal.flavors || []).map((flavor: string) => {
                      const qty = (modalOptions.flavorQty || {})[flavor] || 0;
                      return (
                        <div
                          key={flavor}
                          className={`flex items-center justify-between gap-2 p-2.5 pl-3 rounded-xl border transition-all ${
                            qty > 0
                              ? 'bg-[#FFD700]/10 border-[#FFD700] text-white'
                              : 'bg-white/5 border-white/10 text-white/60'
                          }`}
                        >
                          <span className="text-xs font-bold truncate">{flavor}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setFlavorQty(flavor, -1)}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center text-xs font-black">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setFlavorQty(flavor, 1)}
                              className="w-7 h-7 rounded-lg bg-[#FFD700] hover:bg-[#FFD700]/80 flex items-center justify-center text-black transition-all"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Array.isArray(selectedItemForModal.bases) && selectedItemForModal.bases.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{selectedItemForModal.baseLabel || 'Elige la base (obligatorio):'}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedItemForModal.bases.map((base: string) => {
                          const isSelected = modalOptions.base === base;
                          return (
                            <button
                              key={base}
                              type="button"
                              onClick={() => setModalOptions({ ...modalOptions, base })}
                              className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                                isSelected
                                  ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-lg shadow-[#FFD700]/15'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                              }`}
                            >
                              {base}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedItemForModal.modal !== 'sabor' && !selectedItemForModal.isDrink && (
              <>
              {/* Extras Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-black">
                    {fm.addExtrasLabel} <span className="text-white font-extrabold">{fm.extrasPriceLabel}</span>
                  </p>
                  <div className="relative">
                    <button
                      id="btn-tip-chef"
                      type="button"
                      onClick={() => setIsChefTipOpen(!isChefTipOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 active:scale-95 rounded-full border border-white/10 transition-all cursor-pointer select-none"
                    >
                      <Lightbulb size={11} className="text-[#FFD700]" />
                      <span className="text-[9px] font-black text-[#FFD700] uppercase tracking-tighter">{fm.chefTipButton}</span>
                    </button>

                    <AnimatePresence>
                      {isChefTipOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setIsChefTipOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 z-50 w-72 sm:w-80 bg-[#151D2A] border border-[#FFD700]/30 rounded-2xl p-4 shadow-[0_12px_24px_rgba(0,0,0,0.7)] text-left select-none text-white font-sans text-xs"
                          >
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🧑‍🍳</span>
                                <span className="font-extrabold uppercase tracking-wide text-[10px] text-[#FFD700]">{fm.chefTipHeader}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsChefTipOpen(false)}
                                className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5 rounded-full hover:bg-white/5"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <p className="leading-relaxed text-white/95 font-medium">
                              {getChefTip(selectedItemForModal)}
                            </p>
                            <div className="absolute right-6 -top-1.5 w-3 h-3 bg-[#151D2A] border-t border-l border-[#FFD700]/30 transform rotate-45" />
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                  {extrasList.map((extra) => {
                    const qty = (modalOptions.extras || []).filter((e: string) => e === extra).length;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={extra}
                        className={`flex items-center justify-between gap-2 p-2 pl-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#FFD700]/10 border-[#FFD700] text-white shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-tight truncate">{extra}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => decrementExtra(extra)}
                            disabled={qty === 0}
                            aria-label={`Quitar ${extra}`}
                            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <Minus size={10} />
                          </button>
                          <span className={`w-4 text-center text-[11px] font-black ${isSelected ? 'text-[#FFD700]' : 'text-white/40'}`}>{qty}</span>
                          <button
                            type="button"
                            onClick={() => incrementExtra(extra)}
                            aria-label={`Agregar ${extra}`}
                            className="w-6 h-6 rounded-md bg-[#FFD700] hover:bg-[#FFD700]/80 flex items-center justify-center text-black transition-all"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
              )}

              {/* Contador de cantidad reutilizable para todos los modales excepto 'sabor' y 'buffet':
                  - 'cantidad' (ítems simples): permite pedir varios idénticos
                  - 'ceviche', 'sopa', 'acompañamientos': después de personalizar, indica cuántos idénticos quiere
                  - 'sabor' se excluye porque cada sabor ya tiene su propio contador
                  - 'buffet' se excluye porque cada persona suele querer proteína distinta */}
              {['ceviche', 'sopa', 'acompañamientos', 'acompanamiento', 'cantidad'].includes(selectedItemForModal.modal) && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">{fm.chooseQtyLabel || 'Cantidad:'}</p>
                    <div className="flex items-center gap-3 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setModalOptions({ ...modalOptions, qty: Math.max(1, (parseInt(modalOptions.qty, 10) || 1) - 1) })}
                        disabled={(parseInt(modalOptions.qty, 10) || 1) <= 1}
                        className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-base font-black text-white">{parseInt(modalOptions.qty, 10) || 1}</span>
                      <button
                        type="button"
                        onClick={() => setModalOptions({ ...modalOptions, qty: Math.min(99, (parseInt(modalOptions.qty, 10) || 1) + 1) })}
                        className="w-9 h-9 rounded-lg bg-[#FFD700] hover:bg-[#FFD700]/80 flex items-center justify-center text-black transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Section holding the fixed action button */}
            <div className="pt-4 border-t border-white/5 bg-[#121212]/95 shrink-0 mt-auto mb-6">
              <button
                onClick={confirmAndAdd}
                disabled={isBuffetSelectionIncomplete || isFlavorSelectionIncomplete || isAcompanamientoSelectionIncomplete}
                className="w-full bg-[#FFD700] text-black py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#FFD700]/10 text-xs sm:text-sm disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {fm.confirmAddButton}
              </button>
              <p className="text-[8px] text-center text-white/40 uppercase tracking-widest mt-3 font-bold">
                {cartHint}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Tabs Header */}
            <div className="flex overflow-x-auto no-scrollbar bg-black/20 border-b border-white/[0.05] p-2 md:p-3 gap-2">
              {menuData.map((category, idx) => (
                <button
                  key={category.cat}
                  onClick={() => setActiveTab(idx)}
                  className={`flex-1 min-w-[70px] md:min-w-[100px] py-3 md:py-4 flex flex-col items-center gap-1.5 transition-all duration-500 rounded-2xl relative group ${
                    activeTab === idx 
                      ? 'bg-gradient-to-br from-white/[0.1] to-transparent text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className={`text-xl md:text-2xl transition-transform duration-500 ${activeTab === idx ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'group-hover:scale-105'}`}>
                    {category.ico}
                  </span>
                  <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] text-center leading-none transition-colors duration-500`}>
                    {category.cat}
                  </span>
                  
                  {activeTab === idx && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-gradient-to-t from-[#F27F57]/10 to-transparent rounded-2xl pointer-events-none"
                    />
                  )}
                  {activeTab === idx && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute -bottom-2 md:-bottom-3 left-1/4 right-1/4 h-1 bg-[#F27F57] rounded-full shadow-[0_0_10px_rgba(242,127,87,0.5)]"
                    />
                  )}
                </button>
              ))}
            </div>

            <PackingFeeNotice text={fm.packingFeeNotice} />

            {/* Tab Content */}
            <div className="p-6 md:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {menuData[activeTab].items.map((item, idx) => (
                    item.tipo === 'header' ? (
                      <div key={idx} className="pt-8 pb-3 first:pt-2">
                        <h5 className="text-[11px] font-black text-[#F27F57] uppercase tracking-[0.4em] flex items-center gap-4">
                          <span className="w-8 h-[1px] bg-[#F27F57]/30"></span>
                          {item.n}
                          <span className="flex-1 h-[1px] bg-gradient-to-r from-[#F27F57]/30 to-transparent"></span>
                        </h5>
                      </div>
                    ) : (
                      <div
                        key={idx}
                        className="bg-white/[0.03] rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-white/[0.05] hover:border-[#F27F57]/40 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300 ease-out group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-white font-black text-lg md:text-xl mb-1.5 transition-colors group-hover:text-[#F27F57]">
                            {item.n}
                          </h4>
                          <p className="text-white/40 text-[13px] leading-relaxed italic font-medium">
                            {item.d}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-white/5">
                          <div className="bg-[#F27F57]/10 px-4 py-2 rounded-2xl border border-[#F27F57]/20">
                            <span className="text-[#FFD700] font-mono font-black text-base md:text-lg whitespace-nowrap tracking-tighter">
                              {typeof item.p === 'number' ? `₡${item.p.toLocaleString()}` : item.p}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCartClick(item)}
                            className="bg-[#F27F57] text-white p-4 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(242,127,87,0.4)] group-hover:shadow-[0_15px_25px_-5px_rgba(242,127,87,0.5)] flex-shrink-0"
                          >
                            <ShoppingCart size={20} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GalleryModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('COMIDA');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const categories = ['COMIDA', 'EVENTOS', 'RESTAURANTE'];
  
  const getImages = (category: string) => {
    const folder = category === 'EVENTOS' ? 'Evento' : category.toLowerCase();
    const prefix = 'WhatsApp Image 2026-04-05 at 22.08.';
    
    // Mapping based on the files created by the user earlier
    const imageMap: Record<string, string[]> = {
      'COMIDA': [
        '05 (3).jpeg', '05.jpeg', '07.jpeg', '09 (2).jpeg', '09 (4).jpeg', '10 (2).jpeg', 
        '10.jpeg', '11 (2).jpeg', '11 (6).jpeg', '12.jpeg'
      ],
      'EVENTOS': [
        '04.jpeg', '13 (1).jpeg', '13 (2).jpeg', '13.jpeg', '15 (2).jpeg', 
        '17 (1).jpeg', '17 (2).jpeg', '17.jpeg', '17 (3).jpeg'
      ],
      'RESTAURANTE': [
        '14 (1).jpeg', '14 (2).jpeg', '14.jpeg', '15 (1).jpeg', 
        '15.jpeg', '16 (1).jpeg', '16.jpeg'
      ]
    };

    return (imageMap[category] || []).map(suffix => `/${folder}/${prefix}${suffix}`);
  };

  const images = getImages(activeCategory);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(images[nextIndex]);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(prevIndex);
    setSelectedImage(images[prevIndex]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
      >
        {/* Header / Navigation */}
        <div className="p-6 flex flex-col items-center gap-6 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="w-full flex justify-between items-center">
             <div className="w-10" /> {/* Spacer */}
             <div className="flex gap-2 md:gap-4">
               {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => {
                     setActiveCategory(cat);
                     setSelectedImage(null);
                   }}
                   className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest transition-all ${
                     activeCategory === cat 
                       ? 'bg-[#FF7F50] text-white shadow-lg shadow-[#FF7F50]/20' 
                       : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
             <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
               <X size={32} />
             </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {images.map((src, idx) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  setSelectedImage(src);
                  setCurrentIndex(idx);
                }}
                className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative bg-white/5"
              >
                <img 
                  src={src} 
                  alt={`${activeCategory} ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={32} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Lightbox / Full Image View */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors z-[220]"
              >
                <X size={40} />
              </button>

              <button 
                onClick={handlePrev}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-[220] bg-white/5 p-4 rounded-full hover:bg-white/10"
              >
                <ChevronLeft size={48} />
              </button>

              <motion.img
                key={selectedImage}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={selectedImage}
                alt="Selected"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />

              <button 
                onClick={handleNext}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-[220] bg-white/5 p-4 rounded-full hover:bg-white/10"
              >
                <ChevronRight size={48} />
              </button>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm font-mono tracking-widest">
                {currentIndex + 1} / {images.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Simulated/Mock Delivery Data for Control Center Feed ---
const getSimulatedDeliveries = () => {
  return [];
};

// Defers mounting a background <video> until its section nears the viewport,
// so heavy MP4s (10-15MB) don't all download on initial page load.
function useLazyVideoSection<T extends HTMLElement>(rootMargin = '400px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, rootMargin]);
  return { ref, inView };
}

// The HTML `autoplay` attribute isn't reliable across browsers (video loads but
// stays paused on its first frame). Force play() explicitly and retry whenever the
// video becomes playable or the tab regains visibility, so background videos never
// get stuck showing a blank/frozen frame. `ready` lets lazily-mounted videos wait
// until their <video> element actually exists before wiring up listeners.
//
// Some mobile browsers and in-app webviews (Instagram/Facebook browser, low-power
// mode, data-saver mode, etc.) block muted autoplay outright, so loadeddata/canplay
// never manage to start it. As a last-resort fallback, the first tap/scroll/keypress
// anywhere on the page also retries every registered video — a user gesture always
// satisfies autoplay policies, so this guarantees the video eventually plays.
const pendingAutoplayRetries = new Set<() => void>();
let autoplayGestureListenerAttached = false;
function ensureAutoplayGestureListener() {
  if (autoplayGestureListenerAttached || typeof window === 'undefined') return;
  autoplayGestureListenerAttached = true;
  const retryAll = () => {
    pendingAutoplayRetries.forEach((retry) => retry());
  };
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((evt) =>
    window.addEventListener(evt, retryAll, { passive: true })
  );
}

function useAutoplayVideo(ready = true) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ready) return;
    const videoEl = ref.current;
    if (!videoEl) return;
    const tryPlay = () => {
      if (!videoEl.paused) return;
      videoEl.muted = true;
      videoEl.play().catch(() => {});
    };
    ensureAutoplayGestureListener();
    pendingAutoplayRetries.add(tryPlay);
    tryPlay();
    videoEl.addEventListener('loadeddata', tryPlay);
    videoEl.addEventListener('canplay', tryPlay);
    videoEl.addEventListener('pause', tryPlay);
    document.addEventListener('visibilitychange', tryPlay);
    return () => {
      pendingAutoplayRetries.delete(tryPlay);
      videoEl.removeEventListener('loadeddata', tryPlay);
      videoEl.removeEventListener('canplay', tryPlay);
      videoEl.removeEventListener('pause', tryPlay);
      document.removeEventListener('visibilitychange', tryPlay);
    };
  }, [ready]);
  return ref;
}

// --- Kitchen Display View (/cocina) ---
// A focused, tablet-friendly screen for kitchen staff: only food orders, only the
// buttons needed to move one through Pendiente -> Aceptado -> En Cocina -> Entregado.
// No reservations, no metrics, no delete - kitchen staff don't need (or shouldn't
// have) access to any of that. Reuses the same admin Supabase Auth login as the
// main dashboard; this is a separate view for a fixed kitchen tablet, not a
// separate user role/permission system.
const KitchenView = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data?.session);
      setCheckingSession(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message);
      } else {
        setIsAuthed(true);
      }
    } catch (err) {
      setLoginError('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('pedidos_delivery').select('*').order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
  };

  useEffect(() => {
    if (!isAuthed || !supabase) return;
    fetchOrders();
    const channel = supabase
      .channel('kitchen-realtime-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos_delivery' }, () => {
        playOrderNotification();
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos_delivery' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthed]);

  const advanceStatus = async (orderId: any, newStatus: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('pedidos_delivery').update({ estado: newStatus }).eq('id', orderId).select();
    if (!error && data && data.length > 0) fetchOrders();
  };

  const getDateOnly = (order: any) => {
    try {
      const d = new Date(order.created_at);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) { /* noop */ }
    return '';
  };

  const isOld = (order: any) => {
    const s = (order.estado || '').toLowerCase();
    if (s === 'entregado' || s === 'listo / entregado') {
      const t = new Date(order.created_at).getTime();
      return Date.now() - t > 2 * 60 * 60 * 1000;
    }
    return false;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeOrders = orders.filter(o => getDateOnly(o) === todayStr && !isOld(o));

  if (checkingSession) {
    return <div className="min-h-screen bg-[#0A111A] flex items-center justify-center text-white/40 font-bold uppercase tracking-widest">Cargando...</div>;
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0A111A] flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#0D1721] border-2 border-[#F27F57]/30 rounded-[2.5rem] p-8 space-y-6">
          <div className="text-center">
            <ChefHat size={40} className="mx-auto text-[#F27F57] mb-3" />
            <h1 className="text-xl font-black text-white uppercase tracking-wide">Panel de Cocina</h1>
            <p className="text-white/40 text-xs mt-1">Coco Víquez</p>
          </div>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo" className="w-full bg-[#0A192F] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#F27F57]" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className="w-full bg-[#0A192F] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#F27F57]" />
          {loginError && <p className="text-red-400 text-xs text-center font-bold">⚠️ {loginError}</p>}
          <button type="submit" disabled={isLoggingIn} className="w-full bg-[#F27F57] text-white py-4 rounded-xl font-black uppercase tracking-widest disabled:opacity-50">
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A111A] p-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ChefHat size={32} className="text-[#F27F57]" />
          <h1 className="text-2xl font-black text-white uppercase tracking-wide">Comandas de Cocina</h1>
        </div>
        <span className="bg-[#F27F57]/10 text-[#F27F57] px-4 py-2 rounded-full font-black text-sm border border-[#F27F57]/30">
          {activeOrders.length} activos
        </span>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-24 text-white/30 text-lg font-bold uppercase tracking-widest">
          No hay pedidos pendientes
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeOrders.map(order => {
            const { items } = parseOrderDetails(order);
            const normStatus = (order.estado || 'pendiente').toLowerCase();
            return (
              <div key={order.id} className="bg-[#0E1724] border-2 border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-lg font-black text-white">Pedido #{order.id}</span>
                  <span className="text-xs font-bold text-white/40">
                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="text-[#F27F57] font-bold text-sm">{order.cliente || 'Cliente'}</div>
                <div className="space-y-2 border-y border-white/5 py-4">
                  {items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-white text-base">
                      <span>{it.name}</span>
                      <span className="font-black text-[#F27F57]">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                {normStatus === 'pendiente' && (
                  <button onClick={() => advanceStatus(order.id, 'Aceptado')} className="w-full bg-cyan-500/15 text-cyan-400 border-2 border-cyan-500/40 py-4 rounded-xl font-black uppercase text-sm active:scale-[0.98] transition-transform">
                    👍 Aceptar Pedido
                  </button>
                )}
                {normStatus === 'aceptado' && (
                  <button onClick={() => advanceStatus(order.id, 'En Cocina')} className="w-full bg-purple-500/15 text-purple-400 border-2 border-purple-500/40 py-4 rounded-xl font-black uppercase text-sm active:scale-[0.98] transition-transform">
                    👨‍🍳 En Cocina
                  </button>
                )}
                {(normStatus === 'en cocina' || normStatus === 'en_cocina') && (
                  <button onClick={() => advanceStatus(order.id, 'Listo para Recoger')} className="w-full bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 py-4 rounded-xl font-black uppercase text-sm active:scale-[0.98] transition-transform">
                    📦 Listo para Recoger
                  </button>
                )}
                {normStatus === 'listo para recoger' && (
                  <div className="w-full bg-amber-500/10 text-amber-400/80 border-2 border-amber-500/20 py-3.5 rounded-xl text-sm font-black uppercase text-center">
                    📦 Esperando al dueño
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<'es' | 'en' | 'fr' | 'de'>(() => {
    const saved = localStorage.getItem('coco_viquez_lang');
    return (saved as any) || 'es';
  });

  const heroVideoRef = useAutoplayVideo();

  const [selectedResService, setSelectedResService] = useState<string>('Restaurante General');
  const [selectedResDate, setSelectedResDate] = useState<string>('');
  const [selectedResTime, setSelectedResTime] = useState<string>('12:00');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const resTriggerRef = useRef<HTMLDivElement>(null);
  const resPortalRef = useRef<HTMLDivElement>(null);
  const [resPortalStyle, setResPortalStyle] = useState<React.CSSProperties>({});
  const [isMobileRes, setIsMobileRes] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const minD = getCostaRicaNow();
    return new Date(minD.getFullYear(), minD.getMonth(), 1);
  });

  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>([]);
  const [savedBloqueos, setSavedBloqueos] = useState<{ fecha: string; servicio_tipo: string }[]>([]);
  const [showBlockedTable, setShowBlockedTable] = useState<boolean>(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState<boolean>(false);
  const [blockedList, setBlockedList] = useState<{ fecha: string; servicio_tipo: string; motivo?: string }[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState<boolean>(false);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [deletingKeys, setDeletingKeys] = useState<string[]>([]);
  const [selectedAdminService, setSelectedAdminService] = useState<string>('mesas');
  const [tempBlockedDatesForService, setTempBlockedDatesForService] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Recover password state & routing ---
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [loginMode, setLoginMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // RESET PASSWORD PAGE - States
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // CONTROL DE RESERVAS - States & Handlers
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'reservas' | 'delivery'>('reservas');
  const [selectedAdminDate, setSelectedAdminDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dashboardError, setDashboardError] = useState('');
  const [localReservasFallback, setLocalReservasFallback] = useState<any[]>([]);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);
  const [deliveryHistoryTimeframe, setDeliveryHistoryTimeframe] = useState<'dia' | 'hoy' | 'ayer' | 'mes'>('dia');
  const [deliveryHistoryDate, setDeliveryHistoryDate] = useState(() => {
    const today = new Date();
    return today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
  });

  const fetchReservas = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('id,cliente,email,idioma,fecha,fecha_hora,lugares,servicio_cotizado,estado')
        .order('fecha', { ascending: true });
      if (error) {
        console.warn('Error fetching reservas from Supabase:', error.message);
        setDashboardError('No se pudo encontrar o consultar la tabla "reservas" en Supabase. Usando simulación local segura.');
      } else if (data) {
        setReservas(data);
        setDashboardError('');
      }
    } catch (err: any) {
      console.warn('Network error fetching reservas:', err);
      setDashboardError('Error de red al conectar con Supabase.');
    }
  };

  const fetchDeliveryOrders = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('pedidos_delivery')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error fetching delivery orders from Supabase:', error.message);
      } else if (data) {
        setAdminOrders(data);
        setDashboardError(''); // Clear error on successful data retrieval
      }
    } catch (err: any) {
      console.warn('Network error fetching delivery orders:', err);
    }
  };

  const updateDeliveryStatus = async (orderId: any, newStatus: string) => {
    if (!supabase) return;
    try {
      // 'pedidos_delivery' only has an 'estado' column - there is no 'status' column,
      // sending one makes PostgREST reject the whole update.
      const { data: updatedRows, error } = await supabase
        .from('pedidos_delivery')
        .update({ estado: newStatus })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error("Error updating delivery status in Supabase:", error.message);
        setDashboardError("Error al actualizar el estado del pedido: " + error.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        console.error("El UPDATE no afectó ninguna fila. Probablemente la política RLS de UPDATE en 'pedidos_delivery' está bloqueando al usuario admin actual.");
        setDashboardError("No se pudo actualizar el pedido: la base de datos rechazó el cambio silenciosamente (0 filas afectadas). Revisa la política RLS de UPDATE en la tabla 'pedidos_delivery' para el rol 'authenticated'.");
      } else {
        await fetchDeliveryOrders();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const deleteDeliveryOrder = async (orderId: any) => {
    if (!supabase) return;
    if (!window.confirm('¿Eliminar este pedido de forma permanente?')) return;
    try {
      const { data: deletedRows, error } = await supabase
        .from('pedidos_delivery')
        .delete()
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('Error deleting delivery order:', error.message);
        setDashboardError('Error al eliminar el pedido: ' + error.message);
      } else if (!deletedRows || deletedRows.length === 0) {
        console.error("El DELETE no afectó ninguna fila. Probablemente la política RLS de DELETE en 'pedidos_delivery' está bloqueando al usuario admin actual.");
        setDashboardError("No se pudo eliminar el pedido: la base de datos rechazó el borrado silenciosamente (0 filas afectadas). Revisa la política RLS de DELETE en la tabla 'pedidos_delivery' para el rol 'authenticated'.");
      } else {
        setAdminOrders((prev) => prev.filter((o: any) => o.id !== orderId));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Web Push subscription for this admin device. The button that calls this only
  // renders inside the already-authenticated admin dashboard - see the
  // "Acceso Denegado" gate above - so there's no way to reach this flow without
  // first logging in with the admin's real credentials.
  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const existing = await registration?.pushManager.getSubscription();
      setPushSubscribed(!!existing);
    } catch (err) {
      console.warn('Could not check existing push subscription:', err);
    }
  };

  const handleEnablePush = async () => {
    setPushError('');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushError('Este navegador no soporta notificaciones push. Probá con Chrome en Android.');
      return;
    }
    const vapidPublicKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushError('Las notificaciones push no están configuradas todavía en el servidor.');
      return;
    }
    if (!supabase) {
      setPushError('Supabase no está configurado.');
      return;
    }

    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError('No se concedió el permiso de notificaciones. Revisa la configuración del navegador.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subJson = subscription.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert(
        [{
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }],
        { onConflict: 'endpoint' }
      );

      if (error) {
        console.error('Error saving push subscription:', error.message);
        setPushError('No se pudo guardar la suscripción: ' + error.message);
      } else {
        setPushSubscribed(true);
      }
    } catch (err: any) {
      console.error('Error enabling push notifications:', err);
      setPushError('Ocurrió un error activando las notificaciones: ' + (err.message || err));
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        if (supabase) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      setPushSubscribed(false);
    } catch (err: any) {
      console.error('Error disabling push notifications:', err);
      setPushError('No se pudo desactivar: ' + (err.message || err));
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) checkPushSubscription();
  }, [isAdmin]);

  const updateReservaEstado = async (id: number | string, nuevoEstado: string) => {
    // If it's a fallback record
    if (typeof id === 'number' && id >= 100) {
      setLocalReservasFallback(prev =>
        prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r)
      );
      return;
    }

    if (!supabase) return;
    try {
      const { data: updatedRows, error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id)
        .select();
      if (error) {
        console.error('Error updating reserva status:', error.message);
        setDashboardError('Error al actualizar estado: ' + error.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        console.error("El UPDATE no afectó ninguna fila. Probablemente la política RLS de UPDATE en 'reservas' está bloqueando al usuario admin actual.");
        setDashboardError("No se pudo actualizar la reserva: la base de datos rechazó el cambio silenciosamente (0 filas afectadas). Revisa la política RLS de UPDATE en la tabla 'reservas' para el rol 'authenticated'.");
      } else {
        await fetchReservas();

        if (updatedRows[0]?.email) {
          const reserva = updatedRows[0];
          try {
            if (nuevoEstado === 'confirmado') {
              await fetch('/api/send-reservation-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: reserva.cliente,
                  email: reserva.email,
                  date: reserva.fecha,
                  time: reserva.fecha_hora?.split('T')[1]?.slice(0, 5) || '',
                  guests: reserva.lugares,
                  alergias: reserva.alergias || '',
                  lang: reserva.idioma || 'es'
                })
              });
            } else if (nuevoEstado === 'cancelado') {
              await fetch('/api/send-reservation-cancellation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: reserva.cliente,
                  email: reserva.email,
                  date: reserva.fecha,
                  time: reserva.fecha_hora?.split('T')[1]?.slice(0, 5) || '',
                  guests: reserva.lugares,
                  lang: reserva.idioma || 'es'
                })
              });
            }
          } catch (emailErr: any) {
            console.error('Error sending email:', emailErr);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const deleteReserva = async (id: number | string) => {
    if (typeof id === 'number' && id >= 100) {
      setLocalReservasFallback(prev => prev.filter(r => r.id !== id));
      return;
    }

    if (!supabase) return;
    try {
      const { data: deletedRows, error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)
        .select();
      if (error) {
        console.error('Error deleting reserva:', error.message);
        setDashboardError('Error al eliminar reserva: ' + error.message);
      } else if (!deletedRows || deletedRows.length === 0) {
        console.error("El DELETE no afectó ninguna fila. Probablemente la política RLS de DELETE en 'reservas' está bloqueando al usuario admin actual.");
        setDashboardError("No se pudo eliminar la reserva: la base de datos rechazó el borrado silenciosamente (0 filas afectadas). Revisa la política RLS de DELETE en la tabla 'reservas' para el rol 'authenticated'.");
      } else {
        await fetchReservas();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const dayHasReservations = (dateStr: string) => {
    return (reservas || []).some(r => toDateOnly(r.fecha) === dateStr);
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchReservas();
    fetchDeliveryOrders();
    fetchBlockedDates();

    if (!supabase) return;

    // Realtime postgres updates channel for pedidos_delivery table
    const channel = supabase
      .channel('delivery-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos_delivery'
        },
        (payload) => {
          console.log('Realtime new delivery order received:', payload.new);
          playOrderNotification();

          // Add new order to display state
          setAdminOrders((prevOrders) => {
            const alreadyExists = prevOrders.some(order => order.id === payload.new.id);
            if (alreadyExists) return prevOrders;
            return [payload.new, ...prevOrders];
          });

          // Clear error banner on successful real-time connection flow
          setDashboardError('');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos_delivery'
        },
        (payload) => {
          const wasReady = (payload.old?.estado || '').toLowerCase() === 'listo para recoger';
          const isNowReady = (payload.new?.estado || '').toLowerCase() === 'listo para recoger';
          if (isNowReady && !wasReady) {
            playReadyForPickupNotification();
          }
          setAdminOrders((prevOrders) => prevOrders.map((order: any) => order.id === payload.new.id ? payload.new : order));
        }
      )
      .subscribe();

    // Realtime postgres updates channel for new reservas (table bookings +
    // service reservation requests) - separate channel/tone from delivery
    // orders so the kitchen and front-of-house alerts stay distinguishable.
    const reservasChannel = supabase
      .channel('reservas-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservas'
        },
        (payload) => {
          console.log('Realtime new reservation received:', payload.new);
          playReservationNotification();

          setReservas((prev) => {
            const alreadyExists = prev.some((r: any) => r.id === payload.new.id);
            if (alreadyExists) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reservasChannel);
    };
  }, [isAdmin]);

  useEffect(() => {
    async function checkSession() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
    }
    checkSession();
  }, []);

  const toggleBlockedDate = async (dateStr: string, servicioTipo: string = 'mesas') => {
    if (!supabase) return;
    try {
      const isCurrentlyBlocked = savedBloqueos.some(
        b => b.fecha === dateStr && b.servicio_tipo === servicioTipo
      );
      if (isCurrentlyBlocked) {
        const { data: deletedRows, error } = await supabase
          .from('fechas_bloqueadas')
          .delete()
          .eq('fecha', dateStr)
          .eq('servicio_tipo', servicioTipo)
          .select();
        if (error) {
          console.warn('Error on delete from Supabase in toggleBlockedDate:', error.message);
          setDashboardError('Error al desbloquear el día: ' + error.message);
        } else if (!deletedRows || deletedRows.length === 0) {
          console.error("El DELETE no afectó ninguna fila en toggleBlockedDate. Probablemente RLS está bloqueando al usuario admin actual.");
          setDashboardError("No se pudo desbloquear el día: la base de datos rechazó el borrado silenciosamente. Revisa la política RLS de DELETE en 'fechas_bloqueadas'.");
        }
      } else {
        const { error } = await supabase
          .from('fechas_bloqueadas')
          .upsert(
            [{ fecha: dateStr, servicio_tipo: servicioTipo }],
            { onConflict: 'fecha, servicio_tipo' }
          );
        if (error) {
          console.warn('Error on upsert to Supabase in toggleBlockedDate:', error.message);
        }
      }
      await fetchBlockedDates();
      if (showBlockedTable || isBlockedModalOpen) {
        const { data } = await supabase
          .from('fechas_bloqueadas')
          .select('*')
          .order('fecha', { ascending: true });
        if (data) {
          setBlockedList(data.map((b: any) => ({
            fecha: b.fecha,
            servicio_tipo: b.servicio_tipo || 'todos',
            motivo: b.motivo || ''
          })));
        }
      }
    } catch (err) {
      console.warn('Unexpected error in toggleBlockedDate:', err);
    }
  };

  const handleStatusChange = (dateStr: string, status: 'available' | 'blocked') => {
    if (status === 'available') {
      setTempBlockedDatesForService(prev => prev.filter(d => d !== dateStr));
    } else {
      setTempBlockedDatesForService(prev => prev.includes(dateStr) ? prev : [...prev, dateStr]);
    }
  };

  const handleSaveCalendarChanges = async () => {
    if (!supabase) return;
    try {
      const originallyBlocked = savedBloqueos
        .filter(b => b.servicio_tipo === selectedAdminService)
        .map(b => b.fecha);
      
      const datesToInsert = tempBlockedDatesForService.filter(d => !originallyBlocked.includes(d));
      const datesToDelete = originallyBlocked.filter(d => !tempBlockedDatesForService.includes(d));
      
      if (datesToInsert.length === 0 && datesToDelete.length === 0) {
        alert('No hay cambios pendientes por guardar para este servicio.');
        return;
      }
      
      if (datesToDelete.length > 0) {
        const { data: deletedRows, error: deleteError } = await supabase
          .from('fechas_bloqueadas')
          .delete()
          .eq('servicio_tipo', selectedAdminService)
          .in('fecha', datesToDelete)
          .select();

        if (deleteError) throw deleteError;
        if (!deletedRows || deletedRows.length < datesToDelete.length) {
          throw new Error(`Solo se desbloquearon ${deletedRows?.length || 0} de ${datesToDelete.length} fechas — revisa la política RLS de DELETE en 'fechas_bloqueadas'.`);
        }
      }
      
      if (datesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('fechas_bloqueadas')
          .upsert(
            datesToInsert.map(d => ({
              fecha: d,
              servicio_tipo: selectedAdminService
            })),
            { onConflict: 'fecha, servicio_tipo' }
          );
          
        if (insertError) throw insertError;
      }
      
      alert(`¡Cambios guardados con éxito para el servicio seleccionado!`);
      await fetchBlockedDates();
    } catch (err: any) {
      console.error('Error in handleSaveCalendarChanges:', err);
      alert('Error guardando cambios: ' + (err.message || err));
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setLoginError('El cliente de Supabase no está configurado.');
      return;
    }
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      if (error) {
        setLoginError(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message);
      } else if (data?.session) {
        setIsAdmin(true);
        setShowLoginModal(false);
        setShowAdmin(true);
        setAdminEmail('');
        setAdminPassword('');
      }
    } catch (err: any) {
      setLoginError('Ocurrió un error inesperado al iniciar sesión.');
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setForgotError('El cliente de Supabase no está configurado.');
      return;
    }
    setForgotError('');
    setForgotSuccess('');
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) {
        setForgotError(error.message);
      } else {
        setForgotSuccess("Se ha enviado un enlace seguro a tu correo electrónico.");
        setForgotEmail('');
      }
    } catch (err: any) {
      setForgotError('Ocurrió un error inesperado al enviar el enlace.');
      console.error(err);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setResetError('El cliente de Supabase no está configurado.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setResetError(error.message);
      } else {
        setResetSuccess('¡Tu contraseña ha sido actualizada con éxito!');
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 3000);
      }
    } catch (err: any) {
      setResetError('Ocurrió un error inesperado al actualizar la contraseña.');
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    if (!supabase) return;
    try {
      // 1. Fetch entries
      const { data, error } = await supabase
        .from('fechas_bloqueadas')
        .select('fecha, servicio_tipo');
      if (error) {
        console.error('Error fetching blocked dates from Supabase:', error.message);
        return;
      }
      if (data) {
        const rawBloqueos = data.map((item: any) => ({
          fecha: item.fecha,
          servicio_tipo: item.servicio_tipo || 'todos'
        }));
        setSavedBloqueos(rawBloqueos);
        setBlockedCount(data.length);
      }
    } catch (err) {
      console.error('Unexpected error fetching blocked dates:', err);
    }
  };

  const handleLoadBlockedDaysDetail = async () => {
    setIsBlockedModalOpen(true);
    if (!supabase) return;
    setIsLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from('fechas_bloqueadas')
        .select('*')
        .order('fecha', { ascending: true });
      if (error) {
        console.error('Error fetching ordered blocked days detail:', error.message);
      } else if (data) {
        const mappedList = data.map((b: any) => ({
          id: b.id,
          fecha: b.fecha,
          servicio_tipo: b.servicio_tipo || 'todos',
          motivo: b.motivo || ''
        }));
        setBlockedList(mappedList);
        setBlockedCount(mappedList.length);
      }
    } catch (err) {
      console.error('Error in handleLoadBlockedDaysDetail:', err);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const deleteBlockedDate = async (dateStr: string, servicioTipo: string) => {
    if (!supabase) return;
    const key = `${dateStr}_${servicioTipo}`;
    setDeletingKeys(prev => [...prev, key]);
    try {
      const { data: deletedRows, error } = await supabase
        .from('fechas_bloqueadas')
        .delete()
        .eq('fecha', dateStr)
        .eq('servicio_tipo', servicioTipo)
        .select();

      if (error) {
        console.error('Error deleting blocked date:', error.message);
        alert('Hubo un error al intentar habilitar el día: ' + error.message);
      } else if (!deletedRows || deletedRows.length === 0) {
        console.error("El DELETE no afectó ninguna fila. Probablemente la política RLS de DELETE en 'fechas_bloqueadas' está bloqueando al usuario admin actual.");
        alert("No se pudo habilitar el día: la base de datos rechazó el borrado silenciosamente (0 filas afectadas). Revisa la política RLS de DELETE en la tabla 'fechas_bloqueadas' para el rol 'authenticated'.");
      } else {
        // Refresh counts and main calendars immediately
        await fetchBlockedDates();
        // Refresh the detail table loaded in the modal
        const { data } = await supabase
          .from('fechas_bloqueadas')
          .select('*')
          .order('fecha', { ascending: true });
        if (data) {
          setBlockedList(data.map((b: any) => ({
            id: b.id,
            fecha: b.fecha,
            servicio_tipo: b.servicio_tipo || 'todos',
            motivo: b.motivo || ''
          })));
        }
      }
    } catch (err) {
      console.error('Unexpected error in deleteBlockedDate:', err);
    } finally {
      setDeletingKeys(prev => prev.filter(k => k !== key));
    }
  };

  const handleHabilitar = async (id: string | number | undefined, dateStr?: string, servicioTipo?: string) => {
    if (!supabase) return;
    
    const key = id ? String(id) : (dateStr && servicioTipo ? `${dateStr}_${servicioTipo}` : '');
    if (key) {
      setDeletingKeys(prev => [...prev, key]);
    }

    try {
      let query = supabase.from('fechas_bloqueadas').delete();
      if (id) {
        query = query.eq('id', id);
      } else if (dateStr && servicioTipo) {
        query = query.eq('fecha', dateStr).eq('servicio_tipo', servicioTipo);
      } else {
        if (key) {
          setDeletingKeys(prev => prev.filter(k => k !== key));
        }
        return;
      }

      // .select() forces PostgREST to return the deleted rows. Supabase does NOT
      // report an error when a RLS policy silently filters out the target row(s) —
      // it just deletes 0 rows and reports success, so checking `error` alone is not
      // enough to know the delete actually happened.
      const { data: deletedRows, error } = await query.select();

      if (error) {
        console.error("Error al habilitar la fecha bloqueada:", error.message);
        alert("Hubo un error al intentar habilitar el día: " + error.message);
      } else if (!deletedRows || deletedRows.length === 0) {
        console.error("El DELETE no afectó ninguna fila. Probablemente la política RLS de DELETE en 'fechas_bloqueadas' está bloqueando al usuario admin actual.");
        alert("No se pudo habilitar el día: la base de datos rechazó el borrado silenciosamente (0 filas afectadas). Revisa la política RLS de DELETE en la tabla 'fechas_bloqueadas' para el rol 'authenticated'.");
      } else {
        // Actualizar el estado local para reflejar el cambio instantáneamente
        setBlockedList(prev => prev.filter(b => {
          if (id && b.id) {
            return b.id !== id;
          }
          if (dateStr && b.fecha === dateStr && servicioTipo && b.servicio_tipo === servicioTipo) {
            return false;
          }
          return true;
        }));

        // Actualizar el contador restando 1
        setBlockedCount(prev => Math.max(0, prev - 1));

        // Sincronizar otros calendarios o componentes del dashboard en segundo plano
        fetchBlockedDates();
      }
    } catch (err) {
      console.error("Excepción al intentar habilitar:", err);
    } finally {
      if (key) {
        setDeletingKeys(prev => prev.filter(k => k !== key));
      }
    }
  };

  const fetchBloqueos = fetchBlockedDates;

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'mesas': return 'Reservas de Mesa';
      case 'todos': return 'Todos los Servicios';
      case 'clases_cocina':
      case 'clase': return 'Clases de Cocina';
      case 'catering': return 'Servicio de Catering';
      case 'parrilladas': return 'Parrilladas / Grillades';
      case 'eventos': return 'Eventos Privados';
      case 'chef': return 'Chef Personal';
      case 'fonda': return 'Cantine Massive / Fonda';
      case 'turismo': return 'Turismo y Excursiones';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  useEffect(() => {
    fetchBlockedDates();
  }, []);

  const getServiceTypeFromLabel = (label: string): string => {
    switch (label) {
      case 'Restaurante General':
      case 'Reservas de Mesa':
        return 'mesas';
      case 'Catering Service':
      case 'Servicio de Catering':
        return 'catering';
      case 'Parrilladas':
      case 'Parrilladas / Grillades':
        return 'parrilladas';
      case 'Eventos Privados':
        return 'eventos';
      case 'Chef Personal':
        return 'chef';
      case 'Clases de Cocina Típica':
      case 'Clases de Cocina':
        return 'clases_cocina';
      case 'Cantine Massive / Fonda':
      case 'Fonda':
        return 'fonda';
      case 'Turismo y Excursiones':
      case 'Turismo':
        return 'turismo';
      default:
        return 'mesas';
    }
  };

  useEffect(() => {
    const activeType = getServiceTypeFromLabel(selectedResService);
    const tableBlocked = savedBloqueos
      .filter(b => b.servicio_tipo === activeType || b.servicio_tipo === 'todos')
      .map(b => b.fecha);
    setFechasBloqueadas(tableBlocked);
  }, [savedBloqueos, selectedResService]);

  useEffect(() => {
    const initiallyBlocked = savedBloqueos
      .filter(b => b.servicio_tipo === selectedAdminService)
      .map(b => b.fecha);
    setTempBlockedDatesForService(initiallyBlocked);
  }, [selectedAdminService, savedBloqueos]);

  useEffect(() => {
    localStorage.setItem('coco_viquez_lang', lang);
  }, [lang]);

  useEffect(() => {
    // Global optimization for date inputs: trigger showPicker on click anywhere in the field
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT' && target.type === 'date') {
        if ('showPicker' in target) {
          try {
            target.showPicker();
          } catch (err) {
            console.error('showPicker failed:', err);
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const btn = document.getElementById('backToTop');
      if (btn) {
        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 50;

        if (scrollPosition >= threshold) {
          btn.classList.remove('opacity-0', 'pointer-events-none');
          btn.classList.add('opacity-100', 'pointer-events-auto');
        } else {
          btn.classList.remove('opacity-100', 'pointer-events-auto');
          btn.classList.add('opacity-0', 'pointer-events-none');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mostrarMas, setMostrarMas] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: 'privacy' | 'terms' | null }>({ isOpen: false, type: null });
  const [reservationData, setReservationData] = useState<any>(null);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [formError, setFormError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const resDateInputRef = useRef<HTMLInputElement>(null);
  const [numPeople, setNumPeople] = useState('1');
  const [resDateError, setResDateError] = useState(false);

  const todayStr = (() => {
    const d = new Date();
    return d.getFullYear() + '-' + 
      String(d.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d.getDate()).padStart(2, '0');
  })();

  const getOrderDateOnly = (order: any) => {
    try {
      const d = new Date(order.created_at || order.timestamp);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' + 
          String(d.getMonth() + 1).padStart(2, '0') + '-' + 
          String(d.getDate()).padStart(2, '0');
      }
    } catch (e) {}
    if (typeof order.timestamp === 'string' && order.timestamp.includes('-')) {
      return order.timestamp.split('T')[0];
    }
    return '';
  };

  const isOldEntregado = (order: any) => {
    const statusLower = (order.status || order.estado || '').toLowerCase();
    if (statusLower === 'entregado' || statusLower === 'listo / entregado') {
      try {
        const orderTime = new Date(order.created_at || order.timestamp).getTime();
        const nowTime = Date.now();
        const diffMs = nowTime - orderTime;
        return diffMs > 2 * 60 * 60 * 1000;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const activeDeliveryCount = (adminOrders || []).filter(order => {
    const isToday = getOrderDateOnly(order) === todayStr;
    const statusLower = (order.status || order.estado || '').toLowerCase();
    const isPendingOrCooking = ['pendiente', 'en cocina', 'en_cocina', 'listo para recoger'].includes(statusLower);
    return isToday && isPendingOrCooking;
  }).length;

  const getStatusBadge = (status: string) => {
    const norm = (status || '').toLowerCase();
    if (norm === 'pendiente') {
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
    }
    if (norm === 'aceptado') {
      return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]';
    }
    if (norm === 'en cocina' || norm === 'en_cocina') {
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_8px_rgba(168,85,247,0.1)]';
    }
    if (norm === 'listo para recoger') {
      return 'bg-orange-500/15 text-orange-400 border border-orange-500/25 shadow-[0_0_8px_rgba(249,115,22,0.15)]';
    }
    return 'bg-green-500/15 text-green-400 border border-green-500/25 shadow-[0_0_8px_rgba(34,197,94,0.1)]';
  };

  const getAvailableHoursForDate = (dateStr: string) => {
    const dNow = getCostaRicaNow();
    const todayISO = `${dNow.getFullYear()}-${(dNow.getMonth() + 1).toString().padStart(2, '0')}-${dNow.getDate().toString().padStart(2, '0')}`;
    
    // 7:00 AM (7) to 9:00 PM (21) -> exactly 15 hours
    const allHours = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 7;
      const min = 0;
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      return { hour, min, timeStr };
    });

    const currentHour = dNow.getHours();
    const currentMin = dNow.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMin;

    return allHours.map(opt => {
      const optionMinutes = opt.hour * 60 + opt.min;
      const isPast = dateStr === todayISO && optionMinutes < currentTotalMinutes;
      return { ...opt, isPast };
    });
  };

  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const minDateISO = (() => {
    const dNow = getCostaRicaNow();
    const currentHour = dNow.getHours();
    
    if (currentHour >= 21) {
      const tomorrow = new Date(dNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
    } else {
      return `${dNow.getFullYear()}-${(dNow.getMonth() + 1).toString().padStart(2, '0')}-${dNow.getDate().toString().padStart(2, '0')}`;
    }
  })();

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: '', enabled: false, isPast: false });
    }
    
    const dNow = getCostaRicaNow();
    const todayISO = `${dNow.getFullYear()}-${(dNow.getMonth() + 1).toString().padStart(2, '0')}-${dNow.getDate().toString().padStart(2, '0')}`;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isBlocked = fechasBloqueadas.includes(dateStr);
      const isPast = dateStr < todayISO;
      
      let isEnabled = false;
      if (!isPast) {
        if (isAdmin) {
          isEnabled = true;
        } else {
          isEnabled = (dateStr >= minDateISO && !isBlocked);
        }
      }
      
      days.push({ dayNum: d, dateStr, enabled: isEnabled, isPast });
    }
    
    return days;
  };

  const changeMonth = (dir: number) => {
    setCurrentMonth(prev => {
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileRes(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateResPosition = () => {
    if (resTriggerRef.current && window.innerWidth > 768) {
      const rect = resTriggerRef.current.getBoundingClientRect();
      const top = rect.bottom + window.scrollY;
      const left = rect.left + window.scrollX;
      setResPortalStyle({
        position: 'absolute',
        top: `${top + 4}px`,
        left: `${left}px`,
        width: `${rect.width}px`,
        minWidth: '280px',
        zIndex: 99999
      });
    }
  };

  useEffect(() => {
    if (calendarOpen) {
      updateResPosition();
      window.addEventListener('resize', updateResPosition);
      window.addEventListener('scroll', updateResPosition, true);
    }
    return () => {
      window.removeEventListener('resize', updateResPosition);
      window.removeEventListener('scroll', updateResPosition, true);
    };
  }, [calendarOpen]);

  useEffect(() => {
    const handleCloseCalendar = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (resTriggerRef.current && resTriggerRef.current.contains(target)) ||
        (resPortalRef.current && resPortalRef.current.contains(target)) ||
        (calendarRef.current && calendarRef.current.contains(target))
      ) {
        return;
      }
      setCalendarOpen(false);
    };
    document.addEventListener('mousedown', handleCloseCalendar);
    return () => document.removeEventListener('mousedown', handleCloseCalendar);
  }, []);

  useEffect(() => {
    const handleCloseTimeDropdown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(target)) {
        setTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleCloseTimeDropdown);
    return () => document.removeEventListener('mousedown', handleCloseTimeDropdown);
  }, []);

  // Sync / Reset selectedResTime to a valid option if current becomes invalid on date shift to "today"
  useEffect(() => {
    if (!selectedResDate) return;
    
    const available = getAvailableHoursForDate(selectedResDate);
    const validOptions = available.filter(opt => !opt.isPast);
    const isSelectedTimeValid = validOptions.some(opt => opt.timeStr === selectedResTime);
    
    if (!isSelectedTimeValid) {
      if (validOptions.length > 0) {
        setSelectedResTime(validOptions[0].timeStr);
        setResDateError(false);
      } else {
        setSelectedResTime('');
        setResDateError(true);
      }
    }
  }, [selectedResDate, selectedResTime]);

  const handleResDateChange = (date: string) => {
    if (!date) {
      setResDateError(false);
      return;
    }
    const isBlocked = fechasBloqueadas.includes(date);
    if (isBlocked) {
      setResDateError(true);
      return;
    }
    
    const dNow = getCostaRicaNow();
    const currentHour = dNow.getHours();
    let currentMinDateISO = '';
    
    if (currentHour >= 21) {
      const tomorrow = new Date(dNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      currentMinDateISO = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
    } else {
      currentMinDateISO = `${dNow.getFullYear()}-${(dNow.getMonth() + 1).toString().padStart(2, '0')}-${dNow.getDate().toString().padStart(2, '0')}`;
    }

    if (date < currentMinDateISO) {
      setResDateError(true);
    } else {
      setResDateError(false);
    }
  };

  const t = translations[lang];

  const locationVideo = useLazyVideoSection<HTMLElement>();
  const testimonialsVideo = useLazyVideoSection<HTMLElement>();
  const locationVideoRef = useAutoplayVideo(locationVideo.inView);
  const testimonialsVideoRef = useAutoplayVideo(testimonialsVideo.inView);

  useEffect(() => {
    if (!t.testimonials.items || t.testimonials.items.length === 0) return;
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % t.testimonials.items.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [testimonialIdx, t.testimonials.items.length]);




  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (name: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.name === name) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (name: string) => {
    setCart(prev => prev.filter(item => item.name !== name));
  };

  const confirmOrder = async (location: string | null, address: string, paymentMethod: 'card' | 'sinpe' | 'cash', email: string, phone: string, name: string, deliveryFee: number) => {
    const sanitizedName = sanitizeInput(name);
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedAddress = sanitizeInput(address);
    const sanitizedEmail = sanitizeInput(email);

    // 1. DESGLOSE COMPLETO Y DETALLADO DE PLATOS + EXTRAS:
    const itemsList = cart.map(item => {
      const cleanName = item.name
        .replace(/,\s*Extra:\s*[^,)]+/g, '')
        .replace(/\(\s*Extra:\s*[^,)]+\)/g, '')
        .replace(/\(\s*Extra:\s*[^,)]+,\s*/g, '(')
        .replace(/\(\s*\)/g, '')
        .trim();
      let itemStr = `• ${item.quantity}x ${cleanName} (${item.price})`;
      if (item.extras && item.extras.length > 0) {
        itemStr += `\n  * Extras:\n` + item.extras.map(e => `    - ${e} (+₡2,500)`).join('\n');
      }
      return itemStr;
    }).join('\n\n');

    const subtotal = cart.reduce((acc, item) => {
      const price = item.finalPrice || parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
      return acc + (price * item.quantity);
    }, 0);
    const dishCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const packingFee = dishCount * PACKING_FEE_PER_DISH;
    const total = subtotal + deliveryFee + packingFee;
    
    const transactionId = 'VQX-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const paymentMethodLabel = paymentMethod === 'card' ? 'Tarjeta' : paymentMethod === 'cash' ? 'Efectivo' : 'Sinpe Móvil';
    
    const finalLocationUrl = ((window as any).userLatitude && (window as any).userLongitude)
      ? `https://www.google.com/maps?q=${(window as any).userLatitude},${(window as any).userLongitude}`
      : (location || '');

    // Inserción en Supabase 'pedidos_delivery'.
    // Column names verified against the live 'pedidos_delivery' schema: cliente, telefono,
    // direccion_escrita, latitud, longitud, detalle_pedido, total_pago, estado, address.
    // There is no dedicated column for payment method or email, so both ride along inside
    // detalle_pedido (as JSON) instead of being silently dropped.
    if (supabase) {
      try {
        const payload = {
          cliente: sanitizedName,
          telefono: sanitizedPhone,
          direccion_escrita: sanitizedAddress,
          address: finalLocationUrl,
          latitud: (window as any).userLatitude || null,
          longitud: (window as any).userLongitude || null,
          detalle_pedido: JSON.stringify({
            items: cart.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              extras: item.extras || []
            })),
            email: sanitizedEmail,
            payment_method: paymentMethodLabel,
            transaction_id: transactionId,
            packing_fee: packingFee,
            dish_count: dishCount,
            idioma: lang
          }),
          total_pago: total,
          estado: 'Pendiente'
        };

        const { error: errFull } = await supabase.from('pedidos_delivery').insert([payload]);
        if (errFull) {
          console.error("Error insertando pedido en Supabase 'pedidos_delivery':", errFull.message);
        }
      } catch (err) {
        console.error("Exception during Supabase insert for pedidos_delivery:", err);
      }
    }


    let message = `📍 *NUEVO PEDIDO DELIVERY - COCO VÍQUEZ*\n\n` +
                  `*=== DATOS DE ENTREGA ===*\n` +
                  `*Cliente:* ${sanitizedName}\n` +
                  `*Teléfono:* ${sanitizedPhone}\n\n` +
                  `*=== RESUMEN DEL PEDIDO ===*\n` +
                  `${itemsList}\n\n` +
                  `*Subtotal:* ₡${subtotal.toLocaleString()}\n`;
    if (deliveryFee > 0) {
      message += `*Envío:* ₡${deliveryFee.toLocaleString()}\n`;
    }
    message += `*Cargo de Empaque (${dishCount}x ₡${PACKING_FEE_PER_DISH.toLocaleString()}):* ₡${packingFee.toLocaleString()}\n`;
    message += `*Total:* ₡${total.toLocaleString()}\n\n` +
               `*=== DIRECCIÓN ESCRITA ===*\n` +
               `${sanitizedAddress || 'No proporcionada'}\n\n`;

    if ((window as any).userLatitude && (window as any).userLongitude) {
      message += `📍 *Mapa de Entrega:* https://www.google.com/maps?q=${(window as any).userLatitude},${(window as any).userLongitude}\n\n`;
    }

    message += `Favor confirmar recepción del pago para iniciar preparación.`;
    
    if (paymentMethod === 'card') {
      message += `\n\n*Estado:* Pagado vía Tarjeta/Apple Pay (ID: ${transactionId})`;
    } else if (paymentMethod === 'cash') {
      message += `\n\n*Método de Pago:* Efectivo (Pago contra entrega)`;
    } else {
      message += `\n\n*Método de Pago:* SINPE Móvil`;
    }

    // 2. ENVIAR CORREO HTML AL PROPIETARIO (Formspree background dispatch):
    const htmlItemsList = cart.map(item => {
      const cleanName = item.name
        .replace(/,\s*Extra:\s*[^,)]+/g, '')
        .replace(/\(\s*Extra:\s*[^,)]+\)/g, '')
        .replace(/\(\s*Extra:\s*[^,)]+,\s*/g, '(')
        .replace(/\(\s*\)/g, '')
        .trim();
      let itemHtml = `<div style="padding: 10px 0; border-bottom: 1px dashed rgba(255, 255, 255, 0.1);">`;
      itemHtml += `<p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">• ${item.quantity}x ${cleanName} (<span style="color: #ffd700;">${item.price}</span>)</p>`;
      if (item.extras && item.extras.length > 0) {
        itemHtml += `<ul style="margin: 5px 0 0 20px; padding: 0; font-size: 13px; color: rgba(255,255,255,0.7); list-style-type: square;">`;
        item.extras.forEach(e => {
          itemHtml += `<li style="margin-bottom: 2px;">Extra: ${e} (+₡2,500)</li>`;
        });
        itemHtml += `</ul>`;
      }
      itemHtml += `</div>`;
      return itemHtml;
    }).join('');

    const mapsButtonHtml = ((window as any).userLatitude && (window as any).userLongitude)
      ? `<div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
          <a href="https://www.google.com/maps?q=${(window as any).userLatitude},${(window as any).userLongitude}" target="_blank" style="display: inline-block; background-color: #ffd700; color: #000000; font-weight: 850; text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px; padding: 15px 25px; border-radius: 8px; text-decoration: none; border: 1px solid #ffd700; box-shadow: 0 4px 12px rgba(255,215,0,0.3); font-family: sans-serif;">🗺️ VER UBICACIÓN DE ENTREGA EN GOOGLE MAPS</a>
         </div>`
      : '';

    const emailHtmlBody = `
      <div style="background-color: #0d1b2a; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255, 215, 0, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #ffd700; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">🚨 NUEVA COMANDA EN LÍNEA</h1>
          <p style="color: #F27F57; margin: 5px 0 0; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">COCO VÍQUEZ</p>
        </div>
        
        <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <h3 style="color: #ffd700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 5px; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">👤 DATOS DEL CLIENTE</h3>
          <p style="margin: 8px 0; font-size: 14px; color: rgba(255,255,255,0.9);"><strong>Cliente:</strong> ${name}</p>
          <p style="margin: 8px 0; font-size: 14px; color: rgba(255,255,255,0.9);"><strong>Teléfono:</strong> ${phone}</p>
          <p style="margin: 8px 0; font-size: 14px; color: rgba(255,255,255,0.9);"><strong>Email:</strong> ${email}</p>
        </div>

        <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <h3 style="color: #ffd700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 5px; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🍔 DETALLE DEL PEDIDO</h3>
          ${htmlItemsList}
        </div>

        <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <h3 style="color: #ffd700; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 5px;">💰 DESGLOSE DE PAGO</h3>
          <table style="width: 100%; font-size: 14px; color: #ffffff; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 6px 0; color: rgba(255,255,255,0.7);">Subtotal:</td>
              <td style="text-align: right; font-weight: bold;">₡${subtotal.toLocaleString()}</td>
            </tr>
            ${deliveryFee > 0 ? `
            <tr>
              <td style="padding: 6px 0; color: rgba(255,255,255,0.7);">Costo de Envío:</td>
              <td style="text-align: right; font-weight: bold;">₡${deliveryFee.toLocaleString()}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: rgba(255,255,255,0.7);">Cargo de Empaque (${dishCount}x ₡${PACKING_FEE_PER_DISH.toLocaleString()}):</td>
              <td style="text-align: right; font-weight: bold;">₡${packingFee.toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid rgba(255, 255, 255, 0.15);">
              <td style="padding: 12px 0 0; font-weight: 800; color: #ffd700; font-size: 16px;">TOTAL:</td>
              <td style="padding: 12px 0 0; text-align: right; font-weight: 900; color: #ffd700; font-size: 18px;">₡${total.toLocaleString()}</td>
            </tr>
          </table>
          <p style="margin: 15px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.5);"><strong>Método de Pago:</strong> ${paymentMethodLabel}</p>
        </div>

        <div style="margin-bottom: 25px; background-color: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <h3 style="color: #ffd700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 5px; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📍 DIRECCIÓN DE ENTREGA</h3>
          <p style="margin: 8px 0; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.9); whitespace: pre-wrap;">${address || 'No proporcionada'}</p>
        </div>

        ${mapsButtonHtml}
      </div>
    `;

    try {
      await fetch('https://formspree.io/f/xyzkvovp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'Restaurantecocoviquezph@gmail.com',
          message: message,
          html_content: emailHtmlBody,
          _subject: '🚨 NUEVA COMANDA EN LÍNEA - COCO VÍQUEZ',
          _replyto: email,
          name: name
        })
      });
    } catch (e) {
      console.warn("Error enviando correo en segundo plano:", e);
    }

    // Set up states to trigger premium success modal with WhatsApp retry option
    setLastWhatsAppUrl(`https://wa.me/50689020888?text=${encodeURIComponent(message)}`);
    
    // 1. Close the cart/checkout modal completely first so it disappears smoothly
    setIsCartOpen(false);
    
    // 2. Open the clean '¡PEDIDO ENVIADO!' success modal directly
    setOrderSuccessModalOpen(true);

    // 3. Clear the cart in the background after a small delay so we don't flash the empty cart state during transition
    setTimeout(() => {
      setCart([]);
    }, 450);
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!data.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }

    const emailVal = sanitizeInput((data.email as string) || '').trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setFormError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    const nameVal = data.name as string;
    const dateVal = selectedResDate;
    const timeVal = selectedResTime || '12:00';
    const guestsVal = parseInt(numPeople) || 1;
    const serviceVal = selectedResService || 'General';
    const alergiasVal = sanitizeInput((data.alergias as string) || '').trim();

    if (!dateVal) {
      setFormError('Por favor, selecciona una fecha antes de continuar');
      return;
    }

    setFormError('');
    // Column names match the real 'reservas' table schema (verified against the live
    // Supabase project): cliente, fecha, fecha_hora, lugares, servicio_cotizado, estado, alergias.
    // There is no separate 'hora' column — time lives inside 'fecha_hora'.
    // 'alergias' is optional (nullable text column added for allergy/special notes).
    // 'email' and 'idioma' let the confirmation email (sent when admin marks the
    // reservation 'confirmado') reach the customer in the language they browsed in.
    const reservationInfo: Record<string, any> = {
      cliente: nameVal,
      email: emailVal,
      idioma: lang,
      fecha: dateVal,
      fecha_hora: `${dateVal}T${timeVal}:00`,
      lugares: guestsVal,
      servicio_cotizado: serviceVal,
      estado: 'pendiente'
    };

    if (!supabase) {
      console.warn("Supabase is not initialized. Using local fallback.");
      const newLocal = {
        id: Date.now(),
        ...reservationInfo
      };
      setLocalReservasFallback(prev => [newLocal, ...prev]);
      setReservationSuccess(true);
      setShowChannels(false);
      setTimeout(() => setReservationSuccess(false), 5000);
      form.reset();
      setSelectedResDate('');
      setSelectedResTime('');
      setNumPeople('1');
      return;
    }

    try {
      let payload: Record<string, any> = { ...reservationInfo };
      const result = await supabase.from('reservas').insert([payload]);
      const error = result.error;

      if (error) {
        console.error('Error inserting reservation into Supabase:', error.message);
        setFormError('Error al crear la reserva en la base de datos: ' + error.message);
        return;
      }

      await fetchReservas();
      setReservationSuccess(true);
      // The reservation is already saved above — sendWhatsApp/sendEmail only need
      // this snapshot to open a notification channel, they must NOT insert again.
      setReservationData({ name: nameVal, date: dateVal, time: timeVal, guests: guestsVal, alergias: alergiasVal });
      setShowChannels(true);
      setTimeout(() => setReservationSuccess(false), 5000);
      form.reset();
      setSelectedResDate('');
      setSelectedResTime('');
      setNumPeople('1');
    } catch (err: any) {
      console.error('Exception during Supabase insert:', err);
      setFormError('Error de red al procesar la reserva. Intente de nuevo.');
    }
  };

  // Called only after handleReservation already saved the reservation to Supabase —
  // these just open a notification channel with the same data, they must NOT insert again.
  const sendWhatsApp = () => {
    if (!reservationData || !reservationData.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }
    const { name, date, time, guests, alergias } = reservationData;

    let message = `¡Hola! Quiero reservar para el ${date} a las ${time}. Mi nombre es ${name}. (Personas: ${guests})`;
    if (alergias && alergias.trim()) {
      message += `\n\n⚠️ Notas / Alergias: ${alergias.trim()}`;
    }
    window.open(`https://wa.me/50689020888?text=${encodeURIComponent(message)}`, '_blank');

    setShowChannels(false);
    setReservationData(null);
  };

  const sendEmail = () => {
    if (!reservationData || !reservationData.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }
    const { name, date, time, guests, alergias } = reservationData;

    const subject = `Nueva Reserva - Coco Víquez`;
    let body = `¡Hola! Quiero reservar para el ${date} a las ${time}. Mi nombre es ${name}. (Personas: ${guests})`;
    if (alergias && alergias.trim()) {
      body += `\n\n⚠️ Notas / Alergias: ${alergias.trim()}`;
    }
    window.location.href = `mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setShowChannels(false);
    setReservationData(null);
  };

  if (currentPath.includes('cocina')) {
    return <KitchenView />;
  }

  if (currentPath.includes('reset-password')) {
    return (
      <div className="relative min-h-screen bg-[#0A111A] text-white flex items-center justify-center p-4 selection:bg-coral font-sans select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,127,87,0.1),transparent_40%)]" />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative bg-[#0D1721] w-full max-w-md rounded-[2.5rem] border-2 border-[#F27F57] shadow-[0_0_40px_rgba(242,127,87,0.25)] overflow-hidden p-8 flex flex-col z-10"
        >
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F27F57]/10 border border-[#F27F57]/30 text-[#F27F57] mb-4 shadow-[0_0_15px_rgba(242,127,87,0.2)]">
              <Lock size={28} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-wider">
              Nueva Contraseña
            </h3>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Establece tu nueva contraseña de administrador
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-[#F27F57]">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña (min. 6 caracteres)"
                  className="w-full bg-[#121A24] border border-white/10 rounded-2xl p-4 pr-12 text-white text-sm outline-none focus:border-[#F27F57] focus:ring-1 focus:ring-[#F27F57] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-[#F27F57] focus:outline-none transition-colors"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-[#F27F57]">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showConfirmNewPassword ? "text" : "password"}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  className="w-full bg-[#121A24] border border-white/10 rounded-2xl p-4 pr-12 text-white text-sm outline-none focus:border-[#F27F57] focus:ring-1 focus:ring-[#F27F57] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-[#F27F57] focus:outline-none transition-colors"
                >
                  {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {resetError && (
              <div className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-center">
                ⚠️ {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="text-xs font-bold text-emerald-500 uppercase tracking-wide bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-center">
                ✓ {resetSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-[#F27F57] hover:bg-[#ff8a50] disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_4px_15px_rgba(242,127,87,0.4)] flex items-center justify-center gap-2 border border-white/10"
            >
              {resetLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Actualizar Contraseña</span>
              )}
            </button>
          </form>

          <button 
            onClick={() => window.location.href = window.location.origin}
            className="text-xs text-white/40 hover:text-[#F27F57] uppercase tracking-widest font-black transition-colors mt-6 text-center focus:outline-none"
          >
            Volver al Inicio
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen selection:bg-coral selection:text-white">
      <SeaFoam />
      <Cart
        items={cart}
        onUpdate={updateCartQuantity}
        onRemove={removeFromCart}
        onConfirm={confirmOrder}
        isOpen={isCartOpen}
        setIsOpen={setIsCartOpen}
        t={t}
      />

      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        minAdvanceNoticeText={t.reservation.minAdvanceNotice}
      />

      <MapModal 
        isOpen={isMapModalOpen} 
        onClose={() => setIsMapModalOpen(false)} 
      />

      <GalleryModal 
        isOpen={galleryOpen} 
        onClose={() => setGalleryOpen(false)} 
      />

      {/* --- Header --- */}
      <header 
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-400 ease-in-out ${
          isScrolled 
            ? 'bg-[#0D1721]/80 backdrop-blur-[10px] py-3 shadow-2xl' 
            : 'bg-[#0D1721] py-6'
        }`}
      >
        <div className="w-full px-[4%]">
          {/* Sistema de Tercios: Tres contenedores con flex-1 para centrado matemático */}
          <div className="flex items-center justify-between">
            
            {/* 1. Izquierda: Navegación (flex-1 para ocupar un tercio) */}
            <nav className="hidden lg:flex flex-1 items-center justify-start gap-[25px] lg:gap-[20px]">
              <a href="#menu" className="text-[13px] lg:text-[12px] font-sans font-light uppercase tracking-[2px] text-white hover:text-[#F27F57] transition-all duration-300 whitespace-nowrap">{t.nav.menu}</a>
              <a href="#about" className="text-[13px] lg:text-[12px] font-sans font-light uppercase tracking-[2px] text-white hover:text-[#F27F57] transition-all duration-300 whitespace-nowrap">{t.nav.about}</a>
              <a href="#location" className="text-[13px] lg:text-[12px] font-sans font-light uppercase tracking-[2px] text-white hover:text-[#F27F57] transition-all duration-300 whitespace-nowrap">{t.nav.location}</a>
              <a href="#services" className="text-[13px] lg:text-[12px] font-sans font-light uppercase tracking-[2px] text-white hover:text-[#F27F57] transition-all duration-300 whitespace-nowrap">{t.nav.services}</a>
              <a 
                href="#galeria" 
                onClick={(e) => { e.preventDefault(); setGalleryOpen(true); }}
                className="text-[13px] lg:text-[12px] font-sans font-light uppercase tracking-[2px] text-white hover:text-[#F27F57] transition-all duration-300 whitespace-nowrap"
              >
                {t.nav.galeria}
              </a>
            </nav>

            {/* 2. Centro: Logo (flex-1 y justify-center para centrado absoluto) */}
            <div className="flex-1 flex justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-none"
              >
                <a href="#" className="block">
                  <img 
                    src="/logo/logo.png" 
                    alt="Restaurante Víquez" 
                    className={`h-auto w-auto object-contain transition-all duration-400 brightness-110 ${
                      isScrolled ? 'max-h-[50px] md:max-h-[60px]' : 'max-h-[75px] md:max-h-[95px]'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                </a>
              </motion.div>
            </div>

            {/* 3. Derecha: Acciones y Utilidades (flex-1 y justify-end) */}
            <div className="flex-1 flex items-center justify-end gap-[15px] lg:gap-[25px]">
              <div className="hidden lg:flex items-center gap-[15px] lg:gap-[20px]">
                <a 
                  href="#menu" 
                  className="header-btn header-btn-order whitespace-nowrap !px-4 lg:!px-6"
                >
                  {t.nav.order}
                </a>
                <a 
                  href="#reserve" 
                  className="header-btn header-btn-reserve whitespace-nowrap !px-4 lg:!px-6"
                >
                  {t.nav.reserve}
                </a>
                <div className="pl-4 border-l border-white/10">
                  <LanguageSelector currentLang={lang} onLangChange={setLang} />
                </div>
              </div>

              {/* Mobile Toggle: Visible en tablets y móviles (lg:hidden) */}
              <button className="lg:hidden text-white p-2 hover:text-[#F27F57] transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay (Drawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[80%] max-w-sm z-[70] bg-[#111D2B] shadow-2xl flex flex-col p-8 overflow-y-auto lg:hidden"
            >
              <div className="flex justify-between items-center mb-12">
                <img 
                  src="/logo/logo.png" 
                  alt="Logo Coco Víquez" 
                  className="h-12 w-auto object-contain brightness-110"
                  referrerPolicy="no-referrer"
                />
                <button onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#F27F57] transition-colors">
                  <X size={32} />
                </button>
              </div>

              <nav className="flex flex-col space-y-6">
                {Object.entries(t.nav).map(([key, value]) => {
                  // Skip reserve and order as they will be buttons below
                  if (key === 'reserve' || key === 'order') return null;
                  
                  if (key === 'galeria') {
                    return (
                      <button 
                        key={key} 
                        onClick={(e) => {
                          e.preventDefault();
                          setMobileMenuOpen(false);
                          setGalleryOpen(true);
                        }}
                        className="text-xl font-sans font-medium uppercase tracking-[2px] transition-colors text-left text-white hover:text-[#F27F57]"
                      >
                        {value}
                      </button>
                    );
                  }

                  return (
                    <a 
                      key={key} 
                      href={`#${key}`} 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-xl font-sans font-medium uppercase tracking-[2px] transition-colors text-white hover:text-[#F27F57]"
                    >
                      {value}
                    </a>
                  );
                })}
                
                {/* Mobile Action Buttons */}
                <div className="flex flex-col gap-4 pt-6">
                  <a 
                    href="#menu" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-4 rounded-full border-2 border-[#F27F57] text-[#F27F57] font-bold uppercase tracking-[2px] text-center"
                  >
                    {t.nav.order}
                  </a>
                  <a 
                    href="#reserve" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-4 rounded-full bg-[#F27F57] text-white font-bold uppercase tracking-[2px] text-center shadow-lg"
                  >
                    {t.nav.reserve}
                  </a>
                </div>
              </nav>

              <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-widest">Idioma</span>
                <LanguageSelector currentLang={lang} onLangChange={setLang} openUpward />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Hero Section --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-transparent">
        <video
          ref={heroVideoRef}
          src="/animacion.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        />
        <div className="absolute inset-0 bg-black/40 z-0" />

        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="flex flex-col items-center space-y-4 mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-7xl lg:text-8xl font-bold text-sand tracking-tight leading-tight">
              {t.hero.line1}
            </h1>
            <div className="w-16 md:w-24 h-0.5 bg-coral/50 my-2" />
            <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-medium text-sand/90 tracking-[0.15em] md:tracking-[0.2em] uppercase">
              {t.hero.line2}
            </h2>
          </div>
          <div className="flex justify-center">
            <a 
              href="#reserve" 
              className="w-[85%] sm:w-auto inline-block bg-coral text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-coral transition-all shadow-xl text-center"
            >
              {t.nav.reserve}
            </a>
          </div>
        </div>
      </section>

      {/* --- About Us (Asymmetric) --- */}
      <section id="about" className="py-24 bg-sand relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: -50 }}
              viewport={{ once: true }}
              className="w-full md:w-1/2 relative"
            >
              <div className="asymmetric-shape overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src="/historia.png"
                  alt="Restaurante Víquez"
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 glass bg-coral/20 p-8 rounded-2xl hidden md:block">
                <img src={t.about.src} className="h-10 w-auto object-contain mx-auto" alt="Logo" />
              </div>
            </motion.div>

            <motion.div 
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 50 }}
              viewport={{ once: true }}
              className="w-full md:w-1/2"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-ocean">{t.about.title}</h2>
              <div className="text-lg text-ocean/80 leading-relaxed mb-8">
                <p className="mb-4">{t.about.summary}</p>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="mb-4">{t.about.extended}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-ocean font-bold hover:text-coral transition-colors flex items-center gap-2 mt-2"
                >
                  {isExpanded ? t.about.readLess : t.about.readMore}
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronRight size={18} className="rotate-90" />
                  </motion.span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
                {t.about.features.map((feature: any, idx: number) => {
                  let CustomIcon;
                  if (feature.icon === 'ChefHat') {
                    CustomIcon = (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 13.8811C4.28595 13.4682 3 11.9044 3 10.0243C3 7.78545 4.81014 5.97531 7.04903 5.97531C7.45265 5.97531 7.8385 6.03437 8.2023 6.14382C9.09653 4.14441 11.119 2.75 13.4735 2.75C16.8152 2.75 19.5243 5.45908 19.5243 8.80081C19.5243 9.40058 19.4371 9.97998 19.2743 10.5262C20.2982 11.2384 21 12.4344 21 13.7915C21 15.932 19.3496 17.6534 17.2536 17.7831" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 18H7C5.89543 18 5 18.8954 5 20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20C19 18.8954 18.1046 18 17 18Z" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    );
                  } else if (feature.icon === 'MapPin') {
                    CustomIcon = (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12.5C13.3807 12.5 14.5 11.3807 14.5 10C14.5 8.61929 13.3807 7.5 12 7.5C10.6193 7.5 9.5 8.61929 9.5 10C9.5 11.3807 10.6193 12.5 12 12.5Z" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 22C14 18 20 15.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 15.4183 10 18 12 22Z" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    );
                  } else {
                    CustomIcon = (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.41 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.59 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    );
                  }

                  return (
                    <div key={idx} className="feature-badge-container group">
                      <div className="feature-icon-badge">
                        {CustomIcon}
                      </div>
                      <span className="font-bold text-[#0A192F] text-xs uppercase tracking-widest group-hover:text-[#FF8C00] transition-colors duration-300">
                        {feature.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Special Services Section --- */}
      <section id="services" className="py-24 bg-[#F9F7F2] relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-ocean">{t.services.title}</h2>
            <div className="w-24 h-1 bg-coral mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 items-stretch">
            {t.services.items.slice(0, 4).map((item: any) => (
              <ServiceCard 
                key={item.id} 
                item={item} 
                cta={t.services.cta} 
                reserveNote={t.services.reserveNote} 
                eventDateLabel={t.services.eventDate}
                peopleCountLabel={t.services.peopleCount}
                checkAvailabilityLabel={t.services.checkAvailability}
                requestQuoteLabel={t.services.requestQuote}
                waMessageTemplate={t.services.waMessage}
                emailSubjectTemplate={t.services.emailSubject}
                emailBodyTemplate={t.services.emailBody}
                disclaimerText={t.services.disclaimer}
                nameLabel={t.services.nameLabel}
                namePlaceholder={t.services.namePlaceholder}
                emailLabel={t.services.emailLabel}
                emailPlaceholder={t.services.emailPlaceholder}
                datePlaceholder={t.services.datePlaceholder}
                backLabel={t.services.backLabel}
                calendarWeekDays={t.calendar.weekDays}
                calendarMonths={t.calendar.months}
                lang={lang}
                onClassReserve={() => setIsClassModalOpen(true)}
                fechasBloqueadas={savedBloqueos.filter(b => b.servicio_tipo === (item.id === 'clase' ? 'clases_cocina' : item.id) || b.servicio_tipo === 'todos').map(b => b.fecha)}
                isAdmin={isAdmin}
                onToggleBlockedDate={(dateStr) => toggleBlockedDate(dateStr, item.id === 'clase' ? 'clases_cocina' : item.id)}
                onSelectService={setSelectedResService}
                servicioTipo={item.id === 'clase' ? 'clases_cocina' : item.id}
              />
            ))}
          </div>

          <AnimatePresence>
            {mostrarMas && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 items-stretch">
                  {t.services.items.slice(4).map((item: any) => (
                    <ServiceCard 
                      key={item.id} 
                      item={item} 
                      cta={t.services.cta} 
                      reserveNote={t.services.reserveNote} 
                      eventDateLabel={t.services.eventDate}
                      peopleCountLabel={t.services.peopleCount}
                      checkAvailabilityLabel={t.services.checkAvailability}
                      requestQuoteLabel={t.services.requestQuote}
                      waMessageTemplate={t.services.waMessage}
                      emailSubjectTemplate={t.services.emailSubject}
                      emailBodyTemplate={t.services.emailBody}
                      disclaimerText={t.services.disclaimer}
                      nameLabel={t.services.nameLabel}
                      namePlaceholder={t.services.namePlaceholder}
                      emailLabel={t.services.emailLabel}
                      emailPlaceholder={t.services.emailPlaceholder}
                      datePlaceholder={t.services.datePlaceholder}
                      backLabel={t.services.backLabel}
                      calendarWeekDays={t.calendar.weekDays}
                      calendarMonths={t.calendar.months}
                      lang={lang}
                      onClassReserve={() => setIsClassModalOpen(true)}
                      fechasBloqueadas={savedBloqueos.filter(b => b.servicio_tipo === (item.id === 'clase' ? 'clases_cocina' : item.id) || b.servicio_tipo === 'todos').map(b => b.fecha)}
                      isAdmin={isAdmin}
                      onToggleBlockedDate={(dateStr) => toggleBlockedDate(dateStr, item.id === 'clase' ? 'clases_cocina' : item.id)}
                      onSelectService={setSelectedResService}
                      servicioTipo={item.id === 'clase' ? 'clases_cocina' : item.id}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center mt-12">
            <button 
              onClick={() => setMostrarMas(!mostrarMas)}
              className="group flex items-center gap-3 bg-ocean text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-coral transition-all shadow-xl"
            >
              {mostrarMas ? 'Ver menos' : 'Ver más servicios'}
              <motion.div
                animate={{ rotate: mostrarMas ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform" />
              </motion.div>
            </button>
          </div>
        </div>
      </section>

      {/* --- Digital Menu (Modern Accordion) --- */}
      <section id="menu" className="py-24 bg-ocean text-sand relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(242,127,87,0.05),transparent_70%)]" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">{t.menu.title}</h2>
            <div className="w-24 h-1 bg-coral mx-auto rounded-full" />
          </div>

          <div className="max-w-4xl mx-auto">
            <HorizontalTabsMenu
              onAdd={addToCart}
              t={t}
            />
          </div>
        </div>
      </section>

      {/* --- Reservation Form --- */}
      <section id="reserve" className="py-24 bg-sand relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-[#0B1221] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-white/5 relative">
            {/* Dot Pattern Background Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(coral 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            <div className="w-full lg:w-2/5 bg-ocean/40 backdrop-blur-md p-12 text-sand flex flex-col justify-between relative z-10 border-r border-white/5">
              <div>
                <h2 className="text-3xl font-bold mb-6">{t.reservation.title}</h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="text-sand/60 mb-8"
                >
                  {t.reservation.desc}
                </motion.p>
              </div>

              {/* Centered Logo as brand element to fill the gap */}
              <div className="flex-1 flex items-center justify-center py-8">
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2 }}
                  src="/logo/logo.png" 
                  alt="Logo Coco Víquez" 
                  className="w-60 h-auto object-contain drop-shadow-2xl"
                />
              </div>

              <div className="space-y-4">
                <div className="contact-item-container group flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-coral/10 rounded-lg text-coral group-hover:bg-coral group-hover:text-white transition-all shrink-0"><Clock size={18} /></div>
                  <span className="contact-item-text font-medium text-[11px] sm:text-[13px] md:text-sm tracking-tight break-words min-w-0">{t.reservation.hours}</span>
                </div>
                <div 
                  className="contact-item-container group flex items-center rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-orange-400 active:scale-95 text-sand/80 relative"
                  style={{ position: 'relative', zIndex: 10, cursor: 'pointer' }}
                >
                  <a 
                    href={`mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent('Consulta desde la web')}&body=${encodeURIComponent('Hola, quisiera hacer una consulta sobre sus servicios.')}`}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      width: '100%', 
                      height: '100%', 
                      display: 'block', 
                      cursor: 'pointer', 
                      pointerEvents: 'auto', 
                      textDecoration: 'none', 
                      color: 'inherit',
                      zIndex: 20
                    }}
                    aria-label="Email restaurantecocoviquezph@gmail.com"
                  />
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.2)] group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] pointer-events-none">
                    <Mail size={18} />
                  </div>
                  <span className="contact-item-text font-medium text-sm transition-colors duration-300 pointer-events-none">
                    restaurantecocoviquezph@gmail.com
                  </span>
                </div>
                <a 
                  href="tel:+50626720029"
                  className="contact-item-container group cursor-pointer rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-orange-400 active:scale-95 text-sand/80 relative z-20"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.2)] group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] pointer-events-none">
                    <Phone size={18} />
                  </div>
                  <span className="contact-item-text font-mono text-sm transition-colors duration-300 pointer-events-none">+506 2672 0029</span>
                </a>
                <a 
                  href="https://wa.me/50689020888?text=Hola!%20Me%20gustaría%20hacer%20una%20consulta%20sobre%20una%20reserva."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item-container group cursor-pointer rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:text-green-400 active:scale-95 text-sand/80 relative z-20"
                >
                  <div className="p-2 bg-green-500/10 rounded-lg text-[#25D366] group-hover:bg-[#25D366] group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] pointer-events-none">
                    <MessageCircle size={18} />
                  </div>
                  <span className="contact-item-text font-mono text-sm transition-colors duration-300 pointer-events-none">+506 8902 0888</span>
                </a>
              </div>
            </div>

            <form onSubmit={handleReservation} className="w-full lg:w-3/5 p-12 space-y-8 relative z-10">
              {/* Informative Table Map */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.distributionLabel}</label>
                <div className="p-1 bg-[#0A192F] border border-coral/30 rounded-2xl overflow-hidden shadow-inner">
                  <TableMap
                    onOpenModal={() => setIsMapModalOpen(true)}
                    legendLabel={t.reservation.tableLegend}
                  />
                </div>
                <p className="text-[9px] text-[#F9F7F2]/30 uppercase font-black tracking-widest text-center italic">{t.reservation.clickMapHint}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.name}</label>
                  <input
                    required
                    type="text"
                    name="name"
                    className="w-full bg-[#0A192F] border border-coral/30 hover:border-coral/60 rounded-2xl p-5 focus:ring-2 focus:ring-coral focus:border-coral transition-all outline-none text-white font-medium shadow-inner"
                    placeholder="Ej. Alexander"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.email}</label>
                  <input
                    required
                    type="email"
                    name="email"
                    className="w-full bg-[#0A192F] border border-coral/30 hover:border-coral/60 rounded-2xl p-5 focus:ring-2 focus:ring-coral focus:border-coral transition-all outline-none text-white font-medium shadow-inner"
                    placeholder={t.reservation.emailPlaceholder}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.date}</label>
                    <div className="relative" ref={calendarRef}>
                      <div 
                        ref={resTriggerRef}
                        className="relative cursor-pointer group" 
                        onClick={() => setCalendarOpen(!calendarOpen)}
                      >
                        <input 
                          required 
                          type="text" 
                          id="eventDateInput" 
                          readOnly 
                          value={selectedResDate ? selectedResDate.split('-').reverse().join('/') : ''} 
                          placeholder="Selecciona una fecha disponible" 
                          className="w-full bg-[#0A192F] text-white placeholder-[#F9F7F2]/20 border border-[#F27F57]/30 group-hover:border-[#F27F57]/60 rounded-2xl p-5 text-sm font-medium tracking-wide cursor-pointer shadow-inner transition-all duration-300 outline-none"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#F27F57]/60 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                        </div>
                      </div>

                      <input type="hidden" name="date" value={selectedResDate} required />

                      {calendarOpen && createPortal(
                        <div 
                          ref={resPortalRef}
                          className={
                            isMobileRes 
                              ? "fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[999999] p-4 text-white font-sans"
                              : "absolute z-[999999] text-white font-sans"
                          }
                          style={isMobileRes ? {} : resPortalStyle}
                          onClick={() => setCalendarOpen(false)}
                        >
                          <div 
                            id="customCalendar" 
                            className="w-full max-w-[320px] bg-slate-950 border border-[#F27F57]/30 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-3 px-1">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeMonth(-1);
                                }} 
                                className="text-[#F27F57] hover:text-[#ff8a50] text-sm font-bold p-1 transition-colors"
                              >
                                &lt;
                              </button>
                              <span id="calendarTitle" className="text-[10px] font-bold uppercase tracking-widest text-[#F9F7F2]">
                                {t.calendar.months[currentMonth.getMonth()].toUpperCase()}, {currentMonth.getFullYear()}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeMonth(1);
                                }}
                                className="text-[#F27F57] hover:text-[#ff8a50] text-sm font-bold p-1 transition-colors"
                              >
                                &gt;
                              </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                              {t.calendar.weekDays.map((d: string, i: number) => <div key={i}>{d}</div>)}
                            </div>
                            
                            <div id="calendarDays" className="grid grid-cols-7 gap-1 text-center text-xs">
                              {getCalendarDays().map((day, idx) => {
                                if (day.dayNum === null) {
                                  return <div key={`empty-${idx}`} className="p-1.5" />;
                                }
                                
                                const isSelected = selectedResDate === day.dateStr;
                                const isBlocked = fechasBloqueadas.includes(day.dateStr);
                                
                                return (
                                  <button
                                    key={`day-${day.dateStr}`}
                                    type="button"
                                    disabled={day.isPast || (!day.enabled && !isAdmin)}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (isAdmin) {
                                        await toggleBlockedDate(day.dateStr);
                                      } else {
                                        setSelectedResDate(day.dateStr);
                                        handleResDateChange(day.dateStr);
                                        setCalendarOpen(false);
                                      }
                                    }}
                                    title={day.isPast ? "Fecha Pasada" : isBlocked ? "Fecha Reservada / Bloqueada" : (!day.enabled && !isAdmin) ? "No disponible: fuera de horario de reservas para hoy" : ""}
                                    className={`relative p-1.5 rounded-lg font-bold text-center text-xs transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-[#F27F57] text-white shadow-[0_0_12px_rgba(242,127,87,0.4)]'
                                        : (isBlocked || day.isPast)
                                          ? isAdmin && !day.isPast
                                            ? 'text-red-400 bg-red-950/30 border border-red-500/30 hover:border-red-500/60 cursor-pointer shadow-[0_0_8px_rgba(222,60,60,0.25)]'
                                            : `text-red-500 line-through bg-red-950/30 border border-red-900/30 shadow-[0_0_8px_rgba(222,60,60,0.25)] cursor-not-allowed opacity-60`
                                          : day.enabled
                                            ? 'text-[#F27F57] hover:bg-[#F27F57]/20 hover:text-white cursor-pointer'
                                            : 'text-gray-500 cursor-not-allowed opacity-30 font-light'
                                    }`}
                                  >
                                    <span>{day.dayNum}</span>
                                    {dayHasReservations(day.dateStr) && (
                                      <span className="absolute bottom-1 left-0 right-0 mx-auto w-1 h-1 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}

                      <p className="text-[9px] text-[#F9F7F2]/30 uppercase font-black tracking-widest mt-2 ml-1">
                        {t.reservation.minAdvanceNotice}
                      </p>
                    </div>
                  </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.time}</label>
                      <div className="relative group" ref={timeDropdownRef}>
                        <div 
                          className="w-full bg-[#0A192F] border border-coral/30 group-hover:border-coral/60 rounded-2xl p-5 cursor-pointer text-white font-medium shadow-inner flex justify-between items-center select-none"
                          onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                        >
                          <span className="text-sm">
                            {selectedResTime ? (() => {
                              const parts = selectedResTime.split(':');
                              const h = parseInt(parts[0]);
                              const h12 = h % 12 === 0 ? 12 : h % 12;
                              return `${h12}:${parts[1]} ${h >= 12 ? 'PM' : 'AM'}`;
                            })() : 'Selecciona una hora'}
                          </span>
                          <ChevronDown size={20} className="text-coral group-hover:scale-110 transition-transform" />
                        </div>
                        <input type="hidden" name="time" value={selectedResTime} required />
                        {timeDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1.5 z-[9999] bg-[#0A192F]/95 backdrop-blur-md border border-coral/30 rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
                            {(() => {
                              const available = getAvailableHoursForDate(selectedResDate);
                              const nonPastCount = available.filter(opt => !opt.isPast).length;
                              if (nonPastCount === 0) {
                                return (
                                  <div className="text-white/40 text-[11px] py-4 text-center font-bold uppercase tracking-widest">
                                    No hay horarios disponibles para hoy
                                  </div>
                                );
                              }
                              return (
                                <div className="grid grid-cols-3 gap-1.5">
                                  {available.map(opt => {
                                    const isSelected = selectedResTime === opt.timeStr;
                                    const isDisabled = opt.isPast;
                                    return (
                                      <button
                                        key={opt.timeStr}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                          if (!isDisabled) {
                                            setSelectedResTime(opt.timeStr);
                                            setTimeDropdownOpen(false);
                                          }
                                        }}
                                        className={`px-1 py-2 rounded-xl text-center text-[10px] font-bold transition-all duration-150 border uppercase tracking-wider ${
                                          isDisabled
                                            ? 'bg-slate-900/40 text-[#F9F7F2]/20 border-transparent cursor-not-allowed opacity-[0.35] pointer-events-none'
                                            : isSelected
                                            ? 'bg-coral text-white border-coral shadow-[0_0_10px_rgba(255,127,80,0.35)] cursor-pointer'
                                            : 'bg-[#051122]/80 text-[#F9F7F2]/80 hover:bg-coral/20 hover:text-white border-transparent hover:border-coral/50 cursor-pointer'
                                        }`}
                                      >
                                        {(opt.hour % 12 === 0 ? 12 : opt.hour % 12)}:00 {opt.hour >= 12 ? 'PM' : 'AM'}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.guestsLabel}</label>
                  <div className="group flex items-center bg-[#0A192F] border border-coral/30 rounded-2xl h-[66px] w-full overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-coral transition-all">
                    <button 
                      type="button"
                      onClick={() => {
                        const val = parseInt(numPeople) || 0;
                        setNumPeople((val + 1).toString());
                      }}
                      className="w-16 h-full flex items-center justify-center text-white hover:bg-white/5 transition-colors border-r border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Aumentar"
                    >
                      <Plus size={20} />
                    </button>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={numPeople}
                      placeholder=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          setNumPeople(val);
                        }
                      }}
                      className="flex-1 bg-transparent text-center font-medium text-white text-base outline-none caret-coral"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const val = parseInt(numPeople) || 0;
                        if (val > 1) setNumPeople((val - 1).toString());
                      }}
                      className="w-16 h-full flex items-center justify-center text-white hover:bg-white/5 transition-colors border-l border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Disminuir"
                      disabled={(parseInt(numPeople) || 0) <= 1}
                    >
                      <Minus size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">{t.reservation.allergiesLabel}</label>
                  <textarea
                    name="alergias"
                    rows={3}
                    maxLength={300}
                    placeholder={t.reservation.allergiesPlaceholder}
                    className="w-full bg-[#0A192F] border border-coral/30 hover:border-coral/60 rounded-2xl p-5 focus:ring-2 focus:ring-coral focus:border-coral transition-all outline-none text-white text-sm font-medium shadow-inner resize-none placeholder:text-[#F9F7F2]/25"
                  />
                </div>

                <div className="space-y-4 pt-4">
                  {!showChannels ? (
                    <button
                      type="submit"
                      disabled={resDateError || !numPeople || parseInt(numPeople) < 1}
                      className="w-full bg-coral text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-coral/20 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed border-t border-white/10"
                    >
                      {t.reservation.send}
                    </button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col space-y-3"
                    >
                      <button 
                        type="button"
                        onClick={sendWhatsApp}
                        className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                        <MessageCircle size={20} />
                        Enviar por WhatsApp
                      </button>
                      <button 
                        type="button"
                        onClick={sendEmail}
                        className="w-full bg-ocean text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                        <Mail size={20} />
                        Enviar por Correo
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowChannels(false)}
                        className="w-full text-ocean/40 py-2 text-xs font-bold uppercase tracking-widest hover:text-coral transition-all"
                      >
                        Volver a editar
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {formError && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-xs font-bold text-center mt-2"
                  >
                    {formError}
                  </motion.div>
                )}
                {reservationSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 text-sm font-medium text-center"
                  >
                    Tu solicitud ha sido enviada. Nos comunicaremos contigo para confirmar.
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </section>

      {/* --- Location --- */}
      <section id="location" ref={locationVideo.ref} className="py-24 bg-white relative overflow-hidden">
        {locationVideo.inView && (
          <video
            ref={locationVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/videovz.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-white/70 z-10" />
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="container mx-auto px-6 relative z-20"
        >
          <div className="flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/3">
              <h2 className="text-4xl font-bold mb-6 tracking-tight">{t.nav.location}</h2>
              <p className="text-ocean/70 mb-8 leading-relaxed">{t.footer.location}</p>
              <div className="space-y-8">
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Restaurante+Coco+Viquez+Playa+Hermosa+Guanacaste"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start space-x-4 group"
                >
                  <div className="bg-coral/10 p-3 rounded-xl text-coral shrink-0 group-hover:bg-coral group-hover:text-white transition-all"><MapPin /></div>
                  <div>
                    <h4 className="font-bold text-ocean">Dirección</h4>
                    <p className="text-sm text-ocean/60 group-hover:text-coral transition-colors">Ubicado en la Ruta Nacional 159, Playa Hermosa, Guanacaste, Costa Rica, frente a la entrada principal de Condovac y Villas Sol.</p>
                  </div>
                </a>

                <div className="flex flex-col space-y-6">
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Restaurante+Coco+Viquez+Playa+Hermosa+Guanacaste"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-2 bg-ocean text-sand px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-coral transition-all shadow-lg w-full md:w-auto"
                  >
                    <MapPin size={18} />
                    <span>{t.footer.openMaps}</span>
                  </a>

                  <div className="flex space-x-4">
                    <a 
                      href="https://www.instagram.com/restaurantecocoviquez?igsh=MXM3M3Z6cjNldDV5cA==" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-3 rounded-full hover:scale-110 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center"
                    >
                      <Instagram size={20} />
                    </a>
                    <a 
                      href="https://www.tripadvisor.com.mx/Restaurant_Review-g309246-d7778239-Reviews-Coco_Viquez-Playa_Hermosa_Province_of_Guanacaste.html" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-[#34E0A1] text-white p-3 rounded-full hover:scale-110 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center"
                    >
                      <TripAdvisorIcon size={20} />
                    </a>
                    <a 
                      href="https://www.facebook.com/profile.php?id=100063755972804" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-[#1877F2] text-white p-3 rounded-full hover:scale-110 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center"
                    >
                      <Facebook size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 h-[400px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-sand/50 relative group">
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Restaurante+Coco+Viquez+Playa+Hermosa+Guanacaste" 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0 z-30 cursor-pointer"
                aria-label="Open in Google Maps"
              />
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.407981180219!2d-85.6739663!3d10.5775653!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f9e2a1a6340a9a9%3A0xdb69f46dde6010cf!2sCoco%20Viquez!5e0!3m2!1sen!2scr!4v1712435678901" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="relative z-0"
              />
              <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 rounded-[24px] z-40" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- Testimonials Carousel --- */}
      <section id="testimonials" ref={testimonialsVideo.ref} className="py-24 bg-sand relative overflow-hidden">
        {testimonialsVideo.inView && (
          <video
            ref={testimonialsVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/videovz.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-white/70 z-10" />
        <div className="container mx-auto px-6 max-w-4xl relative z-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-ocean">{t.testimonials.title}</h2>
            <div className="w-24 h-1 bg-coral mx-auto" />
          </div>

          <div 
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIdx}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl flex flex-col items-center text-center transition-all duration-500"
                >
                  <div className="flex mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xl md:text-2xl text-ocean/80 italic mb-8 leading-relaxed">
                    "{t.testimonials.items[testimonialIdx].text}"
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-sand shadow-md aspect-square bg-ocean/10">
                      <img 
                        src={t.testimonials.items[testimonialIdx].photo} 
                        alt={t.testimonials.items[testimonialIdx].name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-ocean text-lg">{t.testimonials.items[testimonialIdx].name}</h4>
                      <p className="text-sm text-ocean/50">Google Reviewer</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel Controls */}
            <div className="flex justify-center mt-12 space-x-6">
              <button 
                onClick={() => {
                  setTestimonialIdx((prev) => (prev - 1 + t.testimonials.items.length) % t.testimonials.items.length);
                  setIsPaused(true);
                }}
                className="bg-ocean text-sand p-4 rounded-full hover:bg-coral transition-all shadow-lg"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => {
                  setTestimonialIdx((prev) => (prev + 1) % t.testimonials.items.length);
                  setIsPaused(true);
                }}
                className="bg-ocean text-sand p-4 rounded-full hover:bg-coral transition-all shadow-lg"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-16 flex flex-col items-center">
            <a 
              href="https://www.google.com/maps/place/Coco+Viquez/@10.5775706,-85.6739663,768m/data=!3m1!1e3!4m18!1m9!3m8!1s0x8f9e2a1a6340a9a9:0xdb69f46dde6010cf!2sCoco+Viquez!8m2!3d10.5775653!4d-85.6713914!9m1!1b1!16s%2Fg%2F11c5bh6xbj!3m7!1s0x8f9e2a1a6340a9a9:0xdb69f46dde6010cf!8m2!3d10.5775653!4d-85.6713914!9m1!1b1!16s%2Fg%2F11c5bh6xbj?hl=es-419&entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-orange-400 to-amber-500 text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out shadow-xl animate-pulse-coral"
            >
              {t.testimonials.googleReview}
            </a>
            <a 
              href="https://www.tripadvisor.com.mx/Restaurant_Review-g309246-d7778239-Reviews-Coco_Viquez-Playa_Hermosa_Province_of_Guanacaste.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-[15px] inline-block bg-gradient-to-r from-orange-400 to-amber-500 text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out shadow-xl animate-pulse-coral"
            >
              {t.testimonials.tripadvisorReview}
            </a>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="pt-40 pb-24 bg-footer-navy footer-dots text-white/40 relative overflow-hidden">
        <div className="container mx-auto px-6 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-20">
            <img 
              src="/logo/logo.png" 
              alt="Logo Coco Víquez" 
              className="h-32 md:h-48 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Social Media Section */}
          <div className="flex items-center space-x-12 mb-14">
            <a 
              href="https://www.instagram.com/restaurantecocoviquez?igsh=MXM3M3Z6cjNldDV5cA==" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="transition-all duration-300 hover:scale-110"
              aria-label="Instagram"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
                <path d="M12 6.865c-2.836 0-5.135 2.299-5.135 5.135s2.299 5.135 5.135 5.135 5.135-2.299 5.135-5.135-2.299-5.135-5.135-5.135zm0 8.423c-1.816 0-3.288-1.472-3.288-3.288s1.472-3.288 3.288-3.288 3.288 1.472 3.288 3.288-1.472 3.288-3.288 3.288zm5.338-8.891c0 .654-.531 1.185-1.185 1.185s-1.185-.531-1.185-1.185.531-1.185 1.185-1.185 1.185.531 1.185 1.185z" fill="white"/>
                <defs>
                  <radialGradient id="ig-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(5.04 20.16) rotate(-45) scale(26.88)">
                    <stop stopColor="#FED011"/>
                    <stop offset=".25" stopColor="#F77737"/>
                    <stop offset=".5" stopColor="#E1306C"/>
                    <stop offset=".75" stopColor="#C13584"/>
                    <stop offset="1" stopColor="#833AB4"/>
                  </radialGradient>
                </defs>
              </svg>
            </a>
            <a 
              href="https://www.facebook.com/profile.php?id=100063755972804" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="transition-all duration-300 hover:scale-110"
              aria-label="Facebook"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#1877F2"/>
                <path d="M14.5 12h-2v7h-3v-7h-1.5v-2.5h1.5v-1.5c0-2.2 1.1-3.5 3.5-3.5h2v2.5h-1.2c-1 0-1.3.5-1.3 1.3v1.2h2.5l-.5 2.5z" fill="white"/>
              </svg>
            </a>
            <a 
              href="https://wa.me/50689020888?text=%C2%A1Hola%2C%20Restaurante%20Coco%20V%C3%ADquez%21%20%F0%9F%91%8B%20Me%20gustar%C3%ADa%20consultar%20sobre%20disponibilidad%20para%20un%20servicio.%20%C2%BFPodr%C3%ADan%20ayudarme%20con%20m%C3%A1s%20informaci%C3%B3n%3F%20%C2%A1Gracias%21" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="transition-all duration-300 hover:scale-110"
              aria-label="WhatsApp"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#25D366"/>
                <path d="M16.6 14.1c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.7-.1.1-.2.1-.4 0-.2-.1-.9-.3-1.7-1-.6-.5-1-1.2-1.1-1.3-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1 0-.2 0-.3-.1-.2-.4-.9-.5-1.2-.1-.3-.3-.3-.4-.3h-.4c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7s.7 2 1 2.2c.1.1 2.1 3.2 5 4.4.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.2-.5 1.4-1 .2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z" fill="white"/>
              </svg>
            </a>
          </div>

          {/* Divider Line */}
          <div className="w-full max-w-5xl border-t border-gray-700/30 mb-12" />

          {/* Copyright and Legal Section */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-5xl gap-8">
            <div className="text-center md:text-left">
              <p className="text-xs md:text-sm text-gray-400 font-sans tracking-wide">
                © 2026 Restaurante Víquez. Todos los derechos reservados.
              </p>
            </div>
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => setLegalModal({ isOpen: true, type: 'terms' })}
                className="text-[10px] md:text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-medium"
              >
                Términos y Condiciones
              </button>
              <button 
                onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })}
                className="text-[10px] md:text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-medium"
              >
                Política de Privacidad
              </button>
            </div>
          </div>

          {/* Red Logout Button - Positioned at the bottom-left of the footer */}
          <div 
            className="absolute bottom-8 left-8 z-10"
            style={{ display: isAdmin ? 'block' : 'none' }}
          >
            <button
              onClick={async () => {
                if (supabase) {
                  await supabase.auth.signOut();
                }
                setIsAdmin(false);
                setShowAdmin(false);
              }}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-red-500 hover:text-red-400 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          {/* Discrete Admin Access - Positioned to the left of the floating cart button */}
          <div className="absolute bottom-8 right-32 z-10">
            <button 
              onClick={() => {
                if (isAdmin) {
                  setShowAdmin(!showAdmin);
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold group transition-all duration-300 ${
                isAdmin && !showAdmin 
                  ? 'text-[#F27F57] opacity-100 hover:text-[#ff8a50] scale-105' 
                  : 'text-white/30 hover:text-white opacity-60 hover:opacity-100'
              }`}
            >
              <Lock size={12} className={`group-hover:scale-110 transition-transform ${isAdmin && !showAdmin ? 'text-[#F27F57]' : ''}`} />
              <span>{isAdmin && !showAdmin ? 'VER PANEL DE CONTROL' : 'Admin'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* --- Admin Panel Modal --- */}
      <AnimatePresence>
        {showAdmin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdmin(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#09101A] w-full max-w-7xl h-[92vh] rounded-[2.5rem] border-2 border-[#F27F57]/30 shadow-[0_0_40px_rgba(242,127,87,0.25)] flex flex-col overflow-hidden text-white"
            >
              {!isAdmin ? (
                /* Strict Session Authentication Check */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-red-950/20 rounded-full flex items-center justify-center text-[#F27F57] border-2 border-[#F27F57]/30 animate-pulse">
                    <Lock size={28} />
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-white">Acceso Denegado</h3>
                  <p className="max-w-md text-white/60 text-xs sm:text-sm">
                    No se detectó ninguna sesión administrativa activa o autorizada. Se ha denegado el acceso a la información confidencial de reservas y pedidos.
                  </p>
                  <button
                    onClick={() => {
                      setShowAdmin(false);
                      setShowLoginModal(true);
                    }}
                    className="px-6 py-3 bg-[#F27F57] text-white hover:bg-white hover:text-[#09101A] rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_5px_15px_rgba(242,127,87,0.3)]"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              ) : (
                <>
                  {/* Header section with Cyberpunk styling & Tabs */}
                  <div className="p-6 pr-16 sm:pr-20 bg-[#0E1724] border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F27F57] animate-ping" />
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                      CENTRO DE CONTROL VÍQUEZ
                    </h2>
                  </div>
                  <p className="text-[#F27F57] text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                    Panel Admin de Ocupación, Reservas y Delivery
                  </p>
                </div>
                
                {/* Switch Tabs: Reservas vs Delivery */}
                <div className="flex bg-[#070D14] p-1.5 rounded-2xl border border-white/5 self-stretch sm:self-auto">
                  <button
                    onClick={() => setAdminTab('reservas')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                      adminTab === 'reservas' 
                        ? 'bg-[#F27F57] text-white shadow-[0_0_15px_rgba(242,127,87,0.4)]' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    📅 Reservas
                  </button>
                  <button
                    onClick={() => setAdminTab('delivery')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                      adminTab === 'delivery' 
                        ? 'bg-[#F27F57] text-white shadow-[0_0_15px_rgba(242,127,87,0.4)]' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🏍️ Delivery ({activeDeliveryCount})
                  </button>
                </div>

                {(() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                  const isStandalone = (window.navigator as any).standalone === true
                    || window.matchMedia('(display-mode: standalone)').matches;
                  const needsIOSInstall = isIOS && !isStandalone;

                  if (needsIOSInstall) {
                    return (
                      <div
                        title="En iPhone hay que instalar el sitio antes de poder activar notificaciones"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/30 max-w-xs text-left leading-snug"
                      >
                        📲 En iPhone: toca Compartir (□↑) → "Agregar a pantalla de inicio" → abre el ícono nuevo desde ahí para activar notificaciones
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
                      disabled={pushBusy}
                      title={pushSubscribed ? 'Notificaciones activas en este dispositivo - click para desactivar' : 'Recibir avisos de pedidos y reservas en este celular, sin tener el sitio abierto'}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border disabled:opacity-50 ${
                        pushSubscribed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-white/60 border-white/10 hover:border-[#F27F57]/40 hover:text-[#F27F57]'
                      }`}
                    >
                      {pushBusy ? '...' : pushSubscribed ? '🔔 Notificaciones Activas' : '🔕 Activar Notificaciones'}
                    </button>
                  );
                })()}

                <button
                  onClick={() => setShowAdmin(false)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Push notification error banner */}
              {pushError && (
                <div className="px-6 py-3 bg-red-950/30 border-b border-red-500/20 text-red-300 text-xs font-bold flex items-center gap-2 shrink-0">
                  <span>⚠️</span> {pushError}
                </div>
              )}

              {/* Status banner */}
              {dashboardError && (
                <div className="bg-red-950/20 border-b border-red-500/30 text-red-400 py-2.5 px-6 text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-2 animate-pulse shrink-0">
                  ⚠️ <span className="opacity-90">{dashboardError}</span>
                </div>
              )}

              {/* Body Content Areas */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070D14]">
                {adminTab === 'reservas' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Panel: Metrics & Control Table */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* --- Metrics Panel --- */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Metric 1 - click to clear the status filter and see every reservation */}
                        <div
                          onClick={() => { setShowBlockedTable(false); setStatusFilter('todos'); }}
                          className={`bg-[#0E1724] border rounded-3xl p-5 shadow-[0_4px_15px_rgba(6,182,212,0.05)] relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-[#111c2c] ${
                            statusFilter === 'todos' && !showBlockedTable ? 'border-cyan-500/60' : 'border-cyan-500/20 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="absolute right-3 top-3 text-cyan-500/10 group-hover:text-cyan-500/20 transition-all">
                            <ChefHat size={48} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-extrabold">Comensales Programados</span>
                          <p className="text-3xl font-black text-white mt-1 font-mono tracking-tight">
                            {reservas.reduce((sum, r) => sum + (parseInt(r.lugares) || 0), 0)}
                          </p>
                          <div className="w-12 h-1 bg-cyan-400 rounded mt-3 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </div>

                        {/* Metric 2 - click to filter the table below to pending reservations only */}
                        <div
                          onClick={() => { setShowBlockedTable(false); setStatusFilter('pendiente'); }}
                          className={`bg-[#0E1724] border rounded-3xl p-5 shadow-[0_4px_15px_rgba(242,127,87,0.05)] relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-[#111c2c] ${
                            statusFilter === 'pendiente' && !showBlockedTable ? 'border-[#F27F57]/60' : 'border-[#F27F57]/20 hover:border-[#F27F57]/40'
                          }`}
                        >
                          <div className="absolute right-3 top-3 text-[#F27F57]/10 group-hover:text-[#F27F57]/20 transition-all">
                            <Clock size={48} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-[#F27F57] font-extrabold">Pendientes por Confirmar</span>
                          <p className="text-3xl font-black text-white mt-1 font-mono tracking-tight">
                            {reservas.filter(r => r.estado === 'pendiente').length}
                          </p>
                          <div className="w-12 h-1 bg-[#F27F57] rounded mt-3 shadow-[0_0_8px_rgba(242,127,87,0.8)]" />
                        </div>

                        {/* Metric 3 */}
                        <div 
                          onClick={handleLoadBlockedDaysDetail}
                          className="bg-[#0E1724] border border-purple-500/20 rounded-3xl p-5 shadow-[0_4px_15px_rgba(168,85,247,0.05)] relative overflow-hidden group hover:border-purple-500/60 hover:bg-[#111c2c] transition-all duration-300 cursor-pointer"
                        >
                          <div className="absolute right-3 top-3 text-purple-500/10 group-hover:text-purple-500/20 transition-all">
                            <Lock size={48} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-extrabold">Días Cerrados / Bloqueados</span>
                          <p className="text-3xl font-black text-white mt-1 font-mono tracking-tight">
                            {blockedCount}
                          </p>
                          <div className="w-12 h-1 bg-purple-500 rounded mt-3 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </div>
                      </div>

                      {/* --- Tabla de Gestión --- */}
                      <div className="bg-[#0E1724] border border-white/5 rounded-3xl p-5 space-y-4">
                        {!showBlockedTable ? (
                          <>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Listado de Reservas y Cotizaciones</h3>
                                <p className="text-white/40 text-[10px] uppercase mt-0.5">Control de asistencias del restaurante y catering</p>
                              </div>
                              
                              {/* Filter Pills */}
                              <div className="flex flex-wrap gap-1.5 bg-[#070D14] p-1 rounded-xl border border-white/5">
                                {['todos', 'pendiente', 'confirmado', 'cancelado', 'finalizado'].map(statusOption => (
                                  <button
                                    key={statusOption}
                                    onClick={() => setStatusFilter(statusOption)}
                                    className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-lg transition-all ${
                                      statusFilter === statusOption 
                                        ? 'bg-[#F27F57] text-white' 
                                        : 'text-white/40 hover:text-white'
                                    }`}
                                  >
                                    {statusOption}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Scrollable container for tables */}
                            <div className="overflow-x-auto rounded-2xl border border-white/5 max-h-[480px]">
                              <table className="w-full text-left text-xs min-w-[600px]">
                                <thead className="bg-[#09101A] text-white/50 font-black tracking-widest uppercase border-b border-white/5">
                                  <tr>
                                    <th className="p-4 text-[10px]">Cliente</th>
                                    <th className="p-4 text-[10px]">Servicio Cotizado</th>
                                    <th className="p-4 text-[10px]">Fecha / Hora</th>
                                    <th className="p-4 text-[10px] text-center">Lugares</th>
                                    <th className="p-4 text-[10px] text-center">Estado</th>
                                    <th className="p-4 text-[10px] text-center">Acciones rápidas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {(() => {
                                    const list = reservas || [];
                                    const filtered = list.filter(r => statusFilter === 'todos' || r.estado === statusFilter);
                                    if (filtered.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={6} className="p-8 text-center text-white/20 uppercase font-black tracking-wider">
                                            No se encontraron registros de este tipo
                                          </td>
                                        </tr>
                                      );
                                    }
                                    return filtered.map(r => (
                                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold text-white">
                                          {r.cliente}
                                        </td>
                                        <td className="p-4 text-white/70">
                                          <span className="bg-[#070D14] px-2.5 py-1 rounded-lg border border-white/5 text-[11px] font-black uppercase text-[#F27F57] tracking-wider">
                                            {r.servicio_cotizado || 'Restaurante / General'}
                                          </span>
                                        </td>
                                        <td className="p-4 text-white/80 font-mono">
                                          <span className="block font-bold">{toDateOnly(r.fecha).split('-').reverse().join('/')}</span>
                                          <span className="block text-[10px] text-white/40">{r.fecha_hora?.slice(11, 16)}</span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-cyan-400 font-mono text-sm">
                                          {r.lugares}
                                        </td>
                                        <td className="p-4 text-center">
                                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            r.estado === 'pendiente' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                                            r.estado === 'confirmado' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' :
                                            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                          }`}>
                                            {r.estado}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {r.estado === 'pendiente' && (
                                              <button
                                                onClick={() => updateReservaEstado(r.id, 'confirmado')}
                                                className="bg-cyan-500 hover:bg-cyan-400 text-[#09101A] font-black text-[9px] uppercase px-2.5 py-1.5 rounded-lg tracking-wider transition-all shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                                title="Confirmar Reserva"
                                              >
                                                Confirmar
                                              </button>
                                            )}
                                            {r.estado === 'confirmado' && (
                                              <button
                                                onClick={() => updateReservaEstado(r.id, 'finalizado')}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-[#09101A] font-black text-[9px] uppercase px-2.5 py-1.5 rounded-lg tracking-wider transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                                title="Finalizar Reserva/Visita"
                                              >
                                                Finalizar
                                              </button>
                                            )}
                                            {(r.estado === 'pendiente' || r.estado === 'confirmado') && (
                                              <button
                                                onClick={() => updateReservaEstado(r.id, 'cancelado')}
                                                className="bg-orange-500 hover:bg-orange-400 text-[#09101A] font-black text-[9px] uppercase px-2.5 py-1.5 rounded-lg tracking-wider transition-all shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                                                title="Cancelar Reserva"
                                              >
                                                Cancelar
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
                                                  deleteReserva(r.id);
                                                }
                                              }}
                                              className="p-1.5 rounded-lg text-red-500/50 hover:text-white hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/20"
                                              title="Eliminar registro"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ));
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                  <span>🔒 Días Cerrados / Bloqueados</span>
                                </h3>
                                <p className="text-white/40 text-[10px] uppercase mt-0.5">Gestión de exclusión de fechas por tipo de servicio</p>
                              </div>
                              
                              <button
                                onClick={() => setShowBlockedTable(false)}
                                className="text-[10px] uppercase font-black px-4 py-2 bg-[#F27F57] hover:bg-[#ff8a50] text-[#09101A] rounded-xl transition-all shadow-[0_0_12px_rgba(242,127,87,0.3)] flex items-center gap-1.5 hover:scale-102"
                              >
                                <span>← Volver a Reservas</span>
                              </button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/5 max-h-[480px]">
                              {isLoadingBlocked ? (
                                <div className="text-center py-20">
                                  <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-500 rounded-full" role="status">
                                    <span className="sr-only">Cargando...</span>
                                  </div>
                                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-4">Obteniendo bloqueos desde el servidor...</p>
                                </div>
                              ) : blockedList.length === 0 ? (
                                <div className="text-center py-20 text-white/20 uppercase font-black tracking-wider text-xs">
                                  No hay fechas bloqueadas registradas
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs min-w-[500px]">
                                  <thead className="bg-[#09101A] text-white/50 font-black tracking-widest uppercase border-b border-white/5">
                                    <tr>
                                      <th className="p-4 text-[10px]">Fecha</th>
                                      <th className="p-4 text-[10px]">Servicio afectado</th>
                                      <th className="p-4 text-[10px] text-center">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 font-medium">
                                    {blockedList.map((b, idx) => (
                                      <tr key={`${b.fecha}-${b.servicio_tipo}-${idx}`} className="hover:bg-purple-500/5 transition-colors">
                                        <td className="p-4 font-bold text-white font-mono text-sm">
                                          {b.fecha.split('-').reverse().join('/')}
                                        </td>
                                        <td className="p-4">
                                          <span className="bg-[#070D14] px-2.5 py-1 rounded-lg border border-purple-500/10 text-[10px] font-black uppercase text-purple-300 tracking-wider">
                                            {getServiceLabel(b.servicio_tipo)}
                                          </span>
                                        </td>
                                        <td className="p-4 text-center">
                                          <button
                                            onClick={async () => {
                                              if (confirm(`¿Estás seguro de que deseas desbloquear el día ${b.fecha.split('-').reverse().join('/')} para el servicio "${getServiceLabel(b.servicio_tipo)}"?`)) {
                                                await handleHabilitar(b.id, b.fecha, b.servicio_tipo);
                                              }
                                            }}
                                            disabled={(b.id && deletingKeys.includes(String(b.id))) || deletingKeys.includes(`${b.fecha}_${b.servicio_tipo}`)}
                                            className={`relative border text-[9px] uppercase font-black px-3.5 py-1.5 rounded-xl tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5 duration-200 ${(b.id && deletingKeys.includes(String(b.id))) || deletingKeys.includes(`${b.fecha}_${b.servicio_tipo}`) ? 'bg-purple-500/25 border-purple-400 text-purple-200 cursor-not-allowed' : 'bg-purple-500/10 border-purple-500/20 hover:border-purple-400 hover:bg-purple-500 hover:text-[#09101A] text-purple-300 hover:scale-105'}`}
                                          >
                                            {((b.id && deletingKeys.includes(String(b.id))) || deletingKeys.includes(`${b.fecha}_${b.servicio_tipo}`)) ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                                                <span>Procesando...</span>
                                              </>
                                            ) : (
                                              <span>Habilitar</span>
                                            )}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                    </div>

                    {/* Right Panel: MASTER OCCUPANCY CALENDAR */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Calendario de Ocupación */}
                      <div className="bg-[#0E1724] border border-[#F27F57]/20 rounded-3xl p-5 shadow-[0_0_20px_rgba(242,127,87,0.05)]">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                            <span>📅 CALENDARIO DE OCUPACIÓN</span>
                          </h4>
                          
                          {/* Navigation */}
                          <div className="flex gap-1 bg-[#070D14] p-1 border border-white/5 rounded-xl">
                            <button 
                              onClick={() => changeMonth(-1)} 
                              className="text-[#F27F57] hover:text-[#ff8a50] leading-none font-bold px-3 py-1 transition-colors text-sm"
                            >
                              &lt;
                            </button>
                            <span className="text-[10px] uppercase font-black text-white/70 px-2 flex items-center tracking-wider">
                              {monthNamesEs[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </span>
                            <button 
                              onClick={() => changeMonth(1)} 
                              className="text-[#F27F57] hover:text-[#ff8a50] leading-none font-bold px-3 py-1 transition-colors text-sm"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        {/* Selector de Servicio integrado */}
                        <div className="mb-5 bg-[#070D14] p-4 rounded-2xl border border-white/5 space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] uppercase font-black tracking-widest text-[#F27F57] font-semibold">
                              Seleccionar Servicio a Gestionar:
                            </label>
                            <select
                              value={selectedAdminService}
                              onChange={(e) => {
                                setSelectedAdminService(e.target.value);
                                setSelectedAdminDate(null); // Reset selected inspected date
                              }}
                              className="w-full bg-[#0E1724] text-white font-extrabold uppercase text-xs rounded-xl border border-white/10 p-3 outline-none focus:border-[#F27F57]/50 transition-all cursor-pointer"
                            >
                              <option value="mesas">Reserva de Mesas</option>
                              <option value="catering">Catering Service</option>
                              <option value="parrilladas">Parrilladas</option>
                              <option value="eventos">Eventos Privados</option>
                              <option value="chef">Chef Personal</option>
                              <option value="clases_cocina">Clases de Cocina Típica</option>
                              <option value="fonda">Fonda masiva</option>
                              <option value="turismo">Turismo y Excursiones</option>
                              <option value="todos">Cierre Total (Todos)</option>
                            </select>
                          </div>

                          {/* Botón de Guardar Cambios con feedback visual de cambios sin guardar */}
                          {(() => {
                            const originallyBlocked = savedBloqueos
                              .filter(b => b.servicio_tipo === selectedAdminService)
                              .map(b => b.fecha);
                            const hasUnsavedChanges = 
                              tempBlockedDatesForService.length !== originallyBlocked.length ||
                              tempBlockedDatesForService.some(d => !originallyBlocked.includes(d)) ||
                              originallyBlocked.some(d => !tempBlockedDatesForService.includes(d));

                            return (
                              <button
                                type="button"
                                onClick={handleSaveCalendarChanges}
                                className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md cursor-pointer ${
                                  hasUnsavedChanges
                                    ? 'bg-[#F27F57] hover:bg-[#ff8a50] text-white shadow-[#F27F57]/20 animate-pulse'
                                    : 'bg-white/5 text-white/40 cursor-not-allowed border border-white/5'
                                }`}
                              >
                                {hasUnsavedChanges ? '💾 Guardar Cambios (Pendientes)' : '✓ Todo Guardado'}
                              </button>
                            );
                          })()}
                        </div>

                        {/* Grid Days of Calendar */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-wider text-[#F27F57]/50 mb-2">
                          <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                          {getCalendarDays().map((day, idx) => {
                            if (day.dayNum === null) {
                              return <div key={`admin-empty-${idx}`} className="p-2" />;
                            }

                            const isBlocked = tempBlockedDatesForService.includes(day.dateStr);
                            const hasReservationsOnThisDay = dayHasReservations(day.dateStr);
                            const isActiveDateSelected = selectedAdminDate === day.dateStr;

                            return (
                              <button
                                key={`admin-day-${day.dateStr}`}
                                type="button"
                                disabled={day.isPast}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Mark as active inspected date
                                  setSelectedAdminDate(day.dateStr);
                                }}
                                className={`relative p-2 rounded-lg font-bold transition-all ${
                                  isActiveDateSelected 
                                    ? 'bg-[#F27F57] text-white shadow-[0_0_12px_rgba(242,127,87,0.5)] border border-white/30 cursor-pointer'
                                    : day.isPast
                                      ? 'text-white/20 bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-40'
                                      : isBlocked
                                        ? 'text-red-400 bg-red-950/30 border border-red-500/30 hover:border-red-500/60 cursor-pointer'
                                        : 'bg-[#070D14] border border-white/5 hover:border-[#F27F57]/30 text-white cursor-pointer'
                                }`}
                                title={`${day.isPast ? 'Fecha Pasada.' : isBlocked ? 'Bloqueado. ' : 'Libre. '}${hasReservationsOnThisDay ? 'Contiene reservas!' : ''}`}
                              >
                                {day.dayNum}
                                
                                {/* Punto rojo de bloqueado */}
                                {isBlocked && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                )}

                                {/* Neon cyan indicator dot for reservation presence */}
                                {hasReservationsOnThisDay && (
                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Informative footer for days of calendar */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[8px] uppercase font-black tracking-wider text-white/30">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" /> Con Reservas
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-950 border border-red-500/30 rounded" /> Bloqueado
                          </span>
                        </div>
                      </div>

                      {/* Redesigned State Control and Attendees Panel */}
                      <div className="bg-[#0E1724] border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
                        <div className="flex flex-col gap-1">
                          <h5 className="text-[11px] md:text-xs font-black uppercase tracking-[0.25em] text-[#F27F57] transition-all">
                            {selectedAdminDate 
                              ? `📅 Gestión de Estado: ${selectedAdminDate.split('-').reverse().join('/')}` 
                              : "🔍 Selección de Fecha"}
                          </h5>
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                            {selectedAdminDate ? "Control de disponibilidad y reservas del día" : "Selecciona una fecha en el calendario para gestionar su estado"}
                          </p>
                        </div>

                        {selectedAdminDate ? (
                          <div className="space-y-5 animate-fadeIn">
                            {/* Selector de Estado con Botones Grandes e Íconos */}
                            <div className="space-y-3">
                              <p className="text-[9px] uppercase font-black tracking-[0.2em] text-white/30 block">
                                Estado del Sistema de Reservas para este día:
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Botón Disponible */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusChange(selectedAdminDate, 'available');
                                  }}
                                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-3.5 transition-all duration-300 group cursor-pointer ${
                                    !tempBlockedDatesForService.includes(selectedAdminDate)
                                      ? 'bg-green-500/10 border-green-500/80 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-green-500/20'
                                      : 'bg-[#070D14] border-white/5 text-white/30 hover:border-green-500/30 hover:text-white/70'
                                  }`}
                                >
                                  <CheckCircle 
                                    size={30} 
                                    className={`transition-transform duration-300 group-hover:scale-110 ${
                                      !tempBlockedDatesForService.includes(selectedAdminDate) 
                                        ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' 
                                        : 'text-white/20'
                                    }`} 
                                  />
                                  <div className="text-center">
                                    <span className="block text-xs font-black uppercase tracking-widest leading-none">
                                      Disponible
                                    </span>
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-white/20 mt-1.5 block">
                                      Abierto para reservas
                                    </span>
                                  </div>
                                </button>

                                {/* Botón Ocupado / Bloqueado */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusChange(selectedAdminDate, 'blocked');
                                  }}
                                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-3.5 transition-all duration-300 group cursor-pointer ${
                                    tempBlockedDatesForService.includes(selectedAdminDate)
                                      ? 'bg-red-500/10 border-red-500/80 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20'
                                      : 'bg-[#070D14] border-white/5 text-white/30 hover:border-[#F27F57]/30 hover:text-white/70'
                                  }`}
                                >
                                  <Lock 
                                    size={30} 
                                    className={`transition-transform duration-300 group-hover:scale-110 ${
                                      tempBlockedDatesForService.includes(selectedAdminDate) 
                                        ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                                        : 'text-white/20'
                                    }`} 
                                  />
                                  <div className="text-center">
                                    <span className="block text-xs font-black uppercase tracking-widest leading-none">
                                      Ocupado / Bloqueado
                                    </span>
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-white/20 mt-1.5 block">
                                      Cerrar día completo
                                    </span>
                                  </div>
                                </button>
                              </div>

                              {/* Pequeño texto de confirmación */}
                              <p className="text-[9px] text-center text-white/40 font-semibold uppercase tracking-wider bg-black/10 py-2.5 px-3 rounded-xl border border-white/5">
                                📢 Presiona "Guardar Cambios" arriba para aplicar los cambios de disponibilidad en Supabase
                              </p>
                            </div>

                            {/* Listado de reservas */}
                            <div className="space-y-3 pt-3 border-t border-white/5">
                              {(() => {
                                const list = reservas || [];
                                const matches = list.filter(r => toDateOnly(r.fecha) === selectedAdminDate);
                                return (
                                  <>
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[10px] uppercase font-black tracking-wider text-white/50">
                                        Reservas Registradas ({matches.length})
                                      </span>
                                      <span className="h-px flex-grow bg-white/5 mx-3" />
                                    </div>
                                    {matches.length === 0 ? (
                                      <div className="p-5 bg-[#070D14] rounded-2xl text-center border border-white/5">
                                        <p className="text-white/30 text-[9px] uppercase font-bold tracking-widest">
                                          Sin reservas agendadas para esta fecha
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                        {matches.map(m => (
                                          <div key={m.id} className="bg-[#070D14] border border-white/5 p-3.5 rounded-2xl space-y-2 hover:border-[#F27F57]/30 transition-all duration-350">
                                            <div className="flex justify-between items-center">
                                              <span className="font-extrabold text-white text-xs">{m.cliente}</span>
                                              <span className="font-mono text-[10px] text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/20 font-black">
                                                {m.fecha_hora?.slice(11, 16)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-white/40">
                                              <span>🍽️ {m.servicio_cotizado || 'Almuerzo/Cena'}</span>
                                              <span className="text-[#F27F57] bg-[#F27F57]/10 px-2 py-0.5 rounded border border-[#F27F57]/20">
                                                {m.lugares} Personas
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 bg-[#070D14] rounded-2xl text-center border border-white/5 text-white/30 space-y-2">
                            <Calendar size={24} className="mx-auto text-white/10" />
                            <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed max-w-[280px] mx-auto">
                              Haz clic en un día del calendario para ver quiénes asisten o bloquear esa fecha.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                ) : (
                  /* Existing Delivery Orders panel */
                  <div className="space-y-6">
                    {/* Control Bar: Switch display queue vs full audit history */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0E1724] p-5 rounded-3xl border border-white/5 shadow-2xl">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-[#F27F57] flex items-center gap-2">
                          {showDeliveryHistory ? '📚 Historial de Pedidos' : '🏍️ Cola de Delivery Activa (Hoy)'}
                        </h4>
                        <p className="text-[10px] text-white/40 uppercase font-bold mt-1 tracking-wider leading-relaxed">
                          {showDeliveryHistory 
                            ? 'Búsqueda e informes de facturación de pedidos pasados por fecha' 
                            : 'Cola en tiempo real para despacho. Pedidos marcados como entregados se limpian tras 2 horas.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {showDeliveryHistory && (
                          <div className="flex flex-wrap items-center gap-2 bg-[#070D14]/80 p-1.5 rounded-2xl border border-white/5 shadow-inner w-full sm:w-auto">
                            <input
                              type="date"
                              value={deliveryHistoryDate}
                              onChange={(e) => {
                                setDeliveryHistoryDate(e.target.value);
                                setDeliveryHistoryTimeframe('dia');
                              }}
                              className="bg-[#0E1724] text-[#F27F57] rounded-xl px-3.5 py-1.5 border border-[#F27F57]/20 hover:border-[#F27F57]/50 focus:border-[#F27F57] outline-none font-mono text-xs transition-all w-full sm:w-auto"
                            />
                            <div className="flex bg-[#0E1724]/60 p-1 rounded-xl gap-1 w-full sm:w-auto justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryHistoryTimeframe('hoy');
                                  const today = new Date();
                                  setDeliveryHistoryDate(today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                  deliveryHistoryTimeframe === 'hoy'
                                    ? 'bg-[#F27F57] text-white shadow-[0_0_8px_rgba(242,127,87,0.3)]'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Hoy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryHistoryTimeframe('ayer');
                                  const yesterday = new Date();
                                  yesterday.setDate(yesterday.getDate() - 1);
                                  setDeliveryHistoryDate(yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0'));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                  deliveryHistoryTimeframe === 'ayer'
                                    ? 'bg-[#F27F57] text-white shadow-[0_0_8px_rgba(242,127,87,0.3)]'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Ayer
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryHistoryTimeframe('mes');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                  deliveryHistoryTimeframe === 'mes'
                                    ? 'bg-[#F27F57] text-white shadow-[0_0_8px_rgba(242,127,87,0.3)]'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Este Mes
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowDeliveryHistory(!showDeliveryHistory)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-2 w-full sm:w-auto ${
                            showDeliveryHistory
                              ? 'bg-transparent text-[#F27F57] border-[#F27F57]/30 hover:bg-[#F27F57]/5'
                              : 'bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {showDeliveryHistory ? '⬅️ Ver Cola Activa' : '📬 Ver Historial'}
                        </button>
                      </div>
                    </div>

                    {/* Pedidos list logic details */}
                    {(() => {
                      const combinedOrders = [...(adminOrders || [])];

                      const yesterdayStr = (() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        return d.getFullYear() + '-' + 
                          String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(d.getDate()).padStart(2, '0');
                      })();

                      const displayedOrders = combinedOrders.filter(order => {
                        if (showDeliveryHistory) {
                          const orderDate = getOrderDateOnly(order);
                          if (deliveryHistoryTimeframe === 'hoy') {
                            return orderDate === todayStr;
                          } else if (deliveryHistoryTimeframe === 'ayer') {
                            return orderDate === yesterdayStr;
                          } else if (deliveryHistoryTimeframe === 'mes') {
                            return orderDate.startsWith(todayStr.substring(0, 7));
                          } else {
                            return orderDate === deliveryHistoryDate;
                          }
                        } else {
                          // Normal live queue: today's orders not older than 2 hours if delivered
                          return getOrderDateOnly(order) === todayStr && !isOldEntregado(order);
                        }
                      });

                      const totalBilled = displayedOrders.reduce((sum, order) => sum + (Number(order.total || order.total_pago) || 0), 0);
                      const totalOrdersCount = displayedOrders.length;

                      return (
                        <div className="space-y-6">
                          {/* Financial and Order metrics summary cards */}
                          {showDeliveryHistory && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                              {/* Total Facturado Container */}
                              <div className="bg-[#0E1724] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors duration-500" />
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block">
                                    Total Facturado
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-green-400 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                                      ₡{totalBilled.toLocaleString('es-CR')}
                                    </span>
                                    <span className="text-[9px] text-white/20 font-black uppercase tracking-wider">CRC</span>
                                  </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
                                  <DollarSign size={20} className="animate-pulse" />
                                </div>
                              </div>

                              {/* Pedidos Totales Container */}
                              <div className="bg-[#0E1724] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#F27F57]/5 rounded-full blur-2xl group-hover:bg-[#F27F57]/10 transition-colors duration-500" />
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block">
                                    Cantidad de Pedidos
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-[#F27F57] font-mono tracking-tight drop-shadow-[0_0_8px_rgba(242,127,87,0.3)]">
                                      {totalOrdersCount}
                                    </span>
                                    <span className="text-[9px] text-white/20 font-black uppercase tracking-wider">
                                      {totalOrdersCount === 1 ? 'pedido' : 'pedidos'}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-[#F27F57]/10 border border-[#F27F57]/20 text-[#F27F57] shadow-[0_0_12px_rgba(242,127,87,0.15)]">
                                  <Package size={20} />
                                </div>
                              </div>
                            </div>
                          )}

                          {displayedOrders.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-white/20 space-y-4 bg-[#0E1724] rounded-3xl border border-white/5 shadow-inner">
                              <ShoppingCart size={48} className="stroke-1 text-[#F27F57]" />
                              <p className="text-sm font-bold uppercase tracking-widest text-white/40 text-center px-4">
                                No hay pedidos pendientes en este momento.
                              </p>
                            </div>
                          ) : showDeliveryHistory ? (
                            /* Modern Table for History Log Audits */
                            <div className="bg-[#0E1724] border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
                              {/* Desktop Table View */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-white/5 bg-[#070D14]/50">
                                      <th className="p-4 pl-6 text-[10px] font-black uppercase tracking-wider text-white/40">ID de Pedido</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-wider text-white/40">Cliente</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-wider text-white/40">Hora</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-wider text-white/40">Método de Pago</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-wider text-white/40">Total</th>
                                      <th className="p-4 pr-6 text-[10px] font-black uppercase tracking-wider text-white/40 text-right">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/[0.03]">
                                    {displayedOrders.map((order) => {
                                      const clientNameStr = order.cliente || order.nombre_cliente || order.name || 'Cliente de Delivery';
                                      const clientPhoneStr = order.telefono || order.phone || '';
                                      const currentStatusStr = order.status || order.estado || 'Pendiente';
                                      const { paymentMethod } = parseOrderDetails(order);
                                      
                                      let statusStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                                      const normS = currentStatusStr.toLowerCase();
                                      if (normS === 'entregado' || normS === 'listo / entregado') {
                                        statusStyle = 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.12)]';
                                      } else if (normS === 'en camino' || normS === 'en_camino') {
                                        statusStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.12)]';
                                      } else if (normS === 'cancelado' || normS === 'rechazado') {
                                        statusStyle = 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.12)]';
                                      } else if (normS === 'pendiente') {
                                        statusStyle = 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.12)]';
                                      }

                                      return (
                                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="p-4 pl-6 font-mono text-xs font-black text-[#F27F57]">
                                            #{order.id}
                                          </td>
                                          <td className="p-4">
                                            <div className="font-bold text-white text-xs">{clientNameStr}</div>
                                            {clientPhoneStr && <div className="text-[10px] text-white/45 font-mono mt-0.5">{clientPhoneStr}</div>}
                                          </td>
                                          <td className="p-4 font-mono text-[11px] text-white/50 animate-pulse-slow">
                                            {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (order.timestamp || '')}
                                          </td>
                                          <td className="p-4">
                                            <span className="text-[10px] uppercase font-black tracking-wider text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                              {paymentMethod}
                                            </span>
                                          </td>
                                          <td className="p-4 font-mono font-black text-xs text-[#F27F57]">
                                            Core ₡{(order.total || order.total_pago) ? (order.total || order.total_pago).toLocaleString('es-CR') : '0'}
                                          </td>
                                          <td className="p-4 pr-6 text-right">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyle}`}>
                                              {currentStatusStr}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Row View */}
                              <div className="block md:hidden divide-y divide-white/[0.04]">
                                {displayedOrders.map((order) => {
                                  const clientNameStr = order.cliente || order.nombre_cliente || order.name || 'Cliente de Delivery';
                                  const clientPhoneStr = order.telefono || order.phone || '';
                                  const currentStatusStr = order.status || order.estado || 'Pendiente';
                                  const { paymentMethod } = parseOrderDetails(order);
                                  
                                  let statusStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
                                  const normS = currentStatusStr.toLowerCase();
                                  if (normS === 'entregado' || normS === 'listo / entregado') {
                                    statusStyle = 'bg-green-500/10 text-green-400 border-green-500/20';
                                  } else if (normS === 'en camino' || normS === 'en_camino') {
                                    statusStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                                  } else if (normS === 'cancelado' || normS === 'rechazado') {
                                    statusStyle = 'bg-red-500/10 text-red-500 border border-red-500/20';
                                  } else if (normS === 'pendiente') {
                                    statusStyle = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                                  }

                                  return (
                                    <div key={order.id} className="p-5 space-y-3 bg-[#0E1724] hover:bg-white/[0.01] transition-all">
                                      <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs font-black text-[#F27F57]">#{order.id}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusStyle}`}>
                                          {currentStatusStr}
                                        </span>
                                      </div>
                                      
                                      <div className="flex justify-between items-start gap-4">
                                        <div>
                                          <div className="font-bold text-white text-xs">{clientNameStr}</div>
                                          {clientPhoneStr && <div className="text-[10px] text-white/40 font-mono mt-0.5">{clientPhoneStr}</div>}
                                        </div>
                                        <div className="text-right font-mono text-[11px] text-white/50">
                                          {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (order.timestamp || '')}
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.04]">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                                          💳 {paymentMethod}
                                        </span>
                                        <span className="font-mono font-black text-xs text-[#F27F57]">
                                          ₡{(order.total || order.total_pago) ? (order.total || order.total_pago).toLocaleString('es-CR') : '0'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* Active Queue Grid Display Cards */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {displayedOrders.map((order) => {
                                const clientNameStr = order.cliente || order.nombre_cliente || order.nombre || order.name || 'Cliente de Delivery';
                                const clientPhoneStr = order.telefono || order.phone || '';
                                const currentStatusStr = order.status || order.estado || 'Pendiente';
                                const normStatus = currentStatusStr.toLowerCase();

                                // Defensive item/email/payment parsing (see parseOrderDetails)
                                const { items: itemsArray, email: clientEmailStr } = parseOrderDetails(order);
                                const clientAddressStr = order.direccion || order.direccion_escrita || order.address || '';

                                return (
                                  <div key={order.id} className="bg-[#0E1724] rounded-3xl p-6 border border-white/5 space-y-4 shadow-xl flex flex-col justify-between">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="text-[10px] font-black text-[#F27F57] uppercase tracking-widest">Pedido #{order.id}</span>
                                          <h3 className="text-xs font-mono font-bold text-white/50 mt-0.5">
                                            {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (order.timestamp || '')}
                                          </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(currentStatusStr)}`}>
                                            {currentStatusStr}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => deleteDeliveryOrder(order.id)}
                                            className="text-white/20 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                                            title="Eliminar pedido"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Order Items */}
                                      <div className="space-y-1.5 border-y border-white/5 py-3">
                                        {itemsArray.map((it: any, idx: number) => {
                                          const priceFormatted = typeof it.price === 'number' 
                                            ? `₡${it.price.toLocaleString()}` 
                                            : (typeof it.price === 'string' && it.price ? it.price : '');
                                          return (
                                            <div key={idx} className="flex justify-between text-xs">
                                              <span className="text-white/70">
                                                {it.name} <span className="text-[#F27F57] font-bold">x{it.quantity}</span>
                                              </span>
                                              <span className="text-white/50 font-mono">{priceFormatted}</span>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Customer Info */}
                                      <div className="space-y-1.5 bg-[#070D14]/60 p-3.5 rounded-2xl border border-white/5 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-white">
                                          <span className="text-base">👤</span>
                                          <span className="font-bold">{clientNameStr}</span>
                                        </div>
                                        
                                        {clientPhoneStr && (
                                          <div className="text-white/50 flex items-center gap-2 font-mono ml-0.5">
                                            <span>📞</span> <span className="text-cyan-400 font-bold">{clientPhoneStr}</span>
                                          </div>
                                        )}
                                        
                                        {clientEmailStr && clientEmailStr !== 'No provisto' && (
                                          <div className="text-white/40 truncate flex items-center gap-2 font-mono ml-0.5">
                                            <span>✉️</span> <span>{clientEmailStr}</span>
                                          </div>
                                        )}
                                        
                                        {clientAddressStr && (
                                          <div className="text-white/50 mt-1.5 border-t border-white/5 pt-1.5 flex items-start gap-1.5">
                                            <span className="text-[#F27F57]">📍</span>
                                            <p className="leading-relaxed">{clientAddressStr}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                      {/* Total block */}
                                      <div className="flex justify-between items-center bg-[#070D14]/40 p-3 rounded-xl border border-white/5">
                                        <span className="text-[9px] text-[#F9F7F2]/50 uppercase font-black tracking-widest">Monto Total:</span>
                                        <span className="text-xl font-black text-[#F27F57] font-mono tracking-tight">
                                          ₡{(order.total || order.total_pago) ? (order.total || order.total_pago).toLocaleString() : '0'}
                                        </span>
                                      </div>

                                      {/* Quick Action Buttons for state changes */}
                                      <div className="space-y-2">
                                        {normStatus === 'pendiente' && (
                                          <button
                                            type="button"
                                            onClick={() => updateDeliveryStatus(order.id, 'Aceptado')}
                                            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            👍 Aceptar Pedido
                                          </button>
                                        )}
                                        {normStatus === 'aceptado' && (
                                          <button
                                            type="button"
                                            onClick={() => updateDeliveryStatus(order.id, 'En Cocina')}
                                            className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(168,85,247,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            👨‍🍳 Preparar (En Cocina)
                                          </button>
                                        )}
                                        {(normStatus === 'en cocina' || normStatus === 'en_cocina') && (
                                          <button
                                            type="button"
                                            onClick={() => updateDeliveryStatus(order.id, 'Listo para Recoger')}
                                            className="w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            📦 Listo para Recoger
                                          </button>
                                        )}
                                        {normStatus === 'listo para recoger' && (
                                          <button
                                            type="button"
                                            onClick={() => updateDeliveryStatus(order.id, 'Entregado')}
                                            className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            🚲 Marcar Entregado
                                          </button>
                                        )}
                                        {(normStatus === 'entregado' || normStatus === 'listo / entregado' || normStatus === 'listo' || normStatus === 'cerrado') && (
                                          <div className="w-full bg-green-500/5 text-green-400/80 border border-green-500/10 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
                                            <span>✨</span> Completado / Despachado
                                          </div>
                                        )}
                                      </div>

                                      {/* Maps / location links */}
                                      {(order.location || (order.latitud && order.longitud)) && (
                                        <div className="pt-1.5 flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const loc = order.location || `${order.latitud},${order.longitud}`;
                                              window.open(loc.startsWith('http') ? loc : `https://www.google.com/maps?q=${loc}`, '_blank');
                                            }}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-white/10"
                                          >
                                            <MapPin size={11} className="text-[#F27F57]" />
                                            Maps
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const loc = order.location || `${order.latitud},${order.longitud}`;
                                              const coords = loc.includes('q=') ? loc.split('q=')[1] : loc;
                                              window.open(`waze://?ll=${coords}&navigate=yes`, '_blank');
                                            }}
                                            className="flex-1 bg-[#F27F57]/5 hover:bg-[#F27F57]/15 text-[#F27F57] py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border border-[#F27F57]/10"
                                          >
                                            <Navigation size={11} />
                                            Waze
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              </>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Botón de Regresar al Inicio */}
      <button
        id="backToTop"
        onClick={scrollToTop}
        className="fixed bottom-24 right-8 z-[65] bg-[#F27F57] hover:bg-white text-white hover:text-black w-12 h-12 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all duration-300 ease-in-out opacity-0 pointer-events-none flex items-center justify-center border border-white/10 hover:scale-110 active:scale-95 group"
        aria-label="Volver arriba"
      >
        <ArrowUp size={20} strokeWidth={2.5} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      </button>

      {/* Legal Modal */}
      <LegalModal 
        isOpen={legalModal.isOpen} 
        type={legalModal.type} 
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })} 
      />

      {/* --- Admin Login Modal --- */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#0A111A] w-full max-w-md rounded-[2.5rem] border-2 border-[#F27F57] shadow-[0_0_35px_rgba(242,127,87,0.4)] overflow-hidden p-8 flex flex-col z-10 font-sans"
            >
              {/* Close Button */}
              <button 
                onClick={() => { setShowLoginModal(false); setLoginMode('login'); }}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
              >
                <X size={24} />
              </button>

              {loginMode === 'login' ? (
                <>
                  <div className="text-center mb-8 mt-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F27F57]/10 border border-[#F27F57]/30 text-[#F27F57] mb-4 shadow-[0_0_15px_rgba(242,127,87,0.2)]">
                      <Lock size={28} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                      Acceso Admin
                    </h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                      Ingresa tus credenciales autorizadas
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#F27F57]">
                        Correo Electrónico
                      </label>
                      <input 
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@restauranteviquez.com"
                        className="w-full bg-[#121A24] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-[#F27F57] focus:ring-1 focus:ring-[#F27F57] transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#F27F57]">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#121A24] border border-white/10 rounded-2xl p-4 pr-12 text-white text-sm outline-none focus:border-[#F27F57] focus:ring-1 focus:ring-[#F27F57] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-[#F27F57] focus:outline-none transition-colors"
                          title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('forgot');
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        className="text-xs text-[#F27F57] hover:text-[#ff8a50] uppercase tracking-widest font-black transition-colors focus:outline-none"
                      >
                        ¿Olvidó su contraseña?
                      </button>
                    </div>

                    {loginError && (
                      <div className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-center">
                        ⚠️ {loginError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#F27F57] hover:bg-[#ff8a50] disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_4px_15px_rgba(242,127,87,0.4)] flex items-center justify-center gap-2 border border-white/10"
                    >
                      {isLoggingIn ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Iniciando...</span>
                        </>
                      ) : (
                        <span>Entrar</span>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center mb-8 mt-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F27F57]/10 border border-[#F27F57]/30 text-[#F27F57] mb-4 shadow-[0_0_15px_rgba(242,127,87,0.2)]">
                      <Lock size={28} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                      Recuperación
                    </h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                      Enviaremos un enlace de restablecimiento
                    </p>
                  </div>

                  <form onSubmit={handleSendResetEmail} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[#F27F57]">
                        Correo Electrónico
                      </label>
                      <input 
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@restauranteviquez.com"
                        className="w-full bg-[#121A24] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-[#F27F57] focus:ring-1 focus:ring-[#F27F57] transition-all"
                      />
                    </div>

                    {forgotError && (
                      <div className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-950/20 border border-red-500/30 rounded-xl p-3 text-center">
                        ⚠️ {forgotError}
                      </div>
                    )}

                    {forgotSuccess && (
                      <div className="text-xs font-bold text-emerald-500 uppercase tracking-wide bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-center">
                        ✓ {forgotSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full bg-[#F27F57] hover:bg-[#ff8a50] disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_4px_15px_rgba(242,127,87,0.4)] flex items-center justify-center gap-2 border border-white/10"
                    >
                      {isSendingReset ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Enviando enlace...</span>
                        </>
                      ) : (
                        <span>Enviar enlace de recuperación</span>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('login');
                          setLoginError('');
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        className="text-xs text-white/50 hover:text-[#F27F57] uppercase tracking-widest font-black transition-colors focus:outline-none"
                      >
                        Volver al Login
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Confirmation Modal */}
      <AnimatePresence>
        {orderSuccessModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderSuccessModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-md bg-[#0D1721] border border-[#FFD700]/30 rounded-3xl p-8 text-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Decorative top illumination glowing bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
              
              {/* Premium Ring Animation for success check icon */}
              <div className="mx-auto w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(34,197,94,0.15)]">
                <CheckCircle size={40} className="text-green-400 animate-bounce" />
              </div>
              
              <h3 className="text-xl font-extrabold uppercase tracking-wide text-[#FFD700] mb-3">
                ¡Pedido Enviado!
              </h3>
              
              <p className="text-sm text-white/90 font-medium mb-1.5 leading-relaxed">
                ¡Tu pedido ha sido enviado a la cocina con éxito!
              </p>
              
              <p className="text-xs text-white/50 mb-8 leading-relaxed">
                Hemos enviado automáticamente la comanda detallada por correo electrónico al propietario del restaurante. No debes preocuparte de nada más.
              </p>
              
              <div className="flex flex-col gap-3">
                {/* Secondary optional WhatsApp confirm */}
                {lastWhatsAppUrl && (
                  <button
                    onClick={() => {
                      window.open(lastWhatsAppUrl, '_blank');
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(37,211,102,0.3)] hover:shadow-[0_4px_25px_rgba(37,211,102,0.4)] cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    <span>Enviar también por WhatsApp</span>
                  </button>
                )}
                
                {/* Close Success Modal button */}
                <button
                  onClick={() => setOrderSuccessModalOpen(false)}
                  className="w-full bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 hover:text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border border-white/10 cursor-pointer"
                >
                  Entendido, ¡Muchas Gracias!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blocked Days Management Modal */}
      <AnimatePresence>
        {isBlockedModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBlockedModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm shadow-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-2xl bg-[#0E1724] border border-purple-500/30 rounded-3xl p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Decorative top glow bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              {/* Decorative background glows */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F27F57]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="pb-4 border-b border-white/5 flex justify-between items-center relative z-10 bg-transparent">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <span>🔒 Días Cerrados / Bloqueados</span>
                    <span className="bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full text-xs font-mono font-bold text-purple-300">
                      {blockedList.length}
                    </span>
                  </h3>
                  <p className="text-white/40 text-[10px] uppercase mt-0.5 tracking-wider font-semibold">
                    Gestión colectiva de fechas deshabilitadas para reservas y cotizaciones
                  </p>
                </div>
                <button
                  onClick={() => setIsBlockedModalOpen(false)}
                  className="p-1.5 px-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all border border-white/5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Scrollable List */}
              <div className="py-4 overflow-y-auto max-h-[60vh] flex-grow relative z-10 space-y-4 pr-1">
                {isLoadingBlocked ? (
                  <div className="text-center py-16">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-500 rounded-full" role="status">
                      <span className="sr-only">Cargando...</span>
                    </div>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-4">Consultando base de datos...</p>
                  </div>
                ) : blockedList.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-[#070D14]/50">
                    <p className="text-white/30 text-xs font-black uppercase tracking-wider">No se encuentran días bloqueados en el sistema</p>
                    <p className="text-white/15 text-[10px] uppercase mt-1">Usa los calendarios para bloquear servicios por fecha</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/5">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-[#09101A] text-white/50 font-black tracking-widest uppercase border-b border-white/5">
                        <tr>
                          <th className="p-4 text-[10px] tracking-wider">Fecha</th>
                          <th className="p-4 text-[10px] tracking-wider">Servicio afectado</th>
                          <th className="p-4 text-[10px] tracking-wider">Motivo</th>
                          <th className="p-4 text-[10px] tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {blockedList.map((b, idx) => (
                          <tr key={`${b.fecha}-${b.servicio_tipo}-${idx}`} className="hover:bg-purple-500/5 transition-colors">
                            {/* Fecha */}
                            <td className="p-4 font-bold text-white font-mono text-sm whitespace-nowrap">
                              {b.fecha.split('-').reverse().join('/')}
                            </td>
                            {/* Servicio */}
                            <td className="p-4">
                              <span className="bg-[#070D14] px-2.5 py-1 rounded-lg border border-purple-500/10 text-[10px] font-black uppercase text-purple-300 tracking-wider inline-block whitespace-nowrap">
                                {getServiceLabel(b.servicio_tipo)}
                              </span>
                            </td>
                            {/* Motivo */}
                            <td className="p-4 text-white/60 text-xs italic max-w-[180px] truncate" title={b.motivo || undefined}>
                              {b.motivo ? b.motivo : <span className="text-white/20 not-italic uppercase font-bold text-[9px] tracking-wider">Sin motivo</span>}
                            </td>
                            {/* Habilitar / Desbloquear */}
                            <td className="p-4 text-center whitespace-nowrap">
                              {(() => {
                                const isDeletingNow = (b.id && deletingKeys.includes(String(b.id))) || deletingKeys.includes(`${b.fecha}_${b.servicio_tipo}`);
                                return (
                                  <button
                                    disabled={isDeletingNow}
                                    onClick={async () => {
                                      const formattedDate = b.fecha.split('-').reverse().join('/');
                                      if (confirm(`¿Estás seguro de que deseas desbloquear/habilitar el día ${formattedDate} para el servicio "${getServiceLabel(b.servicio_tipo)}"?`)) {
                                        await handleHabilitar(b.id, b.fecha, b.servicio_tipo);
                                      }
                                    }}
                                    className={`relative border text-[9px] uppercase font-black px-3.5 py-1.5 rounded-xl tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5 duration-200 before:transition-all ${
                                      isDeletingNow 
                                        ? 'bg-purple-500/25 border-purple-400 text-purple-200 cursor-not-allowed' 
                                        : 'bg-purple-500/10 border-purple-500/20 hover:border-purple-400 hover:bg-purple-500 hover:text-[#09101A] text-purple-300 hover:scale-105'
                                    }`}
                                    title="Desbloquear este día"
                                  >
                                    {isDeletingNow ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                                        <span>Procesando...</span>
                                      </>
                                    ) : (
                                      <span>Habilitar</span>
                                    )}
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Close controls */}
              <div className="pt-4 border-t border-white/5 bg-[#09101A]/40 flex justify-end gap-3 z-10">
                <button
                  onClick={() => setIsBlockedModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-black text-[10px] uppercase rounded-xl border border-white/5 hover:border-white/10 transition-all tracking-wider cursor-pointer"
                >
                  Entendido, Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
