import {
  collection,
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
  BALLOT_SCHEMA_VERSION,
  DELETE_USER_ELECTION_DATA_FUNCTION_NAME,
  OFFICE_MINIMUM_SELECTIONS
} from '@/shared/constants/ballot';
import { db, functions } from '@/shared/firebase/firebase';
import { flowLog } from '@/shared/utils/debugFlow';
import { normalizeStateCode } from '@/shared/utils/state';
import { enrichCandidatesWithPartyScores } from '@/features/candidate-selection/candidateService';
import {
  PUBLIC_CANDIDATE_CHOICES_COLLECTION,
  USER_CHOICE_CONFIG_DOC_ID,
  USER_PRIVATE_COLLECTION,
  asArray,
  normalizeRemoteTimestamp,
  shouldKeepLocalDraftOverRemote
} from './ballotInternals';
import {
  BallotDraftModel,
  createEmptyBallotDraft,
  draftHasBallotSelections,
  normalizeDraft,
  normalizeStoredCandidate
} from './ballotDraftNormalize';
import {
  assertCandidateMatchesStep,
  clearBallotDraft,
  clearVisitorBallotDraft,
  persistBallotDraft,
  readBallotDraft,
  readVisitorBallotDraft
} from './ballotDraftStorage';
import { clearVoteReceipt } from './ballotVoteReceipt';
import { VotingError } from './ballotErrors';

const normalizeRemoteDraftData = (data) => {
  if (!data) return data;

  return {
    ...data,
    updated_at: normalizeRemoteTimestamp(data.updated_at)
  };
};

class FirestoreCandidateChoiceRepository {
  choiceConfigRef(userId) {
    return doc(db, 'users', userId, USER_PRIVATE_COLLECTION, USER_CHOICE_CONFIG_DOC_ID);
  }

  publicChoiceRef(choiceDocId) {
    return doc(db, PUBLIC_CANDIDATE_CHOICES_COLLECTION, choiceDocId);
  }

  legacyDraftRef(userId) {
    return doc(db, 'elections', ACTIVE_ELECTION_ID, 'ballot_drafts', userId);
  }

  userRef(userId) {
    return doc(db, 'users', userId);
  }

  createChoiceDocId() {
    return doc(collection(db, PUBLIC_CANDIDATE_CHOICES_COLLECTION)).id;
  }

  async resolveChoiceDocId(userId) {
    const configSnap = await getDoc(this.choiceConfigRef(userId));
    return configSnap.exists() ? configSnap.data()?.choiceDocId || null : null;
  }

  async ensureChoiceDocId(transaction, userId, updatedAt) {
    const configRef = this.choiceConfigRef(userId);
    const configSnap = await transaction.get(configRef);

    if (configSnap.exists()) {
      const existingChoiceDocId = configSnap.data()?.choiceDocId;
      if (existingChoiceDocId) return existingChoiceDocId;
    }

    const choiceDocId = this.createChoiceDocId();
    transaction.set(configRef, {
      choiceDocId,
      createdAt: updatedAt
    });
    return choiceDocId;
  }

  buildPublicChoicePayload(draft, updatedAt) {
    const normalizedDraft = BallotDraftModel.assertSelectable(draft);
    return {
      schemaVersion: BALLOT_SCHEMA_VERSION,
      electionId: ACTIVE_ELECTION_ID,
      state: normalizedDraft.estado,
      candidateIds: BallotDraftModel.activeCandidateIds(normalizedDraft),
      updatedAt
    };
  }

  async readLegacyDraft(userId, estado = null) {
    const draftSnap = await getDoc(this.legacyDraftRef(userId));
    return draftSnap.exists()
      ? normalizeDraft(normalizeRemoteDraftData(draftSnap.data()), estado)
      : null;
  }

  async readDraft(userId, estado = null) {
    const choiceDocId = await this.resolveChoiceDocId(userId);

    if (!choiceDocId) {
      const legacyDraft = await this.readLegacyDraft(userId, estado);
      return legacyDraft || createEmptyBallotDraft(estado);
    }

    const choiceSnap = await getDoc(this.publicChoiceRef(choiceDocId));
    if (!choiceSnap.exists()) return createEmptyBallotDraft(estado);

    const choiceData = choiceSnap.data();
    if (choiceData.electionId && choiceData.electionId !== ACTIVE_ELECTION_ID) {
      return createEmptyBallotDraft(estado);
    }

    const candidateIds = [...new Set(asArray(choiceData.candidateIds).filter(Boolean))];
    const candidates = await fetchCandidatesByIds(candidateIds);
    return BallotDraftModel.fromPublicChoice(choiceData, candidates, estado);
  }

