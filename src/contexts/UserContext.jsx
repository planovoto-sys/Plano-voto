import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebaseConfig';
import { deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { UserContext } from './UserContextCore';
import { ACTIVE_ELECTION_ID } from '../services/votingService';
import { flowError, flowLog, flowWarn } from '../services/debugFlow';

export const UserProvider = ({ children }) => {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [userEligibility, setUserEligibility] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState('reeleger');

  useEffect(() => {
    let cancelled = false;

    if (!authLoading && !user) {
      queueMicrotask(() => {
        if (cancelled) return;
        flowLog('auth.signed-out');
        setUserData(null);
        setUserEligibility(null);
        setDataLoading(false);
        // BUG CORRIGIDO: Reseta o tema para o padrão ('reeleger') sempre que há um logoff
        setFiltroAtivo('reeleger');
      });

      return () => {
        cancelled = true;
      };
    }

    if (user) {
      flowLog('auth.signed-in', { userId: user.uid });
      const userRef = doc(db, "users", user.uid);
      const voteLockRef = doc(db, "elections", ACTIVE_ELECTION_ID, "votes_realized", user.uid);
      const legacyEligibilityRef = doc(db, "elections", ACTIVE_ELECTION_ID, "eligibility", user.uid);

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
          console.error("Erro ao criar usuário:", error);
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
        console.error("Erro no contexto de usuário:", error);
        setDataLoading(false);
      });

      let voteLockData = null;
      let legacyEligibilityData = null;

      const syncEligibility = () => {
        const hasVotedByVoteLock = Boolean(voteLockData);
        const hasVotedByLegacy = legacyEligibilityData?.has_voted === true;

        if (hasVotedByVoteLock) {
          setUserEligibility({
            ...voteLockData,
            status: 'locked',
            has_voted: true,
            source: 'votes_realized'
          });
          return;
        }

        if (hasVotedByLegacy) {
          setUserEligibility({
            ...legacyEligibilityData,
            status: legacyEligibilityData?.status || 'locked',
            has_voted: true,
            source: 'legacy_eligibility'
          });
          return;
        }

        setUserEligibility({
          status: 'pending',
          has_voted: false,
          missing: true,
          source: 'votes_realized'
        });
      };

      const unsubVoteLock = onSnapshot(voteLockRef, (voteLockDoc) => {
        voteLockData = voteLockDoc.exists() ? voteLockDoc.data() : null;
        flowLog('vote-lock.snapshot', {
          userId: user.uid,
          exists: voteLockDoc.exists(),
          hasVoted: voteLockDoc.exists()
        });
        syncEligibility();
      }, (error) => {
        flowError('vote-lock.snapshot.error', error, { userId: user.uid });
        console.error("Erro ao acompanhar bloqueio de voto:", error);
        setUserEligibility({ status: 'unknown', has_voted: false, error: true });
      });

      const unsubLegacyEligibility = onSnapshot(legacyEligibilityRef, (legacyDoc) => {
        legacyEligibilityData = legacyDoc.exists() ? legacyDoc.data() : null;
        flowLog('eligibility.legacy.snapshot', {
          userId: user.uid,
          exists: legacyDoc.exists(),
          hasVoted: legacyDoc.exists() ? legacyDoc.data().has_voted === true : false
        });
        syncEligibility();
      }, (error) => {
        flowError('eligibility.legacy.snapshot.error', error, { userId: user.uid });
        console.error("Erro ao acompanhar elegibilidade legada:", error);
        setUserEligibility({ status: 'unknown', has_voted: false, error: true });
      });

      return () => {
        unsubUser();
        unsubVoteLock();
        unsubLegacyEligibility();
      };
    }
  }, [user, authLoading]);

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
