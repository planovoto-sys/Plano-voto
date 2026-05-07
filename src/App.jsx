import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/useUser';
import { BALLOT_ROUTES } from './services/votingService';
import PrivacyConsent from './components/PrivacyConsent';

const loadLogin = () => import('./pages/Login');
const loadHome = () => import('./pages/Home');
const loadEscolherCandidatos = () => import('./pages/EscolherCandidatos');
const loadResultado = () => import('./pages/Resultado');
const loadLegalPage = () => import('./pages/LegalPage');

const Login = lazy(loadLogin);
const Home = lazy(loadHome);
const EscolherCandidatos = lazy(loadEscolherCandidatos);
const Resultado = lazy(loadResultado);
const LegalPage = lazy(loadLegalPage);

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
    subtitulo: 'Escolha o primeiro senador',
    rotaAnterior: BALLOT_ROUTES.deputadoFederal,
    proximaRota: BALLOT_ROUTES.senador2
  },
  senador2: {
    cargo: 'Senador',
    chaveBanco: 'senadores',
    chaveGrupo: 'senadores_2',
    etapa: 4,
    titulo: 'Senador 2',
    subtitulo: 'Escolha o segundo senador',
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

function LoadingScreen() {
  return (
    <div className="loading" role="status" aria-live="polite">
      CARREGANDO...
    </div>
  );
}

function App() {
  const { user, loading } = useUser();
  const privateRoute = (element) => (user ? element : <Navigate to="/" replace />);
  const privateRedirect = (to) => (
    user ? <Navigate to={to} replace state={{ bypassVoteRedirect: true }} /> : <Navigate to="/" replace />
  );

  useEffect(() => {
    if (loading) return undefined;

    const preloadRoutes = user
      ? [loadHome, loadEscolherCandidatos, loadResultado]
      : [loadLogin];

    const preload = () => {
      preloadRoutes.forEach((loadRoute) => {
        loadRoute().catch(() => {
          // A rota sera carregada normalmente quando o usuario navegar.
        });
      });
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, 900);
    return () => window.clearTimeout(timeoutId);
  }, [loading, user]);

  return (
    <BrowserRouter>
      {loading ? (
        <LoadingScreen />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
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
            <Route path="/cookies" element={<LegalPage type="cookies" />} />
            <Route path="/politica-de-privacidade" element={<LegalPage type="privacidade" />} />
            <Route path="/lgpd" element={<LegalPage type="lgpd" />} />
            <Route path="/sobre-nos" element={<LegalPage type="sobre" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
      <PrivacyConsent />
    </BrowserRouter>
  );
}

export default App;
