import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // NOVO: Estado global para o filtro de abas
  const [filtroAtivo, setFiltroAtivo] = useState('geral');

  useEffect(() => {
    if (!authLoading && !user) {
      setUserData(null);
      setDataLoading(false);
      return;
    }

    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
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
      filtroAtivo,      // Exportando o estado
      setFiltroAtivo    // Exportando o setter
    }}>
      {children}
    </UserContext.Provider>
  );
};