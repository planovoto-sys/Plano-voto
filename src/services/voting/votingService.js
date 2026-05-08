import {
  collection,
  documentId,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ACTIVE_ELECTION_ID,
  BALLOT_FLOW_STEP_IDS,
  BALLOT_ROUTES,
  BALLOT_SCHEMA_VERSION,
  CAST_VOTE_FUNCTION_NAME,
  DELETE_USER_ELECTION_DATA_FUNCTION_NAME,
  LEGACY_FLOW_STEP_ALIASES,
  OFFICE_LIMITS,
  SAVE_BALLOT_STATE_FUNCTION_NAME,
  SAVE_BALLOT_STEP_FUNCTION_NAME
} from '@/constants/ballot';
import { db, functions, functionsRegion } from '@/services/firebase/firebase';
import { flowLog } from '@/utils/debugFlow';
import { normalizeStateCode } from '@/utils/state';
const STORAGE_PREFIX = `meuvoto:${ACTIVE_ELECTION_ID}`;
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
let storageAvailability = null;

export class VotingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VotingError';
    this.code = code;
  }
}

const canUseStorage = () => {
  if (storageAvailability !== null) return storageAvailability;
  if (typeof window === 'undefined') {
    storageAvailability = false;
    return storageAvailability;
  }

  try {
    const testKey = `${STORAGE_PREFIX}:storage-test`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageAvailability = true;
  } catch {
    storageAvailability = false;
  }

  return storageAvailability;
};

const draftKey = (userId) => `${STORAGE_PREFIX}:ballotDraft:${userId}`;
const receiptKey = (userId) => `${STORAGE_PREFIX}:lastReceipt:${userId}`;

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

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeStoredCandidate = (candidate) => {
  if (!candidate?.id) return null;

  return {
    id: candidate.id,
    nome: candidate.nome || candidate.Nome || '',
    partido: candidate.partido || candidate.Partido || '',
    cargo: candidate.cargo || candidate.Cargo || '',
    numero: candidate.numero || candidate.Numero || null,
    estado: candidate.estado || candidate.Estado || null,
    classificacao: candidate.classificacao || candidate.ClassificacaoOficial || candidate['Classificação'] || candidate.Classificacao || null,
    nota_final: Number(candidate.nota_final ?? candidate.notaFinal ?? 0) || 0,
    chance: Number(candidate.chance ?? candidate.Chance ?? 0) || 0,
    selected_by_users: Number(candidate.selected_by_users ?? candidate.selectedByUsers ?? 0) || 0,
    average_elected_votes: Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 0) || 0,
    ranking_total: Number(candidate.ranking_total ?? candidate.rankingTotal ?? 0) || 0
  };
};

const normalizeDraft = (rawDraft, estado = null) => {
  const baseDraft = createEmptyBallotDraft(estado);
  if (!rawDraft || typeof rawDraft !== 'object') return baseDraft;

  const rawSelections = emptySelections();
  const candidateGroups = emptyCandidateGroups();
  const completedSteps = emptyCompletedSteps();

  Object.keys(OFFICE_LIMITS).forEach((officeKey) => {
    rawSelections[officeKey] = asArray(rawDraft.selections?.[officeKey])
      .map(normalizeStoredCandidate)
      .filter(Boolean)
      .slice(0, OFFICE_LIMITS[officeKey]);
  });

  BALLOT_FLOW_STEP_IDS.forEach((stepId) => {
    const aliases = LEGACY_FLOW_STEP_ALIASES[stepId] || [];
    const rawCandidates = [
      ...asArray(rawDraft.candidate_groups?.[stepId]),
      ...aliases.flatMap((alias) => asArray(rawDraft.candidate_groups?.[alias]))
    ];

    candidateGroups[stepId] = rawCandidates
      .map(normalizeStoredCandidate)
      .filter(Boolean)
      .slice(0, 1);
  });

  const hasGroupedCandidates = Object.values(candidateGroups).some((items) => items.length > 0);
  if (!hasGroupedCandidates) {
    candidateGroups.deputado_federal = rawSelections.deputado_federal.slice(0, 1);
    candidateGroups.senadores_1 = rawSelections.senadores.slice(0, 1);
    candidateGroups.senadores_2 = rawSelections.senadores.slice(1, 2);
  }

  const selections = {
    deputado_federal: candidateGroups.deputado_federal.slice(0, 1),
    senadores: [candidateGroups.senadores_1[0], candidateGroups.senadores_2[0]].filter(Boolean).slice(0, 2)
  };

  BALLOT_FLOW_STEP_IDS.forEach((stepId) => {
    completedSteps[stepId] = candidateGroups[stepId].length > 0;
  });

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

export const readBallotDraft = (userId, estado = null) => {
  if (!userId || !canUseStorage()) return createEmptyBallotDraft(estado);

  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    const parsedDraft = raw ? JSON.parse(raw) : null;
    const updatedAt = Date.parse(parsedDraft?.updated_at || '');

    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(draftKey(userId));
      return createEmptyBallotDraft(estado);
    }

    return normalizeDraft(parsedDraft, estado);
  } catch (error) {
    console.warn('Rascunho de voto local inválido. Criando um novo rascunho.', error);
    return createEmptyBallotDraft(estado);
  }
};

