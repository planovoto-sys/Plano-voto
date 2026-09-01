import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  ''
);

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const supabaseReady = Boolean(
  isHttpUrl(supabaseUrl) && supabasePublishableKey
);

if (!supabaseReady && (supabaseUrl || supabasePublishableKey)) {
  console.warn(
    'Supabase parcialmente configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: 'plano-voto:supabase-auth',
    },
  })
  : null;

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error(
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return supabase;
};
