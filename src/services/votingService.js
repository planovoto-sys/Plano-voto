import {
  collection,
  documentId,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseConfig';
import { flowLog } from './debugFlow';

export const ACTIVE_ELECTION_ID = import.meta.env.VITE_ACTIVE_ELECTION_ID || 'congresso-2026';
const CAST_VOTE_FUNCTION_NAME = import.meta.env.VITE_CAST_VOTE_FUNCTION || 'castAnonymousVote';

const BALLOT_SCHEMA_VERSION = 1;
const OFFICE_LIMITS = {
  deputado_federal: 1,
  senadores: 2
};

const STORAGE_PREFIX = `meuvoto:${ACTIVE_ELECTION_ID}`;

export class VotingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VotingError';
    this.code = code;
  }
}

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const draftKey = (userId) => `${STORAGE_PREFIX}:ballotDraft:${userId}`;
const receiptKey = (userId) => `${STORAGE_PREFIX}:lastReceipt:${userId}`;

const emptySelections = () => ({
  deputado_federal: [],
  senadores: []
});

export const createEmptyBallotDraft = (estado = null) => ({
  schema_version: BALLOT_SCHEMA_VERSION,
  election_id: ACTIVE_ELECTION_ID,
  estado,
  selections: emptySelections(),
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
    nota_final: Number(candidate.nota_final ?? candidate.notaFinal ?? 0) || 0
  };
};

const normalizeDraft = (rawDraft, estado = null) => {
  const baseDraft = createEmptyBallotDraft(estado);
  if (!rawDraft || typeof rawDraft !== 'object') return baseDraft;

  const selections = emptySelections();
  Object.keys(OFFICE_LIMITS).forEach((officeKey) => {
    selections[officeKey] = asArray(rawDraft.selections?.[officeKey])
      .map(normalizeStoredCandidate)
      .filter(Boolean)
      .slice(0, OFFICE_LIMITS[officeKey]);
  });

  return {
    ...baseDraft,
    ...rawDraft,
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: rawDraft.estado ?? estado ?? null,
    selections
  };
};

export const readBallotDraft = (userId, estado = null) => {
  if (!userId || !canUseStorage()) return createEmptyBallotDraft(estado);

  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    return normalizeDraft(raw ? JSON.parse(raw) : null, estado);
  } catch (error) {
    console.warn('Rascunho de voto local inválido. Criando um novo rascunho.', error);
    return createEmptyBallotDraft(estado);
  }
};

const persistBallotDraft = (userId, draft) => {
  if (!userId || !canUseStorage()) return draft;
  window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  flowLog('draft.persisted', {
    userId,
    estado: draft.estado,
    deputadoFederal: draft.selections.deputado_federal.length,
    senadores: draft.selections.senadores.length
  });
  return draft;
};

export const getBallotEstado = (userId, fallbackEstado = null) => {
  const draft = readBallotDraft(userId, fallbackEstado);
  return draft.estado || fallbackEstado || null;
};

export const saveBallotState = (userId, estado) => {
  const currentDraft = readBallotDraft(userId, estado);
  return persistBallotDraft(userId, {
    ...currentDraft,
    estado,
    updated_at: new Date().toISOString()
  });
};

export const resetBallotForState = (userId, estado) => (
  persistBallotDraft(userId, createEmptyBallotDraft(estado))
);

export const saveBallotOfficeSelection = (userId, officeKey, candidates, estado = null) => {
  if (!OFFICE_LIMITS[officeKey]) {
    throw new VotingError('INVALID_OFFICE', 'Cargo inválido para esta eleição.');
  }

  const currentDraft = readBallotDraft(userId, estado);
  const normalizedCandidates = asArray(candidates)
    .map(normalizeStoredCandidate)
    .filter(Boolean)
    .slice(0, OFFICE_LIMITS[officeKey]);

  const nextDraft = {
    ...currentDraft,
    estado: estado ?? currentDraft.estado ?? null,
    selections: {
      ...currentDraft.selections,
      [officeKey]: normalizedCandidates
    },
    updated_at: new Date().toISOString()
  };

  return persistBallotDraft(userId, nextDraft);
};

export const clearBallotDraft = (userId) => {
  if (!userId || !canUseStorage()) return;
  window.localStorage.removeItem(draftKey(userId));
};

export const clearVoteReceipt = (userId) => {
  if (!userId || !canUseStorage()) return;
  window.localStorage.removeItem(receiptKey(userId));
};

export const hasBallotSelections = (userId) => {
  const draft = readBallotDraft(userId);
  return Object.values(draft.selections).some((items) => items.length > 0);
};

export const getBallotSelectionCounts = (draft) => {
  const normalizedDraft = normalizeDraft(draft);

  return {
    deputadoFederal: normalizedDraft.selections.deputado_federal.length,
    senadores: normalizedDraft.selections.senadores.length,
    total: normalizedDraft.selections.deputado_federal.length + normalizedDraft.selections.senadores.length
  };
};

export const draftHasBallotSelections = (draft) => getBallotSelectionCounts(draft).total > 0;

export const getBallotProgress = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  const hasEstado = Boolean(normalizedDraft.estado);
  const hasDeputadoFederal = normalizedDraft.selections.deputado_federal.length === OFFICE_LIMITS.deputado_federal;
  const hasSenadores = normalizedDraft.selections.senadores.length === OFFICE_LIMITS.senadores;

  return {
    hasEstado,
    hasDeputadoFederal,
    hasSenadores,
    isComplete: hasEstado && hasDeputadoFederal && hasSenadores,
    nextRoute: !hasEstado
      ? '/home'
      : !hasDeputadoFederal
        ? '/escolher-deputado-federal'
        : !hasSenadores
          ? '/escolher-senadores'
          : '/finalizacao'
  };
};

export const getCandidateIdsFromDraft = (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  return [
    ...normalizedDraft.selections.deputado_federal,
    ...normalizedDraft.selections.senadores
  ].map((candidate) => candidate.id);
};

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

  const candidateIds = getCandidateIdsFromDraft(normalizedDraft);
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

  window.localStorage.setItem(receiptKey(userId), JSON.stringify(storedReceipt));
  return storedReceipt;
};

export const readLastVoteReceipt = (userId) => {
  if (!userId || !canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(receiptKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Recibo local inválido. Ignorando recibo salvo.', error);
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
    'functions/not-found': 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
    not_found: 'Servidor de votação indisponível. Configure a Cloud Function de registro de voto.',
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
