import assert from 'node:assert/strict';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { loadSharingApp } from './helpers/sharingApp.mjs';

let app, createRoot, dom, root;
const id = '11111111-1111-4111-8111-111111111111';
const sharedPath = `/selecao/${id}`;
const p = { id: 'president', nome: 'Presidente teste', cargo: 'Presidente', estado: null, nota_candidato: 9 };
const s1 = { id: 'senator-1', nome: 'Senador um', cargo: 'Senador', estado: 'SP', nota_candidato: 9 };
const s2 = { ...s1, id: 'senator-2', nome: 'Senador dois' };
const d = { ...s1, id: 'deputy', nome: 'Deputado teste', cargo: 'Deputado Federal' };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
const row = (candidates = [p, s1, s2, d]) => ({
  user_id: 'recipient', state: 'SP', updated_at: '2026-09-09T12:00:00.123456+00:00',
  selections: { selections: {
    presidente: candidates.filter(c => c.cargo === 'Presidente'),
    senadores: candidates.filter(c => c.cargo === 'Senador'),
    deputado_federal: candidates.filter(c => c.cargo === 'Deputado Federal'),
  } },
});
const shared = () => ({ id, revision: 1, election_id: 'congresso-2026', state: 'SP', published_count: 4, candidates: [p, s1, s2, d] });

