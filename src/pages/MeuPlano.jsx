import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE } from '@/constants/candidates';
import { STATE_NAMES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  fetchRemoteBallotDraft,
  fetchCandidatesByIds,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/services/voting/votingService';
import {
  fetchCandidateTallies,
  readCachedTallies
} from '@/services/candidates/candidateService';
import ShareChoicePanel from '@/components/share/ShareChoicePanel';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import { BackIcon } from '@/components/icons/AppIcons';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import CandidateCard from '@/components/selection/CandidateCard';
import {
  calculateCandidateChance,
  formatScore,
  getCandidateChance,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';
import '@/components/selection/SelectBase.css';
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

function OverviewTile({ label, value, caption, tone = 'neutral' }) {
  return (
    <article className={`my-plan-overview-card my-plan-overview-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  );
}

function EmptyChoiceCard({ title, caption, actionLabel, onClick }) {
  return (
    <article className="my-plan-empty-choice">
      <div>
        <strong>{title}</strong>
        <span>{caption}</span>
      </div>
      <button className="nv-touch" type="button" onClick={onClick}>{actionLabel}</button>
    </article>
  );
}

export default function MeuPlano() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isGuestMode = !user?.uid;
  const localDraft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const [remoteDraftState, setRemoteDraftState] = useState({ userId: null, draft: null, loading: false });
  const [candidateDetailsState, setCandidateDetailsState] = useState({ signature: '', candidatesById: new Map(), loading: false });
  const [modalCampoBloqueado, setModalCampoBloqueado] = useState(false);
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

  const loadingDraft = remoteDraftState.userId === user?.uid && remoteDraftState.loading;
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
  const canSharePlan = !isGuestMode && Boolean(deputadosFederais.length > 0 && senadores.length >= 2 && estadoSigla);
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

  const renderChoiceCard = (candidate, route) => (
    <CandidateCard
      key={candidate.id}
      candidate={candidate}
      summary
      selected
      actionLabel="Candidato escolhido"
      lockPersonalizedFields={false}
      showNumberAbove
      onSelect={() => handleEdit(route)}
      onLockedMetricClick={handleLockedFieldClick}
    />
  );

  if ((!isGuestMode && userLoading) || loadingDraft) {
    return (
      <div className="loading nv-screen" role="status" aria-live="polite">
        <div className="loading-intro" aria-label="Carregando">
          <span className="loading-intro__mark" aria-hidden="true">
            <ChanceFlame className="loading-intro__flame" size={82} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-plan-page prototype-page nv-screen ${isGuestMode ? 'my-plan-page--guest' : 'my-plan-page--saved'}`}>
      <header className="my-plan-header">
        <button
          className="my-plan-header__back nv-touch"
          type="button"
          onClick={() => navigate(BALLOT_ROUTES.senadores, { state: { bypassVoteRedirect: true } })}
          aria-label="Voltar"
        >
          <BackIcon />
        </button>
        <div className="my-plan-header__brand">
          <strong>
            <ChanceFlame className="my-plan-header__flame" size={24} />
            <span className="my-plan-header__brand-text">nossovoto<em>.org</em></span>
          </strong>
        </div>
        <button
          className="my-plan-header__logout nv-touch"
          type="button"
          onClick={isGuestMode ? handleLogin : handleLogout}
        >
          {isGuestMode ? 'Entrar' : 'Sair'}
        </button>
      </header>

      <main className="my-plan-scroll prototype-scroll nv-scroll">
        <div className="my-plan-shell">
          <section className="my-plan-profile" aria-label="Perfil">
            {profileImage ? (
              <img
                className="my-plan-profile__photo"
                src={profileImage}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="my-plan-profile__photo my-plan-profile__photo--fallback" aria-hidden="true">
                {profileInitial}
              </span>
            )}
            <div className="my-plan-profile__copy">
              <strong>{profileName}</strong>
              <span>{profileEmail}</span>
            </div>
          </section>

          <section className="my-plan-overview" aria-label="Resumo do plano">
            <OverviewTile
              label="Estado"
              value={estadoSigla || '--'}
              caption={estadoSigla ? estadoNome : 'Escolha seu estado'}
              tone="state"
            />
            <OverviewTile
              label="Nota"
              value={averageScore > 0 ? formatScore(averageScore) : '--'}
              caption="Média das notas"
              tone="score"
            />
            <OverviewTile
              label="Viabilidade"
              value={`${Math.round(averageChance)}%`}
              caption="Média do plano"
              tone="viability"
            />
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
                    title="Nenhum deputado escolhido"
                    caption="Escolha pelo menos um deputado federal para completar seu plano."
                    actionLabel="Escolher"
                    onClick={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
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
                    title="Nenhum senador escolhido"
                    caption="Escolha dois senadores para completar seu plano."
                    actionLabel="Escolher"
                    onClick={() => handleEdit(BALLOT_ROUTES.senadores)}
                  />
                )}
              </div>
            </section>
          </section>

          <section className="my-plan-actions" aria-label="Ações do plano">
            {isGuestMode ? (
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