  async saveDraft(userId, draft) {
    const normalizedDraft = BallotDraftModel.assertSelectable(draft);
    const responseDraft = {
      ...normalizedDraft,
      updated_at: new Date().toISOString()
    };

    await runTransaction(db, async (transaction) => {
      const updatedAt = serverTimestamp();
      const choiceDocId = await this.ensureChoiceDocId(transaction, userId, updatedAt);
      transaction.set(
        this.publicChoiceRef(choiceDocId),
        this.buildPublicChoicePayload(normalizedDraft, updatedAt),
        { merge: false }
      );
      transaction.set(this.userRef(userId), {
        estado: normalizedDraft.estado,
        role: 'voter',
        schema_version: 1,
        updated_at: updatedAt
      }, { merge: true });
    });

    return persistBallotDraft(userId, responseDraft);
  }
}

const candidateChoiceRepository = new FirestoreCandidateChoiceRepository();

const saveBallotStateDirectly = async (userId, estado) => {
  const activeEstado = normalizeStateCode(estado);
  if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

  const previousDraft = readBallotDraft(userId);
  const nextDraft = previousDraft.estado === activeEstado
    ? normalizeDraft({ ...previousDraft, estado: activeEstado, updated_at: new Date().toISOString() }, activeEstado)
    : createEmptyBallotDraft(activeEstado);

  return candidateChoiceRepository.saveDraft(userId, {
    ...nextDraft,
    estado: activeEstado,
    updated_at: new Date().toISOString()
  });
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

  const candidateIds = normalizedCandidates.map((candidate) => candidate.id);
  const fetchedCandidates = await fetchCandidatesByIds(candidateIds);
  const fetchedById = new Map(fetchedCandidates.map((candidate) => [candidate.id, candidate]));
  const candidateSnapshots = normalizedCandidates.map((candidate) => {
    const storedCandidate = fetchedById.get(candidate.id) || candidate;
    assertCandidateMatchesStep(storedCandidate, stepKey, activeEstado);
    return normalizeStoredCandidate(storedCandidate);
  }).filter(Boolean);

  if (currentDraft.estado && currentDraft.estado !== activeEstado) {
    throw new VotingError('STATE_MISMATCH', 'Estado ativo diferente do estado informado.');
  }

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

  return candidateChoiceRepository.saveDraft(userId, nextDraft);
};

export const fetchRemoteBallotDraft = async (userId, estado = null) => {
  if (!userId) return createEmptyBallotDraft(estado);

  const requestStartedAtMs = Date.now();
  const draft = await candidateChoiceRepository.readDraft(userId, estado);
  const localDraft = readBallotDraft(userId, estado);

  if (shouldKeepLocalDraftOverRemote(localDraft, draft, requestStartedAtMs)) {
    flowLog('draft.remote.ignored-stale', {
      userId,
      estado: estado || draft.estado || localDraft.estado || null,
      localUpdatedAt: localDraft.updated_at || null,
      remoteUpdatedAt: draft.updated_at || null
    });
    return localDraft;
  }

  return persistBallotDraft(userId, draft);
};

export const saveBallotState = async (userId, estado) => {
  if (!userId) throw new VotingError('AUTH_REQUIRED', 'Faça login para continuar.');

  flowLog('draft.save-state.firestore-direct', { userId, estado });
  return saveBallotStateDirectly(userId, estado);
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

  flowLog('draft.save-step.firestore-direct', {
    userId,
    estado: activeEstado,
    stepKey,
    total: normalizedCandidates.length,
    markCompleted: options.markCompleted === true
  });
  return saveBallotStepSelectionDirectly(userId, stepKey, normalizedCandidates, activeEstado);
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

  return enrichCandidatesWithPartyScores(uniqueIds.map((id) => docsById.get(id)).filter(Boolean));
};
