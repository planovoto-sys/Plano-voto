import {
  BALLOT_FLOW_STEP_IDS
} from '@/shared/constants/ballot';
import { flowLog } from '@/shared/utils/debugFlow';
import { getCandidateStateCode, normalizeStateCode } from '@/shared/utils/state';
import {
  DRAFT_MAX_AGE_MS,
  VISITOR_DRAFT_STORAGE_ID,
  asArray,
  canUseStorage,
  draftKey,
  normalizeOfficeName
} from './ballotInternals';
import {
  BallotDraftModel,
  createEmptyBallotDraft,
  normalizeDraft,
  normalizeStoredCandidate
} from './ballotDraftNormalize';
import { VotingError } from './ballotErrors';

class LocalBallotDraftRepository {
  read(userId, estado = null) {
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
  }

  persist(userId, draft) {
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
  }

  clear(userId) {
    if (!userId || !canUseStorage()) return;
    try {
      window.localStorage.removeItem(draftKey(userId));
    } catch {
      // O rascunho local e apenas um apoio de navegacao.
    }
  }
}

const localDraftRepository = new LocalBallotDraftRepository();

export const readBallotDraft = (userId, estado = null) => localDraftRepository.read(userId, estado);

export const persistBallotDraft = (userId, draft) => localDraftRepository.persist(userId, draft);

export const readVisitorBallotDraft = (estado = null) => readBallotDraft(VISITOR_DRAFT_STORAGE_ID, estado);

export const persistVisitorBallotDraft = (draft) => persistBallotDraft(
  VISITOR_DRAFT_STORAGE_ID,
  normalizeDraft(draft, draft?.estado)
);

export const getVisitorBallotEstado = (fallbackEstado = null) => {
  const draft = readVisitorBallotDraft(fallbackEstado);
  return draft.estado || fallbackEstado || null;
};

export const saveVisitorBallotState = async (estado) => {
  const activeEstado = normalizeStateCode(estado);
  if (!activeEstado) throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de continuar.');

  const previousDraft = readVisitorBallotDraft();
  const nextDraft = previousDraft.estado === activeEstado
    ? normalizeDraft({ ...previousDraft, estado: activeEstado, updated_at: new Date().toISOString() }, activeEstado)
    : createEmptyBallotDraft(activeEstado);

  return persistBallotDraft(VISITOR_DRAFT_STORAGE_ID, {
    ...nextDraft,
    updated_at: new Date().toISOString()
  });
};

const getStepExpectedOffice = (stepKey) => (
  stepKey === 'deputado_federal' ? 'Deputado Federal' : 'Senador'
);

export const assertCandidateMatchesStep = (candidate, stepKey, estado) => {
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

  return persistBallotDraft(VISITOR_DRAFT_STORAGE_ID, BallotDraftModel.assertSelectable(nextDraft));
};

export const getBallotEstado = (userId, fallbackEstado = null) => {
  const draft = readBallotDraft(userId, fallbackEstado);
  return draft.estado || fallbackEstado || null;
};

export const clearBallotDraft = (userId) => {
  localDraftRepository.clear(userId);
};

export const clearVisitorBallotDraft = () => clearBallotDraft(VISITOR_DRAFT_STORAGE_ID);

export const hasBallotSelections = (userId) => {
  const draft = readBallotDraft(userId);
  return Object.values(draft.selections).some((items) => items.length > 0);
};
