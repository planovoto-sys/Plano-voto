import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/services/firebase/firebase';
import { deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ACTIVE_ELECTION_ID } from '@/constants/ballot';
import { UserContext } from '@/contexts/UserContext';
import { flowError, flowLog, flowWarn } from '@/utils/debugFlow';

const FILTER_STORAGE_KEY = 'plano-voto:filtro-ativo';

const readPersistedFilter = () => {
  if (typeof window === 'undefined') {
    return 'todos';
  }

  try {
    const value = window.localStorage.getItem(FILTER_STORAGE_KEY);
    return ['todos', 'reeleger', 'renovar', 'selecionados'].includes(value) ? value : 'todos';
  } catch {
    return 'todos';
  }
};

export const UserProvider = ({ children }) => {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [userEligibility, setUserEligibility] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState(readPersistedFilter);

  useEffect(() => {
    let cancelled = false;

    if (!authLoading && !user) {
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

    if (user) {
      flowLog('auth.signed-in', { userId: user.uid });
      const userRef = doc(db, "users", user.uid);
      const eligibilityRef = doc(db, "elections", ACTIVE_ELECTION_ID, "eligibility", user.uid);

      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            flowLog('user.create.start', { userId: user.uid });
            await setDoc(userRef, {
              name: user.displayName,
              email: user.email,
              profile_image: user.photoURL,
              estado: null,
              role: 'voter',
              schema_version: 1,
              created_at: serverTimestamp()
            });
            flowLog('user.create.success', { userId: user.uid });
          } else {
            flowLog('user.migrate.start', {
              userId: user.uid,
              hasLegacyChoices: docSnap.data().candidatos_escolhidos !== undefined
            });
            const userPatch = {
              name: user.displayName,
              email: user.email,
              profile_image: user.photoURL,
              role: docSnap.data().role || 'voter',
              schema_version: 1,
              last_login_at: serverTimestamp(),
              updated_at: serverTimestamp()
            };

            if (docSnap.data().candidatos_escolhidos !== undefined) {
              userPatch.candidatos_escolhidos = deleteField();
            }

            await updateDoc(userRef, userPatch);
            flowLog('user.migrate.success', { userId: user.uid });
          }
        } catch (error) {
          flowError('user.ensure.error', error, { userId: user.uid });
          if (import.meta.env.DEV) {
            console.error("Erro ao criar usuário:", error);
          }
        }
      };

      checkAndCreateUser();

      const unsubUser = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          flowLog('user.snapshot', {
            userId: user.uid,
            estado: doc.data().estado || null,
            hasLegacyChoices: doc.data().candidatos_escolhidos !== undefined
          });
          setUserData(doc.data());
        } else {
          flowWarn('user.snapshot.missing', { userId: user.uid });
        }
        setDataLoading(false);
      }, (error) => {
        flowError('user.snapshot.error', error, { userId: user.uid });
        if (import.meta.env.DEV) {
          console.error("Erro no contexto de usuário:", error);
        }
        setDataLoading(false);
      });

      const unsubEligibility = onSnapshot(eligibilityRef, (doc) => {
        flowLog('eligibility.snapshot', {
          userId: user.uid,
          exists: doc.exists(),
          hasVoted: doc.exists() ? doc.data().has_voted === true : false,
          status: doc.exists() ? doc.data().status || null : 'missing'
        });
        setUserEligibility(doc.exists()
          ? doc.data()
          : { status: 'pending', has_voted: false, missing: true }
        );
      }, (error) => {
        flowError('eligibility.snapshot.error', error, { userId: user.uid });
        if (import.meta.env.DEV) {
          console.error("Erro ao acompanhar elegibilidade:", error);
        }
        setUserEligibility({ status: 'unknown', has_voted: false, error: true });
      });

      return () => {
        unsubUser();
        unsubEligibility();
      };
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user?.uid || typeof window === 'undefined') {
      return;
    }

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
      setFiltroAtivo 
    }}>
      {children}
    </UserContext.Provider>
  );
};
