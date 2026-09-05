import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VIABILITY_TARGETS, getViabilityTarget } from '../src/shared/constants/viabilityTargets.js';
import { getCandidateChance, calculateCandidateChance } from '../src/shared/utils/candidateMetrics.js';

test('limites completos por cargo/UF e presidente nacional', () => {
  assert.deepEqual(Object.values(VIABILITY_TARGETS).map((values) => Object.keys(values).length), [1, 27, 27, 26]);
  assert.equal(getViabilityTarget('Presidente', 'SP'), 59276177);
  assert.equal(getViabilityTarget('senadores', 'sp'), 6513282);
  assert.equal(getViabilityTarget('Deputado Federal', 'AC'), 14522);
  assert.equal(getViabilityTarget('DEPUTADO_ESTADUAL', 'DF'), null);
  assert.equal(getViabilityTarget('SENADOR', 'XX'), null);
  assert.equal(getViabilityTarget('desconhecido', 'SP'), null);
});

test('viabilidade usa indicações, nunca todas as aceitações', () => {
  assert.equal(getCandidateChance({ active_selections: 900000 }), 0);
  assert.equal(getCandidateChance({ office: 'Presidente', indication_count: 59276177, selected_by_users: 1 }), 100);
  assert.equal(getCandidateChance({ indication_count: 1, indication_limit: 3, chance: 100 }), 33);
  assert.equal(calculateCandidateChance(4, 3), 100);
  assert.equal(calculateCandidateChance(NaN, 3), 0);
  assert.equal(calculateCandidateChance(3, null), 0);
});
