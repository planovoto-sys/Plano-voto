import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext'; 
import Login from './pages/login';
import Home from './pages/home';
import EscolherCandidatos from './pages/EscolherCandidatos'; 

function App() {
  const { user, loading } = useUser();

  if (loading) return <div>Carregando...</div>;

  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        
        {/* ROTA DE DEPUTADO FEDERAL */}
        <Route path="/escolher-deputado-federal" element={
          user ? (
            <EscolherCandidatos 
              key="tela-deputado" /* <--- ADICIONAMOS A KEY AQUI */
              cargo="Deputado Federal"
              limite={1}
              titulo={<>SELECIONE<br/>1 DEPUTADO FEDERAL</>}
              proximaRota="/escolher-senadores" 
              chaveBanco="deputado_federal"
            />
          ) : <Navigate to="/" replace />
        } />

        {/* ROTA DE SENADORES */}
        <Route path="/escolher-senadores" element={
          user ? (
            <EscolherCandidatos 
              key="tela-senador" 
              cargo="Senador"
              limite={2} 
              titulo={<>SELECIONE<br/>2 SENADORES</>}
              proximaRota="/finalizacao" 
              chaveBanco="senadores"
            />
          ) : <Navigate to="/" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;