import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { getSupabaseClient } from '@/shared/supabase/client';

// Somente leitura: a reserva é feita atomicamente ao salvar ballot_drafts.
export const fetchBallotRecommendations = async (userId) => {
  const { data, error } = await getSupabaseClient()
    .from('ballot_recommendations')
    .select('office, scope, slot, candidate_id, policy_version')
    .eq('election_id', ACTIVE_ELECTION_ID)
    .eq('user_id', userId)
    .order('slot');
  if (error) throw error;
  return data || [];
};
