import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

import Login from './pages/Login';
import Intro from './pages/Intro';
import DefineStrategy from './pages/DefineStrategy';
import NotFound from './pages/NotFound';

const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Carregando...
  </div>
);

function App() {
  // 'loading' do Contexto engloba o carregamento do Firebase Auth e do Firestore
  const { user, loading } = useUser();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Se não está logado, mostra Intro. Se está logado, vai direto para Estratégia */}
        <Route path="/" element={!user ? <Intro /> : <Navigate to="/estrategia" replace />} />
        
        {/* Proteção da rota de Login */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/estrategia" replace />} />
        
        {/* Rota Privada de Estratégia */}
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/login" replace />} />

        {/* Fallback para rotas inexistentes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;