before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test', pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  app = await loadSharingApp();
});
after(() => { dom.window.close(); delete globalThis.sharingTest; });
beforeEach(() => {
  delete navigator.share;
  window.sessionStorage.clear(); window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  const fixture = globalThis.sharingTest = {
    userContext: { user: { uid: 'recipient' }, userData: { estado: 'RJ' }, loading: false },
    candidates: [p], remote: null, publication: shared(), calls: [], reads: 0,
  };
  fixture.client = {
    from(table) {
      const filters = {};
      let payload, action;
      const builder = {
        select() { return builder; }, eq(key, value) { filters[key] = value; return builder; },
        in(key, ids) { assert.equal(table, 'candidates'); return Promise.resolve({ data: ids.map(id => ({ id })) }); },
        update(value) { payload = value; action = 'update'; return builder; },
        insert(value) { payload = value; action = 'insert'; return builder; },
        async single() {
          fixture.calls.push({ name: action, params: { payload, filters } });
          if (action === 'update' && filters.updated_at !== fixture.remote?.updated_at) return { error: { code: 'PGRST116' } };
          if (action === 'insert' && fixture.remote) return { error: { code: '23505' } };
          fixture.remote = { ...payload, updated_at: '2026-09-09T12:00:01.234567+00:00' };
          return { data: fixture.remote };
        },
        maybeSingle: async () => {
          if (table === 'profiles') return { data: { state: 'RJ' } };
          if (table === 'eligibility') return { data: null };
          assert.equal(table, 'ballot_drafts');
          fixture.reads++; return fixture.read ? fixture.read() : { data: fixture.remote };
        },
      };
      return builder;
    },
    channel() { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel() {},
    async rpc(name, params) {
      fixture.calls.push({ name, params });
      if (name === 'read_shared_selection') return { data: fixture.publication };
      if (name === 'my_shared_selection') return { data: 'myPublication' in fixture ? fixture.myPublication : { id, active: true, state: 'SP', count: 4, revision: 1 } };
      if (name === 'publish_shared_selection') return { data: { id, active: true, state: 'SP', count: 4, revision: 2 } };
      if (name === 'disable_shared_selection') return { data: null };
      if (name === 'import_shared_selection') {
        if (fixture.importError) return { error: fixture.importError };
        fixture.remote = row(); return { data: fixture.remote };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
  root = createRoot(document.getElementById('root'));
});
afterEach(async () => { await act(async () => root.unmount()); });
const renderEntry = async () => {
  await act(async () => root.render(React.createElement(React.StrictMode, null,
    React.createElement(MemoryRouter, { initialEntries: [sharedPath] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/selecao/:id', element: React.createElement(app.SharedSelectionPage) }),
        React.createElement(Route, { path: '/home', element: React.createElement('div', null, 'Estado carregado') }),
      )))));
  await tick();
};
const click = async (label) => {
  const button = [...document.querySelectorAll('button')].find(b => b.textContent.includes(label));
  assert.ok(button, `Botão ${label} ausente`);
  await act(async () => button.click()); await tick();
};
const imports = () => sharingTest.calls.filter(c => c.name === 'import_shared_selection');

test('destinatário sem sessão vê login antes de qualquer leitura/importação', async () => {
  sharingTest.userContext.user = null;
  await renderEntry();
  assert.equal(document.querySelector('[data-login-path]').dataset.loginPath, sharedPath);
  assert.equal(sharingTest.reads, 0); assert.deepEqual(sharingTest.calls, []);
});

test('conta nova importa exatamente os quatro candidatos uma única vez em StrictMode', async () => {
  await renderEntry();
  assert.equal(imports().length, 1);
  assert.deepEqual(imports()[0].params.p_candidate_ids, [p.id, s1.id, s2.id, d.id]);
  assert.equal(imports()[0].params.p_expected_updated_at, null);
  assert.match(document.body.textContent, /Estado carregado/);
  const draft = app.readBallotDraft('recipient');
  assert.equal(draft.estado, 'SP', 'UF do perfil não substitui a UF importada');
  assert.equal(draft.updated_at, row().updated_at, 'preserva microssegundos da versão do servidor');
  assert.deepEqual(new Set(app.getDraftActiveCandidateIds(draft)), new Set([p.id, s1.id, s2.id, d.id]));
  assert.equal(app.readSharedSelectionSource('recipient', 'congresso-2026').applied, true);
});

test('cancelar mantém escolhas existentes e não chama importação', async () => {
  sharingTest.remote = row([d]);
  await renderEntry();
  assert.equal(imports().length, 0);
  assert.equal(document.querySelector('.modal-title').textContent, 'Acessar seleção compartilhada?');
  assert.equal(document.querySelector('.modal-message').textContent, 'Ao continuar, sua seleção anterior será apagada.');
  await click('Cancelar');
  assert.equal(imports().length, 0);
  assert.deepEqual(app.getDraftActiveCandidateIds(app.readBallotDraft('recipient')), [d.id]);
});

test('confirmar envia versão exata; conflito não navega nem marca fonte aplicada', async () => {
  sharingTest.remote = row([d]); sharingTest.importError = { message: 'DRAFT_CHANGED' };
  await renderEntry(); await click('Continuar');
  assert.equal(imports()[0].params.p_expected_updated_at, row().updated_at);
  assert.match(document.body.textContent, /mudaram em outra aba/);
  assert.doesNotMatch(document.body.textContent, /Estado carregado/);
  assert.equal(app.readSharedSelectionSource('recipient', 'congresso-2026'), null);
});

test('reabrir a mesma publicação preserva edições próprias sem reimportar', async () => {
  sharingTest.remote = row([d]);
  app.writeSharedSelectionSource({ userId: 'recipient', electionId: 'congresso-2026', id, revision: 1, state: 'SP', candidateIds: [p.id,s1.id,s2.id,d.id] });
  await renderEntry();
  assert.equal(imports().length, 0);
  assert.deepEqual(app.getDraftActiveCandidateIds(app.readBallotDraft('recipient')), [d.id]);
  assert.match(document.body.textContent, /Estado carregado/);
});

test('candidatos retirados exigem confirmação mesmo em conta vazia', async () => {
  sharingTest.publication.candidates = [p];
  await renderEntry();
  assert.equal(imports().length, 0);
  assert.match(document.body.textContent, /3 candidato\(s\)/);
  assert.match(document.body.textContent, /1 candidatos disponíveis/);
});

test('link desativado não importa nem substitui escolhas', async () => {
  sharingTest.publication = null;
  await renderEntry();
  assert.equal(imports().length, 0);
  assert.match(document.body.textContent, /desativada ou não está mais disponível/);
});

test('falha de armazenamento antes da importação não altera a conta', async () => {
  const original = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = () => { throw new Error('blocked'); };
  try {
    await renderEntry();
    assert.equal(imports().length, 0);
    assert.match(document.body.textContent, /Permita o armazenamento/);
  } finally { window.Storage.prototype.setItem = original; }
});

test('falha ao guardar rascunho não navega com escolhas antigas após salvar no servidor', async () => {
  const original = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = function(key, value) {
    if (key.includes(':ballotDraft:')) throw new Error('quota');
    return original.call(this, key, value);
  };
  try {
    await renderEntry();
    assert.equal(imports().length, 1);
    assert.match(document.body.textContent, /foi salva na conta, mas não pôde ser carregada/);
    assert.doesNotMatch(document.body.textContent, /Estado carregado/);
    assert.equal(app.readSharedSelectionSource('recipient', 'congresso-2026'), null);
  } finally { window.Storage.prototype.setItem = original; }
});

test('resposta remota iniciada antes da importação não apaga o rascunho recebido', async () => {
  const pending = deferred(); sharingTest.read = () => pending.promise;
  const reading = app.fetchRemoteBallotDraft('recipient', 'RJ');
  await app.importSharedSelection({ userId: 'recipient', shared: shared(), state: 'SP', candidateIds: [p.id,s1.id,s2.id,d.id], expectedUpdatedAt: null });
  pending.resolve({ data: null });
  const resolved = await reading;
  assert.equal(resolved.estado, 'SP'); assert.equal(app.getDraftActiveCandidateIds(resolved).length, 4);
  assert.equal(app.getDraftActiveCandidateIds(app.readBallotDraft('recipient')).length, 4);
});

test('rascunho remoto antigo recém-carregado continua disponível no navegador', () => {
  const draft = app.normalizeDraft({ ...row().selections, estado: 'SP', updated_at: '2020-01-01T00:00:00Z' });
  app.persistBallotDraft('recipient', draft);
  assert.equal(app.getDraftActiveCandidateIds(app.readBallotDraft('recipient')).length, 4);
});

test('tela só permite editar depois de restaurar a lista; métricas não repetem leitura do rascunho', async () => {
  app.persistBallotDraft('recipient', app.normalizeDraft({ ...row().selections, estado: 'SP', updated_at: row().updated_at }));
  const pending = deferred(); sharingTest.read = () => pending.promise;
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(app.CandidateSelectionPage, { cargo: 'Presidente', titulo: 'Presidente', chaveBanco: 'presidente', chaveGrupo: 'presidente' }))));
  await tick();
  assert.equal(document.querySelectorAll('.candidate-card-list button').length, 0);
  pending.resolve({ data: row() }); await tick();
  assert.match(document.body.textContent, /Presidente teste/);
  assert.ok(document.querySelector('.prototype-candidate-card[aria-pressed="true"]'), 'o candidato importado aparece selecionado');
  assert.equal(sharingTest.reads, 1);
  sharingTest.remote = row();
  await act(async () => document.querySelector('.prototype-candidate-card').click()); await tick();
  assert.ok(document.querySelector('.prototype-candidate-card[aria-pressed="false"]'));
  assert.equal(sharingTest.reads, 1, 'atualizar contadores após edição não restaura a lista antiga');
});

test('edição preserva os outros cargos recebidos e usa controle de versão na escrita', async () => {
  sharingTest.remote = row();
  const draft = await app.fetchRemoteBallotDraft('recipient');
  const next = await app.saveBallotStepSelection('recipient', 'presidente', [], 'SP');
  assert.deepEqual(new Set(app.getDraftActiveCandidateIds(next)), new Set([s1.id,s2.id,d.id]));
  const write = sharingTest.calls.find(c => c.name === 'update');
  assert.equal(write.params.filters.updated_at, draft.updated_at);
  assert.equal(write.params.filters.user_id, 'recipient');
});

test('aba com rascunho anterior à importação não sobrescreve a conta ao salvar', async () => {
  app.persistBallotDraft('recipient', app.normalizeDraft({ ...row([d]).selections, estado: 'SP', updated_at: '2026-09-09T11:00:00+00:00' }));
  sharingTest.remote = row();
  await assert.rejects(app.saveBallotStepSelection('recipient', 'presidente', [p], 'SP'), { code: 'DRAFT_CHANGED' });
  assert.deepEqual(sharingTest.remote, row());
});

test('renovação do login não mescla visitante sobre a lista recebida', async () => {
  window.history.replaceState(null, '', sharedPath);
  app.persistVisitorBallotDraft(app.normalizeDraft({ ...row([d]).selections, estado: 'SP' }));
  await act(async () => root.render(React.createElement(app.UserProvider, null, 'Autenticado')));
  await tick();
  assert.equal(sharingTest.reads, 0);
  window.history.replaceState(null, '', '/home');
  await act(async () => sharingTest.authCallback({ ...sharingTest.userContext.user })); await tick();
  assert.equal(sharingTest.reads, 0, 'TOKEN_REFRESHED não inicia mesclagem de visitante');
  assert.equal(sharingTest.calls.length, 0);
});

test('erro ao carregar rascunho bloqueia edição e permite recarregar sem apagar escolhas', async () => {
  sharingTest.read = async () => ({ error: { message: 'offline' } });
  app.persistBallotDraft('recipient', app.normalizeDraft({ ...row().selections, estado: 'SP' }));
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(app.CandidateSelectionPage, { cargo: 'Presidente', titulo: 'Presidente', chaveBanco: 'presidente', chaveGrupo: 'presidente' }))));
  await tick();
  assert.match(document.body.textContent, /NÃO FOI POSSÍVEL CARREGAR/);
  assert.equal(document.querySelector('.prototype-candidate-card'), null);
  sharingTest.read = null; sharingTest.remote = row();
  await click('TENTAR NOVAMENTE');
  assert.ok(document.querySelector('.prototype-candidate-card[aria-pressed="true"]'));
});

