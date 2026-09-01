import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGoogleIdentityNonce } from '../src/shared/auth/googleIdentity.js';

test('gera nonce Google aleatorio e hash SHA-256 hexadecimal', async () => {
  const first = await createGoogleIdentityNonce();
  const second = await createGoogleIdentityNonce();

  assert.match(first.nonce, /^[A-Za-z0-9+/]+=*$/);
  assert.match(first.hashedNonce, /^[a-f0-9]{64}$/);
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.hashedNonce, second.hashedNonce);
});
