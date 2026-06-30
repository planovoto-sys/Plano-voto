import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogIn, LogOut, Star } from 'lucide-react';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE } from '@/shared/constants/candidates';
import { STATE_NAMES } from '@/shared/constants/states';
import { useUser } from '@/shared/hooks/useUser';
import { useDesktopLayout } from '@/features/desktop/useDesktopLayout';
import { auth } from '@/shared/firebase/firebase';
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

import AppFooter from '@/shared/ui/layout/AppFooter';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import CandidateCard from '@/features/candidate-selection/CandidateCard';
import DesktopPlanSummary from '@/features/desktop/DesktopPlanSummary';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import {
  calculateCandidateChance,
  formatScore,
  getCandidateChance,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

import '@/features/candidate-selection/SelectBase.css';
import './MeuPlano.css';

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getAverageChance = (candidates) => average(candidates.map((candidate) => getCandidateChance(candidate)));
const getAverageScore = (candidates) => (
  average(candidates.map((candidate) => getCandidateSystemScore(candidate)).filter((score) => score > 0))
);

const getCandidateOfficeKey = (candidate = {}) => {
  const officeName = String(candidate.Cargo || candidate.cargo || '').toLowerCase();
  return officeName.includes('senador') ? 'senadores' : 'deputado_federal';
};

const getPlanUrl = () => {
  if (typeof window === 'undefined') return 'https://bomdevoto.com.br/meu-plano';
  return `${window.location.origin}${BALLOT_ROUTES.meuPlano}`;
};

const getDraftOfficeCandidates = (draft, officeKey) => {
  if (!draft) return [];
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
    ? averageElectedVotes : fallbackAverageElectedVotes;

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

function ScoreStars({ score }) {
  return (
    <div className="my-plan-stars-container" aria-hidden="true">
      {getScoreStarFills(score).map((fill, index) => (
        <div key={index} className="star-wrapper">
          <Star className="star-bg" />
          <div className="star-fill-wrapper" style={{ width: `${Math.round(fill * 100)}%` }}>
            <Star className="star-fg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MeuPlano() {
  const { user, userData, loading: userLoading } = useUser();
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
  const rawDeputadosFederais = getDraftOfficeCandidates(currentDraft, 'deputado_federal');
  const rawSenadores = getDraftOfficeCandidates(currentDraft, 'senadores');
  
  const selectedCandidateIds = [...rawDeputadosFederais, ...rawSenadores].map((c) => c.id).filter(Boolean);
  const selectedCandidateSignature = selectedCandidateIds.join('|');
  const storedCandidatesSnapshot = JSON.stringify([...rawDeputadosFederais, ...rawSenadores]);
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
  const deputadosFederais = rawDeputadosFederais.map((c) => candidatesById.get(c.id) || c);
  const senadores = rawSenadores.map((c) => candidatesById.get(c.id) || c);
  
  const featuredDeputadosFederais = deputadosFederais.slice(0, 1);
  const featuredSenadores = senadores.slice(0, 2);
  const estadoSigla = currentDraft?.estado || userData?.estado || '';
  const estadoNome = estadoSigla ? STATE_NAMES[estadoSigla] || estadoSigla : 'Nenhum';
  const deputadoFederal = featuredDeputadosFederais[0] || null;
  const selectedCandidates = [...featuredDeputadosFederais, ...featuredSenadores].filter(Boolean);
  
  const averageChance = getAverageChance(selectedCandidates);
  const averageScore = getAverageScore(selectedCandidates);
  
  const profileImage = userData?.profile_image || user?.photoURL || '';
  const profileInitial = ((userData?.name || user?.displayName || 'U').trim().charAt(0).toUpperCase());
  
  const hasCompletePlan = Boolean(deputadosFederais.length > 0 && senadores.length >= 2 && estadoSigla);
  const canSharePlan = !isGuestMode && hasCompletePlan;
  
  const shareData = canSharePlan ? {
    estadoSigla,
    estadoNome,
    userName: userData?.name || user?.displayName || 'Visitante',
    deputado: deputadoFederal,
    senadores: featuredSenadores,
    url: planUrl
  } : null;

  const handleEdit = (route) => navigate(route, { state: { bypassVoteRedirect: true } });
  const handleLogin = () => navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
  const handleLogout = async () => { await signOut(auth); navigate('/', { replace: true }); };

  if (!isGuestMode && userLoading && !currentDraft) return <LoadingScreen className="nv-screen" />;

  if (isDesktopLayout) {
    return (
      <DesktopPlanSummary
        draft={currentDraft}
        estadoSigla={estadoSigla}
        estadoNome={estadoNome}
        averageScore={averageScore}
        averageChance={averageChance}
        deputadosFederais={deputadosFederais}
        senadores={senadores}
        hasCompletePlan={hasCompletePlan}
        onNavigate={(route) => navigate(route, { state: { bypassVoteRedirect: true } })}
        onBack={() => navigate(BALLOT_ROUTES.estado, { state: { bypassVoteRedirect: true } })}
      />
    );
  }

  return (
    <div className="my-plan-page">
      <header className="my-plan-header">
        <button className="my-plan-header__btn" aria-label="Perfil">
          {profileImage ? (
            <img className="my-plan-header__avatar" src={profileImage} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="my-plan-header__avatar">{profileInitial}</div>
          )}
        </button>
        
        <LogoCompleta as="h1" />

        <button className="my-plan-header__btn" onClick={isGuestMode ? handleLogin : handleLogout} aria-label={isGuestMode ? 'Entrar' : 'Sair'}>
          {isGuestMode ? <LogIn size={20} /> : <LogOut size={20} />}
        </button>
      </header>

      <main className="my-plan-scroll">
        <div className="my-plan-shell">
          
          <section className="my-plan-overview">
            <div className="my-plan-overview__metrics">
              
              <div className="my-plan-overview__metric">
                <span className="my-plan-overview__label">Estado</span>
                <span className="my-plan-overview__value">{estadoSigla || '--'}</span>
                <span className="my-plan-overview__sub">{estadoSigla ? estadoNome : 'Definir'}</span>
              </div>

              <div className="my-plan-overview__metric">
                <span className="my-plan-overview__label">Nota</span>
                <span className="my-plan-overview__value my-plan-overview__value--green">
                  {averageScore > 0 ? formatScore(averageScore) : '--'}
                </span>
                <ScoreStars score={averageScore} />
              </div>

              <div className="my-plan-overview__metric">
                <span className="my-plan-overview__label">Viabilidade</span>
                <span className="my-plan-overview__value my-plan-overview__value--green">
                  {Math.round(averageChance)}%
                </span>
                <div className="my-plan-gauge">
                  <div className="my-plan-gauge__fill" style={{ width: `${Math.round(averageChance)}%` }}></div>
                </div>
              </div>

            </div>
          </section>

          <section className="my-plan-choices">
            
            <div className="my-plan-choice-section">
              <h2>Deputado Federal</h2>
              <div className="my-plan-choice-list">
                {featuredDeputadosFederais.length > 0 ? (
                  featuredDeputadosFederais.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      showNumberAbove={true} 
                      onSelect={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
                      onLockedMetricClick={() => setModalCampoBloqueado(true)}
                    />
                  ))
                ) : (
                  <div className="my-plan-empty">
                    <strong>Nenhum Candidato</strong>
                    <span>Escolha um deputado para apoiar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="my-plan-choice-section">
              <h2>Senadores</h2>
              <div className="my-plan-choice-list">
                {featuredSenadores.length > 0 ? (
                  featuredSenadores.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      showNumberAbove={true}
                      onSelect={() => handleEdit(BALLOT_ROUTES.senadores)}
                      onLockedMetricClick={() => setModalCampoBloqueado(true)}
                    />
                  ))
                ) : (
                  <div className="my-plan-empty">
                    <strong>Nenhum Candidato</strong>
                    <span>Escolha senadores para apoiar</span>
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
                  <span>Complete suas escolhas de deputado e senadores para liberar o compartilhamento com amigos.</span>
                </div>
              )
            )}
          </section>

        </div>
        
        <AppFooter />
      </main>

      {/* Renderiza o modal de compartilhamento controlado por estado */}
      {shareData && (
        <ShareChoicePanel 
          shareData={shareData}
          isOpenControlled={isShareModalOpen}
          onCloseControlled={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Renderiza a barra e avisa que é a tela final, passando a ação do botão */}
      <ConvexBottomNavigation 
        currentStep="nossovoto" 
        isFinalStep={true} 
        onShareClick={() => {
          if (canSharePlan) {
            setIsShareModalOpen(true);
          } else {
            if (isGuestMode) {
              setModalCampoBloqueado(true);
            }
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