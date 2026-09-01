import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildScoreUpdateRows,
  normalizePartyAcronym,
} from '../scripts/update-supabase-scores.mjs';

const baseDataset = {
  partidos: [{ sigla: 'PODEMOS', nome: 'PODEMOS', nota: null }],
  politicos: [{
    nome: 'ZE DA SILVA',
    nome_civil: 'JOSÉ ANTÔNIO DA SILVA',
    cargo: 'Deputado Federal',
    numero_candidato: 2010,
    partido_sigla: 'PODEMOS',
    partido_nome: 'PODEMOS',
    estado: 'SÃO PAULO',
    uf: 'SP',
    nota: null,
  }],
};

test('reconhece a equivalencia PODE para PODEMOS', () => {
  assert.equal(normalizePartyAcronym('PODE'), 'PODEMOS');
});

test('atualiza por nome civil normalizado sem criar novo candidato', () => {
  const scoreDataset = {
    partidos: [{ sigla: 'PODE', nome: 'Podemos', nota: 6.03, status_avaliacao: 'avaliado' }],
    politicos: [{
      nome: 'Jose Antonio da Silva',
      cargo: 'Deputado Federal',
      partido_sigla: 'PODE',
      uf: 'SP',
      nota: 8.42,
      nota_exibida: '8,42',
      status_avaliacao: 'avaliado',
    }],
  };

  const result = buildScoreUpdateRows(baseDataset, scoreDataset);
  assert.equal(result.candidateUpdates.length, 1);
  assert.equal(result.partyUpdates.length, 1);
  assert.equal(result.unmatchedCandidates.length, 0);
  assert.equal(result.candidateUpdates[0].scores.candidate, 8.42);
  assert.equal(result.candidateUpdates[0].legacy_data.nota_exibida, '8,42');
  assert.equal(result.partyUpdates[0].id, 'podemos');
  assert.equal(result.partyUpdates[0].score, 6.03);
});

test('ignora de forma observavel politicos ausentes da base de candidatos', () => {
  const result = buildScoreUpdateRows(baseDataset, {
    partidos: [],
    politicos: [{
      nome: 'SEM CANDIDATURA',
      cargo: 'Senador',
      partido_sigla: 'PODE',
      uf: 'SP',
      nota: 7,
    }],
  });

  assert.equal(result.candidateUpdates.length, 0);
  assert.equal(result.unmatchedCandidates.length, 1);
});
