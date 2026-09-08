import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  VIABILITY_TARGETS, VIABILITY_TEST_TARGET, getViabilityTarget, resolveViabilityTestTarget,
} from '../src/shared/constants/viabilityTargets.js';
import { getCandidateChance, calculateCandidateChance } from '../src/shared/utils/candidateMetrics.js';

test('limites completos por cargo/UF e presidente nacional', () => {
  assert.equal(VIABILITY_TEST_TARGET, 3, 'o teste temporário da main está ativo');
  assert.deepEqual(Object.values(VIABILITY_TARGETS).map((values) => Object.keys(values).length), [1, 27, 27, 26]);
  assert.equal(getViabilityTarget('Presidente', 'SP'), 3);
  assert.equal(getViabilityTarget('senadores', 'sp'), 3);
  assert.equal(getViabilityTarget('Deputado Federal', 'AC'), 3);
  assert.equal(getViabilityTarget('DEPUTADO_ESTADUAL', 'DF'), 3);
  assert.equal(getViabilityTarget('SENADOR', 'XX'), 3);
  assert.equal(getViabilityTarget('desconhecido', 'SP'), 3);
});

test('viabilidade usa indicações, nunca todas as aceitações', () => {
  assert.equal(getCandidateChance({ active_selections: 900000 }), 0);
  assert.equal(getCandidateChance({ office: 'Presidente', indication_count: 59276177, selected_by_users: 1 }), 100);
  assert.equal(getCandidateChance({ indication_count: 1, indication_limit: 3, chance: 100 }), 33);
  assert.equal(calculateCandidateChance(4, 3), 100);
  assert.equal(calculateCandidateChance(NaN, 3), 0);
  assert.equal(calculateCandidateChance(3, null), 0);
});

test('alvo visual de teste aceita 3 sem substituir as referências oficiais', () => {
  assert.equal(resolveViabilityTestTarget('3'), 3);
  assert.equal(resolveViabilityTestTarget('0'), null);
  assert.equal(resolveViabilityTestTarget('3.5'), null);
  assert.equal(VIABILITY_TARGETS.PRESIDENTE.BR, 59276177);
});
