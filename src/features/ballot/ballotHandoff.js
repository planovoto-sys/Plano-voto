import { httpsCallable } from 'firebase/functions';
import {
  ACTIVE_ELECTION_ID,
  BALLOT_SCHEMA_VERSION,
  CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME,
  REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME
} from '@/shared/constants/ballot';
import { functions } from '@/shared/firebase/firebase';
import { normalizeDraft } from './ballotDraftNormalize';
import { VotingError } from './ballotErrors';

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
