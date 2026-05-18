import {
  collection,
  deleteField,
  documentId,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ACTIVE_ELECTION_ID,
  BALLOT_FLOW_STEP_IDS,
  BALLOT_ROUTES,
  BALLOT_SCHEMA_VERSION,
  CAST_VOTE_FUNCTION_NAME,
  CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME,
  DELETE_USER_ELECTION_DATA_FUNCTION_NAME,
  LEGACY_FLOW_STEP_ALIASES,
  OFFICE_MINIMUM_SELECTIONS,
  REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME,
  SAVE_BALLOT_STATE_FUNCTION_NAME,
  SAVE_BALLOT_STEP_FUNCTION_NAME,
  VISITOR_DRAFT_ID
} from '@/constants/ballot';
import { db, functions, functionsRegion } from '@/services/firebase/firebase';
import { flowLog } from '@/utils/debugFlow';
import { getCandidateStateCode, normalizeStateCode } from '@/utils/state';
const STORAGE_PREFIX = `meuvoto:${ACTIVE_ELECTION_ID}`;
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const VISITOR_DRAFT_STORAGE_ID = `${VISITOR_DRAFT_ID}:local`;
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
    nota_final: Number(candidate.nota_final ?? candidate.notaFinal ?? candidate['Nota candidato'] ?? candidate['Nota partido'] ?? 0) || 0,
    chance: Number(candidate.chance ?? candidate.Chance ?? 0) || 0,
    selected_by_users: Number(candidate.selected_by_users ?? candidate.selectedByUsers ?? 0) || 0,
    average_elected_votes: Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 0) || 0,
    ranking_total: Number(candidate.ranking_total ?? candidate.rankingTotal ?? 0) || 0,
    temNotaCandidato: candidate.temNotaCandidato ?? candidate.tem_nota_candidato ?? null
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

const normalizeDraft = (rawDraft, estado = null) => {
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

export const readVisitorBallotDraft = (estado = null) => readBallotDraft(VISITOR_DRAFT_STORAGE_ID, estado);

export const getVisitorBallotEstado = (fallbackEstado = null) => {
  const draft = readVisitorBallotDraft(fallbackEstado);
  return draft.estado || fallbackEstado || null;
};

export const saveVisitorBallotState = async (estado) => {
  const activeEstado = normalizeStateCode(estado);
  if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

  const previousDraft = readVisitorBallotDraft(activeEstado);
  const nextDraft = previousDraft.estado === activeEstado
    ? normalizeDraft({ ...previousDraft, estado: activeEstado, updated_at: new Date().toISOString() }, activeEstado)
    : createEmptyBallotDraft(activeEstado);

  return persistBallotDraft(VISITOR_DRAFT_STORAGE_ID, {
    ...nextDraft,
    updated_at: new Date().toISOString()
  });
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

const normalizeOfficeName = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

const getStepExpectedOffice = (stepKey) => (
  stepKey === 'deputado_federal' ? 'Deputado Federal' : 'Senador'
);

const assertCandidateMatchesStep = (candidate, stepKey, estado) => {
  const candidateId = candidate?.id || 'selecionado';
  const candidateOffice = candidate?.Cargo || candidate?.cargo;
  const expectedOffice = getStepExpectedOffice(stepKey);

  if (normalizeOfficeName(candidateOffice) !== normalizeOfficeName(expectedOffice)) {
    throw new VotingError('INVALID_CANDIDATE_OFFICE', `Candidato ${candidateId} não pertence ao cargo ${expectedOffice}.`);
  }

  const candidateState = getCandidateStateCode(candidate, { allowPartyFallback: stepKey !== 'deputado_federal' });
  if (stepKey !== 'deputado_federal' && !candidateState) {
    throw new VotingError('INVALID_CANDIDATE_STATE', `Candidato ${candidateId} não possui estado definido.`);
  }

  if (candidateState && candidateState !== 'TODOS' && candidateState !== estado) {
    throw new VotingError('INVALID_CANDIDATE_STATE', `Candidato ${candidateId} não pertence ao estado selecionado.`);
  }
};

export const saveVisitorBallotStepSelection = async (stepKey, candidates, estado = null) => {
  if (!BALLOT_FLOW_STEP_IDS.includes(stepKey)) {
    throw new VotingError('INVALID_BALLOT_STEP', 'Etapa inválida para esta eleição.');
  }

  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean);
  const currentDraft = readVisitorBallotDraft(estado);
  const activeEstado = normalizeStateCode(estado ?? currentDraft.estado);

  if (!activeEstado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de selecionar candidatos.');
  }

  const candidateSnapshots = normalizedCandidates.map((candidate) => {
    assertCandidateMatchesStep(candidate, stepKey, activeEstado);
    return normalizeStoredCandidate(candidate);
  }).filter(Boolean);

  const nextDraft = normalizeDraft({
    ...currentDraft,
    estado: activeEstado,
    candidate_groups: {
      ...currentDraft.candidate_groups,
      [stepKey]: candidateSnapshots,
      ...(stepKey.startsWith('senadores') ? { senadores_2: [] } : {})
    },
    updated_at: new Date().toISOString()
  }, activeEstado);

  const senatorIds = nextDraft.candidate_groups.senadores_1.map((candidate) => candidate.id).filter(Boolean);
  if (new Set(senatorIds).size !== senatorIds.length) {
    throw new VotingError('DUPLICATED_CANDIDATE', 'O mesmo senador não pode ser escolhido mais de uma vez.');
  }

  return persistBallotDraft(VISITOR_DRAFT_STORAGE_ID, nextDraft);
};

const getDraftActiveCandidateIds = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  return [
    ...normalizedDraft.candidate_groups.deputado_federal,
    ...normalizedDraft.candidate_groups.senadores_1
  ].map((candidate) => candidate.id).filter(Boolean);
};

