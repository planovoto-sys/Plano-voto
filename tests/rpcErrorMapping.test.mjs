import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeErrorResponse, normalizeErrorCode } from '../api/rpc.js';

test('normaliza codigos numericos do Firestore Admin', () => {
  assert.equal(normalizeErrorCode(7), 'permission-denied');
  assert.equal(normalizeErrorCode(8), 'resource-exhausted');
  assert.equal(normalizeErrorCode('14 UNAVAILABLE'), 'unavailable');
  assert.equal(normalizeErrorCode(13), 'internal');
});

test('converte quota, permissao e indisponibilidade em HTTP observavel sem vazar detalhes', async () => {
  const cases = [
    { code: 7, status: 503, publicCode: 'unavailable' },
    { code: 8, status: 429, publicCode: 'resource-exhausted' },
    { code: 14, status: 503, publicCode: 'unavailable' },
    { code: 16, status: 503, publicCode: 'unavailable' },
    { code: 13, status: 500, publicCode: 'internal' },
  ];
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    for (const item of cases) {
      const response = makeErrorResponse(Object.assign(
        new Error('projects/segredo/documents/dado-interno'),
        { code: item.code }
      ));
      const payload = await response.json();

      assert.equal(response.status, item.status);
      assert.equal(payload.error.code, item.publicCode);
      assert.doesNotMatch(payload.error.message, /segredo|documents|dado-interno/i);
    }
  } finally {
    console.error = originalConsoleError;
  }
});
