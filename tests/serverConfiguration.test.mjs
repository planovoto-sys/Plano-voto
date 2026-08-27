import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { after, before, test } from 'node:test';

const originalVercel = process.env.VERCEL;
const originalServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

before(() => {
  process.env.VERCEL = '1';
  delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
});

after(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;

  if (originalServiceAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  else process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = originalServiceAccount;
});

test('RPC informa indisponibilidade quando a credencial Admin falta na Vercel', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const { default: rpcHandler } = await import('../api/rpc.js?missing-admin-config');
    const response = await rpcHandler.fetch(new Request('https://example.test/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.test',
      },
      body: JSON.stringify({ action: 'syncUserProfile', data: {} }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(payload, {
      error: {
        code: 'unavailable',
        message: 'Servico temporariamente indisponivel.',
      },
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test('health profundo falha de forma observavel sem credencial Admin', async () => {
  const { default: healthHandler } = await import('../api/health.js?missing-admin-config');
  const response = await healthHandler.fetch(
    new Request('https://example.test/api/health?deep=1')
  );
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.ok, false);
  assert.equal(payload.database_admin, 'configuration-missing');
  assert.equal(payload.business_module, 'error:unavailable');
});

test('RPC trata credencial Admin malformada como indisponibilidade segura', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = 'nao-e-um-json-base64';

  try {
    const { default: rpcHandler } = await import('../api/rpc.js?malformed-admin-config');
    const response = await rpcHandler.fetch(new Request('https://example.test/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.test',
      },
      body: JSON.stringify({ action: 'syncUserProfile', data: {} }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(payload, {
      error: {
        code: 'unavailable',
        message: 'Servico temporariamente indisponivel.',
      },
    });
  } finally {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    console.error = originalConsoleError;
  }
});

test('RPC rejeita com seguranca credencial de outro projeto', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({
    type: 'service_account',
    project_id: 'outro-projeto',
    private_key: 'x',
    client_email: 'teste@example.invalid',
  })).toString('base64');

  try {
    const { default: rpcHandler } = await import('../api/rpc.js?wrong-project-admin-config');
    const response = await rpcHandler.fetch(new Request('https://example.test/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.test',
      },
      body: JSON.stringify({ action: 'syncUserProfile', data: {} }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.error.code, 'unavailable');
    assert.doesNotMatch(payload.error.message, /outro-projeto|private|client_email/i);
  } finally {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    console.error = originalConsoleError;
  }
});
