import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.supabaseUrl || 
  (window as any).supabaseUrl || 
  '';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.supabaseKey || 
  (window as any).supabaseKey || 
  '';

// Initialize Supabase Client securely.
// We guard against empty/undefined keys so the dev server and build successfully compiled even if keys are missing initially.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn(
    'Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Blocked dates fetching will be bypassed.'
  );
}
