import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildImportRows,
  transformCandidate,
  transformParty,
} from '../scripts/import-supabase-candidates-2026.mjs';

const party = {
  sigla: 'AGIR',
  nome: 'AGIR',
  nota: null,
};

const candidate = {
  nome: 'ANTONIO JOSE',
  nome_civil: 'ANTONIO JOSÉ RODRIGUES MARCOS',
  cargo: 'Deputado Federal',
  numero_candidato: 3600,
  partido_sigla: 'AGIR',
  partido_nome: 'AGIR',
  estado: 'ACRE',
  uf: 'AC',
  nota: null,
  nota_exibida: null,
  status_avaliacao: 'sem_nota_na_planilha',
};

test('transforma partido e candidato preservando dados legados e notas ausentes', () => {
  const transformedParty = transformParty(party);
  const transformedCandidate = transformCandidate(candidate);

  assert.equal(transformedParty.id, 'agir');
  assert.equal(transformedParty.score, null);
  assert.equal(transformedCandidate.party_id, 'agir');
  assert.equal(transformedCandidate.office, 'Deputado Federal');
  assert.equal(transformedCandidate.state, 'AC');
  assert.equal(transformedCandidate.scores.candidate, null);
  assert.equal(transformedCandidate.legacy_data.nome_civil, candidate.nome_civil);
});

test('mantem IDs distintos quando o mesmo numero aparece para pessoas diferentes', () => {
  const first = transformCandidate(candidate);
  const second = transformCandidate({ ...candidate, nome: 'OUTRA PESSOA', nome_civil: 'OUTRA PESSOA CIVIL' });
  assert.notEqual(first.id, second.id);
});

test('valida referencias de partido no plano de importacao', () => {
  const rows = buildImportRows({ partidos: [party], politicos: [candidate] });
  assert.equal(rows.parties.length, 1);
  assert.equal(rows.candidates.length, 1);

  assert.throws(
    () => buildImportRows({ partidos: [party], politicos: [{ ...candidate, partido_sigla: 'XYZ' }] }),
    /nao existe/
  );
});