const persistBallotDraft = (userId, draft) => {
  if (!userId || !canUseStorage()) return draft;
  try {
    window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    return draft;
  }

  flowLog('draft.persisted', {
    userId,
    estado: draft.estado,
    deputadoFederal: draft.selections.deputado_federal.length,
    senadores: draft.selections.senadores.length,
    grupos: Object.fromEntries(
      Object.entries(draft.candidate_groups || {}).map(([key, items]) => [key, items.length])
    )
  });
  return draft;
};

const persistCallableDraft = (userId, fallbackEstado, data) => {
  const normalizedDraft = normalizeDraft(data?.draft || data, fallbackEstado);
  return persistBallotDraft(userId, normalizedDraft);
};

const normalizeRemoteDraftData = (data) => {
  if (!data) return data;
  const updatedAt = typeof data.updated_at?.toDate === 'function'
    ? data.updated_at.toDate().toISOString()
    : data.updated_at || null;

  return {
    ...data,
    updated_at: updatedAt
  };
};

export const getBallotEstado = (userId, fallbackEstado = null) => {
  const draft = readBallotDraft(userId, fallbackEstado);
  return draft.estado || fallbackEstado || null;
};

export const fetchRemoteBallotDraft = async (userId, estado = null) => {
  if (!userId) return createEmptyBallotDraft(estado);

  const draftRef = doc(db, 'elections', ACTIVE_ELECTION_ID, 'ballot_drafts', userId);
  const draftSnap = await getDoc(draftRef);
  const draft = draftSnap.exists()
    ? normalizeDraft(normalizeRemoteDraftData(draftSnap.data()), estado)
    : createEmptyBallotDraft(estado);

  return persistBallotDraft(userId, draft);
};

export const saveBallotState = async (userId, estado) => {
  if (!userId) throw new VotingError('AUTH_REQUIRED', 'Faça login para continuar.');

  const saveState = httpsCallable(functions, SAVE_BALLOT_STATE_FUNCTION_NAME);
  const response = await saveState({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: normalizeStateCode(estado)
  });

  return persistCallableDraft(userId, estado, response.data);
};

export const resetBallotForState = (userId, estado) => saveBallotState(userId, estado);

export const saveBallotOfficeSelection = async (userId, officeKey, candidates, estado = null) => {
  if (!OFFICE_LIMITS[officeKey]) {
    throw new VotingError('INVALID_OFFICE', 'Cargo inválido para esta eleição.');
  }

  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean)
    .slice(0, OFFICE_LIMITS[officeKey]);

  if (officeKey === 'deputado_federal') {
    return saveBallotStepSelection(userId, 'deputado_federal', normalizedCandidates, estado, { markCompleted: true });
  }

  const [senador1, senador2] = normalizedCandidates;
  await saveBallotStepSelection(userId, 'senadores_1', senador1 ? [senador1] : [], estado, { markCompleted: true });
  return saveBallotStepSelection(userId, 'senadores_2', senador2 ? [senador2] : [], estado, { markCompleted: true });
};

