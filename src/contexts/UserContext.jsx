import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const UserContext = createContext();
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState('geral');

  useEffect(() => {
    if (!authLoading && !user) {
      setUserData(null);
      setDataLoading(false);
      return;
    }

    if (user) {
      const userRef = doc(db, "users", user.uid);

      // Função que verifica e cria o usuário no Firestore se ele não existir
      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              name: user.displayName,
              email: user.email,
              profile_image: user.photoURL,
              estado: null,
              candidatos_escolhidos: null,
              created_at: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Erro ao criar usuário:", error);
        }
      };

      checkAndCreateUser();

      // Mantém o listener dos dados em tempo real
      const unsub = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
        setDataLoading(false);
      }, (error) => {
        console.error("Erro no contexto de usuário:", error);
        setDataLoading(false);
      });

      return () => unsub();
    }
  }, [user, authLoading]);

  return (
    <UserContext.Provider value={{ 
      user, 
      userData, 
      loading: authLoading || dataLoading,
      filtroAtivo,
      setFiltroAtivo 
    }}>
      {children}
    </UserContext.Provider>
  );
};