const countCandidateIds = (candidateIds) => (
  candidateIds.reduce((counts, candidateId) => {
    counts.set(candidateId, (counts.get(candidateId) || 0) + 1);
    return counts;
  }, new Map())
);

const updateActiveTalliesInTransaction = async (transaction, oldDraft, newDraft, updatedAt) => {
  const oldCounts = countCandidateIds(getDraftActiveCandidateIds(oldDraft));
  const newCounts = countCandidateIds(getDraftActiveCandidateIds(newDraft));
  const candidateIds = new Set([...oldCounts.keys(), ...newCounts.keys()]);
  const changes = [];

  candidateIds.forEach((candidateId) => {
    const delta = (newCounts.get(candidateId) || 0) - (oldCounts.get(candidateId) || 0);
    if (delta === 0) return;
    changes.push({
      candidateId,
      delta,
      ref: doc(db, 'elections', ACTIVE_ELECTION_ID, 'candidate_tallies', candidateId)
    });
  });

  const tallySnaps = [];
  for (const change of changes) {
    tallySnaps.push(await transaction.get(change.ref));
  }

  changes.forEach((change, index) => {
    const currentActiveSelections = Number(tallySnaps[index].data()?.active_selections || 0) || 0;
    transaction.set(change.ref, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: ACTIVE_ELECTION_ID,
      candidate_id: change.candidateId,
      active_selections: Math.max(0, currentActiveSelections + change.delta),
      updated_at: updatedAt
    }, { merge: true });
  });
};

const prepareDraftForFirestore = (draft, userId, updatedAt) => ({
  ...normalizeDraft(draft, draft.estado),
  schema_version: BALLOT_SCHEMA_VERSION,
  election_id: ACTIVE_ELECTION_ID,
  user_id: userId,
  active_candidate_ids: getDraftActiveCandidateIds(draft),
  updated_at: updatedAt
});

const shouldFallbackToFirestore = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return [
    'internal',
    'functions/internal',
    'unavailable',
    'functions/unavailable',
    'not-found',
    'functions/not-found',
    'unknown',
    'functions/unknown'
  ].includes(code) || message.includes('failed to fetch') || message.includes('network') || message.includes('cors');
};

const saveBallotStateDirectly = async (userId, estado) => {
  const activeEstado = normalizeStateCode(estado);
  if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

  const draftRef = doc(db, 'elections', ACTIVE_ELECTION_ID, 'ballot_drafts', userId);
  const userRef = doc(db, 'users', userId);
  let responseDraft = null;

  await runTransaction(db, async (transaction) => {
    const updatedAt = serverTimestamp();
    const draftSnap = await transaction.get(draftRef);
    const previousDraft = draftSnap.exists()
      ? normalizeDraft(normalizeRemoteDraftData(draftSnap.data()), activeEstado)
      : createEmptyBallotDraft(activeEstado);
    const nextDraft = previousDraft.estado === activeEstado
      ? normalizeDraft({ ...previousDraft, estado: activeEstado, updated_at: new Date().toISOString() }, activeEstado)
      : createEmptyBallotDraft(activeEstado);

    responseDraft = normalizeDraft({
      ...nextDraft,
      estado: activeEstado,
      updated_at: new Date().toISOString()
    }, activeEstado);

    await updateActiveTalliesInTransaction(transaction, previousDraft, responseDraft, updatedAt);
    transaction.set(draftRef, prepareDraftForFirestore(responseDraft, userId, updatedAt), { merge: false });
    transaction.set(userRef, {
      estado: activeEstado,
      role: 'voter',
      schema_version: 1,
      updated_at: updatedAt,
      candidatos_escolhidos: deleteField()
    }, { merge: true });
  });

  return persistBallotDraft(userId, responseDraft);
};

