import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import Login from './pages/login';
import Home from './pages/home';
import EscolherCandidatos from './pages/EscolherCandidatos';
import Resultado from './pages/Resultado';

function App() {
  const { user, loading } = useUser();

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        
        {/* Adicionado key="deputado" para forçar o React a recriar o componente */}
        <Route path="/escolher-deputado-federal" element={
          user ? <EscolherCandidatos key="deputado" cargo="Deputado Federal" limite={1} titulo="SELECIONE 1 DEPUTADO FEDERAL" proximaRota="/escolher-senadores" chaveBanco="deputado_federal" /> : <Navigate to="/" />
        } />
        
        {/* Adicionado key="senadores" para forçar o React a recriar o componente */}
        <Route path="/escolher-senadores" element={
          user ? <EscolherCandidatos key="senadores" cargo="Senador" limite={2} titulo="SELECIONE 2 SENADORES" proximaRota="/finalizacao" chaveBanco="senadores" /> : <Navigate to="/" />
        } />
        
        <Route path="/finalizacao" element={user ? <Resultado /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;