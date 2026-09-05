import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { getSupabaseClient } from '@/shared/supabase/client';
import { normalizeDraft, persistBallotDraft } from '@/features/ballot';

const rpc = async (name, params) => {
  const { data, error } = await getSupabaseClient().rpc(name, params);
  if (error) throw error;
  return data;
};
export const getMySharedSelection = () => rpc('my_shared_selection', { p_election: ACTIVE_ELECTION_ID });
export const publishSharedSelection = () => rpc('publish_shared_selection', { p_election: ACTIVE_ELECTION_ID });
export const disableSharedSelection = () => rpc('disable_shared_selection', { p_election: ACTIVE_ELECTION_ID });
export const readSharedSelection = (id) => rpc('read_shared_selection', { p_id: id });

export const readImportContext = async (userId) => {
  const { data, error } = await getSupabaseClient().from('ballot_drafts')
    .select('state, updated_at, selections').eq('election_id', ACTIVE_ELECTION_ID).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
};

export const importSharedSelection = async ({ userId, shared, state, candidateIds, expectedUpdatedAt }) => {
  const row = await rpc('import_shared_selection', {
    p_id: shared.id, p_revision: shared.revision, p_state: state,
    p_candidate_ids: candidateIds, p_expected_updated_at: expectedUpdatedAt,
  });
  const draft = normalizeDraft({ ...row.selections, estado: row.state }, row.state);
  return persistBallotDraft(userId, draft);
};

export const sharedSelectionError = (error) => {
  const message = String(error?.message || '');
  if (/LOCAL_DRAFT_MISSING/.test(message)) return 'O rascunho não está mais disponível neste navegador. Volte ao link compartilhado para revisar a seleção novamente.';
  if (/SHARE_CHANGED/.test(message)) return 'O autor atualizou esta seleção. Recarregue e revise a nova versão antes de confirmar.';
  if (/DRAFT_CHANGED/.test(message)) return 'Suas escolhas mudaram em outra aba ou dispositivo. Recarregue para revisar antes de substituir.';
  if (/CANDIDATES_CHANGED|INVALID_CANDIDATE/.test(message)) return 'Alguns candidatos não estão mais disponíveis para este estado. Recarregue a seleção.';
  if (/SHARE_UNAVAILABLE|ELECTION_UNAVAILABLE/.test(message)) return 'Esta seleção foi desativada ou não está mais disponível.';
  if (/EMPTY_SELECTION/.test(message)) return 'Salve pelo menos um candidato antes de publicar ou importar uma seleção.';
  return 'Não foi possível confirmar a operação. Recarregue para consultar o estado atual antes de tentar novamente.';
};
