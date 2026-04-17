import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import Login from './pages/login'; // Ajuste maiúscula se necessário
import Home from './pages/home';
import Intro from './pages/Intro'; // Ajuste maiúscula
import EscolherCandidatos from './pages/EscolherCandidatos';
import Resultado from './pages/Resultado';

// Componente isolado para o Redirecionamento Inteligente
const RotaInicial = () => {
  const { user, userData } = useUser();

  if (!user) return <Login />;
  
  // Aguarda o banco de dados ser criado/lido no contexto antes de decidir a rota
  if (!userData) return <div className="loading">Preparando dados...</div>; 

  const progresso = userData.candidatos_escolhidos;
  
  if (progresso?.senadores && progresso.senadores.length === 2) {
    return <Navigate to="/finalizacao" replace />;
  } else if (progresso?.deputado_federal) {
    return <Navigate to="/escolher-senadores" replace />;
  } else if (userData.estado) {
    return <Navigate to="/escolher-deputado-federal" replace />;
  } else {
    // Se não escolheu nada ainda, joga para a introdução
    return <Navigate to="/intro" replace />; 
  }
};

function App() {
  const { loading } = useUser();

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* A rota raiz agora controla todo o fluxo de entrada */}
        <Route path="/" element={<RotaInicial />} />
        
        <Route path="/intro" element={useUser().user ? <Intro /> : <Navigate to="/" replace />} />
        <Route path="/home" element={useUser().user ? <Home /> : <Navigate to="/" replace />} />
        
        <Route path="/escolher-deputado-federal" element={
          useUser().user ? <EscolherCandidatos key="deputado" cargo="Deputado Federal" limite={1} titulo="SELECIONE 1 DEPUTADO FEDERAL" proximaRota="/escolher-senadores" chaveBanco="deputado_federal" /> : <Navigate to="/" />
        } />
        
        <Route path="/escolher-senadores" element={
          useUser().user ? <EscolherCandidatos key="senadores" cargo="Senador" limite={2} titulo="SELECIONE 2 SENADORES" proximaRota="/finalizacao" chaveBanco="senadores" /> : <Navigate to="/" />
        } />
        
        <Route path="/finalizacao" element={useUser().user ? <Resultado /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;