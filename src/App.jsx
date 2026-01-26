import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

import Login from './pages/Login';
import SelectState from './pages/SelectState';
import DefineStrategy from './pages/DefineStrategy';
import MyPlan from './pages/MyPlan';
import Profile from './pages/Profile'; 

// --- NOVO COMPONENTE: Redirecionador Inteligente ---
// Verifica o progresso do utilizador no Firestore e decide para onde ir
function AuthRedirect() {
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState('/estado'); // Destino padrão

  useEffect(() => {
    const checkUserStatus = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const hasProfile = data.username && data.state;
            const hasPlan = data.strategy && data.strategy.length > 0;

            if (hasProfile && hasPlan) {
              setDestination('/meu-plano');
            } else if (hasProfile) {
              setDestination('/estrategia');
            }
            // Se não tiver nada, mantém '/estado'
          }
        } catch (error) {
          console.error("Erro ao verificar status:", error);
        }
      }
      setLoading(false);
    };
    checkUserStatus();
  }, []);

  if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop: 50}}>Carregando...</div>;
  
  return <Navigate to={destination} replace />;
}

// --- APP PRINCIPAL ---
function App() {
  // O hook useAuthState gerencia o estado global de autenticação
  const [user, loading] = useAuthState(auth);

  if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop: 50}}>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz Inteligente:
            - Se NÃO logado: Mostra Login
            - Se Logado: Chama AuthRedirect para decidir a página correta */}
        <Route path="/" element={!user ? <Login /> : <AuthRedirect />} />
        
        {/* Rotas Protegidas (só acessíveis se user existir) */}
        <Route path="/estado" element={user ? <SelectState /> : <Navigate to="/" />} />
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/" />} />
        <Route path="/meu-plano" element={user ? <MyPlan /> : <Navigate to="/" />} />
        <Route path="/verificar-instagram" element={user ? <VerifyInstagram /> : <Navigate to="/" />} />
        
      
        
        {/* Rota do Perfil */}
        <Route path="/perfil" element={user ? <Profile /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;