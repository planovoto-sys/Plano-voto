import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearSharedSelectionReturn, eligibleSharedCandidates, isSharedSelectionId, isSharedSelectionPath,
  readSharedSelectionReturn, rememberSharedSelectionReturn, sharedSelectionMessage, sharedSelectionUrl,
  SHARE_RETURN_KEY,
  SHARED_DRAFT_KEY, clearSharedSelectionDraft, readSharedSelectionDraft, writeSharedSelectionDraft,
} from '../src/features/sharing/sharedSelectionModel.js';
const id = '11111111-1111-4111-8111-111111111111';

test('link curto validado não contém dados pessoais nem todos os IDs de candidatos', () => {
  assert.equal(sharedSelectionUrl(id, 'https://bomdevoto.com.br'), `https://bomdevoto.com.br/selecao/${id}`);
  assert.ok(isSharedSelectionId(id));
  assert.ok(isSharedSelectionPath(`/selecao/${id}`));
  assert.ok(isSharedSelectionPath(`/selecao/${id}/resumo`));
  for (const path of ['//evil.com', `https://evil.com/selecao/${id}`, `/selecao/${id}?redirect=https://evil.com`, '/selecao/../../login']) {
    assert.equal(isSharedSelectionPath(path), false);
  }
  assert.throws(() => sharedSelectionUrl('../../', 'https://bomdevoto.com.br'));
});

test('rascunho anônimo mantém exatamente os itens escolhidos até o login', () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = { sessionStorage: { setItem: (key, value) => values.set(key, value), getItem: (key) => values.get(key), removeItem: (key) => values.delete(key) } };
  try {
    assert.ok(writeSharedSelectionDraft({ id, revision: 3, state: 'ES', candidateIds: ['item-b', 'item-c', 'item-b'] }));
    const draft = readSharedSelectionDraft(id);
    assert.deepEqual(draft.candidateIds, ['item-b', 'item-c']);
    assert.equal(draft.state, 'ES'); assert.equal(draft.revision, 3);
    assert.ok(rememberSharedSelectionReturn(`/selecao/${id}/resumo`));
    assert.equal(readSharedSelectionReturn(), `/selecao/${id}/resumo`);
    assert.deepEqual(readSharedSelectionDraft(id), draft, 'guardar retorno do login não muda seleção');
    assert.equal(readSharedSelectionDraft('22222222-2222-4222-8222-222222222222'), null);
    values.set(SHARED_DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() - 86400001 }));
    assert.equal(readSharedSelectionDraft(id), null);
    assert.equal(writeSharedSelectionDraft({ id, revision: 0, state: 'ES', candidateIds: ['item'] }), false);
    assert.equal(writeSharedSelectionDraft({ id, revision: 1, state: 'ES', candidateIds: [] }), false);
    clearSharedSelectionDraft(); assert.equal(values.has(SHARED_DRAFT_KEY), false);
  } finally { globalThis.window = previousWindow; }
});

test('armazenamento bloqueado impede avançar para login com falsa promessa de preservar dados', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: { setItem: () => { throw new Error('blocked'); } } };
  try {
    assert.equal(writeSharedSelectionDraft({ id, revision: 1, state: 'ES', candidateIds: ['item'] }), false);
    assert.equal(rememberSharedSelectionReturn(`/selecao/${id}/resumo`), false);
  } finally { globalThis.window = previousWindow; }
});

test('outra UF mantém apenas presidentes; listas compartilhadas não são limitadas ao resumo', () => {
  const candidates = [
    { id: 'p', cargo: 'Presidente', estado: null },
    { id: 's1', cargo: 'Senador', estado: 'SP' },
    { id: 's2', cargo: 'Senador', estado: 'SP' },
    { id: 's3', cargo: 'Senador', estado: 'SP' },
    { id: 'd', cargo: 'Deputado Federal', estado: 'SP' },
  ];
  assert.equal(eligibleSharedCandidates(candidates, 'SP').length, 5);
  assert.deepEqual(eligibleSharedCandidates(candidates, 'RJ').map((c) => c.id), ['p']);
  assert.equal(eligibleSharedCandidates([{ id: 'x', cargo: 'Cargo inválido', estado: 'SP' }], 'SP').length, 0);
});

test('retorno após login é restrito à seleção, expira e não importa automaticamente', () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = { sessionStorage: { setItem: (key, value) => values.set(key, value), getItem: (key) => values.get(key), removeItem: (key) => values.delete(key) } };
  try {
    rememberSharedSelectionReturn(`/selecao/${id}`);
    assert.equal(readSharedSelectionReturn(), `/selecao/${id}`);
    assert.equal(values.size, 1);
    clearSharedSelectionReturn(); assert.equal(readSharedSelectionReturn(), null);
    rememberSharedSelectionReturn('https://evil.com'); assert.equal(readSharedSelectionReturn(), null);
    values.set(SHARE_RETURN_KEY, JSON.stringify({ path: `/selecao/${id}`, at: Date.now() - 3600001 }));
    assert.equal(readSharedSelectionReturn(), null);
    values.set(SHARE_RETURN_KEY, 'invalid json'); assert.equal(readSharedSelectionReturn(), null);
  } finally { globalThis.window = previousWindow; }
});

test('mensagem de compartilhamento mantém link clicável e revisão explícita', () => {
  const url = sharedSelectionUrl(id, 'https://bomdevoto.com.br');
  const message = sharedSelectionMessage(url);
  const wa = new URL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  assert.equal(wa.searchParams.get('text'), message);
  assert.ok(message.includes('revisar os candidatos'));
  assert.ok(message.endsWith(url));
});
