import {
  ACTIVE_ELECTION_ID,
  BALLOT_FLOW_STEP_IDS,
  BALLOT_ROUTES,
  BALLOT_SCHEMA_VERSION,
  LEGACY_FLOW_STEP_ALIASES,
  OFFICE_MINIMUM_SELECTIONS
} from '@/shared/constants/ballot';
import { getCandidateStateCode, normalizeStateCode } from '@/shared/utils/state';
import {
  MAX_ACTIVE_CANDIDATES,
  asArray,
  normalizeOfficeName,
  normalizeRemoteTimestamp
} from './ballotInternals';
import { VotingError } from './ballotErrors';

const emptySelections = () => ({
  deputado_federal: [],
  senadores: []
});

const emptyCandidateGroups = () => (
  BALLOT_FLOW_STEP_IDS.reduce((groups, stepId) => ({
    ...groups,
    [stepId]: []
  }), {})
);

const emptyCompletedSteps = () => (
  BALLOT_FLOW_STEP_IDS.reduce((steps, stepId) => ({
    ...steps,
    [stepId]: false
  }), {})
);

export const createEmptyBallotDraft = (estado = null) => ({
  schema_version: BALLOT_SCHEMA_VERSION,
  election_id: ACTIVE_ELECTION_ID,
  estado: normalizeStateCode(estado) || null,
  selections: emptySelections(),
  candidate_groups: emptyCandidateGroups(),
  completed_steps: emptyCompletedSteps(),
  updated_at: null
});

export const normalizeStoredCandidate = (candidate) => {
  if (!candidate?.id) return null;

  return {
    id: candidate.id,
    nome: candidate.nome || candidate.Nome || '',
    nome_civil: candidate.nome_civil || candidate.nomeCivil || candidate.NomeCivil || null,
    partido: candidate.partido || candidate.Partido || candidate.sigla_partido || '',
    sigla_partido: candidate.sigla_partido || candidate.siglaPartido || candidate.SiglaPartido || null,
    tipo: candidate.tipo || candidate.Tipo || null,
    cargo: candidate.cargo || candidate.Cargo || '',
    numero: candidate.numero || candidate.Numero || null,
    estado: getCandidateStateCode(candidate, { allowPartyFallback: true }) || normalizeStateCode(candidate.estado || candidate.Estado || candidate.UF || candidate.uf || '') || null,
    classificacao: candidate.classificacao || candidate.ClassificacaoOficial || candidate['Classificação'] || candidate.Classificacao || null,
    nota_candidato: Number(candidate.nota_candidato ?? candidate.notaCandidato ?? candidate['Nota candidato'] ?? 0) || 0,
    nota_partido: Number(candidate.nota_partido ?? candidate.notaPartido ?? candidate['Nota partido'] ?? 0) || 0,
    nota_final: Number(candidate.nota_final ?? candidate.notaFinal ?? candidate.nota_candidato ?? candidate['Nota candidato'] ?? candidate.nota_partido ?? candidate['Nota partido'] ?? 0) || 0,
    chance: Number(candidate.chance ?? candidate.Chance ?? 0) || 0,
    selected_by_users: Number(candidate.selected_by_users ?? candidate.selectedByUsers ?? 0) || 0,
    average_elected_votes: Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 0) || 0,
    ranking_total: Number(candidate.ranking_total ?? candidate.rankingTotal ?? 0) || 0,
    temNotaCandidato: candidate.temNotaCandidato ?? candidate.tem_nota_candidato ?? null,
    tem_nota_candidato: candidate.temNotaCandidato ?? candidate.tem_nota_candidato ?? null
  };
};

const uniqueCandidatesById = (candidates) => {
  const seenIds = new Set();
  return candidates.filter((candidate) => {
    if (!candidate?.id || seenIds.has(candidate.id)) return false;
    seenIds.add(candidate.id);
    return true;
  });
};

