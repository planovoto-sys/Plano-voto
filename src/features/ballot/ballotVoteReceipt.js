import { httpsCallable } from 'firebase/functions';
import {
  ACTIVE_ELECTION_ID,
  BALLOT_SCHEMA_VERSION,
  CAST_VOTE_FUNCTION_NAME
} from '@/shared/constants/ballot';
import { functions, functionsRegion } from '@/shared/firebase/firebase';
import { flowLog } from '@/shared/utils/debugFlow';
import {
  canUseStorage,
  receiptKey
} from './ballotInternals';
import {
  getCandidateIdsFromDraft,
  normalizeDraft,
  validateCompleteBallot
} from './ballotDraftNormalize';
import { VotingError } from './ballotErrors';

export const clearVoteReceipt = (userId) => {
  if (!userId || !canUseStorage()) return;
  try {
    window.localStorage.removeItem(receiptKey(userId));
  } catch {
    // O recibo local pode ser recriado apos nova confirmacao bem-sucedida.
  }
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

export const castAnonymousVote = async ({ user, estado, draft }) => {
  if (!user?.uid) {
    throw new VotingError('AUTH_REQUIRED', 'Faça login para confirmar seu voto.');
  }

  const validation = validateCompleteBallot(draft);
  if (!validation.ok) {
    throw new VotingError(validation.code, 'Selecione pelo menos 1 deputado federal e 2 senadores antes de confirmar o voto.');
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
