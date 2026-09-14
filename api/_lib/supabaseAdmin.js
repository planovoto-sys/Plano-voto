import { createClient } from '@supabase/supabase-js';
import process from 'node:process';

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const readSupabaseAdminConfig = (environment = process.env) => {
  const url = environment.SUPABASE_URL?.trim() || '';
  const serviceRoleKey = (
    environment.SUPABASE_SECRET_KEY?.trim()
    || environment.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || ''
  );

  return {
    ready: Boolean(isHttpUrl(url) && serviceRoleKey),
    url,
    serviceRoleKey,
  };
};

let cachedClient = null;
let cachedIdentity = '';

export const getSupabaseAdminClient = () => {
  const config = readSupabaseAdminConfig();

  if (!config.ready) {
    const error = new Error(
      'Supabase Admin nao configurado. Defina SUPABASE_URL e SUPABASE_SECRET_KEY.'
    );
    error.code = 'SUPABASE_CONFIGURATION_MISSING';
    throw error;
  }

  const identity = `${config.url}:${config.serviceRoleKey}`;
  if (!cachedClient || cachedIdentity !== identity) {
    cachedClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: { 'X-Client-Info': 'plano-voto-api' },
      },
    });
    cachedIdentity = identity;
  }

  return cachedClient;
};