const saveBallotStepSelectionDirectly = async (userId, stepKey, candidates, estado = null) => {
  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean);
  const currentDraft = readBallotDraft(userId, estado);
  const activeEstado = normalizeStateCode(estado ?? currentDraft.estado);

  if (!activeEstado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de selecionar candidatos.');
  }

  const draftRef = doc(db, 'elections', ACTIVE_ELECTION_ID, 'ballot_drafts', userId);
  const candidateIds = normalizedCandidates.map((candidate) => candidate.id);
  const fetchedCandidates = await fetchCandidatesByIds(candidateIds);
  const fetchedById = new Map(fetchedCandidates.map((candidate) => [candidate.id, candidate]));
  const candidateSnapshots = normalizedCandidates.map((candidate) => {
    const storedCandidate = fetchedById.get(candidate.id) || candidate;
    assertCandidateMatchesStep(storedCandidate, stepKey, activeEstado);
    return normalizeStoredCandidate(storedCandidate);
  }).filter(Boolean);
  let responseDraft = null;

  await runTransaction(db, async (transaction) => {
    const updatedAt = serverTimestamp();
    const draftSnap = await transaction.get(draftRef);
    const previousDraft = draftSnap.exists()
      ? normalizeDraft(normalizeRemoteDraftData(draftSnap.data()), activeEstado)
      : currentDraft;

    if (previousDraft.estado && previousDraft.estado !== activeEstado) {
      throw new VotingError('STATE_MISMATCH', 'Estado ativo diferente do estado informado.');
    }

    const nextDraft = normalizeDraft({
      ...previousDraft,
      estado: activeEstado,
      candidate_groups: {
        ...previousDraft.candidate_groups,
        [stepKey]: candidateSnapshots,
        ...(stepKey.startsWith('senadores') ? { senadores_2: [] } : {})
      },
      updated_at: new Date().toISOString()
    }, activeEstado);
    const senatorIds = nextDraft.candidate_groups.senadores_1.map((candidate) => candidate.id).filter(Boolean);

    if (new Set(senatorIds).size !== senatorIds.length) {
      throw new VotingError('DUPLICATED_CANDIDATE', 'O mesmo senador não pode ser escolhido mais de uma vez.');
    }

    responseDraft = nextDraft;
    await updateActiveTalliesInTransaction(transaction, previousDraft, responseDraft, updatedAt);
    transaction.set(draftRef, prepareDraftForFirestore(responseDraft, userId, updatedAt), { merge: false });
  });

  return persistBallotDraft(userId, responseDraft);
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
  let response = null;

  try {
    response = await saveState({
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: ACTIVE_ELECTION_ID,
      estado: normalizeStateCode(estado)
    });
  } catch (error) {
    if (!shouldFallbackToFirestore(error)) throw error;
    flowLog('draft.save-state.firestore-fallback', {
      userId,
      estado,
      code: error?.code || error?.message || 'unknown'
    });
    return saveBallotStateDirectly(userId, estado);
  }

  return persistCallableDraft(userId, estado, response.data);
};

export const resetBallotForState = (userId, estado) => saveBallotState(userId, estado);

export const saveBallotOfficeSelection = async (userId, officeKey, candidates, estado = null) => {
  if (!OFFICE_MINIMUM_SELECTIONS[officeKey]) {
    throw new VotingError('INVALID_OFFICE', 'Cargo inválido para esta eleição.');
  }

  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean);

  if (officeKey === 'deputado_federal') {
    return saveBallotStepSelection(userId, 'deputado_federal', normalizedCandidates, estado, { markCompleted: true });
  }

  return saveBallotStepSelection(userId, 'senadores_1', normalizedCandidates, estado, { markCompleted: true });
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
  let response = null;

  try {
    response = await saveStep({
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: ACTIVE_ELECTION_ID,
      estado: activeEstado,
      step_key: stepKey,
      candidate_ids: normalizedCandidates.map((candidate) => candidate.id),
      mark_completed: options.markCompleted === true
    });
  } catch (error) {
    if (!shouldFallbackToFirestore(error)) throw error;
    flowLog('draft.save-step.firestore-fallback', {
      userId,
      estado: activeEstado,
      stepKey,
      code: error?.code || error?.message || 'unknown'
    });
    return saveBallotStepSelectionDirectly(userId, stepKey, normalizedCandidates, activeEstado);
  }

  return persistCallableDraft(userId, activeEstado, response.data);
};

