import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compareCandidatesByScorePriority,
  getCandidateSystemScore,
  hasCandidateOwnScore,
} from '../src/shared/utils/candidateMetrics.js';

test('nota propria prevalece sobre a nota do partido', () => {
  const candidate = {
    nome: 'Evair de Melo',
    nota_candidato: 8.51,
    nota_partido: 7.2,
    nota_final: 7.2,
    temNotaCandidato: true,
  };

  assert.equal(hasCandidateOwnScore(candidate), true);
  assert.equal(getCandidateSystemScore(candidate), 8.51);
});

test('usa nota do partido somente quando nao existe nota propria', () => {
  const candidate = {
    nota_candidato: 9,
    nota_partido: 7.3,
    nota_final: 9,
    temNotaCandidato: false,
  };

  assert.equal(hasCandidateOwnScore(candidate), false);
  assert.equal(getCandidateSystemScore(candidate), 7.3);
});

test('em empate coloca primeiro quem possui nota propria', () => {
  const ownScore = { nome: 'Com nota própria', nota_candidato: 8, nota_partido: 6, temNotaCandidato: true };
  const partyScore = { nome: 'Com nota do partido', nota_partido: 8, temNotaCandidato: false };

  assert.ok(compareCandidatesByScorePriority(ownScore, partyScore) < 0);
  assert.ok(compareCandidatesByScorePriority(partyScore, ownScore) > 0);
});
