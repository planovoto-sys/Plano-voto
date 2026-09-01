import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Star } from 'lucide-react';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE } from '@/shared/constants/candidates';
import { STATE_NAMES } from '@/shared/constants/states';
import { useUser } from '@/shared/hooks/useUser';
import { useDesktopLayout } from '@/features/desktop/useDesktopLayout';
import { useHideOnScroll } from '@/shared/hooks/useHideOnScroll';
import { signOutUser } from '@/shared/auth/authService';
import {
  fetchRemoteBallotDraft,
  fetchCandidatesByIds,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/features/ballot';
import {
  fetchCandidateTallies,
  readCachedTallies
} from '@/features/candidate-selection/candidateService';

// IMPORTAÇÕES ATUALIZADAS
import ConvexBottomNavigation from '@/app/shell/BottomNavigation';
import ShareChoicePanel from '@/features/sharing/ShareChoicePanel';
import { useNotify } from '@/features/notifications/useNotify';
import { STEP_GUIDANCE_MESSAGES } from '@/features/notifications/notificationMessages';

import AppFooter from '@/shared/ui/layout/AppFooter';
import '@/shared/ui/layout/AppHeader.css';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import CandidateCard from '@/features/candidate-selection/CandidateCard';
import DesktopPlanSummary from '@/features/desktop/DesktopPlanSummary';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import {
  calculateCandidateChance,
  formatScore,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

import '@/features/candidate-selection/SelectBase.css';
import './MeuPlano.css';

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getAverageScore = (candidates) => (
  average(candidates.map((candidate) => getCandidateSystemScore(candidate)).filter((score) => score > 0))
);

const getCandidateOfficeKey = (candidate = {}) => {
  const officeName = String(candidate.Cargo || candidate.cargo || '').toLowerCase();
  if (officeName.includes('presidente')) return 'presidente';
  return officeName.includes('senador') ? 'senadores' : 'deputado_federal';
};

const getPlanUrl = () => {
  if (typeof window === 'undefined') return 'https://bomdevoto.com.br/resumo';
  return `${window.location.origin}${BALLOT_ROUTES.meuPlano}`;
};

const getDraftOfficeCandidates = (draft, officeKey) => {
  if (!draft) return [];
  if (officeKey === 'presidente') {
    return draft.candidate_groups?.presidente?.length
      ? draft.candidate_groups.presidente
      : draft.selections?.presidente || [];
  }
  if (officeKey === 'deputado_federal') {
    return draft.candidate_groups?.deputado_federal?.length
      ? draft.candidate_groups.deputado_federal
      : draft.selections?.deputado_federal || [];
  }
  return draft.candidate_groups?.senadores_1?.length
    ? draft.candidate_groups.senadores_1
    : draft.selections?.senadores || [];
};

const mergeCandidateDetails = (storedCandidate, fetchedCandidate, tally) => {
  const mergedCandidate = { ...storedCandidate, ...fetchedCandidate };
  const selectedByUsers = Number(
    tally?.active_selections ?? fetchedCandidate?.active_selections ?? fetchedCandidate?.selected_by_users ??
    storedCandidate?.selected_by_users ?? storedCandidate?.selectedByUsers ?? 0
  );
  const averageElectedVotes = Number(
    fetchedCandidate?.average_elected_votes ?? fetchedCandidate?.averageElectedVotes ??
    storedCandidate?.average_elected_votes ?? storedCandidate?.averageElectedVotes ?? 0
  );
  const safeSelectedByUsers = Number.isFinite(selectedByUsers) ? selectedByUsers : 0;
  const fallbackAverageElectedVotes = AVERAGE_ELECTED_VOTES_BY_OFFICE[getCandidateOfficeKey(mergedCandidate)] || 3;
  const safeAverageElectedVotes = Number.isFinite(averageElectedVotes) && averageElectedVotes > 0
    ? averageElectedVotes
    : fallbackAverageElectedVotes;

  return {
    ...mergedCandidate,
    selected_by_users: safeSelectedByUsers,
    selectedByUsers: safeSelectedByUsers,
    active_selections: safeSelectedByUsers,
    average_elected_votes: safeAverageElectedVotes,
    averageElectedVotes: safeAverageElectedVotes,
    chance: calculateCandidateChance(safeSelectedByUsers, safeAverageElectedVotes)
  };
};

const getScoreStarFills = (score) => {
  const normalizedScore = Math.max(0, Math.min(10, Number(score) || 0)) / 2;
  return Array.from({ length: 5 }, (_, index) => (
    Math.max(0, Math.min(1, normalizedScore - index))
  ));
};

function ScoreStars({ score, isBad }) {
  const starClass = isBad ? 'star-fill-wrapper--red' : 'star-fill-wrapper--default';
  
  return (
    <div className="my-plan-stars-container" aria-hidden="true">
      {getScoreStarFills(score).map((fill, index) => (
        <div key={index} className="star-wrapper">
          <Star className="star-bg" />
          <div className={`star-fill-wrapper ${starClass}`} style={{ width: `${Math.round(fill * 100)}%` }}>
            <Star className="star-fg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChoiceSectionHeading({ title }) {
  return (
    <div className="my-plan-choice-heading">
      <h2>{title}</h2>
    </div>
  );
}

export default function MeuPlano() {
  const { user, userData, loading: userLoading } = useUser();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const isGuestMode = !user?.uid;
  const isDesktopLayout = useDesktopLayout();
  
  const localDraft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const [remoteDraftState, setRemoteDraftState] = useState({ userId: null, draft: null, loading: false });
  const [candidateDetailsState, setCandidateDetailsState] = useState({ signature: '', candidatesById: new Map(), loading: false });
  const [modalCampoBloqueado, setModalCampoBloqueado] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [planUrl] = useState(() => getPlanUrl());

  const scrollRef = useRef(null);
  const headerVisible = useHideOnScroll(scrollRef);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;
    const fallbackDraft = readBallotDraft(user.uid, userData?.estado);

    queueMicrotask(() => {
      if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: null, loading: true });
    });

    fetchRemoteBallotDraft(user.uid, fallbackDraft.estado || userData?.estado)
      .then((remoteDraft) => { if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: remoteDraft, loading: false }); })
      .catch(() => { if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: fallbackDraft, loading: false }); });

    return () => { cancelled = true; };
  }, [user?.uid, userData?.estado]);

  const currentDraft = remoteDraftState.userId === user?.uid && remoteDraftState.draft ? remoteDraftState.draft : localDraft;
  const rawPresidentes = getDraftOfficeCandidates(currentDraft, 'presidente');
  const rawDeputadosFederais = getDraftOfficeCandidates(currentDraft, 'deputado_federal');
  const rawSenadores = getDraftOfficeCandidates(currentDraft, 'senadores');
  
  const selectedCandidateIds = [...rawPresidentes, ...rawSenadores, ...rawDeputadosFederais].map((c) => c.id).filter(Boolean);
  const selectedCandidateSignature = selectedCandidateIds.join('|');
  const storedCandidatesSnapshot = JSON.stringify([...rawPresidentes, ...rawSenadores, ...rawDeputadosFederais]);
  const selectedDraftEstado = currentDraft?.estado || userData?.estado || null;

  useEffect(() => {
    if (!selectedCandidateSignature) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setCandidateDetailsState((s) => (s.signature === '' ? s : { signature: '', candidatesById: new Map(), loading: false }));
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;
    const candidateIds = selectedCandidateSignature.split('|').filter(Boolean);
    const storedCandidates = JSON.parse(storedCandidatesSnapshot || '[]');

    queueMicrotask(() => {
      if (!cancelled) {
        setCandidateDetailsState((s) => ({
          signature: selectedCandidateSignature,
          candidatesById: s.signature === selectedCandidateSignature ? s.candidatesById : new Map(),
          loading: true
        }));
      }
    });

    const cachedTallies = readCachedTallies(candidateIds, { estado: selectedDraftEstado });

    Promise.all([
      fetchCandidatesByIds(candidateIds),
      fetchCandidateTallies(candidateIds, { forceRefresh: true, estado: selectedDraftEstado }).catch(() => cachedTallies)
    ]).then(([fetchedCandidates, tallies]) => {
      if (cancelled) return;
      const fetchedById = new Map(fetchedCandidates.map((c) => [c.id, c]));
      const storedById = new Map(storedCandidates.map((c) => [c.id, c]));
      const candidatesById = new Map(candidateIds.map((id) => [
        id, mergeCandidateDetails(storedById.get(id), fetchedById.get(id), tallies.get(id))
      ]));

      setCandidateDetailsState({ signature: selectedCandidateSignature, candidatesById, loading: false });
    }).catch(() => {
      if (!cancelled) setCandidateDetailsState({ signature: selectedCandidateSignature, candidatesById: new Map(), loading: false });
    });

    return () => { cancelled = true; };
  }, [selectedCandidateSignature, selectedDraftEstado, storedCandidatesSnapshot]);

  const candidatesById = candidateDetailsState.signature === selectedCandidateSignature ? candidateDetailsState.candidatesById : new Map();
  const presidentes = rawPresidentes.map((c) => candidatesById.get(c.id) || c);
  const deputadosFederais = rawDeputadosFederais.map((c) => candidatesById.get(c.id) || c);
  const senadores = rawSenadores.map((c) => candidatesById.get(c.id) || c);
  
  const featuredPresidentes = presidentes;
  const featuredDeputadosFederais = deputadosFederais.slice(0, 1);
  const displayedDeputadosFederais = deputadosFederais;
  const featuredSenadores = senadores;
  const estadoSigla = currentDraft?.estado || userData?.estado || '';
  const estadoNome = estadoSigla ? STATE_NAMES[estadoSigla] || estadoSigla : 'Nenhum';
  const deputadoFederal = featuredDeputadosFederais[0] || null;
  const selectedCandidates = [...presidentes.slice(0, 1), ...senadores.slice(0, 2), ...featuredDeputadosFederais].filter(Boolean);
  
  const averageScore = getAverageScore(selectedCandidates);
  
  const profileImage = userData?.profile_image || user?.photoURL || '';
  const profileInitial = ((userData?.name || user?.displayName || 'U').trim().charAt(0).toUpperCase());
  
  const hasCompletePlan = Boolean(presidentes.length > 0 && deputadosFederais.length > 0 && senadores.length >= 2 && estadoSigla);
  const canSharePlan = !isGuestMode && hasCompletePlan;
  
  const shareData = canSharePlan ? {
    estadoSigla,
    estadoNome,
    userName: userData?.name || user?.displayName || 'Visitante',
    presidente: presidentes[0] || null,
    deputado: deputadoFederal,
    senadores: senadores.slice(0, 2),
    url: planUrl
  } : null;

  const handleEdit = (route) => navigate(route, { state: { bypassVoteRedirect: true } });
  const handleLogin = () => navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  const handleLogout = async () => { await signOutUser(); navigate('/', { replace: true }); };

  if (!isGuestMode && userLoading && !currentDraft) return <LoadingScreen className="nv-screen" />;

  if (isDesktopLayout) {
    return (
      <DesktopPlanSummary
        draft={currentDraft}
        estadoSigla={estadoSigla}
        estadoNome={estadoNome}
        averageScore={averageScore}
        deputadosFederais={deputadosFederais}
        senadores={senadores}
        hasCompletePlan={hasCompletePlan}
        onNavigate={(route) => navigate(route, { state: { bypassVoteRedirect: true } })}
        onBack={() => navigate(BALLOT_ROUTES.estado, { state: { bypassVoteRedirect: true } })}
      />
    );
  }

  // ==========================================
  // LÓGICA DE CORES GLOBAIS DO PAINEL DE RESUMO
  // ==========================================
  const hasScore = averageScore > 0;

  // A cor do conjunto segue exclusivamente a nota média: abaixo de 7 é
  // vermelho; a partir de 7 é verde. Sem nota, permanece neutro.
  const isPlanBad = hasScore && averageScore < 7;
  const globalMetricClass = hasScore
    ? (isPlanBad ? 'my-plan-overview__metric--red' : 'my-plan-overview__metric--green')
    : '';
  const overviewToneClass = hasScore
    ? (isPlanBad ? 'is-score-red' : 'is-score-green')
    : '';
  return (
    <div className={`my-plan-page prototype-page nv-screen${!headerVisible ? ' is-header-hidden' : ''}`}>
      <header className={`app-header app-header--default step-header-sticky ${!headerVisible ? 'is-header-hidden' : ''}`}>
        <div className="app-header__inner">
          <div className="app-header__left">
            <button className="app-header__icon-btn" aria-label="Perfil">
              {profileImage ? (
                <img className="app-header__avatar" src={profileImage} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="app-header__avatar app-header__avatar--initial">{profileInitial}</div>
              )}
            </button>
          </div>
          <div className="app-header__center">
            <span className="app-header__brand-link">
              <LogoCompleta />
            </span>
          </div>
          <div className="app-header__right">
            <button className="app-header__icon-btn" onClick={isGuestMode ? handleLogin : handleLogout} aria-label={isGuestMode ? 'Entrar' : 'Sair'}>
              {isGuestMode ? <LogIn size={20} /> : <LogOut size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main ref={scrollRef} className="prototype-scroll my-plan-scroll">
        <div className="my-plan-shell">
          
          <section className={`my-plan-overview ${overviewToneClass}`}>
            <div className="my-plan-overview__metrics">
              
              {/* ESTADO - Agora muda de cor junto com o resto! */}
              <div className={`my-plan-overview__metric ${globalMetricClass}`}>
                <span className="my-plan-overview__label">Estado</span>
                <span className="my-plan-overview__value">{estadoSigla || '--'}</span>
                <span className="my-plan-overview__sub">{estadoSigla ? estadoNome : 'Definir'}</span>
              </div>

              {/* NOTA - Muda de cor junto */}
              <div className={`my-plan-overview__metric ${globalMetricClass}`}>
                <span className="my-plan-overview__label">Nota</span>
                <span className="my-plan-overview__value">
                  {averageScore > 0 ? formatScore(averageScore) : '--'}
                </span>
                <ScoreStars score={averageScore} isBad={isPlanBad} />
              </div>

            </div>
          </section>

          <section className="my-plan-choices">
            <div className="my-plan-choice-section">
              <ChoiceSectionHeading
                title="Presidente"
              />
              <div className="my-plan-choice-list">
                {featuredPresidentes.length > 0 ? (
                  featuredPresidentes.map((candidate, index) => {
                    const candWithNumber = { ...candidate, numero: candidate.numero || `${index + 1}` };
                    return (
                      <CandidateCard
                        key={candWithNumber.id}
                        candidate={candWithNumber}
                        variant="summary"
                        onSelect={() => handleEdit(BALLOT_ROUTES.presidente)}
                        onLockedMetricClick={() => setModalCampoBloqueado(true)}
                      />
                    );
                  })
                ) : (
                  <div className="my-plan-empty">
                    <strong>Nenhum Candidato</strong>
                    <span>Escolha um presidente para apoiar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="my-plan-choice-section">
              <ChoiceSectionHeading
                title="Senadores"
              />
              <div className="my-plan-choice-list">
                {featuredSenadores.length > 0 ? (
                  featuredSenadores.map((candidate, index) => {
                    const candWithNumber = { ...candidate, numero: candidate.numero || `12${index + 1}` };
                    return (
                      <CandidateCard
                        key={candWithNumber.id}
                        candidate={candWithNumber}
                        variant="summary"
                        onSelect={() => handleEdit(BALLOT_ROUTES.senadores)}
                        onLockedMetricClick={() => setModalCampoBloqueado(true)}
                      />
                    );
                  })
                ) : (
                  <div className="my-plan-empty">
                    <strong>Nenhum Candidato</strong>
                    <span>Escolha senadores para apoiar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="my-plan-choice-section">
              <ChoiceSectionHeading
                title="Deputado Federal"
              />
              <div className="my-plan-choice-list">
                {displayedDeputadosFederais.length > 0 ? (
                  displayedDeputadosFederais.map((candidate, index) => {
                    const candWithNumber = { ...candidate, numero: candidate.numero || `123${index + 1}` };
                    return (
                      <CandidateCard
                        key={candWithNumber.id}
                        candidate={candWithNumber}
                        variant="summary"
                        onSelect={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
                        onLockedMetricClick={() => setModalCampoBloqueado(true)}
                      />
                    );
                  })
                ) : (
                  <div className="my-plan-empty">
                    <strong>Nenhum Candidato</strong>
                    <span>Escolha um deputado para apoiar</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="my-plan-actions">
            {isGuestMode ? (
              <div className="my-plan-action-box">
                <strong>Salve seu plano</strong>
                <span>Entre para salvar suas escolhas com segurança e liberar o compartilhamento.</span>
                <button className="my-plan-btn-primary" onClick={handleLogin}>Fazer Login</button>
              </div>
            ) : (
              !shareData && (
                <div className="my-plan-action-box">
                  <strong>Compartilhar plano</strong>
                  <span>Complete suas escolhas de presidente, senadores e deputado para liberar o compartilhamento com amigos.</span>
                </div>
              )
            )}
          </section>

        </div>
        
        <AppFooter className="app-footer--scroll-content" />
      </main>

      {shareData && (
        <ShareChoicePanel 
          shareData={shareData}
          isOpenControlled={isShareModalOpen}
          onCloseControlled={() => setIsShareModalOpen(false)}
        />
      )}

      <ConvexBottomNavigation 
        currentStep="resultado" 
        isFinalStep={true} 
        onShareClick={() => {
          if (!estadoSigla) {
            notify.warning(STEP_GUIDANCE_MESSAGES.estado);
          } else if (presidentes.length < 1) {
            notify.warning(STEP_GUIDANCE_MESSAGES.presidente);
          } else if (senadores.length < 2) {
            notify.warning(STEP_GUIDANCE_MESSAGES.senador);
          } else if (deputadosFederais.length < 1) {
            notify.warning(STEP_GUIDANCE_MESSAGES.deputado);
          } else if (canSharePlan) {
            setIsShareModalOpen(true);
          } else if (isGuestMode) {
            setModalCampoBloqueado(true);
          }
        }} 
      />

      <ConfirmModal
        isOpen={modalCampoBloqueado}
        titulo="Recurso disponível com login"
        mensagem="Faça login para liberar indicadores e salvar seu plano na conta."
        textoConfirmar="ENTRAR AGORA"
        textoCancelar="CONTINUAR EXPLORANDO"
        tipo="login-required"
        onConfirm={handleLogin}
        onCancel={() => setModalCampoBloqueado(false)}
      />
    </div>
  );
}