export const saveBallotDraftToAccount = async (userId, draft) => {
  if (!userId) throw new VotingError('AUTH_REQUIRED', 'Faça login para continuar.');

  const normalizedDraft = normalizeDraft(draft);
  const activeEstado = normalizeStateCode(normalizedDraft.estado);
  if (!activeEstado) return createEmptyBallotDraft();

  let savedDraft = await saveBallotState(userId, activeEstado);
  const deputadoFederal = normalizedDraft.candidate_groups.deputado_federal;
  const senadores = normalizedDraft.candidate_groups.senadores_1;

  if (deputadoFederal.length > 0) {
    savedDraft = await saveBallotStepSelection(userId, 'deputado_federal', deputadoFederal, activeEstado, { markCompleted: true });
  }

  if (senadores.length > 0) {
    savedDraft = await saveBallotStepSelection(userId, 'senadores_1', senadores, activeEstado, {
      markCompleted: senadores.length >= OFFICE_MINIMUM_SELECTIONS.senadores
    });
  }

  return savedDraft;
};

export const mergeVisitorBallotDraftIntoAccount = async (userId) => {
  const visitorDraft = readVisitorBallotDraft();
  if (!draftHasBallotSelections(visitorDraft) && !visitorDraft.estado) return null;

  const savedDraft = await saveBallotDraftToAccount(userId, visitorDraft);
  clearVisitorBallotDraft();
  return savedDraft;
};

export const createPlanHandoffToken = async (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  if (!normalizedDraft.estado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de gerar o QR Code.');
  }

  const createToken = httpsCallable(functions, CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME);
  const response = await createToken({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    draft: normalizedDraft
  });

  return response.data || {};
};

export const redeemPlanHandoffToken = async (token) => {
  const redeemToken = httpsCallable(functions, REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME);
  const response = await redeemToken({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    token
  });

  return normalizeDraft(response.data?.draft || null);
};

export const clearBallotDraft = (userId) => {
  if (!userId || !canUseStorage()) return;
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // O rascunho local e apenas um apoio de navegacao.
  }
};

export const clearVisitorBallotDraft = () => clearBallotDraft(VISITOR_DRAFT_STORAGE_ID);

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
    candidateIds
  });

  const castVote = httpsCallable(functions, CAST_VOTE_FUNCTION_NAME);
  const response = await castVote({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: estado ?? normalizedDraft.estado ?? null,
    offices: {
      deputado_federal: normalizedDraft.selections.deputado_federal.map((candidate) => candidate.id),
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
    INCOMPLETE_BALLOT: 'Escolha pelo menos 1 deputado federal e 2 senadores antes de finalizar.',
    DUPLICATED_CANDIDATE: 'O mesmo candidato não pode ser usado mais de uma vez no mesmo voto.',
    VOTE_ALREADY_CAST: 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    VOTER_NOT_ELIGIBLE: 'Seu cadastro não está habilitado para votar nesta eleição.',
    VOTER_NOT_ENROLLED: 'Não encontramos sua habilitação para esta eleição.',
    RECEIPT_NOT_RETURNED: 'O voto não retornou um recibo válido. Tente novamente.',
    FUNCTION_UNREACHABLE: 'Não foi possível conectar ao servidor de votação. Verifique a implantação da Cloud Function e tente novamente.',
    'functions/not-found': 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
    not_found: 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
    'functions/internal': 'Servidor de votação indisponível ou sem configuração de acesso. Verifique região e deploy.',
    internal: 'Servidor de votação indisponível ou sem configuração de acesso. Verifique região e deploy.',
    'functions/unavailable': 'Servidor de votação temporariamente indisponível. Tente novamente em instantes.',
    unavailable: 'Servidor de votação temporariamente indisponível. Tente novamente em instantes.',
    'functions/unauthenticated': 'Faça login novamente para continuar.',
    unauthenticated: 'Faça login novamente para continuar.',
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
