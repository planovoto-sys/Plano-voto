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
import { usesSupabaseAuth } from '@/shared/auth/authService';
import { db } from '@/shared/firebase/firebase';
import { getSupabaseClient } from '@/shared/supabase/client';
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
  filterDraftCandidatesByIds,
  getDraftActiveCandidateIds,
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

const deserializeSupabaseDraft = (row, estado = null) => normalizeDraft({
  ...(row?.selections || {}),
  estado: row?.state || estado,
  updated_at: row?.updated_at || null,
}, estado);

const removeLegacyCandidateIds = async (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const candidateIds = getDraftActiveCandidateIds(normalizedDraft);
  if (candidateIds.length === 0) return normalizedDraft;

  const validIds = [];
  for (let offset = 0; offset < candidateIds.length; offset += 100) {
    const { data, error } = await getSupabaseClient()
      .from('candidates')
      .select('id')
      .eq('election_id', ACTIVE_ELECTION_ID)
      .in('id', candidateIds.slice(offset, offset + 100));
    if (error) throw error;
    validIds.push(...(data || []).map((candidate) => candidate.id));
  }

  return filterDraftCandidatesByIds(normalizedDraft, validIds);
};

const saveSupabaseDraft = async (userId, draft) => {
  const normalizedDraft = await removeLegacyCandidateIds(draft);
  const { data, error } = await getSupabaseClient()
    .from('ballot_drafts')
    .upsert({
      election_id: ACTIVE_ELECTION_ID,
      user_id: userId,
      state: normalizedDraft.estado,
      schema_version: BALLOT_SCHEMA_VERSION,
      selections: {
        selections: normalizedDraft.selections,
        candidate_groups: normalizedDraft.candidate_groups,
      },
      completed_steps: Object.entries(normalizedDraft.completed_steps)
        .filter(([, completed]) => completed)
        .map(([stepId]) => stepId),
    }, { onConflict: 'election_id,user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return persistBallotDraft(userId, deserializeSupabaseDraft(data, normalizedDraft.estado));
};

const readSupabaseDraft = async (userId, estado = null) => {
  const { data, error } = await getSupabaseClient()
    .from('ballot_drafts')
    .select('*')
    .eq('election_id', ACTIVE_ELECTION_ID)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? deserializeSupabaseDraft(data, estado) : createEmptyBallotDraft(estado);
};

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

  if (usesSupabaseAuth) {
    const remoteDraft = await readSupabaseDraft(userId, estado);
    return persistBallotDraft(userId, remoteDraft);
  }

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

  if (usesSupabaseAuth) {
    const activeEstado = normalizeStateCode(estado);
    if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

    const currentDraft = await readSupabaseDraft(userId, activeEstado);
    const nextDraft = currentDraft.estado === activeEstado
      ? normalizeDraft(currentDraft, activeEstado)
      : createEmptyBallotDraft(activeEstado);
    return saveSupabaseDraft(userId, nextDraft);
  }

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

  if (officeKey === 'presidente') {
    return saveBallotStepSelection(userId, 'presidente', normalizedCandidates, estado, { markCompleted: true });
  }

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

  if (usesSupabaseAuth) {
    const nextDraft = normalizeDraft({
      ...currentDraft,
      estado: activeEstado,
      candidate_groups: {
        ...currentDraft.candidate_groups,
        [stepKey]: normalizedCandidates,
      },
    }, activeEstado);
    return saveSupabaseDraft(userId, nextDraft);
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
  const presidente = normalizedDraft.candidate_groups.presidente;
  const deputadoFederal = normalizedDraft.candidate_groups.deputado_federal;
  const senadores = normalizedDraft.candidate_groups.senadores_1;

  if (presidente.length > 0) {
    savedDraft = await saveBallotStepSelection(userId, 'presidente', presidente, activeEstado, { markCompleted: true });
  }

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

  if (usesSupabaseAuth) {
    const { error } = await getSupabaseClient()
      .from('ballot_drafts')
      .delete()
      .eq('election_id', ACTIVE_ELECTION_ID)
      .eq('user_id', userId);
    if (error) throw error;
    clearBallotDraft(userId);
    clearVoteReceipt(userId);
    return { ok: true };
  }

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

  if (usesSupabaseAuth) {
    const rows = [];
    for (let index = 0; index < uniqueIds.length; index += 100) {
      const chunk = uniqueIds.slice(index, index + 100);
      const { data, error } = await getSupabaseClient()
        .from('candidates')
        .select('id, name, office, state, party_id, number, image_url, scores, legacy_data')
        .in('id', chunk);
      if (error) throw error;
      rows.push(...(data || []));
    }

    const rowsById = new Map(rows.map((row) => [row.id, {
      ...(row.legacy_data || {}),
      id: row.id,
      nome: row.name,
      cargo: row.office,
      uf: row.state,
      partido: row.legacy_data?.partido_nome || row.party_id || '',
      partido_sigla: row.party_id || row.legacy_data?.partido_sigla || '',
      sigla_partido: row.party_id || row.legacy_data?.partido_sigla || '',
      numero: row.number,
      numero_candidato: row.number,
      imagem: row.image_url || row.legacy_data?.imagem || '',
      scores: row.scores || {},
      nota_candidato: row.scores?.candidate ?? row.legacy_data?.nota ?? null,
      nota_final: row.scores?.candidate ?? row.legacy_data?.nota ?? null,
      temNotaCandidato: (row.scores?.candidate ?? row.legacy_data?.nota) != null,
    }]));

    return enrichCandidatesWithPartyScores(uniqueIds.map((id) => rowsById.get(id)).filter(Boolean));
  }

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
