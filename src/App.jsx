import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/useUser';
import Login from './pages/Login';
import Home from './pages/Home';
import EscolherCandidatos from './pages/EscolherCandidatos';
import Resultado from './pages/Resultado';
import { BALLOT_ROUTES } from './services/votingService';

const candidateRoutes = {
  deputadoFederal: {
    cargo: 'Deputado Federal',
    chaveBanco: 'deputado_federal',
    chaveGrupo: 'deputado_federal',
    etapa: 2,
    titulo: 'Deputado Federal',
    subtitulo: 'Escolha 1 candidato.',
    rotaAnterior: BALLOT_ROUTES.estado,
    proximaRota: BALLOT_ROUTES.senador1
  },
  senador1: {
    cargo: 'Senador',
    chaveBanco: 'senadores',
    chaveGrupo: 'senadores_1',
    etapa: 3,
    titulo: 'Senador 1',
    subtitulo: 'Escolha 1 candidato.',
    rotaAnterior: BALLOT_ROUTES.deputadoFederal,
    proximaRota: BALLOT_ROUTES.senador2
  },
  senador2: {
    cargo: 'Senador',
    chaveBanco: 'senadores',
    chaveGrupo: 'senadores_2',
    etapa: 4,
    titulo: 'Senador 2',
    subtitulo: 'Escolha 1 candidato.',
    rotaAnterior: BALLOT_ROUTES.senador1,
    proximaRota: BALLOT_ROUTES.resultado
  }
};

const renderCandidateRoute = (config) => (
  <EscolherCandidatos
    key={config.chaveGrupo}
    cargo={config.cargo}
    titulo={config.titulo}
    subtitulo={config.subtitulo}
    proximaRota={config.proximaRota}
    rotaAnterior={config.rotaAnterior}
    chaveBanco={config.chaveBanco}
    chaveGrupo={config.chaveGrupo}
    etapa={config.etapa}
  />
);

function App() {
  const { user, loading } = useUser();
  const privateRoute = (element) => (user ? element : <Navigate to="/" replace />);
  const privateRedirect = (to) => (
    user ? <Navigate to={to} replace state={{ bypassVoteRedirect: true }} /> : <Navigate to="/" replace />
  );

  return (
    <BrowserRouter>
      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <Routes>
          <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
          <Route path="/home" element={privateRoute(<Home />)} />
          
          <Route path="/escolher-deputado-federal" element={privateRoute(renderCandidateRoute(candidateRoutes.deputadoFederal))} />

          <Route path="/escolher-deputado-federal/reeleger" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />
          <Route path="/escolher-deputado-federal/renovar" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />
          
          <Route path="/escolher-senador-1" element={privateRoute(renderCandidateRoute(candidateRoutes.senador1))} />
          <Route path="/escolher-senador-2" element={privateRoute(renderCandidateRoute(candidateRoutes.senador2))} />

          <Route path="/escolher-senadores" element={privateRedirect(BALLOT_ROUTES.senador1)} />
          <Route path="/escolher-senadores/reeleger" element={privateRedirect(BALLOT_ROUTES.senador1)} />
          <Route path="/escolher-senadores/renovar" element={privateRedirect(BALLOT_ROUTES.senador2)} />
          
          <Route path="/finalizacao" element={privateRoute(<Resultado />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
