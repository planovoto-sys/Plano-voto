import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import { UserContext } from '@/app/providers/UserContext';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { callBackend } from '@/shared/api/backend';
import { subscribeToAuth, usesSupabaseAuth } from '@/shared/auth/authService';
import { ACTIVE_ELECTION_ID, SYNC_USER_PROFILE_FUNCTION_NAME } from '@/shared/constants/ballot';
import { db } from '@/shared/firebase/firebase';
import { getSupabaseClient } from '@/shared/supabase/client';
import { flowError, flowLog, flowWarn } from '@/shared/utils/debugFlow';

const FILTER_STORAGE_KEY = 'plano-voto:filtro-ativo';

const readPersistedFilter = () => {
  if (typeof window === 'undefined') return 'todos';

  try {
    const value = window.localStorage.getItem(FILTER_STORAGE_KEY);
    return ['todos', 'selecao', 'avaliacao', 'partido'].includes(value) ? value : 'todos';
  } catch {
    return 'todos';
  }
};

const normalizeSupabaseProfile = (profile, user) => ({
  ...(profile || {}),
  estado: profile?.state || null,
  foto: profile?.avatar_url || user?.photoURL || '',
  name: profile?.display_name || user?.displayName || '',
  nome: profile?.display_name || user?.displayName || '',
  profile_image: profile?.avatar_url || user?.photoURL || '',
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userEligibility, setUserEligibility] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState(readPersistedFilter);

  useEffect(() => subscribeToAuth((nextUser, error) => {
    if (error) flowError('auth.subscription.error', error);
    setUser(nextUser);
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    let cancelled = false;
    let cleanupDataSubscriptions = () => {};

    if (authLoading) return cleanupDataSubscriptions;

    if (!user) {
      queueMicrotask(() => {
        if (cancelled) return;
        flowLog('auth.signed-out');
        setUserData(null);
        setUserEligibility(null);
        setDataLoading(false);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(FILTER_STORAGE_KEY);
          } catch {
            // Ignora falhas de persistência local.
          }
        }
        setFiltroAtivo('todos');
      });

      return () => {
        cancelled = true;
      };
    }

    flowLog('auth.signed-in', { userId: user.uid, provider: usesSupabaseAuth ? 'supabase' : 'firebase' });
    queueMicrotask(() => {
      if (!cancelled) setDataLoading(true);
    });

    if (usesSupabaseAuth) {
      const supabase = getSupabaseClient();

      const loadSupabaseUserData = async () => {
        const [profileResult, eligibilityResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.uid).maybeSingle(),
          supabase
            .from('eligibility')
            .select('*')
            .eq('election_id', ACTIVE_ELECTION_ID)
            .eq('user_id', user.uid)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        if (profileResult.error) throw profileResult.error;
        if (eligibilityResult.error) throw eligibilityResult.error;

        setUserData(normalizeSupabaseProfile(profileResult.data, user));
        setUserEligibility(eligibilityResult.data || {
          status: 'pending',
          has_voted: false,
          missing: true,
        });
      };

      const profileChannel = supabase
        .channel(`profile:${user.uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.uid}` },
          ({ new: profile }) => setUserData(normalizeSupabaseProfile(profile, user))
        )
        .subscribe();

      const eligibilityChannel = supabase
        .channel(`eligibility:${ACTIVE_ELECTION_ID}:${user.uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'eligibility', filter: `user_id=eq.${user.uid}` },
          ({ new: eligibility }) => setUserEligibility(eligibility)
        )
        .subscribe();

      loadSupabaseUserData()
        .catch((error) => {
          if (cancelled) return;
          flowError('user.supabase.load.error', error, { userId: user.uid });
          setUserData(normalizeSupabaseProfile(null, user));
          setUserEligibility({ status: 'unknown', has_voted: false, error: true });
        })
        .finally(() => {
          if (!cancelled) setDataLoading(false);
        });

      void mergeVisitorBallotDraftIntoAccount(user.uid).catch((error) => {
        flowError('visitor-draft.merge.error', error, { userId: user.uid });
      });

      cleanupDataSubscriptions = () => {
        cancelled = true;
        void supabase.removeChannel(profileChannel);
        void supabase.removeChannel(eligibilityChannel);
      };

      return cleanupDataSubscriptions;
    }

    const userRef = doc(db, 'users', user.uid);
    const eligibilityRef = doc(db, 'elections', ACTIVE_ELECTION_ID, 'eligibility', user.uid);

    const syncUserProfile = async () => {
      try {
        flowLog('user.sync.start', { userId: user.uid });
        await callBackend(SYNC_USER_PROFILE_FUNCTION_NAME, {});
        flowLog('user.sync.success', { userId: user.uid });
      } catch (error) {
        flowError('user.ensure.error', error, { userId: user.uid });
        if (import.meta.env.DEV) console.error('Erro ao criar usuário:', error);
      }
    };

    void syncUserProfile();

    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        flowLog('user.snapshot', {
          userId: user.uid,
          estado: snapshot.data().estado || null,
          hasLegacyChoices: snapshot.data().candidatos_escolhidos !== undefined,
        });
        setUserData(snapshot.data());
      } else {
        flowWarn('user.snapshot.missing', { userId: user.uid });
      }
      setDataLoading(false);
    }, (error) => {
      flowError('user.snapshot.error', error, { userId: user.uid });
      if (import.meta.env.DEV) console.error('Erro no contexto de usuário:', error);
      setDataLoading(false);
    });

    const unsubEligibility = onSnapshot(eligibilityRef, (snapshot) => {
      setUserEligibility(snapshot.exists()
        ? snapshot.data()
        : { status: 'pending', has_voted: false, missing: true });
    }, (error) => {
      flowError('eligibility.snapshot.error', error, { userId: user.uid });
      setUserEligibility({ status: 'unknown', has_voted: false, error: true });
    });

    cleanupDataSubscriptions = () => {
      cancelled = true;
      unsubUser();
      unsubEligibility();
    };

    return cleanupDataSubscriptions;
  }, [user, authLoading]);

  useEffect(() => {
    if (!user?.uid || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, filtroAtivo);
    } catch {
      // Ignora falhas de persistência local.
    }
  }, [filtroAtivo, user?.uid]);

  return (
    <UserContext.Provider value={{
      user,
      userData,
      userEligibility,
      loading: authLoading || dataLoading,
      filtroAtivo,
      setFiltroAtivo,
    }}>
      {children}
    </UserContext.Provider>
  );
};
