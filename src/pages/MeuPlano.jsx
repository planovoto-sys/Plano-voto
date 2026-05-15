import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import QRCode from 'qrcode';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE } from '@/constants/candidates';
import { STATE_NAMES } from '@/constants/states';
import { useDesktopExperience } from '@/hooks/useDesktopExperience';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  createPlanHandoffToken,
  fetchRemoteBallotDraft,
  fetchCandidatesByIds,
  getBallotProgress,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/services/voting/votingService';
import {
  fetchCandidateTallies,
  readCachedTallies
} from '@/services/candidates/candidateService';
import ShareChoicePanel from '@/components/share/ShareChoicePanel';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import AppFooter from '@/components/layout/AppFooter';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import { BackIcon } from '@/components/icons/AppIcons';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import {
  calculateCandidateChance,
  formatScore,
  getCandidateChance,
  getCandidateTone,
  getCandidateName,
  getCandidateParty,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';
import './MeuPlano.css';

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getAverageChance = (candidates) => average(candidates.map((candidate) => getCandidateChance(candidate)));

const getAverageScore = (candidates) => (
  average(candidates.map((candidate) => getCandidateSystemScore(candidate)).filter((score) => score > 0))
);

const getCandidateNumber = (candidate = {}) => {
  const value = candidate.Numero ?? candidate.numero ?? candidate.number ?? '';
  const normalizedValue = String(value).trim();
  return normalizedValue || '000000';
};

const getCandidateAssessment = (candidate = {}) => {
  const score = getCandidateSystemScore(candidate);
  const chance = getCandidateChance(candidate);

  if (score >= 7 && chance >= 100) return { label: 'Não precisa de mais votos', icon: 'info' };
  if (score >= 7) return { label: 'Precisa de mais votos', icon: 'info' };
  if (score > 0) return { label: 'Mal avaliado', icon: score < 6 ? 'error' : 'info' };
  return { label: 'Sem nota', icon: 'info' };
};

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

function MetricThermometer({ title, value, displayValue, caption, tone = 'viability', locked = false, onLockedClick }) {
  const progress = clampPercent(value);
  const handleClick = () => {
    if (locked) onLockedClick?.();
  };
  const handleKeyDown = (event) => {
    if (locked && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      onLockedClick?.();
    }
  };

  return (
    <article
      className={`my-plan-meter my-plan-meter--${tone} ${locked ? 'is-locked' : ''}`}
      style={{ '--my-plan-meter-value': progress }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="my-plan-meter__gauge" aria-hidden="true">
        <strong>{displayValue}</strong>
      </span>
      <div>
        <h3>{title}</h3>
        <p>{caption}</p>
      </div>
    </article>
  );
}

function CandidateViability({ value, locked = false, onLockedClick }) {
  const progress = clampPercent(value);
  const handleClick = (event) => {
    if (!locked) return;

    event.preventDefault();
    event.stopPropagation();
    onLockedClick?.();
  };
  const handleKeyDown = (event) => {
    if (!locked || !['Enter', ' '].includes(event.key)) return;

    handleClick(event);
  };

  return (
    <span
      className={`my-plan-candidate-viability ${locked ? 'is-locked' : ''}`}
      style={{ '--candidate-plan-progress': progress }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      aria-label={locked ? 'Campo de viabilidade bloqueado' : `Viabilidade ${progress}%`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <strong>{progress}<small>%</small></strong>
      <span>viável</span>
    </span>
  );
}

function CandidateSummaryCard({ candidate, fallbackTitle, onEdit, locked = false, onLockedClick, showIndicators = true }) {
  if (!candidate) {
    return (
      <article className="my-plan-candidate my-plan-candidate--empty">
        <div className="my-plan-candidate__identity">
          <strong>{fallbackTitle}</strong>
          <small>Nº 000000 | Pendente</small>
        </div>
        <button type="button" onClick={onEdit}>Escolher</button>
      </article>
    );
  }

  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const score = getCandidateSystemScore(candidate);
  const chance = getCandidateChance(candidate);
  const tone = locked ? 'neutral' : getCandidateTone(candidate);
  const assessment = getCandidateAssessment(candidate);

  return (
    <article className={`my-plan-candidate my-plan-candidate--${tone} ${showIndicators ? '' : 'my-plan-candidate--draft'}`}>
      <div className="my-plan-candidate__identity">
        <strong>{name || fallbackTitle}</strong>
        <small>Nº {number} | {party || 'Partido não informado'}</small>
        {showIndicators && (
          <span
            className={`my-plan-candidate__assessment my-plan-candidate__assessment--${assessment.icon} ${locked ? 'is-locked' : ''}`}
            role={locked ? 'button' : undefined}
            tabIndex={locked ? 0 : undefined}
            aria-label={locked ? 'Campo de viabilidade bloqueado' : undefined}
            onClick={(event) => {
              if (!locked) return;
              event.preventDefault();
              event.stopPropagation();
              onLockedClick?.();
            }}
            onKeyDown={(event) => {
              if (!locked || !['Enter', ' '].includes(event.key)) return;
              event.preventDefault();
              event.stopPropagation();
              onLockedClick?.();
            }}
          >
            <i aria-hidden="true">{assessment.icon === 'error' ? 'X' : '!'}</i>
            <span>Nota {score > 0 ? formatScore(score) : '--'} | {assessment.label}</span>
          </span>
        )}
      </div>
      {showIndicators ? (
        <CandidateViability value={chance} locked={locked} onLockedClick={onLockedClick} />
      ) : (
        <span className="my-plan-candidate__draft-pill">No rascunho</span>
      )}
    </article>
  );
}

export default function MeuPlano() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktopExperience = useDesktopExperience();
  const isGuestMode = !user?.uid;
  const localDraft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const [remoteDraftState, setRemoteDraftState] = useState({ userId: null, draft: null, loading: false });
  const [candidateDetailsState, setCandidateDetailsState] = useState({ signature: '', candidatesById: new Map(), loading: false });
  const [expandedCandidateGroups, setExpandedCandidateGroups] = useState({ deputados: false, senadores: false });
  const [handoffQrState, setHandoffQrState] = useState({ status: 'idle', url: '', expiresAtMs: null, error: '' });
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
  const handoffDraftPayload = currentDraft?.estado
    ? JSON.stringify({
      estado: currentDraft.estado,
      candidate_groups: currentDraft.candidate_groups,
      selections: currentDraft.selections
    })
    : '';

  useEffect(() => {
    if (!isDesktopExperience || isGuestMode || !handoffDraftPayload) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setHandoffQrState({ status: 'idle', url: '', expiresAtMs: null, error: '' });
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const draftForHandoff = JSON.parse(handoffDraftPayload);
    queueMicrotask(() => {
      if (!cancelled) {
        setHandoffQrState((currentState) => ({
          ...currentState,
          status: 'loading',
          error: ''
        }));
      }
    });

    createPlanHandoffToken(draftForHandoff)
      .then((handoff) => {
        const token = handoff.token;
        if (!token) throw new Error('Token ausente');

        const handoffUrl = `${window.location.origin}${BALLOT_ROUTES.continuarPlano}/${encodeURIComponent(token)}`;
        return QRCode.toDataURL(handoffUrl, {
          width: 190,
          margin: 1,
          color: {
            dark: '#111111',
            light: '#ffffff'
          }
        }).then((url) => ({ url, expiresAtMs: handoff.expires_at_ms || null }));
      })
      .then(({ url, expiresAtMs }) => {
        if (!cancelled) setHandoffQrState({ status: 'ready', url, expiresAtMs, error: '' });
      })
      .catch(() => {
        if (!cancelled) {
          setHandoffQrState({
            status: 'error',
            url: '',
            expiresAtMs: null,
            error: 'QR Code temporário indisponível agora.'
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handoffDraftPayload, isDesktopExperience, isGuestMode]);

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

    const cachedTallies = readCachedTallies(candidateIds);

    Promise.all([
      fetchCandidatesByIds(candidateIds),
      fetchCandidateTallies(candidateIds, { forceRefresh: true }).catch(() => cachedTallies)
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
  }, [selectedCandidateSignature, storedCandidatesSnapshot]);

  const candidatesById = candidateDetailsState.signature === selectedCandidateSignature
    ? candidateDetailsState.candidatesById
    : new Map();
  const deputadosFederais = rawDeputadosFederais.map((candidate) => candidatesById.get(candidate.id) || candidate);
  const senadores = rawSenadores.map((candidate) => candidatesById.get(candidate.id) || candidate);
  const estadoSigla = currentDraft?.estado || userData?.estado || '';
  const estadoNome = estadoSigla ? STATE_NAMES[estadoSigla] || estadoSigla : 'Estado não selecionado';
  const deputadoFederal = deputadosFederais[0] || null;
  const selectedCandidates = [...deputadosFederais, ...senadores].filter(Boolean);
  const planProgress = currentDraft ? getBallotProgress(currentDraft) : null;
  const averageChance = getAverageChance(selectedCandidates);
  const averageScore = getAverageScore(selectedCandidates);
  const scoreMeterValue = averageScore * 10;
  const showAllDeputados = expandedCandidateGroups.deputados;
  const showAllSenadores = expandedCandidateGroups.senadores;
  const visibleDeputadosFederais = showAllDeputados ? deputadosFederais : deputadosFederais.slice(0, 1);
  const visibleSenadores = showAllSenadores ? senadores : senadores.slice(0, 2);
  const hasMoreDeputados = deputadosFederais.length > 1;
  const hasMoreSenadores = senadores.length > 2;
  const profileName = isGuestMode ? 'Visitante' : userData?.name || user?.displayName || 'Usuário';
  const profileEmail = isGuestMode ? 'Rascunho local' : userData?.email || user?.email || '';
  const profileImage = isGuestMode ? '' : userData?.profile_image || user?.photoURL || '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'N';
  const canSharePlan = !isGuestMode && Boolean(deputadosFederais.length > 0 && senadores.length >= 2 && estadoSigla);
  const shareData = canSharePlan ? {
    estadoSigla,
    estadoNome,
    userName: profileName,
    deputado: deputadoFederal,
    senadores: senadores.slice(0, 2),
    url: planUrl
  } : null;
  const deputySummary = deputadoFederal ? getCandidateName(deputadoFederal) : 'Pendente';
  const senatorsSummary = senadores.length > 0
    ? senadores.slice(0, 2).map((candidate) => getCandidateName(candidate)).filter(Boolean).join(', ')
    : 'Pendente';

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

  const toggleCandidateGroup = (group) => {
    setExpandedCandidateGroups((currentGroups) => ({
      ...currentGroups,
      [group]: !currentGroups[group]
    }));
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/', { replace: true });
  };

  if ((!isGuestMode && userLoading) || loadingDraft) {
    return <div className="loading nv-screen" role="status" aria-live="polite">CARREGANDO...</div>;
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
            <span className="my-plan-header__brand-text">nossoVoto<em>.org</em></span>
          </strong>
          <small>Meu plano</small>
        </div>
      </header>

      <main className="my-plan-scroll prototype-scroll nv-scroll">
        <div className="my-plan-shell">
          <section className={`my-plan-status ${isGuestMode ? 'is-guest' : 'is-saved'}`} aria-label="Status do plano">
            <span>{isGuestMode ? 'Rascunho local' : 'Plano salvo'}</span>
            <h1>{isGuestMode ? 'Seu rascunho está pronto' : 'Plano salvo com sucesso'}</h1>
            <p>
              {isGuestMode
                ? 'Seu rascunho está salvo apenas neste dispositivo. Entre para guardar na conta e acessar depois.'
                : 'Suas escolhas foram guardadas na conta e podem ser retomadas em outro dispositivo.'}
            </p>
          </section>

          <section className="my-plan-summary-card" aria-label="Resumo do rascunho">
            <div>
              <span>Estado</span>
              <strong>{estadoNome}{estadoSigla ? ` (${estadoSigla})` : ''}</strong>
            </div>
            <div>
              <span>Deputado Federal</span>
              <strong>{deputySummary}</strong>
            </div>
            <div>
              <span>Senadores</span>
              <strong>{senatorsSummary}</strong>
            </div>
          </section>

          <section className="my-plan-hero" aria-label="Resumo do plano">
            <div className="my-plan-profile">
              {profileImage ? (
                <img src={profileImage} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden="true">{profileInitial}</span>
              )}
              <div>
                <strong>{profileName}</strong>
                {profileEmail && <small>{profileEmail}</small>}
              </div>
            </div>

            <div className="my-plan-state">
              <span>Estado escolhido</span>
              <strong>{estadoNome}{estadoSigla ? ` (${estadoSigla})` : ''}</strong>
            </div>
          </section>

          {!isGuestMode && (
            <section className="my-plan-meters" aria-label="Indicadores do plano">
              <MetricThermometer
                title="Viabilidade geral"
                value={averageChance}
                displayValue={`${Math.round(averageChance)}%`}
                caption="Indicador médio de viabilidade dos candidatos escolhidos."
                tone="viability"
                onLockedClick={handleLockedFieldClick}
              />
              <MetricThermometer
                title="Média das notas"
                value={scoreMeterValue}
                displayValue={averageScore > 0 ? formatScore(averageScore) : '--'}
                caption="Média das notas disponíveis no sistema."
                tone="score"
                onLockedClick={handleLockedFieldClick}
              />
              <p className="my-plan-meters__note">
                Esses termômetros são indicadores neutros baseados nos dados disponíveis. Eles ajudam a revisar o plano, mas não são recomendação absoluta de voto.
              </p>
            </section>
          )}

          <section className="my-plan-section" aria-labelledby="my-plan-candidates-title">
            <div className="my-plan-section__heading">
              <h2 id="my-plan-candidates-title">Candidatos escolhidos</h2>
              <p>Revise os nomes salvos por cargo.</p>
            </div>

            <div className="my-plan-candidate-groups">
              <div className="my-plan-office">
                <div className="my-plan-office__header">
                  <h3>Deputado Federal</h3>
                </div>
                <div className="my-plan-office-candidates" id="my-plan-deputados-list">
                  {deputadosFederais.length > 0 ? visibleDeputadosFederais.map((candidate, index) => (
                    <CandidateSummaryCard
                      key={candidate.id || `deputado-${index}`}
                      candidate={candidate}
                      fallbackTitle={`Deputado Federal ${index + 1}`}
                      onEdit={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
                      onLockedClick={handleLockedFieldClick}
                      showIndicators={!isGuestMode}
                    />
                  )) : (
                    <CandidateSummaryCard
                      candidate={null}
                      fallbackTitle="Deputado Federal"
                      onEdit={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
                    />
                  )}
                </div>
                {hasMoreDeputados && (
                  <button
                    className="my-plan-office__toggle"
                    type="button"
                    aria-expanded={showAllDeputados}
                    aria-controls="my-plan-deputados-list"
                    onClick={() => toggleCandidateGroup('deputados')}
                  >
                    {showAllDeputados ? 'Mostrar menos deputados' : `Ver todos os deputados (${deputadosFederais.length})`}
                  </button>
                )}
              </div>

              <div className="my-plan-office">
                <div className="my-plan-office__header">
                  <h3>Senadores</h3>
                </div>
                <div className="my-plan-office-candidates my-plan-senators" id="my-plan-senadores-list">
                  {senadores.length > 0 ? visibleSenadores.map((candidate, index) => (
                    <CandidateSummaryCard
                      key={candidate.id || `senador-${index}`}
                      candidate={candidate}
                      fallbackTitle={`Senador ${index + 1}`}
                      onEdit={() => handleEdit(BALLOT_ROUTES.senadores)}
                      onLockedClick={handleLockedFieldClick}
                      showIndicators={!isGuestMode}
                    />
                  )) : [0, 1].map((index) => (
                    <CandidateSummaryCard
                      key={`senador-${index}`}
                      candidate={null}
                      fallbackTitle={`Senador ${index + 1}`}
                      onEdit={() => handleEdit(BALLOT_ROUTES.senadores)}
                    />
                  ))}
                </div>
                {hasMoreSenadores && (
                  <button
                    className="my-plan-office__toggle"
                    type="button"
                    aria-expanded={showAllSenadores}
                    aria-controls="my-plan-senadores-list"
                    onClick={() => toggleCandidateGroup('senadores')}
                  >
                    {showAllSenadores ? 'Mostrar menos senadores' : `Ver todos os senadores (${senadores.length})`}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="my-plan-actions" aria-label="Ações do plano">
            {isGuestMode ? (
              <div className="my-plan-save-invite">
                <strong>Salvar rascunho na conta</strong>
                <span>Seu rascunho está salvo apenas neste dispositivo. Entre para guardar na conta e acessar depois.</span>
                <button className="nv-touch" type="button" onClick={handleLogin}>
                  Fazer login para salvar
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

            <button className="my-plan-edit-action nv-touch" type="button" onClick={() => handleEdit(planProgress?.hasDeputadoFederal ? BALLOT_ROUTES.senadores : BALLOT_ROUTES.deputadoFederal)}>
              {isGuestMode ? 'Voltar e editar' : 'Editar escolhas'}
            </button>
          </section>

          {!isGuestMode && (
            <aside className="my-plan-qr" aria-label="Continuar no celular">
              <div>
                <strong>Continuar no celular</strong>
                <span>Escaneie para abrir este plano no celular. O acesso é temporário e funciona uma única vez.</span>
              </div>
              {handoffQrState.status === 'ready' && handoffQrState.url && (
                <img src={handoffQrState.url} alt="QR Code temporário para continuar o plano no celular" />
              )}
              {handoffQrState.status === 'loading' && (
                <span className="my-plan-qr__status">Gerando QR Code temporário...</span>
              )}
              {handoffQrState.status === 'error' && (
                <span className="my-plan-qr__status">{handoffQrState.error}</span>
              )}
              {!handoffDraftPayload && (
                <span className="my-plan-qr__status">Escolha um estado para gerar o QR Code.</span>
              )}
            </aside>
          )}

          {!isGuestMode && (
            <button className="my-plan-logout nv-touch" type="button" onClick={handleLogout}>
              Sair da conta
            </button>
          )}

          <AppFooter className="app-footer--scroll-content" />
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