export const saveBallotStepSelection = async (userId, stepKey, candidates, estado = null, options = {}) => {
  if (!BALLOT_FLOW_STEP_IDS.includes(stepKey)) {
    throw new VotingError('INVALID_BALLOT_STEP', 'Etapa inválida para esta eleição.');
  }

  if (!userId) throw new VotingError('AUTH_REQUIRED', 'Faça login para continuar.');

  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean);
  const currentDraft = readBallotDraft(userId, estado);
  const activeEstado = normalizeStateCode(estado ?? currentDraft.estado);

  if (!activeEstado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de selecionar candidatos.');
  }

  const saveStep = httpsCallable(functions, SAVE_BALLOT_STEP_FUNCTION_NAME);
  const response = await saveStep({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: activeEstado,
    step_key: stepKey,
    candidate_ids: normalizedCandidates.map((candidate) => candidate.id),
    mark_completed: options.markCompleted === true
  });

  return persistCallableDraft(userId, activeEstado, response.data);
};

export const clearBallotDraft = (userId) => {
  if (!userId || !canUseStorage()) return;
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // O rascunho local e apenas um apoio de navegacao.
  }
};

export const clearVoteReceipt = (userId) => {
  if (!userId || !canUseStorage()) return;
  try {
    window.localStorage.removeItem(receiptKey(userId));
  } catch {
    // O recibo local pode ser recriado apos nova confirmacao bem-sucedida.
  }
};

export const deleteUserElectionData = async (userId) => {
  if (!userId) throw new VotingError('AUTH_REQUIRED', 'Faça login para continuar.');

  const deleteData = httpsCallable(functions, DELETE_USER_ELECTION_DATA_FUNCTION_NAME);
  await deleteData({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID
  });
  clearBallotDraft(userId);
  clearVoteReceipt(userId);

  return { ok: true };
};

export const hasBallotSelections = (userId) => {
  const draft = readBallotDraft(userId);
  return Object.values(draft.selections).some((items) => items.length > 0);
};

export const getBallotSelectionCounts = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const deputadoFederal = normalizedDraft.candidate_groups.deputado_federal.length;
  const senador1 = normalizedDraft.candidate_groups.senadores_1.length;
  const senador2 = normalizedDraft.candidate_groups.senadores_2.length;
  const total = deputadoFederal + senador1 + senador2;

  return {
    deputadoFederal,
    senadores: senador1 + senador2,
    deputadoFederalReeleger: deputadoFederal,
    deputadoFederalRenovar: 0,
    senador1,
    senador2,
    senadoresReeleger: senador1,
    senadoresRenovar: senador2,
    total
  };
};

export const draftHasBallotSelections = (draft) => getBallotSelectionCounts(draft).total > 0;

export const getBallotProgress = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const hasEstado = Boolean(normalizedDraft.estado);
  const isStepComplete = (stepId) => (
    normalizedDraft.candidate_groups?.[stepId]?.length > 0
  );
  const hasDeputadoFederal = isStepComplete('deputado_federal');
  const hasSenador1 = isStepComplete('senadores_1');
  const hasSenador2 = isStepComplete('senadores_2');
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
              : BALLOT_ROUTES.resultado
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
  const missingOffices = Object.entries(OFFICE_LIMITS)
    .filter(([officeKey, limit]) => normalizedDraft.selections[officeKey].length !== limit)
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

export const saveLastVoteReceipt = (userId, receipt, draft) => {
  if (!userId || !canUseStorage()) return null;

  const normalizedDraft = normalizeDraft(draft);
  const storedReceipt = {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    receipt_code: receipt.receiptCode,
    candidate_ids: getCandidateIdsFromDraft(normalizedDraft),
    selections: normalizedDraft.selections,
    submitted_at: new Date().toISOString()
  };

  try {
    window.localStorage.setItem(receiptKey(userId), JSON.stringify(storedReceipt));
  } catch {
    return storedReceipt;
  }

  return storedReceipt;
};

