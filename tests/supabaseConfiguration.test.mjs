import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSupabaseAdminConfig } from '../api/_lib/supabaseAdmin.js';

test('configuracao Admin do Supabase exige URL e service role', () => {
  assert.deepEqual(readSupabaseAdminConfig({}), {
    ready: false,
    url: '',
    serviceRoleKey: '',
  });

  assert.equal(readSupabaseAdminConfig({
    SUPABASE_URL: 'https://project.supabase.co',
  }).ready, false);

  assert.equal(readSupabaseAdminConfig({
    SUPABASE_SERVICE_ROLE_KEY: 'server-only',
  }).ready, false);
});

test('configuracao Admin do Supabase aceita um ambiente completo', () => {
  const config = readSupabaseAdminConfig({
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only',
  });

  assert.equal(config.ready, true);
  assert.equal(config.url, 'https://project.supabase.co');
  assert.equal(config.serviceRoleKey, 'server-only');
});

test('configuracao Admin do Supabase prioriza a secret key moderna', () => {
  const config = readSupabaseAdminConfig({
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_modern',
    SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
  });

  assert.equal(config.ready, true);
  assert.equal(config.serviceRoleKey, 'sb_secret_modern');
});

test('configuracao Admin do Supabase rejeita protocolos inseguros ou invalidos', () => {
  assert.equal(readSupabaseAdminConfig({
    SUPABASE_URL: 'javascript:alert(1)',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only',
  }).ready, false);
});
