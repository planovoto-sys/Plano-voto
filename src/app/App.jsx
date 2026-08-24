import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { CANDIDATE_ROUTES } from '@/shared/constants/candidateRoutes';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useDesktopExperience } from '@/shared/hooks/useDesktopExperience';
import { useUser } from '@/shared/hooks/useUser';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import PrivacyConsent from '@/features/privacy/PrivacyConsent';
import PageTransition from '@/features/motion/PageTransition';
import { STEP_GUIDANCE_MESSAGES } from '@/features/notifications/notificationMessages';
import {
  fetchRemoteBallotDraft,
  getBallotProgress,
  readBallotDraft
} from '@/features/ballot';

const loadLogin = () => import('@/features/auth/LoginPage');
const loadHome = () => import('@/features/state-selection/StateSelectionPage');
const loadEscolherCandidatos = () => import('@/features/candidate-selection/CandidateSelectionPage');
const loadLegalPage = () => import('@/features/privacy/LegalPage');
const loadMeuPlano = () => import('@/features/plan-summary/PlanSummaryPage');
const loadContinuarPlano = () => import('@/features/handoff/ContinuePlanPage');

const Login = lazy(loadLogin);
const Home = lazy(loadHome);
const EscolherCandidatos = lazy(loadEscolherCandidatos);
const LegalPage = lazy(loadLegalPage);
const MeuPlano = lazy(loadMeuPlano);
const ContinuarPlano = lazy(loadContinuarPlano);
const INTRO_MIN_DURATION_MS = 1600;

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

const getResumeNotice = (progress) => {
  if (!progress?.hasEstado) return '';
  if (!progress.hasDeputadoFederal) return STEP_GUIDANCE_MESSAGES.deputado;
  if (!progress.hasSenadores) return STEP_GUIDANCE_MESSAGES.senador;
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

function AppRoutes({ rootElement, publicExplorationRoute, privateRedirect }) {
  const location = useLocation();
  const navigationType = useNavigationType();

  return (
    <Suspense fallback={null}>
      <PageTransition
        locationKey={location.key}
        pathname={location.pathname}
        navigationType={navigationType}
      >
        <Routes location={location}>
          <Route path="/" element={rootElement} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={publicExplorationRoute(<Home />)} />

          <Route path="/escolher-deputado-federal" element={publicExplorationRoute(renderCandidateRoute(CANDIDATE_ROUTES.deputadoFederal))} />

          <Route path="/escolher-deputado-federal/reeleger" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />
          <Route path="/escolher-deputado-federal/renovar" element={privateRedirect(BALLOT_ROUTES.deputadoFederal)} />

          <Route path="/escolher-senadores" element={publicExplorationRoute(renderCandidateRoute(CANDIDATE_ROUTES.senadores))} />
          <Route path="/escolher-senador-1" element={privateRedirect(BALLOT_ROUTES.senadores)} />
          <Route path="/escolher-senador-2" element={privateRedirect(BALLOT_ROUTES.senadores)} />
          <Route path="/escolher-senadores/reeleger" element={privateRedirect(BALLOT_ROUTES.senadores)} />
          <Route path="/escolher-senadores/renovar" element={privateRedirect(BALLOT_ROUTES.senadores)} />
          <Route path={BALLOT_ROUTES.meuPlano} element={publicExplorationRoute(<MeuPlano />)} />
          <Route path="/meu-plano" element={<Navigate to={BALLOT_ROUTES.meuPlano} replace />} />
          <Route path={`${BALLOT_ROUTES.continuarPlano}/:token`} element={<ContinuarPlano />} />
          <Route path={`${BALLOT_ROUTES.continuarPlanoCurto}/:token`} element={<ContinuarPlano />} />
          <Route path="/meu-nossovoto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />

          <Route path="/meu-voto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
          <Route path="/meuvoto" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
          <Route path="/resultado" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
          <Route path="/finalizacao" element={privateRedirect(BALLOT_ROUTES.meuPlano)} />
          <Route path="/cookies" element={<LegalPage type="cookies" />} />
          <Route path="/politica-de-privacidade" element={<LegalPage type="privacidade" />} />
          <Route path="/lgpd" element={<LegalPage type="lgpd" />} />
          <Route path="/termos-de-uso" element={<LegalPage type="termos" />} />
          <Route path="/aviso-eleitoral" element={<LegalPage type="avisoEleitoral" />} />
          <Route path="/dados-no-dispositivo" element={<LegalPage type="dadosNoDispositivo" />} />
          <Route path="/excluir-dados" element={<LegalPage type="excluirDados" />} />
          <Route path="/central-de-privacidade" element={<LegalPage type="centralPrivacidade" />} />
          <Route path="/fornecedores" element={<LegalPage type="fornecedores" />} />
          <Route path="/sobre-nos" element={<LegalPage type="sobre" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </Suspense>
  );
}

function App() {
  const { user, userData, loading } = useUser();
  const isDesktopExperience = useDesktopExperience();
  const [introReady, setIntroReady] = useState(false);
  const publicExplorationRoute = (element) => (user || isDesktopExperience ? element : <Navigate to="/" replace />);
  const privateRedirect = (to) => (
    user || isDesktopExperience
      ? <Navigate to={to} replace state={{ bypassVoteRedirect: true }} />
      : <Navigate to="/" replace />
  );

  useEffect(() => {
    const introTimer = window.setTimeout(() => setIntroReady(true), INTRO_MIN_DURATION_MS);
    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    const preloadRoutes = user || isDesktopExperience
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
  }, [isDesktopExperience, loading, user]);

  const rootElement = isDesktopExperience
    ? <LegalPage type="sobre" />
    : (!user ? <Login /> : <AuthenticatedEntryRedirect user={user} estado={userData?.estado} />);

  return (
    <BrowserRouter>
      {loading || !introReady ? (
        <LoadingScreen />
      ) : (
        <AppRoutes
          rootElement={rootElement}
          publicExplorationRoute={publicExplorationRoute}
          privateRedirect={privateRedirect}
        />
      )}
      <PrivacyConsent />
    </BrowserRouter>
  );
}

export default App;
