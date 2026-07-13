import { supabase } from '../supabaseClient';

export interface ServiceQuoteData {
  serviceName: string;
  clientName: string;
  clientEmail: string;
  date: string;
  peopleCount: string;
}

/**
 * Centralized utility function to handle Service Quote requests.
 * 1. Synchronously inserts booking metadata into Supabase 'servicios' table as a fire-and-forget side effect (without async/await).
 * 2. Formats and triggers a mailto redirect to open the client's local email application.
 */
export function handleServiceQuote(data: ServiceQuoteData): void {
  const { serviceName, clientName, clientEmail, date, peopleCount } = data;

  // Insert event metadata to Supabase 'servicios' table if client is initialized
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase
          .from('servicios')
          .insert([
            {
              nombre_cliente: clientName,
              email_cliente: clientEmail,
              fecha_evento: date,
              personas: peopleCount,
              tipo_servicio: serviceName,
              estado: 'pendiente'
            }
          ]);
        if (error) {
          console.error('Error registering service quote in Supabase:', error.message);
        } else {
          console.log('Service quote successfully registered in Supabase.');
        }
      } catch (err) {
        console.error('Unexpected error registering service quote in Supabase:', err);
      }
    })();
  } else {
    console.warn('Supabase client not configured or unavailable.');
  }

  // Construct email metadata and trigger mailto redirect
  const subject = 'Reserva: ' + serviceName;
  const body = 'Nombre: ' + clientName + '\nCorreo: ' + clientEmail + '\nFecha: ' + date + '\nPersonas: ' + peopleCount;
  
  window.location.href = 'mailto:restaurantecocoviquezph@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