const renderSharePanel = async () => {
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(app.ShareChoicePanel, { shareData: { url: 'https://example.test' }, isOpenControlled: true }))));
  await tick();
};

test('painel mostra somente botão de compartilhar e QR atualizado pela revisão da publicação', async () => {
  await renderSharePanel();
  assert.equal(document.querySelectorAll('.sp-action-card').length, 3);
  assert.equal(document.querySelector('.published-selection__options'), null, 'não há submenu oculto');
  assert.equal(document.querySelector('input[readonly]'), null, 'não há campo visível com link');
  assert.equal(document.querySelector('.published-selection a[href^="https://wa.me/"]'), null, 'WhatsApp não aparece');
  assert.doesNotMatch(document.body.textContent, /Copiar convite do app/);
  assert.equal(sharingTest.calls.filter(c => c.name === 'publish_shared_selection').length, 0);
  const firstQr = document.querySelector('.published-selection__preview img').src;
  sharingTest.myPublication = { ...sharingTest.myPublication, revision: 2, count: 5 };
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(app.ShareChoicePanel, { shareData: { url: 'https://example.test' }, isOpenControlled: true }))));
  await tick();
  assert.notEqual(document.querySelector('.published-selection__preview img').src, firstQr, 'um QR novo é gerado ao mudar a revisão');
});

