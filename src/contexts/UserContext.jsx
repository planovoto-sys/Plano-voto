import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const UserContext = createContext();

// Hook personalizado para facilitar o acesso aos dados
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Se não tiver usuário logado, para o carregamento
    if (!authLoading && !user) {
      setUserData(null);
      setDataLoading(false);
      return;
    }

    if (user) {
      // Escuta em tempo real mudanças no perfil do usuário (onSnapshot)
      const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
        setDataLoading(false);
      }, (error) => {
        console.error("Erro no contexto de usuário:", error);
        setDataLoading(false);
      });

      return () => unsub(); // Limpa o listener ao desmontar
    }
  }, [user, authLoading]);

  return (
    <UserContext.Provider value={{ user, userData, loading: authLoading || dataLoading }}>
      {children}
    </UserContext.Provider>
  );
};