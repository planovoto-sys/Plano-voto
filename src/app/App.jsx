import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CANDIDATE_ROUTES } from '@/constants/candidateRoutes';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import PrivacyConsent from '@/components/privacy/PrivacyConsent';

const loadLogin = () => import('@/pages/Login');
const loadHome = () => import('@/pages/Home');
const loadEscolherCandidatos = () => import('@/pages/EscolherCandidatos');
const loadLegalPage = () => import('@/pages/LegalPage');

const Login = lazy(loadLogin);
const Home = lazy(loadHome);
const EscolherCandidatos = lazy(loadEscolherCandidatos);
const LegalPage = lazy(loadLegalPage);

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
    chaveGrupos={config.chaveGrupos}
  />
);

function LoadingScreen() {
  return (
    <div className="loading loading--intro" role="status" aria-live="polite">
      <div className="loading-intro" aria-label="Carregando meuvoto.org">
        <span className="loading-intro__ring" aria-hidden="true"></span>
        <span className="loading-intro__scan" aria-hidden="true"></span>
        <span className="loading-intro__brand">meuvoto.org</span>
        <span className="loading-intro__caption">PlanoVoto.org</span>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useUser();
  const [introReady, setIntroReady] = useState(false);
  const privateRoute = (element) => (user ? element : <Navigate to="/" replace />);
  const privateRedirect = (to) => (
    user ? <Navigate to={to} replace state={{ bypassVoteRedirect: true }} /> : <Navigate to="/" replace />
  );

  useEffect(() => {
    const introTimer = window.setTimeout(() => setIntroReady(true), 1500);
    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    const preloadRoutes = user
      ? [loadHome, loadEscolherCandidatos]
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
      {loading || !introReady ? (
        <LoadingScreen />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
            <Route path="/home" element={privateRoute(<Home />)} />

            <Route path="/escolher-deputado-federal" element={privateRoute(renderCandidateRoute(CANDIDATE_ROUTES.deputadoFederal))} />

            <Route path="/escolher-deputado-federal/reeleger" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />
            <Route path="/escolher-deputado-federal/renovar" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />

            <Route path="/escolher-senadores" element={privateRoute(renderCandidateRoute(CANDIDATE_ROUTES.senadores))} />
            <Route path="/escolher-senador-1" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senador-2" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senadores/reeleger" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senadores/renovar" element={privateRedirect(BALLOT_ROUTES.senadores)} />

            <Route path="/meu-voto" element={privateRedirect(BALLOT_ROUTES.estado)} />
            <Route path="/meuvoto" element={privateRedirect(BALLOT_ROUTES.estado)} />
            <Route path="/resultado" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/finalizacao" element={privateRedirect(BALLOT_ROUTES.senadores)} />
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
