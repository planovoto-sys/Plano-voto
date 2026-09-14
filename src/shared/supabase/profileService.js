import { getSupabaseClient } from '@/shared/supabase/client';
import { normalizeStateCode } from '@/shared/utils/state';

export const updateSupabaseProfileState = async (userId, state) => {
  const normalizedState = normalizeStateCode(state);
  if (!userId || !normalizedState) {
    throw new Error('Usuário e estado válidos são obrigatórios para atualizar o perfil.');
  }

  const { error } = await getSupabaseClient()
    .from('profiles')
    .update({ state: normalizedState })
    .eq('id', userId);

  if (error) throw error;
};
