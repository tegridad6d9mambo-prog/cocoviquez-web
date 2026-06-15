import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
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
      summary: 'Raíces que crecen desde Ciudad Quesada, San Carlos. Tras 23 años de lucha en su primer restaurante La Pradera, Abraham Víquez deja todo junto su familia para emprender Restaurante Coco Víquez en Playa Hermosa, durante 13 años de esfuerzo junto a su Esposa Marjorie e hijos Josué, Emmanuel y quienes hoy continúan el legado de excelencia en cada plato.',
      extended: '...logran como familia dar un salto y adquieren su propio terreno en Playa Hermosa y construyen su propio nuevo Restaurante. Esta vez más grande, moderno y propio. Actualmente administrado por su fundandor Abraham Víquez y su hijo Sebastián. Está ubicado en la ruta nacional 159 frente a la entrada principal de Condovac y Villas Sol. Caracterizándose por ser el único restaurante 100 % costarricense con sus sabores únicos y precios accesibles tanto para extranjeros como locales.',
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
      date: 'Fecha',
      time: 'Hora',
      guests: 'Personas',
      guestsHint: '8+ o grupos grandes',
      send: 'Enviar Reserva',
      success: '¡Reserva enviada! (Simulado en consola)'
    },
    footer: {
      rights: '© 2026 Coco Viquez. Todos los derechos reservados.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Abrir en Google Maps'
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
      summary: 'Roots growing from Ciudad Quesada, San Carlos. After 23 years of struggle at their first restaurant La Pradera, Abraham Víquez leaves everything with his family to start Coco Víquez Restaurant in Playa Hermosa, during 13 years of effort alongside his wife Marjorie and sons Josué, Emmanuel, and those who today continue the legacy of excellence in every dish.',
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
      date: 'Date',
      time: 'Time',
      guests: 'Guests',
      guestsHint: '8+ or large groups',
      send: 'Send Reservation',
      success: 'Reservation sent! (Simulated in console)'
    },
    footer: {
      rights: '© 2026 Coco Viquez. All rights reserved.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Open in Google Maps'
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
      summary: 'Des racines qui poussent depuis Ciudad Quesada, San Carlos. Après 23 ans de lutte dans son premier restaurant La Pradera, Abraham Víquez quitte tout avec sa famille pour fonder le restaurant Coco Víquez à Playa Hermosa, pendant 13 ans d\'effort aux côtés de sa femme Marjorie et de ses fils Josué, Emmanuel et ceux qui continuent aujourd\'hui l\'héritage d\'excellence dans chaque plat.',
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
      date: 'Date',
      time: 'Heure',
      guests: 'Personnes',
      guestsHint: '8+ ou grands groupes',
      send: 'Envoyer la Réservation',
      success: 'Réservation envoyée ! (Simulé en console)'
    },
    footer: {
      rights: '© 2026 Coco Viquez. Tous droits réservés.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'Ouvrir dans Google Maps'
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
      summary: 'Wurzeln, die in Ciudad Quesada, San Carlos, wachsen. Nach 23 Jahren Kampf in seinem ersten Restaurant La Pradera verlässt Abraham Víquez mit seiner Familie alles, um das Restaurant Coco Víquez in Playa Hermosa zu gründen, während 13 Jahren Anstrengung an der Seite seiner Frau Marjorie und seiner Söhne Josué, Emmanuel und die heute das Erbe der Exzellenz in jedem Gericht fortsetzen.',
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
      date: 'Datum',
      time: 'Uhrzeit',
      guests: 'Personen',
      guestsHint: '8+ oder große Gruppen',
      send: 'Reservierung Senden',
      success: 'Reservierung gesendet! (Simuliert in Konsole)'
    },
    footer: {
      rights: '© 2026 Coco Viquez. Alle Rechte vorbehalten.',
      location: 'Playa Hermosa, Guanacaste, Costa Rica',
      openMaps: 'In Google Maps öffnen'
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
  onOpenModal 
}: { 
  onOpenModal?: () => void
}) => {
  return (
    <div 
      onClick={onOpenModal}
      className={`relative w-full bg-ocean/5 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-zoom-in`}
    >
      <img 
        src="/mapa/mapa.jpg" 
        alt="Restaurante Coco Víquez Floor Plan - Distribución de mesas" 
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
          <span>Distribución de Mesas</span>
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
  onClassReserve?: () => void;
  fechasBloqueadas?: string[];
  isAdmin?: boolean;
  onToggleBlockedDate?: (dateStr: string) => Promise<void>;
  onSelectService?: (serviceName: string) => void;
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
  onClassReserve,
  fechasBloqueadas = [],
  isAdmin = false,
  onToggleBlockedDate,
  onSelectService
}) => {
  const isClase = item.id === 'clase' || item.name.toLowerCase().includes('cook') || item.name.toLowerCase().includes('cocina');
  const isEventos = item.id === 'eventos';
  
  // Dynamic capacities based on service type
  const minCapacity = isClase ? 5 : 1;
  const maxCapacity = isClase ? 15 : (isEventos ? 50 : 20);

  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPeople, setSelectedPeople] = useState('1');
  const [clientName, setClientName] = useState('');
  const [dateError, setDateError] = useState(false);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [isMobile, setIsMobile] = useState(false);

  const [localFechasBloqueadas, setLocalFechasBloqueadas] = useState<string[]>(fechasBloqueadas);

  useEffect(() => {
    setLocalFechasBloqueadas(fechasBloqueadas);
  }, [fechasBloqueadas]);

  useEffect(() => {
    async function fetchBlockedDates() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('fechas_bloqueadas')
          .select('fecha');
        if (error) {
          console.error('Error fetching blocked dates from Supabase inside ServiceCard:', error.message);
          return;
        }
        if (data) {
          const dates = data.map((item: any) => item.fecha);
          setLocalFechasBloqueadas(dates);
        }
      } catch (err) {
        console.error('Unexpected error fetching blocked dates in ServiceCard:', err);
      }
    }
    fetchBlockedDates();
  }, []);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper date tools
  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const getMinDateLimit = () => {
    if (isAdmin) return getTodayISO();
    const today = new Date();
    if (isEventos) {
      const minDate = new Date();
      minDate.setDate(today.getDate() + 7);
      return minDate.toISOString().split('T')[0];
    } else {
      const minDate = new Date();
      minDate.setDate(today.getDate() + 3);
      return minDate.toISOString().split('T')[0];
    }
  };

  const getMaxDateLimit = () => {
    if (isEventos) {
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(today.getMonth() + 3);
      return maxDate.toISOString().split('T')[0];
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setSelectedPeople('1');
      setSelectedDate('');
      setClientName('');
    }
  }, [isFlipped]);

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

  const buttonText = item.cta || cta;

  // Calculate max date (today + 90 days)
  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString().split('T')[0];
  };

  const peopleRanges = isClase 
    ? ['5', '8', '10', '12', '15']
    : ['2-10', '11-20', '21-50', '51-100', '100+'];

  const formatMessage = (template: string) => {
    return template
      .replace('{service}', item.name)
      .replace('{date}', selectedDate)
      .replace('{people}', selectedPeople);
  };

  const handleWhatsApp = async (e: React.MouseEvent) => {
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

    try {
      if (supabase) {
        // Handle range values like '2-10', extract first number
        const numericPeople = selectedPeople.includes('-') 
          ? parseInt(selectedPeople.split('-')[0]) 
          : (parseFloat(selectedPeople) || 1);

        const { error } = await supabase
          .from('reservas')
          .insert([{
            nombre_cliente: sanitizedName,
            servicio_cotizado: item.name,
            fecha: selectedDate,
            hora: '12:00',
            total_personas: numericPeople,
            estado: 'pendiente'
          }]);
        if (error) {
          console.error("Error inserting reservation in Supabase from flip card via WhatsApp:", error.message);
        }
      }
    } catch (err) {
      console.error(err);
    }

    // Append client name nicely to the Whatsapp message
    const formattedDate = selectedDate.split('-').reverse().join('/');
    const message = `¡Hola! Mi nombre es ${sanitizedName}.\nQuiero consultar disponibilidad para: ${item.name}\nFecha: ${formattedDate}\nPersonas: ${selectedPeople}`;
    window.open(`https://wa.me/50626720029?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmail = async (e: React.MouseEvent) => {
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

    try {
      if (supabase) {
        const numericPeople = selectedPeople.includes('-') 
          ? parseInt(selectedPeople.split('-')[0]) 
          : (parseFloat(selectedPeople) || 1);

        const { error } = await supabase
          .from('reservas')
          .insert([{
            nombre_cliente: sanitizedName,
            servicio_cotizado: item.name,
            fecha: selectedDate,
            hora: '12:00',
            total_personas: numericPeople,
            estado: 'pendiente'
          }]);
        if (error) {
          console.error("Error inserting reservation in Supabase from flip card via Email:", error.message);
        }
      }
    } catch (err) {
      console.error(err);
    }

    const formattedDate = selectedDate.split('-').reverse().join('/');
    const subject = `Solicitud de Cotización - ${item.name}`;
    const body = `Hola equipo de Restaurante Coco Víquez,\n\n` +
                 `Deseo realizar la siguiente solicitud de cotización:\n\n` +
                 `- Nombre del cliente: ${sanitizedName}\n` +
                 `- Servicio solicitado: ${item.name}\n` +
                 `- Fecha elegida: ${formattedDate}\n` +
                 `- Cantidad de personas: ${selectedPeople}\n\n` +
                 `Quedo a la espera de sus comentarios de cotización. ¡Muchas gracias!`;

    const mailtoUrl = `mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  const isFormValid = selectedDate !== '' && selectedPeople !== '';

  return (
    <div 
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
            title="Volver"
          >
            ✕
          </button>

          {/* Dot Pattern Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[2.5rem]" style={{ backgroundImage: 'radial-gradient(#F27F57 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-[#F9F7F2] mb-1">{item.name}</h3>
            <p className="text-[#F9F7F2]/80 text-[10px] leading-tight mb-1">
              {item.desc}
            </p>
            <p className="text-[9px] font-light italic text-[#F27F57] mb-3">{reserveNote}</p>

            <div className="flex flex-col gap-2.5 w-full mb-3">
              <div className="text-left w-full">
                <label className="block text-[9px] uppercase tracking-widest text-[#F9F7F2]/60 mb-1 ml-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#0b131f]/60 text-white placeholder-gray-650 border border-[#F27F57]/30 focus:border-[#F27F57] rounded-lg px-3 py-1.5 text-xs shadow-[0_0_10px_rgba(242,127,87,0.05)] transition-all duration-300 outline-none"
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
                    placeholder="Selecciona una fecha..." 
                    className="w-full bg-slate-950 text-white placeholder-[#F9F7F2]/20 border border-[#F27F57]/30 group-hover:border-[#F27F57]/60 rounded-xl px-4 py-2 text-xs font-mono cursor-pointer transition-all duration-300 outline-none shadow-[0_0_15px_rgba(242,127,87,0.1)] focus:shadow-[0_0_15px_rgba(242,127,87,0.3)] h-11"
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
                          {monthNamesEs[currentMonth.getMonth()].toUpperCase()}, {currentMonth.getFullYear()}
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
                        <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {getCalendarDays().map((day, dIdx) => {
                          if (day.dayNum === null) {
                            return <div key={`empty-${dIdx}`} className="p-1.5" />;
                          }
                          const isSelected = selectedDate === day.dateStr;
                          const isBlocked = localFechasBloqueadas.includes(day.dateStr);
                          const isDisabled = !day.enabled;
                          
                          return (
                            <button
                              key={`day-${day.dateStr}`}
                              type="button"
                              disabled={isDisabled && !isAdmin}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isAdmin && onToggleBlockedDate) {
                                  await onToggleBlockedDate(day.dateStr);
                                } else {
                                  handleDateChange(day.dateStr);
                                  setCalendarOpen(false);
                                }
                              }}
                              className={`relative p-1.5 rounded-lg font-bold text-center text-xs transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-[#F27F57] text-white shadow-[0_0_12px_rgba(242,127,87,0.4)]'
                                  : (isBlocked || day.isPast)
                                    ? 'text-red-500 line-through bg-red-950/30 border border-red-900/30 shadow-[0_0_8px_rgba(222,60,60,0.25)] cursor-not-allowed opacity-60'
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
                    className="flex-1 w-full bg-transparent text-center font-bold text-white text-lg outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                disabled={!selectedDate || !selectedPeople || selectedPeople === '0' || dateError}
                onClick={handleEmail}
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


interface CartItem {
  name: string;
  price: string;
  quantity: number;
  baseName?: string;
  extras?: string[];
  finalPrice?: number;
}

const Cart = ({ items, onUpdate, onRemove, onConfirm }: { 
  items: CartItem[]; 
  onUpdate: (name: string, delta: number) => void;
  onRemove: (name: string) => void;
  onConfirm: (location: string | null, address: string, paymentMethod: 'card' | 'sinpe' | 'cash', email: string, phone: string, name: string, deliveryFee: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sinpe' | 'cash'>('card');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+506');
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
                     phone.length >= 8 && 
                     name.length > 2 &&
                     (location !== null || address.length > 5) && 
                     !isLocating;

  const subtotal = items.reduce((acc, item) => {
    const price = item.finalPrice || parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
    return acc + (price * item.quantity);
  }, 0);

  const iva = Math.round(subtotal * 0.13);
  const totalNumeric = subtotal + iva + deliveryFee;

  const handleGetLocation = () => {
    // 1. COMPROBACIÓN DE COMPATIBILIDAD Y HTTPS:
    if (!navigator.geolocation) {
      alert("La geolocalización no está disponible en este navegador o requiere de una conexión HTTPS segura. Por favor, intente con otro navegador moderno o escriba su dirección de forma manual en el campo 'DIRECCIÓN EXACTA'.");
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
        alert("No pudimos obtener tu GPS. Por favor, escribe tu dirección exacta abajo o copia el enlace de tu ubicación manualmente.");
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
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">TU PEDIDO</h2>
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
                    <p className="font-bold uppercase tracking-widest text-sm">El carrito está vacío</p>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="text-[#F27F57] text-xs font-bold underline underline-offset-4"
                    >
                      Volver al menú
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    
                    {/* Resumen section first to show details clearly */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#F27F57] flex items-center gap-3">
                        <span className="w-6 h-[1px] bg-[#F27F57]/30"></span>
                        Resumen de Pedido
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
                                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Total Item</span>
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
                          <span>Subtotal</span>
                          <span className="text-white">₡{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                          <span>IVA (13%)</span>
                          <span className="text-white">₡{iva.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                          <span>Envío</span>
                          <span className="text-white">₡{deliveryFee.toLocaleString()}</span>
                        </div>
                        <div className="h-[1px] bg-white/5 my-2"></div>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F27F57]">Total Final</span>
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
                        Datos de Entrega
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nombre Completo</label>
                          <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${name && name.length < 3 ? 'border-red-500/50' : 'border-white/10'}`}
                            placeholder="Ej: Jafeth Calero"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Correo Electrónico</label>
                            <input 
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${email && !isEmailValid(email) ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder="tu@correo.com"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Confirmar Correo</label>
                            <input 
                              type="email"
                              value={confirmEmail}
                              onChange={(e) => setConfirmEmail(e.target.value)}
                              className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${confirmEmail && email !== confirmEmail ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder="Confirma tu correo"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Número de Teléfono</label>
                          <div className="flex gap-2">
                            <select 
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="bg-[#112240] border border-white/10 rounded-xl p-3 text-xs md:text-sm focus:border-[#F27F57] outline-none transition-all text-white"
                            >
                              <option value="+506">🇨🇷 Costa Rica (CR +506)</option>
                              <option value="+1">🇺🇸 Estados Unidos (US +1)</option>
                              <option value="+1">🇨🇦 Canadá (CA +1)</option>
                              <option value="+33">🇫🇷 Francia (FR +33)</option>
                              <option value="+49">🇩🇪 Alemania (DE +49)</option>
                              <option value="+34">🇪🇸 España (ES +34)</option>
                              <option value="+505">🇳🇮 Nicaragua (NI +505)</option>
                              <option value="+507">🇵🇦 Panamá (PA +507)</option>
                            </select>
                            <input 
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={`flex-1 bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all ${phone && phone.length < 8 ? 'border-red-500/50' : 'border-white/10'}`}
                              placeholder="8888-8888"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Dirección Exacta</label>
                          <textarea 
                            ref={addressInputRef}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={`w-full bg-[#112240] border rounded-xl p-3 text-sm focus:border-[#F27F57] outline-none transition-all resize-none h-24 ${address && address.length < 5 ? 'border-red-500/50' : 'border-white/10'}`}
                            placeholder="Ej: Casa blanca, frente al parque, portón negro..."
                          />
                        </div>

                        {/* Dropdown de Zonas de Entrega */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                              ZONA DE ENTREGA
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
                              🗺️ View Delivery Map
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
                          {isLocating ? '⌛ Obteniendo ubicación...' : location ? '✅ Ubicación Guardada' : 'COMPARTIR MI UBICACIÓN'}
                        </button>
                      </div>
                    </div>

                    {/* Payment & Checkout Buttons */}
                    <div className="space-y-6 pt-2 border-t border-white/5">
                      {/* Payment Toggle */}
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 text-center mb-1">Selecciona Método de Pago</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => setPaymentMethod('card')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'card' ? 'bg-[#F27F57] border-[#F27F57] text-white shadow-[0_0_20px_rgba(242,127,87,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <CreditCard size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">Tarjeta</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('sinpe')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'sinpe' ? 'bg-[#25D366] border-[#25D366] text-white shadow-[0_0_20px_rgba(37,211,102,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <Smartphone size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">SINPE</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all justify-center ${paymentMethod === 'cash' ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                          >
                            <Wallet size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">EFECTIVO</span>
                          </button>
                        </div>
                      </div>

                      <button 
                        id="btn-enviar-pedido"
                        onClick={() => {
                          if (!isEmailValid(email)) { alert('Por favor, ingrese un correo electrónico válido.'); return; }
                          if (email !== confirmEmail) { alert('Los correos electrónicos no coinciden.'); return; }
                          if (phone.length < 8) { alert('Por favor, ingrese un número de teléfono válido.'); return; }
                          if (name.length < 3) { alert('Por favor, ingrese su nombre completo.'); return; }
                          if (!location && address.length < 5) { alert('Por favor, comparta su ubicación o ingrese su dirección exacta.'); return; }
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
                        {paymentMethod === 'sinpe' ? 'PAGAR AHORA' : 'ENVIAR PEDIDO'}
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
                  aria-label="Cerrar mapa de entrega"
                >
                  <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <img 
                src="/delivery-map.png" 
                alt="Mapa de Zonas de Entrega" 
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

const LanguageSelector = ({ currentLang, onLangChange }: { currentLang: string, onLangChange: (lang: any) => void }) => {
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
    <div className={`lang-selector-container ${isOpen ? 'active' : ''}`} ref={dropdownRef}>
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
const ClassModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    guests: '5',
    date: '',
    time: '10:00'
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = minDate.toISOString().split('T')[0];

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
        const { error } = await supabase
          .from('reservas')
          .insert([{
            nombre_cliente: sanitizedName,
            servicio_cotizado: 'Clase de Cocina Típica',
            fecha: date,
            hora: time || '10:00',
            total_personas: parseInt(guests) || 5,
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
                      LAS RESERVAS REQUIEREN UN MÍNIMO DE 72 HORAS DE ANTICIPACIÓN
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

const HorizontalTabsMenu = ({ onAdd }: { onAdd: (item: any) => void }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItemForModal, setSelectedItemForModal] = useState<any>(null);
  const [modalOptions, setModalOptions] = useState<any>({});
  const [isChefTipOpen, setIsChefTipOpen] = useState(false);

  const getChefTip = (item: any) => {
    if (!item) return "";
    const name = (item.n || "").toLowerCase();

    const chefTips: Record<string, string> = {
      "pasta salsa de tomate": "💡 Tip del Chef: Para esta receta italiana mediterránea, te recomendamos acompañarla con una fresca 'Ensalada' o añadir una 'Botella de Hot Sauce' si buscas un toque picante balanceado.",
      "pasta salsa blanca": "💡 Tip del Chef: La cremosidad de la salsa blanca combina de forma excelente con el pan de ajo incluido, pero si deseas un contraste fresco, una porción de 'Ensalada' es el balance ideal.",
      "sándwich": "💡 Tip del Chef: ¡Potencia tu sándwich! Un extra de 'Papas Fritas' dentro o al lado, combinado con 'Salsa de Nacho', eleva por completo la experiencia urbana de este plato.",
      "omelette": "💡 Tip del Chef: Para un desayuno o brunch redondo, te sugerimos acompañar tu omelette con extras tradicionales como 'Patacones' o 'Frijoles Molidos'.",
      "arroz": "💡 Tip del Chef: Los arroces costeros brillan más cuando añades la textura crujiente de los 'Patacones' o el dulzor del 'Plátano Maduro'.",
      "default": "💡 Tip del Chef: ¡Dale un toque especial a tu elección agregando 'Pico de Gallo' fresco o 'Plátano Maduro' para un balance dulce-salado perfecto!"
    };

    // Find custom match
    for (const key of Object.keys(chefTips)) {
      if (key !== "default" && (name.includes(key) || key.includes(name))) {
        return chefTips[key];
      }
    }
    if (name.includes("sandwich")) {
      return chefTips["sándwich"];
    }
    return chefTips["default"];
  };

  const menuData = [
    {
      "cat": "Desayunos", "ico": "☀️",
      "items": [
        {"n": "Sándwich (Carne/Pollo/Jamón)", "p": 6000, "d": "Con queso y proteína a elegir 🥪"},
        {"n": "Omelette", "p": 6000, "d": "Ingredientes frescos 🍳"}
      ]
    },
    {
      "cat": "Buffets", "ico": "🍽️",
      "items": [
        {"n": "Almuerzo/Cena Buffet", "p": 6000, "d": "Proteína + 4 acompañamientos + Jugo natural 🥩"},
        {"n": "Buffet Desayuno", "p": 6000, "d": "Opciones completas + Bebida natural/Café ☕"}
      ]
    },
    {
      "cat": "Pastas", "ico": "🍝",
      "items": [
        {
          "n": "Pasta Salsa de Tomate", 
          "p": 6500, 
          "d": "Vegetariana: Con hongos, albahaca y queso parmesano. Incluye pan al ajillo 🌿"
        },
        {
          "n": "Pasta Salsa Blanca", 
          "p": 8000, 
          "d": "Estilo Alfredo: Con hongos y pollo o jamón. Incluye pan al ajillo 🍗"
        },
        {
          "n": "Pasta con Camarones", 
          "p": 8000, 
          "d": "Con salsa blanca y ajo. Incluye pan al ajillo 🍤"
        },
        {
          "n": "Pasta al Ajillo de Pulpo", 
          "p": 8000, 
          "d": "Pulpo fresco al ajillo. Incluye pan al ajillo 🐙"
        },
        {
          "n": "Pasta al Ajillo de Camarón", 
          "p": 8000, 
          "d": "Camarones al ajillo. Incluye pan al ajillo 🍤"
        },
        {
          "n": "Pasta de Camarón y Pulpo", 
          "p": 9000, 
          "d": "Mix de mariscos al ajillo. Incluye pan al ajillo 🐙🍤"
        }
      ]
    },
    {
      "cat": "Arroces", "ico": "🍚",
      "items": [
        {"n": "Arroz con Camarón", "p": 8000, "d": "Clásico con camarones frescos 🍤"},
        {"n": "Arroz con Pollo", "p": 6500, "d": "Receta tradicional tica 🥥"},
        {"n": "Arroz Cantones", "p": 6500, "d": "Estilo oriental con carnes 🍚"},
        {"n": "Arroz Mixto Mariscos", "p": 9000, "d": "Pulpo, calamar y camarón 🥣"}
      ]
    },
    {
      "cat": "Mariscos", "ico": "🐟",
      "items": [
        { "n": "Ceviche de Pescado (Loro)", "p": 8000, "d": "Cocinada al momento. 🍋", "modal": "ceviche" },
        { "n": "Ceviche de Camarón", "p": 8000, "d": "Camarones frescos. 🍤", "modal": "ceviche" },
        { "n": "Ceviche Mixto", "p": 8500, "d": "Pescado y camarón. 🐟🍤", "modal": "ceviche" },
        { "n": "Ceviche de Pulpo", "p": 9000, "d": "Pulpo tierno. 🐙", "modal": "ceviche" },
        { "n": "Ceviche Premium", "p": 10000, "d": "Loro, Camarón y Pulpo. 🏆", "modal": "ceviche" },
        { "n": "Sopa de Mariscos", "p": 8000, "d": "Incluye arroz. 🥣", "modal": "sopa" },
        { "n": "Camarón al Ajillo", "p": 9000, "d": "🍤", "modal": "acompañamientos" },
        { "n": "Pescado Entero (Pargo Rojo)", "p": 10000, "d": "Frito. 🐟", "modal": "acompañamientos" },
        { "n": "Tacos de Pulpo", "p": 8000, "d": "🐙", "modal": "acompañamientos" },
        { "n": "Pulpo (Parrilla o Ajillo)", "p": 9000, "d": "🐙", "modal": "acompañamientos" },
        { "n": "Camarones Empanizados", "p": 8000, "d": "🍤", "modal": "acompañamientos" },
        { "n": "Quesadilla de Camarón", "p": 7500, "d": "🧀🍤" }
      ]
    },
    {
      "cat": "Snacks", "ico": "🍟",
      "items": [
        { "n": "Orden de Papas Fritas", "p": 3000, "d": "Clásicas y crujientes. 🍟" },
        { "n": "Dedos de Pescado o Pollo", "p": 6500, "d": "Incluye 2 acompañamientos a elegir. 🐟🍗", "modal": "acompañamientos" },
        { "n": "Víquez Fries", "p": 6500, "d": "Papas con carne o pollo mechado, pico de gallo y queso. 🧀" },
        { "n": "Nachos", "p": 6500, "d": "Con frijoles molidos, queso fundido y pico de gallo. 🧀" },
        { "n": "Quesadilla", "p": 6500, "d": "Tortilla de harina con queso derretido. 🧀" },
        { "n": "Pinchos - Skewers", "p": 9000, "d": "Brochetas de carne y vegetales a la parrilla. 🥩🍢" },
        { "n": "Taco Tico", "p": 6000, "d": "Frito, relleno de carne. Estilo tradicional. 🇨🇷" },
        { "n": "Tacos Mexicanos", "p": 8000, "d": "3 Tacos suaves con carne, cebolla y cilantro. 🇲🇽" },
        { "n": "Tacos de Pescado o Camarón", "p": 9000, "d": "2 tacos con guarnición y aderezo especial. 🐟" },
        { "n": "2 Chalupas", "p": 7000, "d": "Tortilla frita con frijoles, carne, repollo y salsas. 🌮" },
        { "n": "Hamburguesa con Papas (Cheese Burger)", "p": 6000, "d": "Carne, queso y papas fritas. 🍔" },
        { "n": "Hamburguesa Regular", "p": 6000, "d": "Sencilla, con sabor tradicional. 🍔" },
        { "n": "Hamburguesa de Pollo", "p": 6000, "d": "Con filet de pollo empanizado o a la parrilla. 🍗" },
        { "n": "Quesadilla de Beef Steak", "p": 7500, "d": "Tortilla de harina con carne asada y queso. 🥩" }
      ]
    },
    {
      "cat": "Especialidades", "ico": "🥩",
      "items": [
        { "n": "Cordon Blue", "p": 8000, "d": "Pollo relleno de jamón y queso empanizado. Incluye 2 acompañamientos. 🍗", "modal": "acompañamientos" },
        { "n": "Filet de Pollo / Pescado", "p": 8500, "d": "A la plancha o al ajillo. Incluye 2 acompañamientos. 🐟🍗", "modal": "acompañamientos" },
        { "n": "Carne o Pollo a la Parrilla", "p": 8000, "d": "Corte premium a la brasa. Incluye 2 acompañamientos. 🥩🔥", "modal": "acompañamientos" },
        { "n": "Bistec Casa", "p": 8000, "d": "Receta tradicional de la casa. Incluye 2 acompañamientos. 🥩", "modal": "acompañamientos" },
        { "n": "Milanesa de Pollo o Carne", "p": 8000, "d": "Empanizado crujiente. Incluye 2 acompañamientos. 🥩🍗", "modal": "acompañamientos" },
        { "n": "Carnitas", "p": 8000, "d": "Fajitas de carne salteadas a la parrilla. Incluye 2 acompañamientos. 🥩", "modal": "acompañamientos" },
        { "n": "Chifrijo", "p": 8000, "d": "Capa de arroz, frijoles tiernos, chicharrón y pico de gallo. (Preguntar disponibilidad) 🥣" }
      ]
    },
    {
      "cat": "Bebidas", "ico": "🍹",
      "items": [
        { "tipo": "header", "n": "REFRESCOS Y CAFÉ ☕" },
        { "n": "Botella de Agua / Natural", "p": 1500, "d": "Agua purificada o jugo de frutas." },
        { "n": "Sodas - Gaseosa", "p": 2000, "d": "Variedad de sabores." },
        { "n": "Batido Mixto", "p": 4000, "d": "Smoothies de frutas naturales." },
        { "n": "Café Britt Especial", "p": 3500, "d": "Capuccino, Espresso, Latte o Café Frío." },

        { "tipo": "header", "n": "CERVEZAS 🍺" },
        { "n": "Cerveza Nacional", "p": 2000, "d": "Imperial (Light, Ultra, Silver) o Pilsen." },
        { "n": "Cerveza Premium / Artesanal", "p": 3500, "d": "Bavaria, Heineken, Corona o Artesanal (IPA/Lager)." },

        { "tipo": "header", "n": "VINOS Y LICORES 🍷" },
        { "n": "Copa de Vino Seleccionada", "p": 4000, "d": "Merlot, Cabernet, Sauvignon Blanc, Chardonnay." },
        { "n": "Sangría", "p": 5000, "d": "Receta de la casa." },
        { "n": "Trago de Licor Premium", "p": 3500, "d": "Ron Flor de Caña, Tequila, Vodka o Seltzer." },
        { "n": "Whisky Old Parr", "p": 4000, "d": "Servido solo o en las rocas." },
        { "n": "Cacique", "p": 2500, "d": "Guaro nacional." }
      ]
    }
  ];

  const extrasList = [
    'Arroz', 'Frijoles', 'Ensalada', 'Pico de Gallo', 'Chips Tortillas de Maíz', 
    'Tortilla Suave Harina de Maíz', 'Patacones', 'Plátano Maduro', 
    'Frijoles Molidos', 'Guacamole', 'Papas Fritas', 'Salsa de Nacho', 'Botella de Hot Sauce'
  ];

  const handleAddToCartClick = (item: any) => {
    if (menuData[activeTab].cat !== 'Bebidas') {
      setSelectedItemForModal({ ...item, category: menuData[activeTab].cat });
      setModalOptions({ sides: [], extras: [] });
      setIsChefTipOpen(false);
    } else {
      onAdd({ name: item.n, price: `₡${item.p.toLocaleString()}` });
    }
  };

  const confirmAndAdd = () => {
    let finalName = selectedItemForModal.n;
    const options = [];
    
    if (selectedItemForModal.modal === 'ceviche') {
      if (modalOptions.side) options.push(modalOptions.side);
    } else if (selectedItemForModal.modal === 'sopa') {
      if (modalOptions.base) options.push(modalOptions.base);
    } else if (selectedItemForModal.modal === 'acompañamientos') {
      if (modalOptions.sides) options.push(...modalOptions.sides);
    }

    if (modalOptions.extras && modalOptions.extras.length > 0) {
      options.push(...modalOptions.extras.map((e: string) => `Extra: ${e}`));
    }

    if (options.length > 0) {
      finalName += ` (${options.join(', ')})`;
    }

    const itemBasePrice = typeof selectedItemForModal.p === 'number' ? selectedItemForModal.p : 0;
    const numExtras = (modalOptions.extras || []).length;
    const itemTotalPrice = itemBasePrice + numExtras * 2500;

    onAdd({ 
      name: finalName, 
      price: `₡${itemTotalPrice.toLocaleString()}`,
      baseName: selectedItemForModal.n,
      extras: modalOptions.extras || [],
      finalPrice: itemTotalPrice
    });
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

  const toggleExtra = (extra: string) => {
    setModalOptions((prev: any) => {
      const currentExtras = prev.extras || [];
      if (currentExtras.includes(extra)) {
        return { ...prev, extras: currentExtras.filter((e: string) => e !== extra) };
      }
      return { ...prev, extras: [...currentExtras, extra] };
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
                      const numExtras = (modalOptions.extras || []).length;
                      const currentTotal = basePrice + numExtras * 2500;
                      return `₡${currentTotal.toLocaleString()}`;
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
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">Elige tu acompañamiento:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {['Chips de Maíz', 'Patacones con Pico de Gallo'].map((opt) => (
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
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">Elige la base de tu sopa:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {['Base en Agua', 'Base en Crema'].map((opt) => (
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
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">Selecciona exactamente 2 acompañamientos:</p>
                    <span className="text-[10px] font-black text-[#FFD700] bg-[#FFD700]/10 px-2.5 py-0.5 rounded-full">{(modalOptions.sides || []).length}/2</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Arroz', 'Frijoles', 'Puré', 'Papas Fritas', 'Ensalada', 'Patacones', 'Vegetales'].map((opt) => {
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

              {/* Extras Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-black">
                    Añadir Extras (Opcional) <span className="text-white font-extrabold">— ₡2,500 / $5.00 c/u:</span>
                  </p>
                  <div className="relative">
                    <button
                      id="btn-tip-chef"
                      type="button"
                      onClick={() => setIsChefTipOpen(!isChefTipOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 active:scale-95 rounded-full border border-white/10 transition-all cursor-pointer select-none"
                    >
                      <Lightbulb size={11} className="text-[#FFD700]" />
                      <span className="text-[9px] font-black text-[#FFD700] uppercase tracking-tighter">Tip de Chef</span>
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
                                <span className="font-extrabold uppercase tracking-wide text-[10px] text-[#FFD700]">Recomendación del Chef</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
                  {extrasList.map((extra) => {
                    const isSelected = (modalOptions.extras || []).includes(extra);
                    return (
                      <button
                        key={extra}
                        onClick={() => toggleExtra(extra)}
                        className={`p-2.5 rounded-xl border text-center transition-all text-[11px] font-semibold leading-tight min-h-[44px] flex items-center justify-center whitespace-normal break-words ${
                          isSelected 
                            ? 'bg-[#FFD700]/10 border-[#FFD700] text-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.15)] font-bold' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {extra}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Section holding the fixed action button */}
            <div className="pt-4 border-t border-white/5 bg-[#121212]/95 shrink-0 mt-auto mb-6">
              <button
                onClick={confirmAndAdd}
                className="w-full bg-[#FFD700] text-black py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#FFD700]/10 text-xs sm:text-sm"
              >
                Confirmar y Agregar al Carrito ✅
              </button>
              <p className="text-[8px] text-center text-white/40 uppercase tracking-widest mt-3 font-bold">
                Puedes ajustar tu pedido luego en el carrito
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
                  
                  <div className="pt-10 text-center">
                    <p id="tax-notice" className="text-[10px] uppercase tracking-[0.3em] font-black animate-neon-pulse">
                      ▲ PRECIOS NO INCLUYEN IMPUESTOS
                    </p>
                  </div>
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

export default function App() {
  const [lang, setLang] = useState<'es' | 'en' | 'fr' | 'de'>(() => {
    const saved = localStorage.getItem('coco_viquez_lang');
    return (saved as any) || 'es';
  });

  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
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
        .select('*')
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
      const { error } = await supabase
        .from('pedidos_delivery')
        .update({ 
          status: newStatus,
          estado: newStatus 
        })
        .eq('id', orderId);
      
      if (error) {
        console.error("Error updating delivery status in Supabase:", error.message);
        setDashboardError("Error al actualizar el estado del pedido: " + error.message);
      } else {
        await fetchDeliveryOrders();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

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
      const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id);
      if (error) {
        console.error('Error updating reserva status:', error.message);
        setDashboardError('Error al actualizar estado: ' + error.message);
      } else {
        await fetchReservas();
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
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting reserva:', error.message);
        setDashboardError('Error al eliminar reserva: ' + error.message);
      } else {
        await fetchReservas();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const createReservaManual = async (resData: any) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('reservas')
        .insert([resData]);
      if (error) {
        console.warn('No se pudo insertar en la tabla "reservas" de Supabase:', error.message);
        // Add to local fallback so we can see it in dashboard instantly!
        const newLocal = {
          id: Date.now(),
          ...resData
        };
        setLocalReservasFallback(prev => [newLocal, ...prev]);
      } else {
        await fetchReservas();
      }
    } catch (err: any) {
      console.warn(err);
      const newLocal = {
        id: Date.now(),
        ...resData
      };
      setLocalReservasFallback(prev => [newLocal, ...prev]);
    }
  };

  const dayHasReservations = (dateStr: string) => {
    return (reservas || []).some(r => r.fecha === dateStr);
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchReservas();
    fetchDeliveryOrders();

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
          
          // Play a kitchen alert/bell sound
          try {
            const kitchenBell = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            kitchenBell.volume = 0.65;
            kitchenBell.play().catch(e => console.warn('Audio playback blocked or failed:', e));
          } catch (audioErr) {
            console.warn('Could not play notification chime:', audioErr);
          }

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const toggleBlockedDate = async (dateStr: string) => {
    // Failsafe / Simulación Local: Aplicar instantáneamente al estado de React
    const isCurrentlyBlocked = fechasBloqueadas.includes(dateStr);
    if (isCurrentlyBlocked) {
      setFechasBloqueadas(prev => prev.filter(d => d !== dateStr));
    } else {
      setFechasBloqueadas(prev => [...prev, dateStr]);
    }

    if (!supabase) return;
    try {
      if (isCurrentlyBlocked) {
        const { error } = await supabase
          .from('fechas_bloqueadas')
          .delete()
          .eq('fecha', dateStr);
        if (error) {
          console.warn('Aviso de Autenticación / RLS en Supabase: Para aplicar cambios persistentes en "fechas_bloqueadas" se requieren permisos de administrador. El estado se ha actualizado de forma local correctamente.');
        }
      } else {
        const { error } = await supabase
          .from('fechas_bloqueadas')
          .insert([{ fecha: dateStr }]);
        if (error) {
          console.warn('Aviso de Autenticación / RLS en Supabase: Para aplicar cambios persistentes en "fechas_bloqueadas" se requieren permisos de administrador. El estado se ha actualizado de forma local correctamente.');
        }
      }
    } catch (err) {
      console.warn('Fallo de red o excepción persistiendo en Supabase. El estado ha sido simulado de manera local.', err);
    }
  };

  const setDateAvailable = async (dateStr: string) => {
    // Failsafe / Simulación Local: Eliminar de la lista local de bloqueados
    setFechasBloqueadas(prev => prev.filter(d => d !== dateStr));

    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('fechas_bloqueadas')
        .delete()
        .eq('fecha', dateStr);
      if (error) {
        console.warn('Aviso de Autenticación / RLS en Supabase: Para aplicar cambios persistentes en "fechas_bloqueadas" se requieren permisos de administrador. El estado se ha actualizado de forma local correctamente.');
      }
    } catch (err) {
      console.warn('Fallo de red o excepción persistiendo en Supabase. El estado ha sido simulado de manera local.', err);
    }
  };

  const setDateReserved = async (dateStr: string) => {
    // Failsafe / Simulación Local: Agregar a la lista local de bloqueados
    setFechasBloqueadas(prev => {
      if (prev.includes(dateStr)) return prev;
      return [...prev, dateStr];
    });

    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('fechas_bloqueadas')
        .insert([{ fecha: dateStr }]);
      if (error) {
        console.warn('Aviso de Autenticación / RLS en Supabase: Para aplicar cambios persistentes en "fechas_bloqueadas" se requieren permisos de administrador. El estado se ha actualizado de forma local correctamente.');
      }
    } catch (err) {
      console.warn('Fallo de red o excepción persistiendo en Supabase. El estado ha sido simulado de manera local.', err);
    }
  };

  const handleStatusChange = async (dateStr: string, status: 'available' | 'blocked') => {
    if (status === 'available') {
      await setDateAvailable(dateStr);
    } else {
      await setDateReserved(dateStr);
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

  useEffect(() => {
    async function fetchBlockedDates() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('fechas_bloqueadas')
          .select('fecha');
        if (error) {
          console.error('Error fetching blocked dates from Supabase:', error.message);
          return;
        }
        if (data) {
          const dates = data.map((item: any) => item.fecha);
          setFechasBloqueadas(dates);
        }
      } catch (err) {
        console.error('Unexpected error fetching blocked dates:', err);
      }
    }
    fetchBlockedDates();
  }, []);

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
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [occupiedTables, setOccupiedTables] = useState<number[]>([]);
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
    const isPendingOrCooking = ['pendiente', 'en cocina', 'en_cocina'].includes(statusLower);
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
    return 'bg-green-500/15 text-green-400 border border-green-500/25 shadow-[0_0_8px_rgba(34,197,94,0.1)]';
  };

  const getAvailableHoursForDate = (dateStr: string) => {
    const dNow = new Date();
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

  const [selectedResDate, setSelectedResDate] = useState<string>('');
  const [selectedResTime, setSelectedResTime] = useState<string>('12:00');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedResService, setSelectedResService] = useState<string>('Restaurante General');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const resTriggerRef = useRef<HTMLDivElement>(null);
  const resPortalRef = useRef<HTMLDivElement>(null);
  const [resPortalStyle, setResPortalStyle] = useState<React.CSSProperties>({});
  const [isMobileRes, setIsMobileRes] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const minD = new Date();
    return new Date(minD.getFullYear(), minD.getMonth(), 1);
  });

  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const minDateISO = (() => {
    const dNow = new Date();
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
    
    const dNow = new Date();
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
    
    const dNow = new Date();
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

  useEffect(() => {
    if (!t.testimonials.items || t.testimonials.items.length === 0) return;
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % t.testimonials.items.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [testimonialIdx, t.testimonials.items.length]);

  const GOOGLE_SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_placeholder/exec';

  useEffect(() => {
    const fetchOccupied = async () => {
      // Skip if URL is placeholder
      if (GOOGLE_SHEETS_SCRIPT_URL.includes('_placeholder')) {
        console.log("Google Sheets URL not configured. Skipping fetch.");
        return;
      }
      
      try {
        const response = await fetch(`${GOOGLE_SHEETS_SCRIPT_URL}?action=getOccupied`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data.occupied) setOccupiedTables(data.occupied);
      } catch (e) {
        // Log as warning instead of error to avoid cluttering console with expected fetch failures during setup
        console.warn("Could not fetch occupied tables from Google Sheets. Check your Script URL.", e);
      }
    };
    fetchOccupied();
  }, []);

  const sendToGoogleSheets = async (data: any) => {
    if (GOOGLE_SHEETS_SCRIPT_URL.includes('_placeholder')) {
      console.log("Google Sheets URL not configured. Data not sent to Sheets.");
      return;
    }

    try {
      await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn("Error sending to Google Sheets", e);
    }
  };

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
    const iva = Math.round(subtotal * 0.13);
    const total = subtotal + iva + deliveryFee;
    
    const transactionId = 'VQX-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const paymentMethodLabel = paymentMethod === 'card' ? 'Tarjeta' : paymentMethod === 'cash' ? 'Efectivo' : 'Sinpe Móvil';
    
    const finalLocationUrl = ((window as any).userLatitude && (window as any).userLongitude)
      ? `https://www.google.com/maps?q=${(window as any).userLatitude},${(window as any).userLongitude}`
      : (location || '');

    // Inserción en Supabase 'pedidos_delivery'
    if (supabase) {
      try {
        const unified_payload = {
          // 1. Columnas exactas solicitadas por el usuario:
          nombre: sanitizedName,
          telefono: sanitizedPhone,
          direccion_escrita: sanitizedAddress,
          latitud: (window as any).userLatitude || null,
          longitud: (window as any).userLongitude || null,
          detalle_pedido: JSON.stringify(cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            extras: item.extras || []
          }))),
          total_pago: total,

          // 2. Columnas de compatibilidad histórica:
          nombre_cliente: sanitizedName,
          name: sanitizedName,
          items: cart,
          total: total,
          direccion: sanitizedAddress,
          address: sanitizedAddress,
          location: finalLocationUrl,
          email: sanitizedEmail,
          estado: 'Pendiente',
          status: 'Pendiente',
          metodo_pago: paymentMethodLabel,
          payment_method: paymentMethodLabel,
          created_at: new Date().toISOString()
        };

        const { error: errFull } = await supabase.from('pedidos_delivery').insert([unified_payload]);
        if (errFull) {
          console.warn("Unified payload insertion failed, retrying with legacy column formats:", errFull.message);
          
          const english_payload = {
            name: sanitizedName,
            items: cart,
            total: total,
            address: sanitizedAddress,
            location: finalLocationUrl,
            phone: sanitizedPhone,
            email: sanitizedEmail,
            status: 'Pendiente',
            payment_method: paymentMethodLabel,
            created_at: new Date().toISOString()
          };
          const { error: err2 } = await supabase.from('pedidos_delivery').insert([english_payload]);
          if (err2) {
            console.error("Supabase fallback insert with English columns also failed:", err2.message);
          }
        }
      } catch (err) {
        console.error("Exception during Supabase insert for pedidos_delivery:", err);
      }
    }

    // Send to Google Sheets
    await sendToGoogleSheets({
      action: 'newOrder',
      id: transactionId,
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      address: sanitizedAddress,
      items: cart.map(item => `${item.name} (x${item.quantity})`).join(', '),
      subtotal,
      deliveryFee,
      total,
      paymentMethod: paymentMethodLabel,
      location: finalLocationUrl || 'N/A',
      timestamp: new Date().toLocaleString()
    });

    let message = `📍 *NUEVO PEDIDO DELIVERY - COCO VÍQUEZ*\n\n` +
                  `*=== DATOS DE ENTREGA ===*\n` +
                  `*Cliente:* ${sanitizedName}\n` +
                  `*Teléfono:* ${sanitizedPhone}\n\n` +
                  `*=== RESUMEN DEL PEDIDO ===*\n` +
                  `${itemsList}\n\n` +
                  `*Subtotal:* ₡${subtotal.toLocaleString()}\n` +
                  `*IVA (13%):* ₡${iva.toLocaleString()}\n`;
    if (deliveryFee > 0) {
      message += `*Envío:* ₡${deliveryFee.toLocaleString()}\n`;
    }
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
            <tr>
              <td style="padding: 6px 0; color: rgba(255,255,255,0.7);">IVA (13%):</td>
              <td style="text-align: right; font-weight: bold;">₡${iva.toLocaleString()}</td>
            </tr>
            ${deliveryFee > 0 ? `
            <tr>
              <td style="padding: 6px 0; color: rgba(255,255,255,0.7);">Costo de Envío:</td>
              <td style="text-align: right; font-weight: bold;">₡${deliveryFee.toLocaleString()}</td>
            </tr>` : ''}
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
    setOrderSuccessModalOpen(true);
    setCart([]);
  };

  const handleReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!data.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }
    
    setFormError('');
    setReservationData({ ...data, guests: numPeople });
    setShowChannels(true);
  };

  const sendWhatsApp = async () => {
    if (!reservationData || !reservationData.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }
    const { name, date, time, guests } = reservationData;
    
    // Register in Supabase 'reservas' table
    await createReservaManual({
      nombre_cliente: name,
      fecha: date,
      hora: time || '12:00',
      total_personas: parseInt(guests) || 1,
      servicio_cotizado: selectedResService,
      estado: 'pendiente'
    });

    // Send to Google Sheets
    await sendToGoogleSheets(reservationData);

    const message = `¡Hola! Quiero reservar para el ${date} a las ${time}. Mi nombre es ${name}. (Personas: ${guests})`;
    window.open(`https://wa.me/50689020888?text=${encodeURIComponent(message)}`, '_blank');
    
    setReservationSuccess(true);
    setShowChannels(false);
    setTimeout(() => setReservationSuccess(false), 5000);
  };

  const sendEmail = async () => {
    if (!reservationData || !reservationData.name) {
      setFormError('Por favor, ingresa tu nombre para continuar');
      return;
    }
    const { name, date, time, guests } = reservationData;
    
    // Register in Supabase 'reservas' table
    await createReservaManual({
      nombre_cliente: name,
      fecha: date,
      hora: time || '12:00',
      total_personas: parseInt(guests) || 1,
      servicio_cotizado: selectedResService,
      estado: 'pendiente'
    });

    const subject = `Nueva Reserva - Coco Víquez`;
    const body = `¡Hola! Quiero reservar para el ${date} a las ${time}. Mi nombre es ${name}. (Personas: ${guests})`;
    
    // Send to Google Sheets
    await sendToGoogleSheets(reservationData);

    try {
      // Formspree implementation
      const response = await fetch('https://formspree.io/f/xyzkvovp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'Restaurantecocoviquezph@gmail.com',
          message: body,
          _subject: subject,
          name: name
        })
      });

      if (response.ok) {
        setReservationSuccess(true);
      } else {
        window.location.href = `mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setReservationSuccess(true);
      }
    } catch (error) {
      window.location.href = `mailto:restaurantecocoviquezph@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setReservationSuccess(true);
    }
    
    setShowChannels(false);
    setTimeout(() => setReservationSuccess(false), 5000);
  };

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
      />

      <ClassModal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
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
            <nav className="hidden md:flex flex-1 items-center justify-start gap-[25px] lg:gap-[20px]">
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
              <div className="hidden md:flex items-center gap-[15px] lg:gap-[20px]">
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

              {/* Mobile Toggle: Visible en tablets y móviles (md:hidden) */}
              <button className="md:hidden text-white p-2 hover:text-[#F27F57] transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[80%] max-w-sm z-[70] bg-[#111D2B] shadow-2xl flex flex-col p-8 md:hidden"
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
                <LanguageSelector currentLang={lang} onLangChange={setLang} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Hero Section --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-transparent">
        <video 
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
                  src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1000" 
                  alt="Restaurant Interior" 
                  className="w-full h-[500px] object-cover"
                  referrerPolicy="no-referrer"
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

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10 items-stretch">
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
                onClassReserve={() => setIsClassModalOpen(true)} 
                fechasBloqueadas={fechasBloqueadas}
                isAdmin={isAdmin}
                onToggleBlockedDate={toggleBlockedDate}
                onSelectService={setSelectedResService}
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
                      onClassReserve={() => setIsClassModalOpen(true)} 
                      fechasBloqueadas={fechasBloqueadas}
                      isAdmin={isAdmin}
                      onToggleBlockedDate={toggleBlockedDate}
                      onSelectService={setSelectedResService}
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
            <HorizontalTabsMenu onAdd={addToCart} />
          </div>
        </div>
      </section>

      {/* --- Reservation Form --- */}
      <section id="reserve" className="py-24 bg-sand relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-[#0B1221] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/5 relative">
            {/* Dot Pattern Background Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(coral 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            
            <div className="w-full md:w-2/5 bg-ocean/40 backdrop-blur-md p-12 text-sand flex flex-col justify-between relative z-10 border-r border-white/5">
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
                <div className="contact-item-container group flex items-center whitespace-nowrap">
                  <div className="p-2 bg-coral/10 rounded-lg text-coral group-hover:bg-coral group-hover:text-white transition-all shrink-0"><Clock size={18} /></div>
                  <span className="font-medium text-xs sm:text-[13px] md:text-sm tracking-tight whitespace-nowrap">Lunes a Domingo: 7:00 AM - 9:00 PM</span>
                </div>
                <a 
                  href="mailto:restaurantecocoviquezph@gmail.com"
                  className="contact-item-container group cursor-pointer rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-orange-400 active:scale-95 text-sand/80"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.2)] group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    <Mail size={18} />
                  </div>
                  <span className="contact-item-text font-medium text-sm transition-colors duration-300">restaurantecocoviquezph@gmail.com</span>
                </a>
                <a 
                  href="tel:+50626720029"
                  className="contact-item-container group cursor-pointer rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-orange-400 active:scale-95 text-sand/80"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.2)] group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    <Phone size={18} />
                  </div>
                  <span className="contact-item-text font-mono text-sm transition-colors duration-300">+506 2672 0029</span>
                </a>
                <a 
                  href="https://wa.me/50689020888?text=Hola!%20Me%20gustaría%20hacer%20una%20consulta%20sobre%20una%20reserva."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item-container group cursor-pointer rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:text-green-400 active:scale-95 text-sand/80"
                >
                  <div className="p-2 bg-green-500/10 rounded-lg text-[#25D366] group-hover:bg-[#25D366] group-hover:text-black transition-all duration-300 shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    <MessageCircle size={18} />
                  </div>
                  <span className="contact-item-text font-mono text-sm transition-colors duration-300">+506 8902 0888</span>
                </a>
              </div>
            </div>

            <form onSubmit={handleReservation} className="w-full md:w-3/5 p-12 space-y-8 relative z-10">
              {/* Informative Table Map */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">Distribución del Restaurante</label>
                <div className="p-1 bg-[#0A192F] border border-coral/30 rounded-2xl overflow-hidden shadow-inner">
                  <TableMap 
                    onOpenModal={() => setIsMapModalOpen(true)}
                  />
                </div>
                <p className="text-[9px] text-[#F9F7F2]/30 uppercase font-black tracking-widest text-center italic">Haz clic en el mapa para ampliar la vista</p>
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
                                {monthNamesEs[currentMonth.getMonth()].toUpperCase()}, {currentMonth.getFullYear()}
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
                              <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
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
                                    title={day.isPast ? "Fecha Pasada" : isBlocked ? "Fecha Reservada / Bloqueada" : ""}
                                    className={`relative p-1.5 rounded-lg font-bold text-center text-xs transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-[#F27F57] text-white shadow-[0_0_12px_rgba(242,127,87,0.4)]'
                                        : (isBlocked || day.isPast)
                                          ? `text-red-500 line-through bg-red-950/30 border border-red-900/30 shadow-[0_0_8px_rgba(222,60,60,0.25)] cursor-not-allowed opacity-60`
                                          : day.enabled
                                            ? 'text-[#F27F57] hover:bg-[#F27F57]/20 hover:text-white cursor-pointer'
                                            : 'text-gray-650 cursor-not-allowed opacity-30 font-light'
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
                        LAS RESERVAS REQUIEREN UN MÍNIMO DE 72 HORAS DE ANTICIPACIÓN
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
                              return `${selectedResTime} ${h >= 12 ? 'PM' : 'AM'}`;
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
                                        {opt.timeStr} {opt.hour >= 12 ? 'PM' : 'AM'}
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
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#F9F7F2]/40 ml-1">Número de Personas</label>
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
      <section id="location" className="py-24 bg-white relative overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/videovz.mp4" type="video/mp4" />
        </video>
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
                    <p className="text-sm text-ocean/60 group-hover:text-coral transition-colors">Ruta Nacional Secundaria 159, Playa Hermosa, Guanacaste, Costa Rica. Frente a la playa, 200m Sur del Hotel Bosque del Mar.</p>
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
      <section id="testimonials" className="py-24 bg-sand relative overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/videovz.mp4" type="video/mp4" />
        </video>
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
              className="flex items-center gap-2 text-[10px] text-white/30 hover:text-white opacity-60 hover:opacity-100 transition-all duration-300 uppercase tracking-[0.2em] font-bold group"
            >
              <Lock size={12} className="group-hover:scale-110 transition-transform" />
              <span>Admin</span>
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
                  <div className="p-6 bg-[#0E1724] border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
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

                <button 
                  onClick={() => setShowAdmin(false)} 
                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                >
                  <X size={24} />
                </button>
              </div>

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
                        {/* Metric 1 */}
                        <div className="bg-[#0E1724] border border-cyan-500/20 rounded-3xl p-5 shadow-[0_4px_15px_rgba(6,182,212,0.05)] relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
                          <div className="absolute right-3 top-3 text-cyan-500/10 group-hover:text-cyan-500/20 transition-all">
                            <ChefHat size={48} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-extrabold">Comensales Programados</span>
                          <p className="text-3xl font-black text-white mt-1 font-mono tracking-tight">
                            {reservas.reduce((sum, r) => sum + (parseInt(r.total_personas) || 0), 0)}
                          </p>
                          <div className="w-12 h-1 bg-cyan-400 rounded mt-3 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-[#0E1724] border border-[#F27F57]/20 rounded-3xl p-5 shadow-[0_4px_15px_rgba(242,127,87,0.05)] relative overflow-hidden group hover:border-[#F27F57]/40 transition-all duration-300">
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
                        <div className="bg-[#0E1724] border border-purple-500/20 rounded-3xl p-5 shadow-[0_4px_15px_rgba(168,85,247,0.05)] relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
                          <div className="absolute right-3 top-3 text-purple-500/10 group-hover:text-purple-500/20 transition-all">
                            <Lock size={48} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-extrabold">Días Cerrados / Bloqueados</span>
                          <p className="text-3xl font-black text-white mt-1 font-mono tracking-tight">
                            {fechasBloqueadas.length}
                          </p>
                          <div className="w-12 h-1 bg-purple-500 rounded mt-3 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </div>
                      </div>

                      {/* --- Tabla de Gestión --- */}
                      <div className="bg-[#0E1724] border border-white/5 rounded-3xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Listado de Reservas y Cotizaciones</h3>
                            <p className="text-white/40 text-[10px] uppercase mt-0.5">Control de asistencias del restaurante y catering</p>
                          </div>
                          
                          {/* Filter Pills */}
                          <div className="flex flex-wrap gap-1.5 bg-[#070D14] p-1 rounded-xl border border-white/5">
                            {['todos', 'pendiente', 'confirmado', 'finalizado'].map(statusOption => (
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
                                      {r.nombre_cliente}
                                    </td>
                                    <td className="p-4 text-white/70">
                                      <span className="bg-[#070D14] px-2.5 py-1 rounded-lg border border-white/5 text-[11px] font-black uppercase text-[#F27F57] tracking-wider">
                                        {r.servicio_cotizado || 'Restaurante / General'}
                                      </span>
                                    </td>
                                    <td className="p-4 text-white/80 font-mono">
                                      <span className="block font-bold">{r.fecha?.split('-').reverse().join('/')}</span>
                                      <span className="block text-[10px] text-white/40">{r.hora}</span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-cyan-400 font-mono text-sm">
                                      {r.total_personas}
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

                        {/* Grid Days of Calendar */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-wider text-[#F27F57]/50 mb-2">
                          <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                          {getCalendarDays().map((day, idx) => {
                            if (day.dayNum === null) {
                              return <div key={`admin-empty-${idx}`} className="p-2" />;
                            }

                            const isBlocked = fechasBloqueadas.includes(day.dateStr);
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
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleStatusChange(selectedAdminDate, 'available');
                                  }}
                                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-3.5 transition-all duration-300 group cursor-pointer ${
                                    !fechasBloqueadas.includes(selectedAdminDate)
                                      ? 'bg-green-500/10 border-green-500/80 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-green-500/20'
                                      : 'bg-[#070D14] border-white/5 text-white/30 hover:border-green-500/30 hover:text-white/70'
                                  }`}
                                >
                                  <CheckCircle 
                                    size={30} 
                                    className={`transition-transform duration-300 group-hover:scale-110 ${
                                      !fechasBloqueadas.includes(selectedAdminDate) 
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
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleStatusChange(selectedAdminDate, 'blocked');
                                  }}
                                  className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-3.5 transition-all duration-300 group cursor-pointer ${
                                    fechasBloqueadas.includes(selectedAdminDate)
                                      ? 'bg-red-500/10 border-red-500/80 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20'
                                      : 'bg-[#070D14] border-white/5 text-white/30 hover:border-[#F27F57]/30 hover:text-white/70'
                                  }`}
                                >
                                  <Lock 
                                    size={30} 
                                    className={`transition-transform duration-300 group-hover:scale-110 ${
                                      fechasBloqueadas.includes(selectedAdminDate) 
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
                                📢 Los cambios se aplicarán instantáneamente al sistema de reservas de los clientes
                              </p>
                            </div>

                            {/* Listado de reservas */}
                            <div className="space-y-3 pt-3 border-t border-white/5">
                              {(() => {
                                const list = reservas || [];
                                const matches = list.filter(r => r.fecha === selectedAdminDate);
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
                                              <span className="font-extrabold text-white text-xs">{m.nombre_cliente}</span>
                                              <span className="font-mono text-[10px] text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/20 font-black">
                                                {m.hora}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-white/40">
                                              <span>🍽️ {m.servicio_cotizado || 'Almuerzo/Cena'}</span>
                                              <span className="text-[#F27F57] bg-[#F27F57]/10 px-2 py-0.5 rounded border border-[#F27F57]/20">
                                                {m.total_personas} Personas
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
                                      const clientNameStr = order.nombre_cliente || order.name || 'Cliente de Delivery';
                                      const clientPhoneStr = order.telefono || order.phone || '';
                                      const currentStatusStr = order.status || order.estado || 'Pendiente';
                                      const paymentMethod = order.metodo_pago || 'Sinpe Móvil';
                                      
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
                                  const clientNameStr = order.nombre_cliente || order.name || 'Cliente de Delivery';
                                  const clientPhoneStr = order.telefono || order.phone || '';
                                  const currentStatusStr = order.status || order.estado || 'Pendiente';
                                  const paymentMethod = order.metodo_pago || 'Sinpe Móvil';
                                  
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
                                const clientNameStr = order.nombre_cliente || order.nombre || order.name || 'Cliente de Delivery';
                                const clientPhoneStr = order.telefono || order.phone || '';
                                const clientEmailStr = order.email || '';
                                const clientAddressStr = order.direccion || order.direccion_escrita || order.address || '';
                                const currentStatusStr = order.status || order.estado || 'Pendiente';
                                const normStatus = currentStatusStr.toLowerCase();

                                // Defensive item parsing
                                let itemsArray = [];
                                const itemsField = order.items || order.detalle_pedido;
                                if (itemsField) {
                                  if (Array.isArray(itemsField)) {
                                    itemsArray = itemsField;
                                  } else if (typeof itemsField === 'string') {
                                    try {
                                      itemsArray = JSON.parse(itemsField);
                                    } catch (e) {
                                      itemsArray = itemsField.split(',').map((it: string) => ({ name: it.trim(), quantity: 1, price: '' }));
                                    }
                                  }
                                }

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
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(currentStatusStr)}`}>
                                          {currentStatusStr}
                                        </span>
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
                                            onClick={() => updateDeliveryStatus(order.id, 'Entregado')}
                                            className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            🚲 Listo / Entregado
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

      {/* Floating Logout Button */}
      {isAdmin && (
        <div className="fixed bottom-24 left-8 z-[150]">
          <button
            onClick={async () => {
              if (supabase) {
                await supabase.auth.signOut();
              }
              setIsAdmin(false);
              setShowAdmin(false);
            }}
            className="bg-[#121E2C] hover:bg-black/80 border border-red-500 text-white font-black text-xs px-6 py-4 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 uppercase tracking-widest flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
