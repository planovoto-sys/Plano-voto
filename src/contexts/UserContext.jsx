import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebaseConfig';
import { deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { UserContext } from './UserContextCore';
import { ACTIVE_ELECTION_ID } from '../services/votingService';

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
      const userRef = doc(db, "users", user.uid);
      const eligibilityRef = doc(db, "elections", ACTIVE_ELECTION_ID, "eligibility", user.uid);

      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              name: user.displayName,
              email: user.email,
              profile_image: user.photoURL,
              estado: null,
              role: 'voter',
              schema_version: 1,
              created_at: serverTimestamp()
            });
          } else {
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
          }
        } catch (error) {
          console.error("Erro ao criar usuário:", error);
        }
      };

      checkAndCreateUser();

      const unsubUser = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
        setDataLoading(false);
      }, (error) => {
        console.error("Erro no contexto de usuário:", error);
        setDataLoading(false);
      });

      const unsubEligibility = onSnapshot(eligibilityRef, (doc) => {
        setUserEligibility(doc.exists()
          ? doc.data()
          : { status: 'pending', has_voted: false, missing: true }
        );
      }, (error) => {
        console.error("Erro ao acompanhar elegibilidade:", error);
        setUserEligibility({ status: 'unknown', has_voted: false, error: true });
      });

      return () => {
        unsubUser();
        unsubEligibility();
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
