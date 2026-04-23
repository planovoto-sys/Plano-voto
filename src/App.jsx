import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/useUser';
import Login from './pages/Login';
import Home from './pages/Home';
import EscolherCandidatos from './pages/EscolherCandidatos';
import Resultado from './pages/Resultado';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

function App() {
  const { loading } = useUser();

  return (
    <BrowserRouter>
      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route
              path="/escolher-deputado-federal"
              element={<EscolherCandidatos key="deputado" cargo="Deputado Federal" limite={1} titulo="SELECIONE 1 DEPUTADO FEDERAL" proximaRota="/escolher-senadores" chaveBanco="deputado_federal" />}
            />
            <Route
              path="/escolher-senadores"
              element={<EscolherCandidatos key="senadores" cargo="Senador" limite={2} titulo="SELECIONE 2 SENADORES" proximaRota="/finalizacao" chaveBanco="senadores" />}
            />
            <Route path="/finalizacao" element={<Resultado />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
