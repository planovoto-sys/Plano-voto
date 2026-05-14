import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CANDIDATE_ROUTES } from '@/constants/candidateRoutes';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import PrivacyConsent from '@/components/privacy/PrivacyConsent';
import {
  fetchRemoteBallotDraft,
  getBallotProgress,
  readBallotDraft
} from '@/services/voting/votingService';

const loadLogin = () => import('@/pages/Login');
const loadHome = () => import('@/pages/Home');
const loadEscolherCandidatos = () => import('@/pages/EscolherCandidatos');
const loadLegalPage = () => import('@/pages/LegalPage');
const loadMeuPlano = () => import('@/pages/MeuPlano');

const Login = lazy(loadLogin);
const Home = lazy(loadHome);
const EscolherCandidatos = lazy(loadEscolherCandidatos);
const LegalPage = lazy(loadLegalPage);
const MeuPlano = lazy(loadMeuPlano);

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
      <div className="loading-intro" aria-label="Carregando nossovoto.org">
        <span className="loading-intro__ring" aria-hidden="true"></span>
        <span className="loading-intro__scan" aria-hidden="true"></span>
        <span className="loading-intro__brand">nossovoto.org</span>
        <span className="loading-intro__caption">PlanoVoto.org</span>
      </div>
    </div>
  );
}

const getResumeNotice = (progress) => {
  if (!progress?.hasEstado) return '';
  if (!progress.hasDeputadoFederal) return 'Você ainda não selecionou seu deputado federal';
  if (!progress.hasSenadores) return 'Você ainda não selecionou seus senadores';
  return '';
};

function AuthenticatedEntryRedirect({ user, estado }) {
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const resolveRedirect = async () => {
      let draft = readBallotDraft(user.uid, estado);

      try {
        draft = await fetchRemoteBallotDraft(user.uid, draft.estado || estado);
      } catch {
        // Se a leitura remota falhar, o rascunho local ainda posiciona o usuario no fluxo correto.
      }

      if (cancelled) return;

      const progress = getBallotProgress(draft);
      setRedirect({
        to: progress.nextRoute,
        notice: getResumeNotice(progress)
      });
    };

    resolveRedirect();

    return () => {
      cancelled = true;
    };
  }, [estado, user.uid]);

  if (!redirect) return <LoadingScreen />;

  return (
    <Navigate
      to={redirect.to}
      replace
      state={{
        bypassVoteRedirect: true,
        flowNotice: redirect.notice
      }}
    />
  );
}

function App() {
  const { user, userData, loading } = useUser();
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
      ? [loadHome, loadEscolherCandidatos, loadMeuPlano]
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
            <Route path="/" element={!user ? <Login /> : <AuthenticatedEntryRedirect user={user} estado={userData?.estado} />} />
            <Route path="/home" element={privateRoute(<Home />)} />

            <Route path="/escolher-deputado-federal" element={privateRoute(renderCandidateRoute(CANDIDATE_ROUTES.deputadoFederal))} />

            <Route path="/escolher-deputado-federal/reeleger" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />
            <Route path="/escolher-deputado-federal/renovar" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />

            <Route path="/escolher-senadores" element={privateRoute(renderCandidateRoute(CANDIDATE_ROUTES.senadores))} />
            <Route path="/escolher-senador-1" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senador-2" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senadores/reeleger" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path="/escolher-senadores/renovar" element={privateRedirect(BALLOT_ROUTES.senadores)} />
            <Route path={BALLOT_ROUTES.meuPlano} element={privateRoute(<MeuPlano />)} />
            <Route path="/meu-nossovoto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />

            <Route path="/meu-voto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
            <Route path="/meuvoto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
            <Route path="/resultado" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
            <Route path="/finalizacao" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
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
