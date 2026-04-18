import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import Login from './pages/Login';
import Home from './pages/Home';
import EscolherCandidatos from './pages/EscolherCandidatos';
import Resultado from './pages/Resultado';

function App() {
  const { user, loading } = useUser();

  // A lógica de carregamento agora está dentro do retorno (renderização condicional)
  // Isso evita a quebra das regras dos Hooks do React.
  return (
    <BrowserRouter>
      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <Routes>
          <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
          <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
          
          <Route path="/escolher-deputado-federal" element={
            user ? <EscolherCandidatos key="deputado" cargo="Deputado Federal" limite={1} titulo="SELECIONE 1 DEPUTADO FEDERAL" proximaRota="/escolher-senadores" chaveBanco="deputado_federal" /> : <Navigate to="/" />
          } />
          
          <Route path="/escolher-senadores" element={
            user ? <EscolherCandidatos key="senadores" cargo="Senador" limite={2} titulo="SELECIONE 2 SENADORES" proximaRota="/finalizacao" chaveBanco="senadores" /> : <Navigate to="/" />
          } />
          
          <Route path="/finalizacao" element={user ? <Resultado /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;