export const normalizeDraft = (rawDraft, estado = null) => {
  const baseDraft = createEmptyBallotDraft(estado);
  if (!rawDraft || typeof rawDraft !== 'object') return baseDraft;

  const rawSelections = emptySelections();
  const candidateGroups = emptyCandidateGroups();
  const completedSteps = emptyCompletedSteps();

  Object.keys(OFFICE_MINIMUM_SELECTIONS).forEach((officeKey) => {
    rawSelections[officeKey] = asArray(rawDraft.selections?.[officeKey])
      .map(normalizeStoredCandidate)
      .filter(Boolean);
  });

  BALLOT_FLOW_STEP_IDS.forEach((stepId) => {
    const aliases = LEGACY_FLOW_STEP_ALIASES[stepId] || [];
    const rawCandidates = [
      ...asArray(rawDraft.candidate_groups?.[stepId]),
      ...aliases.flatMap((alias) => asArray(rawDraft.candidate_groups?.[alias]))
    ];

    candidateGroups[stepId] = rawCandidates
      .map(normalizeStoredCandidate)
      .filter(Boolean);
  });

  const hasCandidateGroupsObject = rawDraft.candidate_groups &&
    typeof rawDraft.candidate_groups === 'object' &&
    Object.keys(rawDraft.candidate_groups).length > 0;
  const hasGroupedCandidates = Object.values(candidateGroups).some((items) => items.length > 0);
  if (!hasCandidateGroupsObject && !hasGroupedCandidates) {
    candidateGroups.deputado_federal = rawSelections.deputado_federal;
    candidateGroups.senadores_1 = rawSelections.senadores;
    candidateGroups.senadores_2 = [];
  } else {
    candidateGroups.deputado_federal = uniqueCandidatesById(candidateGroups.deputado_federal);
    candidateGroups.senadores_1 = uniqueCandidatesById([
      ...candidateGroups.senadores_1,
      ...candidateGroups.senadores_2
    ]);
    candidateGroups.senadores_2 = [];
  }

  const selections = {
    deputado_federal: candidateGroups.deputado_federal,
    senadores: candidateGroups.senadores_1
  };

  completedSteps.deputado_federal = candidateGroups.deputado_federal.length >= OFFICE_MINIMUM_SELECTIONS.deputado_federal;
  completedSteps.senadores_1 = candidateGroups.senadores_1.length >= 1;
  completedSteps.senadores_2 = candidateGroups.senadores_1.length >= OFFICE_MINIMUM_SELECTIONS.senadores;

  return {
    ...baseDraft,
    ...rawDraft,
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: normalizeStateCode(rawDraft.estado ?? estado) || null,
    selections,
    candidate_groups: candidateGroups,
    completed_steps: completedSteps
  };
};

export const getDraftCandidateList = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  return [
    ...normalizedDraft.candidate_groups.deputado_federal,
    ...normalizedDraft.candidate_groups.senadores_1
  ].filter(Boolean);
};

export const getDraftActiveCandidateIds = (draft) => (
  [...new Set(getDraftCandidateList(draft).map((candidate) => candidate.id).filter(Boolean))]
);

export class BallotDraftModel {
  static empty(estado = null) {
    return createEmptyBallotDraft(estado);
  }

  static from(rawDraft, estado = null) {
    return normalizeDraft(rawDraft, estado);
  }

  static activeCandidateIds(draft) {
    return getDraftActiveCandidateIds(draft);
  }

  static assertSelectable(draft) {
    const normalizedDraft = normalizeDraft(draft);
    const allCandidateIds = getDraftCandidateList(normalizedDraft)
      .map((candidate) => candidate.id)
      .filter(Boolean);

    if (allCandidateIds.length > MAX_ACTIVE_CANDIDATES) {
      throw new VotingError('TOO_MANY_SELECTIONS', 'Você atingiu o limite técnico de candidatos salvos neste rascunho.');
    }

    if (new Set(allCandidateIds).size !== allCandidateIds.length) {
      throw new VotingError('DUPLICATED_CANDIDATE', 'O mesmo candidato não pode ser usado mais de uma vez.');
    }

    return normalizedDraft;
  }

