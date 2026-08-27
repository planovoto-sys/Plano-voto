import {
  collection,
  documentId,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import {
  ACTIVE_ELECTION_ID,
  BALLOT_FLOW_STEP_IDS,
  BALLOT_SCHEMA_VERSION,
  DELETE_USER_ELECTION_DATA_FUNCTION_NAME,
  OFFICE_MINIMUM_SELECTIONS,
  SAVE_BALLOT_STATE_FUNCTION_NAME,
  SAVE_BALLOT_STEP_FUNCTION_NAME
} from '@/shared/constants/ballot';
import { callBackend } from '@/shared/api/backend';
import { db } from '@/shared/firebase/firebase';
import { flowLog } from '@/shared/utils/debugFlow';
import { normalizeStateCode } from '@/shared/utils/state';
import { enrichCandidatesWithPartyScores } from '@/features/candidate-selection/candidateService';
import {
  asArray,
  normalizeRemoteTimestamp,
  shouldKeepLocalDraftOverRemote
} from './ballotInternals';
import {
  createEmptyBallotDraft,
  draftHasBallotSelections,
  normalizeDraft,
  normalizeStoredCandidate
} from './ballotDraftNormalize';
import {
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

class FirestoreBallotDraftRepository {
  draftRef(userId) {
    return doc(db, 'elections', ACTIVE_ELECTION_ID, 'ballot_drafts', userId);
  }

  async readDraft(userId, estado = null) {
    const draftSnap = await getDoc(this.draftRef(userId));
    return draftSnap.exists()
      ? normalizeDraft(normalizeRemoteDraftData(draftSnap.data()), estado)
      : createEmptyBallotDraft(estado);
  }
}

const ballotDraftRepository = new FirestoreBallotDraftRepository();

const saveBallotStateServerSide = async (userId, estado) => {
  const activeEstado = normalizeStateCode(estado);
  if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

  const result = await callBackend(SAVE_BALLOT_STATE_FUNCTION_NAME, {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: activeEstado
  });
  return persistBallotDraft(userId, normalizeDraft(result.data?.draft, activeEstado));
};

const saveBallotStepSelectionServerSide = async (userId, stepKey, candidates, estado = null) => {
  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean);
  const activeEstado = normalizeStateCode(estado ?? readBallotDraft(userId, estado).estado);

  if (!activeEstado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de selecionar candidatos.');
  }

  const result = await callBackend(SAVE_BALLOT_STEP_FUNCTION_NAME, {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: activeEstado,
    step_key: stepKey,
    candidate_ids: normalizedCandidates.map((candidate) => candidate.id)
  });
  return persistBallotDraft(userId, normalizeDraft(result.data?.draft, activeEstado));
};

export const fetchRemoteBallotDraft = async (userId, estado = null) => {
  if (!userId) return createEmptyBallotDraft(estado);

  const requestStartedAtMs = Date.now();
  const draft = await ballotDraftRepository.readDraft(userId, estado);
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

  flowLog('draft.save-state.server-side', { userId, estado });
  return saveBallotStateServerSide(userId, estado);
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

  flowLog('draft.save-step.server-side', {
    userId,
    estado: activeEstado,
    stepKey,
    total: normalizedCandidates.length,
    markCompleted: options.markCompleted === true
  });
  return saveBallotStepSelectionServerSide(userId, stepKey, normalizedCandidates, activeEstado);
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

  await callBackend(DELETE_USER_ELECTION_DATA_FUNCTION_NAME, {
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