export const readLastVoteReceipt = (userId) => {
  if (!userId || !canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(receiptKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Recibo local inválido. Ignorando recibo salvo.', error);
    try {
      window.localStorage.removeItem(receiptKey(userId));
    } catch {
      // Sem acao: falha ao limpar recibo invalido.
    }
    return null;
  }
};

export const fetchCandidatesByIds = async (candidateIds) => {
  const uniqueIds = [...new Set(candidateIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const docsById = new Map();
  for (let index = 0; index < uniqueIds.length; index += 10) {
    const chunk = uniqueIds.slice(index, index + 10);
    const candidatesQuery = query(
      collection(db, 'candidatos'),
      where(documentId(), 'in', chunk)
    );
    const snapshot = await getDocs(candidatesQuery);
    snapshot.forEach((candidateDoc) => {
      docsById.set(candidateDoc.id, { id: candidateDoc.id, ...candidateDoc.data() });
    });
  }

  return uniqueIds.map((id) => docsById.get(id)).filter(Boolean);
};

export const castAnonymousVote = async ({ user, estado, draft }) => {
  if (!user?.uid) {
    throw new VotingError('AUTH_REQUIRED', 'Faça login para confirmar seu voto.');
  }

  const validation = validateCompleteBallot(draft);
  if (!validation.ok) {
    throw new VotingError(validation.code, 'Complete todos os cargos antes de confirmar o voto.');
  }

  const { normalizedDraft, candidateIds } = validation;
  flowLog('vote.cast.start', {
    userId: user.uid,
    electionId: ACTIVE_ELECTION_ID,
    estado: estado ?? normalizedDraft.estado ?? null,
    functionName: CAST_VOTE_FUNCTION_NAME,
    functionsRegion,
    appCheckConfigured: Boolean(import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY),
    candidateIds
  });

  const castVote = httpsCallable(functions, CAST_VOTE_FUNCTION_NAME);
  const response = await castVote({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: estado ?? normalizedDraft.estado ?? null,
    offices: {
      deputado_federal: normalizedDraft.selections.deputado_federal[0].id,
      senadores: normalizedDraft.selections.senadores.map((candidate) => candidate.id)
    },
    candidate_ids: candidateIds
  });
  const data = response.data || {};
  const receiptCode = data.receiptCode || data.receipt_code;

  if (!receiptCode) {
    throw new VotingError('RECEIPT_NOT_RETURNED', 'O servidor registrou a chamada, mas não retornou um recibo válido.');
  }

  return {
    electionId: data.electionId || data.election_id || ACTIVE_ELECTION_ID,
    receiptCode
  };
};

export const getVotingErrorMessage = (error) => {
  const messages = {
    AUTH_REQUIRED: 'Faça login novamente para confirmar seu voto.',
    INCOMPLETE_BALLOT: 'Complete a escolha de deputado federal e dos 2 senadores antes de finalizar.',
    DUPLICATED_CANDIDATE: 'O mesmo candidato não pode ser usado mais de uma vez no mesmo voto.',
    VOTE_ALREADY_CAST: 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    VOTER_NOT_ELIGIBLE: 'Seu cadastro não está habilitado para votar nesta eleição.',
    VOTER_NOT_ENROLLED: 'Não encontramos sua habilitação para esta eleição.',
    RECEIPT_NOT_RETURNED: 'O voto não retornou um recibo válido. Tente novamente.',
    FUNCTION_UNREACHABLE: 'Não foi possível conectar ao servidor de votação. Verifique a implantação da Cloud Function e tente novamente.',
    'functions/not-found': 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
    not_found: 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
    'functions/internal': 'Servidor de votação indisponível ou sem configuração de acesso. Verifique região, deploy e App Check.',
    internal: 'Servidor de votação indisponível ou sem configuração de acesso. Verifique região, deploy e App Check.',
    'functions/unavailable': 'Servidor de votação temporariamente indisponível. Tente novamente em instantes.',
    unavailable: 'Servidor de votação temporariamente indisponível. Tente novamente em instantes.',
    'functions/unauthenticated': 'Faça login novamente e verifique a configuração do App Check.',
    unauthenticated: 'Faça login novamente e verifique a configuração do App Check.',
    'functions/already-exists': 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    already_exists: 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    'functions/permission-denied': 'Você não tem permissão para votar nesta eleição.',
    permission_denied: 'Você não tem permissão para votar nesta eleição.',
    'functions/failed-precondition': 'Não foi possível confirmar sua habilitação para votar.',
    failed_precondition: 'Não foi possível confirmar sua habilitação para votar.',
    'functions/invalid-argument': 'Os dados do voto são inválidos. Revise suas escolhas.',
    invalid_argument: 'Os dados do voto são inválidos. Revise suas escolhas.'
  };

  return messages[error?.code] || messages[error?.message] || 'Não foi possível registrar o voto. Tente novamente.';
};