  static fromPublicChoice(choiceData, candidates, fallbackEstado = null) {
    const estado = normalizeStateCode(choiceData?.state ?? fallbackEstado);
    const candidateIds = [...new Set(asArray(choiceData?.candidateIds).filter(Boolean))];
    const fetchedById = new Map(asArray(candidates).map((candidate) => [candidate.id, candidate]));
    const candidateSnapshots = candidateIds
      .map((candidateId) => normalizeStoredCandidate(fetchedById.get(candidateId) || { id: candidateId }))
      .filter(Boolean);
    const deputadoFederal = [];
    const senadores = [];

    candidateSnapshots.forEach((candidate) => {
      const office = normalizeOfficeName(candidate.cargo || candidate.Cargo || candidate.id);
      if (office.includes('senador')) {
        senadores.push(candidate);
      } else {
        deputadoFederal.push(candidate);
      }
    });

    return normalizeDraft({
      estado,
      candidate_groups: {
        ...emptyCandidateGroups(),
        deputado_federal: deputadoFederal,
        senadores_1: senadores,
        senadores_2: []
      },
      updated_at: normalizeRemoteTimestamp(choiceData?.updatedAt)
    }, estado);
  }
}

export const getBallotSelectionCounts = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const deputadoFederal = normalizedDraft.candidate_groups.deputado_federal.length;
  const senadores = normalizedDraft.candidate_groups.senadores_1.length;
  const total = deputadoFederal + senadores;

  return {
    deputadoFederal,
    senadores,
    deputadoFederalReeleger: deputadoFederal,
    deputadoFederalRenovar: 0,
    senador1: senadores > 0 ? 1 : 0,
    senador2: senadores > 1 ? 1 : 0,
    senadoresReeleger: senadores,
    senadoresRenovar: 0,
    total
  };
};

export const draftHasBallotSelections = (draft) => getBallotSelectionCounts(draft).total > 0;

export const getBallotProgress = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const hasEstado = Boolean(normalizedDraft.estado);
  const deputadoCount = normalizedDraft.candidate_groups?.deputado_federal?.length || 0;
  const senatorCount = normalizedDraft.candidate_groups?.senadores_1?.length || 0;
  const hasDeputadoFederal = deputadoCount >= OFFICE_MINIMUM_SELECTIONS.deputado_federal;
  const hasSenador1 = senatorCount >= 1;
  const hasSenador2 = senatorCount >= OFFICE_MINIMUM_SELECTIONS.senadores;
  const hasSenadores = hasSenador1 && hasSenador2;

  return {
    hasEstado,
    hasDeputadoFederalReeleger: hasDeputadoFederal,
    hasDeputadoFederalRenovar: false,
    hasDeputadoFederal,
    hasSenador1,
    hasSenador2,
    hasSenadoresReeleger: hasSenador1,
    hasSenadoresRenovar: hasSenador2,
    hasSenadores,
    isComplete: hasEstado && hasDeputadoFederal && hasSenadores,
    nextRoute: !hasEstado
      ? BALLOT_ROUTES.estado
      : !hasDeputadoFederal
        ? BALLOT_ROUTES.deputadoFederal
        : !hasSenador1
            ? BALLOT_ROUTES.senadores
          : !hasSenador2
              ? BALLOT_ROUTES.senadores
              : BALLOT_ROUTES.senadores
  };
};

export const getCandidateIdsFromDraft = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const groupedCandidates = Object.values(normalizedDraft.candidate_groups).flat();
  const candidates = groupedCandidates.length > 0
    ? groupedCandidates
    : [
      ...normalizedDraft.selections.deputado_federal,
      ...normalizedDraft.selections.senadores
    ];

  return candidates.map((candidate) => candidate.id);
};

export const getBallotCandidateGroups = (draft) => normalizeDraft(draft).candidate_groups;

export const validateCompleteBallot = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const missingOffices = Object.entries(OFFICE_MINIMUM_SELECTIONS)
    .filter(([officeKey, minimum]) => normalizedDraft.selections[officeKey].length < minimum)
    .map(([officeKey]) => officeKey);

  if (missingOffices.length > 0) {
    return {
      ok: false,
      code: 'INCOMPLETE_BALLOT',
      missingOffices
    };
  }

  const candidateIds = [
    ...normalizedDraft.selections.deputado_federal,
    ...normalizedDraft.selections.senadores
  ].map((candidate) => candidate.id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    return {
      ok: false,
      code: 'DUPLICATED_CANDIDATE',
      missingOffices: []
    };
  }

  return {
    ok: true,
    candidateIds,
    normalizedDraft
  };
};