test('criação do link pede consentimento somente ao compartilhar pela primeira vez', async () => {
  sharingTest.myPublication = null;
  await renderSharePanel();
  assert.equal(document.querySelector('.published-selection__confirmation'), null);
  await click('Compartilhar');
  assert.match(document.body.textContent, /Seu nome e e-mail não serão publicados/);
  assert.equal(sharingTest.calls.filter(c => c.name === 'publish_shared_selection').length, 0);
  await click('Cancelar');
  assert.equal(sharingTest.calls.filter(c => c.name === 'publish_shared_selection').length, 0);
  await click('Compartilhar'); await click('Criar link da seleção');
  assert.equal(sharingTest.calls.filter(c => c.name === 'publish_shared_selection').length, 1);
  assert.ok(document.querySelector('.published-selection__preview img'), 'o QR aparece após criar o link');
});

test('compartilhamento nativo envia o link da seleção sem abrir menu escondido', async () => {
  let received;
  Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => {
    received = payload; throw new DOMException('cancelled', 'AbortError');
  } });
  await renderSharePanel(); await click('Compartilhar');
  assert.equal(received.url, `https://example.test${sharedPath}`);
  assert.equal(document.querySelector('.published-selection__options'), null, 'não há menu de opções para o QR');
  assert.equal(sharingTest.calls.filter(c => c.name !== 'my_shared_selection').length, 0);
});

test('sem compartilhamento nativo não mostra ações extras fora do QR e do botão', async () => {
  await renderSharePanel(); await click('Compartilhar');
  assert.equal(document.querySelector('.published-selection__options'), null);
  assert.equal(document.querySelector('.published-selection__subtle'), null, 'não há ação extra visível');
  assert.equal(document.querySelector('.published-selection__manage'), null, 'não há atualizar seleção visível');
  assert.ok(document.querySelector('.published-selection__preview img'), 'o QR continua visível');
});
