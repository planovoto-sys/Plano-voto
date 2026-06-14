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
import ShareChoicePanel from '@/features/sharing/ShareChoicePanel';
import BottomNavigation from '@/app/shell/BottomNavigation';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import CandidateCard from '@/features/candidate-selection/CandidateCard';
import DesktopPlanSummary from '@/features/desktop/DesktopPlanSummary';
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
  if (typeof window === 'undefined') return 'https://nossovoto.org/meu-plano';
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
  const mergedCandidate = {
    ...storedCandidate,
    ...fetchedCandidate
  };
  const selectedByUsers = Number(
    tally?.active_selections ??
    fetchedCandidate?.active_selections ??
    fetchedCandidate?.selected_by_users ??
    storedCandidate?.selected_by_users ??
    storedCandidate?.selectedByUsers ??
    0
  );
  const averageElectedVotes = Number(
    fetchedCandidate?.average_elected_votes ??
    fetchedCandidate?.averageElectedVotes ??
    storedCandidate?.average_elected_votes ??
    storedCandidate?.averageElectedVotes ??
    0
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

const getViabilityLabel = (chance) => {
  if (chance >= 80) return 'Excelente';
  if (chance >= 60) return 'Boa';
  if (chance >= 35) return 'Regular';
  return 'Baixa';
};

function ScoreStars({ score }) {
  return (
    <span className="my-plan-overview__stars" aria-hidden="true">
      {getScoreStarFills(score).map((fill, index) => (
        <span
          key={index}
          className="my-plan-overview__star"
          style={{ '--star-fill': `${Math.round(fill * 100)}%` }}
        >
          <Star className="my-plan-overview__star-base" />
          <span className="my-plan-overview__star-fill">
            <Star />
          </span>
        </span>
      ))}
    </span>
  );
}

function PlanViabilityGauge({ chance }) {
  const progress = Math.max(0, Math.min(100, Math.round(chance)));
  const viabilityLabel = getViabilityLabel(progress);

  return (
    <div className="viability-thermometer-container">
      {/* Cabeçalho com o Texto e a Badge */}
      <div className="viability-thermometer__header">
        <span className="viability-thermometer__title">
          <strong>{progress}%</strong> VIÁVEL
        </span>
   
      </div>

      {/* Barra do Termômetro */}
      <div className="viability-thermometer__track">
        <div 
          className="viability-thermometer__fill" 
          style={{ width: `${progress}%` }}
        ></div>
        {/* Marcações de 25%, 50% e 75% */}
        <span className="viability-thermometer__tick viability-thermometer__tick--first"></span>
        <span className="viability-thermometer__tick viability-thermometer__tick--second"></span>
        <span className="viability-thermometer__tick viability-thermometer__tick--third"></span>
      </div>
    </div>
  );
}

function EmptyChoiceCard({ title, caption }) {
  return (
    <article className="my-plan-empty-choice">
      <div>
        <strong>{title}</strong>
        <span>{caption}</span>
      </div>
    </article>
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [planUrl] = useState(() => getPlanUrl());

  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;
    const fallbackDraft = readBallotDraft(user.uid, userData?.estado);

    queueMicrotask(() => {
      if (!cancelled) {
        setRemoteDraftState({ userId: user.uid, draft: null, loading: true });
      }
    });

    fetchRemoteBallotDraft(user.uid, fallbackDraft.estado || userData?.estado)
      .then((remoteDraft) => {
        if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: remoteDraft, loading: false });
      })
      .catch(() => {
        if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: fallbackDraft, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, userData?.estado]);

  const currentDraft = remoteDraftState.userId === user?.uid && remoteDraftState.draft
    ? remoteDraftState.draft
    : localDraft;
  const rawDeputadosFederais = getDraftOfficeCandidates(currentDraft, 'deputado_federal');
  const rawSenadores = getDraftOfficeCandidates(currentDraft, 'senadores');
  const selectedCandidateIds = [...rawDeputadosFederais, ...rawSenadores].map((candidate) => candidate.id).filter(Boolean);
  const selectedCandidateSignature = selectedCandidateIds.join('|');
  const storedCandidatesSnapshot = JSON.stringify([...rawDeputadosFederais, ...rawSenadores]);
  const selectedDraftEstado = currentDraft?.estado || userData?.estado || null;
  useEffect(() => {
    if (!selectedCandidateSignature) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) {
          setCandidateDetailsState((currentState) => (
            currentState.signature === '' ? currentState : { signature: '', candidatesById: new Map(), loading: false }
          ));
        }
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const candidateIds = selectedCandidateSignature.split('|').filter(Boolean);
    const storedCandidates = JSON.parse(storedCandidatesSnapshot || '[]');

    queueMicrotask(() => {
      if (!cancelled) {
        setCandidateDetailsState((currentState) => ({
          signature: selectedCandidateSignature,
          candidatesById: currentState.signature === selectedCandidateSignature ? currentState.candidatesById : new Map(),
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

      const fetchedById = new Map(fetchedCandidates.map((candidate) => [candidate.id, candidate]));
      const storedById = new Map(storedCandidates.map((candidate) => [candidate.id, candidate]));
      const candidatesById = new Map(candidateIds.map((candidateId) => [
        candidateId,
        mergeCandidateDetails(storedById.get(candidateId), fetchedById.get(candidateId), tallies.get(candidateId))
      ]));

      setCandidateDetailsState({
        signature: selectedCandidateSignature,
        candidatesById,
        loading: false
      });
    }).catch(() => {
      if (!cancelled) {
        setCandidateDetailsState({ signature: selectedCandidateSignature, candidatesById: new Map(), loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCandidateSignature, selectedDraftEstado, storedCandidatesSnapshot]);

  const candidatesById = candidateDetailsState.signature === selectedCandidateSignature
    ? candidateDetailsState.candidatesById
    : new Map();
  const deputadosFederais = rawDeputadosFederais.map((candidate) => candidatesById.get(candidate.id) || candidate);
  const senadores = rawSenadores.map((candidate) => candidatesById.get(candidate.id) || candidate);
  const featuredDeputadosFederais = deputadosFederais.slice(0, 1);
  const featuredSenadores = senadores.slice(0, 2);
  const estadoSigla = currentDraft?.estado || userData?.estado || '';
  const estadoNome = estadoSigla ? STATE_NAMES[estadoSigla] || estadoSigla : 'Estado não selecionado';
  const deputadoFederal = featuredDeputadosFederais[0] || null;
  const selectedCandidates = [...featuredDeputadosFederais, ...featuredSenadores].filter(Boolean);
  const averageChance = getAverageChance(selectedCandidates);
  const averageScore = getAverageScore(selectedCandidates);
  const profileName = isGuestMode ? 'Visitante' : userData?.name || user?.displayName || 'Usuário';
  const profileEmail = isGuestMode ? 'Plano local' : userData?.email || user?.email || 'Email não informado';
  const profileImage = userData?.profile_image || user?.photoURL || '';
  const profileInitial = (profileName || 'N').trim().charAt(0).toUpperCase();
  const hasCompletePlan = Boolean(deputadosFederais.length > 0 && senadores.length >= 2 && estadoSigla);
  const canSharePlan = !isGuestMode && hasCompletePlan;
  const shareData = canSharePlan ? {
    estadoSigla,
    estadoNome,
    userName: profileName,
    deputado: deputadoFederal,
    senadores: featuredSenadores,
    url: planUrl
  } : null;
  const handleEdit = (route = BALLOT_ROUTES.deputadoFederal) => {
    navigate(route, { state: { bypassVoteRedirect: true } });
  };

  const getNextMissingRoute = () => {
    if (!estadoSigla) return BALLOT_ROUTES.estado;
    if (deputadosFederais.length === 0) return BALLOT_ROUTES.deputadoFederal;
    if (senadores.length < 2) return BALLOT_ROUTES.senadores;
    return BALLOT_ROUTES.meuPlano;
  };

  const handleContinuePlan = () => {
    handleEdit(getNextMissingRoute());
  };

  const handleLogin = () => {
    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`
      }
    });
  };

  const handleLockedFieldClick = () => {
    setModalCampoBloqueado(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/', { replace: true });
  };

  const handleDesktopNavigate = (route) => {
    navigate(route, { state: { bypassVoteRedirect: true } });
  };

  const getDesktopBackRoute = () => {
    if (!estadoSigla) return BALLOT_ROUTES.estado;
    if (senadores.length > 0 || deputadosFederais.length > 0) return BALLOT_ROUTES.senadores;
    return BALLOT_ROUTES.deputadoFederal;
  };

  const handleDesktopBack = () => {
    navigate(getDesktopBackRoute(), { state: { bypassVoteRedirect: true } });
  };

  const renderChoiceCard = (candidate, route) => (
    <CandidateCard
      key={candidate.id}
      candidate={candidate}
      summary
      selected
      actionLabel="Candidato escolhido"
      lockPersonalizedFields={false}
      showNumberAbove
      numberFallback="000000"
      onSelect={() => handleEdit(route)}
      onLockedMetricClick={handleLockedFieldClick}
    />
  );

  if (!isGuestMode && userLoading && !currentDraft) {
    return <LoadingScreen className="nv-screen" />;
  }

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
        onNavigate={handleDesktopNavigate}
        onBack={handleDesktopBack}
      />
    );
  }

  return (
    <div className={`my-plan-page prototype-page nv-screen ${isGuestMode ? 'my-plan-page--guest' : 'my-plan-page--saved'}`}>
      <header className="my-plan-header">
        <div className="my-plan-header__profile-wrap">
          <button
            className="my-plan-header__profile nv-touch"
            type="button"
            onClick={() => setProfileMenuOpen((currentValue) => !currentValue)}
            aria-label="Mostrar perfil"
            aria-expanded={profileMenuOpen}
          >
            <span className="my-plan-header__profile-avatar" aria-hidden="true">
              {profileImage ? (
                <img
                  className="my-plan-header__profile-image"
                  src={profileImage}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="my-plan-header__profile-initial">{profileInitial}</span>
              )}
            </span>
          </button>
          {profileMenuOpen && (
            <div className="my-plan-header__profile-popover" role="dialog" aria-label="Dados do perfil">
              <strong>{profileName}</strong>
              <span>{profileEmail}</span>
            </div>
          )}
        </div>
        <h1 className="my-plan-header__title">
          <ChanceFlame className="my-plan-header__flame" size={20} />
          <span>nossovoto<em>.org</em></span>
        </h1>
        <button
          className="my-plan-header__logout nv-touch"
          type="button"
          onClick={isGuestMode ? handleLogin : handleLogout}
          aria-label={isGuestMode ? 'Entrar' : 'Sair'}
        >
          {isGuestMode ? <LogIn aria-hidden="true" /> : <LogOut aria-hidden="true" />}
        </button>
      </header>

      <main className="my-plan-scroll prototype-scroll nv-scroll">
        <div className="my-plan-shell">
          <section className="my-plan-overview" aria-label="Resumo do plano">
            <div className="my-plan-overview__metrics">
              <article className="my-plan-overview__metric my-plan-overview__metric--state">
                <strong className="my-plan-overview__state-code">{estadoSigla || '--'}</strong>
                <small>{estadoSigla ? estadoNome : 'Escolha seu estado'}</small>
              </article>

              <article className="my-plan-overview__metric my-plan-overview__metric--score">
                <strong className="my-plan-overview__score">
                  {averageScore > 0 ? formatScore(averageScore) : '--'}
                </strong>
                <ScoreStars score={averageScore} />
              </article>

              <article className="my-plan-overview__metric my-plan-overview__metric--viability">
                <PlanViabilityGauge chance={averageChance} />
              </article>
            </div>

          </section>

          <section className="my-plan-choices" aria-label="Candidatos escolhidos">
            <section className="candidate-current-section my-plan-choice-section">
              <div className="prototype-section-heading prototype-section-heading--current">
                <div className="prototype-section-heading__copy">
                  <h2>Deputado Federal</h2>
                </div>
              </div>
              <div className="candidate-current-list my-plan-choice-list">
                {featuredDeputadosFederais.length > 0 ? (
                  featuredDeputadosFederais.map((candidate) => renderChoiceCard(candidate, BALLOT_ROUTES.deputadoFederal))
                ) : (
                  <EmptyChoiceCard
                    title="Nenhum Candidato Escolhido"
                    caption="Escolha seus candidatos para continuar"
                  />
                )}
              </div>
            </section>

            <section className="candidate-current-section my-plan-choice-section">
              <div className="prototype-section-heading prototype-section-heading--current">
                <div className="prototype-section-heading__copy">
                  <h2>Senadores</h2>
                </div>
              </div>
              <div className="candidate-current-list candidate-current-list--double my-plan-choice-list">
                {featuredSenadores.length > 0 ? (
                  featuredSenadores.map((candidate) => renderChoiceCard(candidate, BALLOT_ROUTES.senadores))
                ) : (
                  <EmptyChoiceCard
                    title="Nenhum Candidato Escolhido"
                    caption="Escolha seus candidatos para continuar"
                  />
                )}
              </div>
            </section>
          </section>

          <section className="my-plan-actions" aria-label="Ações do plano">
            {!hasCompletePlan ? (
              <button className="my-plan-continue-button nv-touch" type="button" onClick={handleContinuePlan}>
                <strong>Escolher</strong>
              </button>
            ) : isGuestMode ? (
              <div className="my-plan-save-invite">
                <strong>Entrar para compartilhar</strong>
                <span>Seu plano está salvo neste dispositivo. Entre para compartilhar com segurança.</span>
                <button className="nv-touch" type="button" onClick={handleLogin}>
                  Fazer login
                </button>
              </div>
            ) : (
              shareData ? (
                <ShareChoicePanel shareData={shareData} className="my-plan-share-panel" />
              ) : (
                <div className="my-plan-share-disabled">
                  <strong>Compartilhar plano</strong>
                  <span>Complete deputado federal e dois senadores para liberar o compartilhamento.</span>
                </div>
              )
            )}
          </section>

        </div>
      </main>

      <BottomNavigation currentStep="nossovoto" placement="footer" />

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
