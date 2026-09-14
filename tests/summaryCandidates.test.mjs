import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSummaryOfficeCandidates } from '../src/features/plan-summary/summaryCandidates.js';

test('resumo usa somente reservas do servidor, sem substituir por nota maior', () => {
  const candidates = [{ id: 'lotado', nota_candidato: 10 }, { id: 'livre', nota_candidato: 7 }];
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1, ['livre']), [candidates[1]]);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1, []), []);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1, ['nao-selecionado']), []);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 2, ['livre', 'livre']), [candidates[1]]);
});

test('prévia desempata seleções iguais por nota antes de limitar a 1/1/2', () => {
  const candidates = [
    { id: 'low', nome: 'Primeiro selecionado', nota_candidato: 5, chance: 100 },
    { id: 'party', nome: 'Alfa', nota_partido: 8, temNotaCandidato: false, chance: 90 },
    { id: 'own', nome: 'Zeta', nota_candidato: 8, chance: 0 },
    { id: 'best', nome: 'Último selecionado', nota_candidato: 9, chance: 1 },
  ];
  const original = structuredClone(candidates);

  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1).map((c) => c.id), ['best']);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 2).map((c) => c.id), ['best', 'own']);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 4).map((c) => c.id), ['best', 'own', 'party', 'low']);
  assert.deepEqual(candidates, original, 'a ordem salva no rascunho não deve ser alterada');
});

test('prévia prioriza mais seleções sobre maior nota ou viabilidade', () => {
  const candidates = [
    { id: 'melhor-nota', nota_candidato: 10, active_selections: 2, chance: 100 },
    { id: 'mais-selecionado', nota_candidato: 6, active_selections: 20, chance: 0 },
  ];
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1), [candidates[1]]);
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 1, ['melhor-nota']), [candidates[0]]);
});

test('resumo utiliza a nota atualizada do banco antes de ordenar', () => {
  const candidates = [
    { id: 'other', nome: 'Outro', nota_candidato: 8 },
    { id: 'evair', nome: 'Evair de Melo', nota_partido: 7.2, temNotaCandidato: false },
  ];
  const freshCandidate = { ...candidates[1], nota_candidato: 8.51, temNotaCandidato: true };
  const candidatesById = new Map([['evair', freshCandidate]]);

  assert.deepEqual(getSummaryOfficeCandidates(candidates, candidatesById, 1), [freshCandidate]);
  assert.equal(candidatesById.get('evair'), freshCandidate);
});

test('resumo mantém listas vazias ou incompletas e desempata por nome sem viabilidade', () => {
  assert.deepEqual(getSummaryOfficeCandidates([], new Map(), 2), []);
  const candidates = [
    { id: 'b', nome: 'Beta', nota_candidato: 8, chance: 100 },
    { id: 'a', nome: 'Alfa', nota_candidato: 8, chance: 0 },
  ];
  assert.deepEqual(getSummaryOfficeCandidates(candidates, new Map(), 2).map((c) => c.id), ['a', 'b']);
  assert.equal(getSummaryOfficeCandidates(candidates.slice(0, 1), new Map(), 2).length, 1);
});
