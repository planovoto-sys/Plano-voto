import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE } from '@/constants/candidates';
import { STATE_NAMES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import {
    castAnonymousVote,
    getBallotCandidateGroups,
    getBallotProgress,
    getVotingErrorMessage,
    readBallotDraft,
    saveLastVoteReceipt,
    saveBallotStepSelection
} from '@/services/voting/votingService';
import {
    fetchCandidatesByOffice,
    fetchCandidateTallies,
    readCachedCandidatesByOffice,
    readCachedTallies
} from '@/services/candidates/candidateService';
import { shareResult, svgToPngBlob } from '@/services/share/shareResultImage';
import { flowLog, flowWarn } from '@/utils/debugFlow';
import {
    calculateCandidateChance,
    formatScore,
    getCandidateChance,
    getCandidateScore,
    getCandidateScoreTone,
    getDisplayCandidate,
    parseNumeric
} from '@/utils/candidateMetrics';
import { normalizeState } from '@/utils/search';
import AppFooter from '@/components/layout/AppFooter';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import { BackIcon, ShareSolidIcon } from '@/components/icons/AppIcons';
import ShareResultSvg from '@/components/share/ShareResultSvg';
import './Resultado.css';

const getCandidateId = (candidate) => candidate?.id || null;

const enrichCandidate = (candidate, tally, officeKey, rankingTotal) => {
    const selectedByUsers = parseNumeric(
        tally?.total_votes,
        tally?.total_selections,
        candidate.total_selecoes,
        candidate.selecoes_recebidas,
        candidate.selecionado_por,
        candidate.selecionados,
        candidate.votos_recebidos
    );
    const averageElectedVotes = AVERAGE_ELECTED_VOTES_BY_OFFICE[officeKey] || 3;
    const chance = calculateCandidateChance(selectedByUsers, averageElectedVotes);

    return {
        ...candidate,
        nota_final: getCandidateScore(candidate),
        chance,
        selected_by_users: selectedByUsers,
        average_elected_votes: averageElectedVotes,
        ranking_total: rankingTotal
    };
};

const rankCandidates = (candidates, tallies, officeKey, estado) => {
    const normalizedState = normalizeState(estado);
    const filteredCandidates = candidates.filter((candidate) => {
        const candidateState = normalizeState(candidate.Estado || candidate.estado || 'TODOS');
        return candidateState === 'TODOS' || candidateState === normalizedState;
    });

    return filteredCandidates
        .map((candidate) => enrichCandidate(candidate, tallies.get(candidate.id), officeKey, filteredCandidates.length))
        .filter((candidate) => getCandidateScore(candidate) >= 7 && getCandidateChance(candidate) < 100)
        .sort((a, b) => {
            const scoreDiff = getCandidateScore(b) - getCandidateScore(a);
            if (scoreDiff !== 0) return scoreDiff;

            const chanceDiff = getCandidateChance(b) - getCandidateChance(a);
            if (chanceDiff !== 0) return chanceDiff;

            return getDisplayCandidate(a, '', '').nome.localeCompare(getDisplayCandidate(b, '', '').nome);
        });
};

const loadRankedCandidates = async (officeName, officeKey, estado) => {
    const cachedCandidates = readCachedCandidatesByOffice(officeName);
    let candidates = cachedCandidates?.value || [];

    if (!cachedCandidates?.isFresh) {
        try {
            candidates = await fetchCandidatesByOffice(officeName);
        } catch (error) {
            if (candidates.length === 0) throw error;
        }
    }

    const candidateIds = candidates.map((candidate) => candidate.id);
    let tallies = readCachedTallies(candidateIds);

    try {
        tallies = await fetchCandidateTallies(candidateIds);
    } catch {
        // As chances em cache ou zeradas ainda permitem comparar por nota.
    }

    return rankCandidates(candidates, tallies, officeKey, estado);
};

const getSlotRecommendation = (rankedCandidates, currentCandidate, excludedCandidates = [], preferredIndex = 0) => {
    const currentId = getCandidateId(currentCandidate);
    const excludedIds = new Set(excludedCandidates.map(getCandidateId).filter(Boolean));
    const preferredCandidate = rankedCandidates[preferredIndex];

    if (
        preferredCandidate &&
        getCandidateId(preferredCandidate) !== currentId &&
        !excludedIds.has(getCandidateId(preferredCandidate))
    ) {
        return preferredCandidate;
    }

    return rankedCandidates.find((candidate) => {
        const candidateId = getCandidateId(candidate);
        return candidateId !== currentId && !excludedIds.has(candidateId);
    }) || null;
};

function ResultMetric({ label, value, tone }) {
    const numericValue = Number(String(value).replace(',', '.')) || 0;
    const maxValue = label === 'Nota' ? 10 : 100;
    const progress = Math.max(0, Math.min(100, (numericValue / maxValue) * 100));

    return (
        <span className={`metric-circle metric-circle--${tone}`} style={{ '--metric-progress': progress }}>
            <small>{label}</small>
            <strong>{value}</strong>
        </span>
    );
}

function VoteCard({ candidate, fallbackName, defaultNumber, tone = 'neutral' }) {
    const displayCandidate = getDisplayCandidate(candidate, fallbackName, defaultNumber);
    const hasScore = displayCandidate.nota > 0;

    return (
        <article className={`vote-card vote-card--${tone}`}>
            <div className="vote-card__identity">
                <span>{displayCandidate.numero}</span>
                <strong>{displayCandidate.nome}</strong>
                <small>{displayCandidate.partido}</small>
            </div>

            <div className="vote-card__metrics">
                <ResultMetric label="Nota" value={hasScore ? formatScore(displayCandidate.nota) : '--'} tone={tone} />
                <ResultMetric label="Chance" value={displayCandidate.chance} tone={tone} />
            </div>
        </article>
    );
}

export default function Resultado() {
    const { user, userData, userEligibility, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const shareSvgRef = useRef(null);
    const [draft, setDraft] = useState(null);
    const [rankedCandidates, setRankedCandidates] = useState({ deputadoFederal: [], senadores: [] });
    const [openComparison, setOpenComparison] = useState(null);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [shareStatus, setShareStatus] = useState({ type: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) return;

        let cancelled = false;

        queueMicrotask(() => {
            if (cancelled) return;

            if (!user?.uid) {
                navigate('/', { replace: true });
                return;
            }

            const currentDraft = readBallotDraft(user.uid, userData?.estado);
            const progress = getBallotProgress(currentDraft);

            if (!progress.hasEstado) {
                flowWarn('result.no-state.redirect-home', { userId: user.uid });
                navigate('/home', { replace: true });
                return;
            }

            if (!progress.isComplete) {
                flowWarn('result.incomplete-flow.redirect', { userId: user.uid, to: progress.nextRoute });
                navigate(progress.nextRoute, { replace: true, state: { bypassVoteRedirect: true } });
                return;
            }

            flowLog('result.summary.load', { userId: user.uid });
            setDraft(currentDraft);
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [navigate, user?.uid, userData?.estado, userLoading]);

    const groups = useMemo(() => (
        draft ? getBallotCandidateGroups(draft) : {}
    ), [draft]);

    const deputado = groups.deputado_federal?.[0] || null;
    const senador1 = groups.senadores_1?.[0] || null;
    const senador2 = groups.senadores_2?.[0] || null;
    const estadoSigla = draft?.estado || userData?.estado || '';
    const estadoNome = STATE_NAMES[estadoSigla] || estadoSigla || 'Estado não selecionado';

    useEffect(() => {
        if (!draft?.estado) return;

        let cancelled = false;

        const loadRecommendations = async () => {
            try {
                const [deputadoFederal, senadores] = await Promise.all([
                    loadRankedCandidates('Deputado Federal', 'deputado_federal', draft.estado),
                    loadRankedCandidates('Senador', 'senadores', draft.estado)
                ]);

                if (!cancelled) {
                    setRankedCandidates({ deputadoFederal, senadores });
                }
            } catch (error) {
                flowWarn('result.recommendations.fetch-error', { message: error?.message });
            }
        };

        loadRecommendations();

        return () => {
            cancelled = true;
        };
    }, [draft?.estado]);

    const sections = useMemo(() => ([
        {
            id: 'deputado_federal',
            title: 'Deputado federal',
            stepKey: 'deputado_federal',
            candidate: deputado,
            recommendation: getSlotRecommendation(rankedCandidates.deputadoFederal, deputado, [], 0),
            defaultNumber: '00000',
            tone: getCandidateScoreTone(deputado, 'success'),
            recommendationLabel: 'Candidato em destaque'
        },
        {
            id: 'senadores_1',
            title: 'Senador 1/2',
            stepKey: 'senadores_1',
            candidate: senador1,
            recommendation: getSlotRecommendation(rankedCandidates.senadores, senador1, [senador2], 0),
            defaultNumber: '000',
            tone: getCandidateScoreTone(senador1, 'success'),
            recommendationLabel: 'Senador em destaque'
        },
        {
            id: 'senadores_2',
            title: 'Senador 2/2',
            stepKey: 'senadores_2',
            candidate: senador2,
            recommendation: getSlotRecommendation(rankedCandidates.senadores, senador2, [senador1], 1),
            defaultNumber: '000',
            tone: getCandidateScoreTone(senador2, 'danger'),
            recommendationLabel: '2º melhor senador'
        }
    ]), [deputado, rankedCandidates.deputadoFederal, rankedCandidates.senadores, senador1, senador2]);

    const shareScore = useMemo(() => {
        const scores = [deputado, senador1, senador2]
            .map((candidate) => getCandidateScore(candidate))
            .filter((score) => score > 0);

        if (scores.length === 0) return 0;

        return scores.reduce((total, score) => total + score, 0) / scores.length;
    }, [deputado, senador1, senador2]);

    const handleSwapCandidate = (section) => {
        if (!user?.uid || !draft?.estado || !section.recommendation) return;

        const updatedDraft = saveBallotStepSelection(
            user.uid,
            section.stepKey,
            [section.recommendation],
            draft.estado,
            { markCompleted: true }
        );

        setDraft(updatedDraft);
        setOpenComparison(null);
        flowLog('result.recommendation.swap', {
            userId: user.uid,
            stepKey: section.stepKey,
            candidateId: getCandidateId(section.recommendation)
        });
    };

    const navigateToStep = (path) => {
        navigate(path, { state: { bypassVoteRedirect: true } });
    };

    const handleConfirmVote = async () => {
        if (!user?.uid || !draft) return;

        setSubmitting(true);
        setSubmitStatus({ type: '', message: '' });
        setShareStatus({ type: '', message: '' });

        try {
            const receipt = await castAnonymousVote({ user, estado: draft.estado, draft });
            saveLastVoteReceipt(user.uid, receipt, draft);
            setSubmitStatus({
                type: 'success',
                message: `Voto confirmado. Recibo ${receipt.receiptCode}.`
            });
        } catch (error) {
            setSubmitStatus({
                type: 'error',
                message: getVotingErrorMessage(error)
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditChoices = () => {
        navigateToStep(BALLOT_ROUTES.estado);
    };

    const handleShareVote = async () => {
        setSharing(true);
        setShareStatus({ type: '', message: '' });

        try {
            const blob = await svgToPngBlob(shareSvgRef.current);
            const result = await shareResult(blob, {
                fileName: 'meuvoto-resultado.png',
                title: 'Meu Voto',
                text: 'Meu voto no meuvoto.org'
            });

            if (result === 'downloaded') {
                setShareStatus({
                    type: 'success',
                    message: 'Imagem gerada para compartilhamento.'
                });
            } else if (result === 'shared') {
                setShareStatus({
                    type: 'success',
                    message: 'Compartilhamento iniciado.'
                });
            }
        } catch (error) {
            flowWarn('result.share.error', { message: error?.message });
            setShareStatus({
                type: 'error',
                message: 'Não foi possível compartilhar agora. Tente novamente.'
            });
        } finally {
            setSharing(false);
        }
    };

    const voteAlreadyConfirmed = userEligibility?.has_voted === true || submitStatus.type === 'success';

    if (loading || userLoading) return <div className="loading">CARREGANDO...</div>;

    return (
        <div className="resultado-page prototype-page">
            <header className="prototype-header app-page-header">
                <div className="app-page-header__actions">
                    <button
                        className="app-header-back-button"
                        type="button"
                        onClick={() => navigateToStep(BALLOT_ROUTES.senadores)}
                        aria-label="Voltar"
                    >
                        <BackIcon />
                        <span>Voltar</span>
                    </button>
                </div>

                <div className="app-page-header__copy">
                    <h1>MEU VOTO</h1>
                    <p>Confirme seus candidatos antes de votar</p>
                </div>

                <div className="app-page-header__side">
                    <BottomNavigation currentStep="senador" placement="header" />
                </div>
            </header>

            <main className="prototype-scroll resultado-scroll">
                <div className="resultado-review-grid">
                    <div className="resultado-review-heading">
                        <h2>Resumo do seu voto</h2>
                        <p>Revise suas escolhas antes de finalizar.</p>
                    </div>

                    <section className="vote-review-section vote-review-section--state">
                        <div className="vote-section-heading">
                            <h2>Estado</h2>
                            <button className="vote-change-button" type="button" onClick={() => navigateToStep(BALLOT_ROUTES.estado)}>
                                Alterar
                            </button>
                        </div>

                        <article className="state-summary-card">
                            <span>{estadoSigla || '--'}</span>
                            <strong>{estadoNome}</strong>
                        </article>
                    </section>

                    {sections.map((section) => {
                        const isComparing = openComparison === section.id;
                        const showRecommendationButton = Boolean(section.recommendation);

                        return (
                            <section className={`vote-review-section ${isComparing ? 'is-comparing' : ''}`} key={section.id}>
                                <div className="vote-section-heading">
                                    <div className="vote-section-heading__top">
                                        <h2>{section.title}</h2>
                                        <button
                                            className="vote-change-button"
                                            type="button"
                                            onClick={() => navigateToStep(
                                                section.id === 'deputado_federal'
                                                    ? BALLOT_ROUTES.deputadoFederal
                                                    : BALLOT_ROUTES.senadores
                                            )}
                                        >
                                            Alterar
                                        </button>
                                    </div>

                                    <div className="vote-chip-row">
                                      <span className="vote-chip">Escolhido</span>
                                      {showRecommendationButton && (
                                          <button
                                              className="vote-chip vote-chip--wide vote-chip--action"
                                              type="button"
                                              onClick={() => setOpenComparison(isComparing ? null : section.id)}
                                          >
                                              Candidato bem avaliado com maior chance
                                          </button>
                                      )}
                                    </div>
                                </div>

                                <div className={`vote-comparison-grid ${isComparing ? 'is-open' : ''}`}>
                                    <div className="vote-card-column">
                                        <span className="vote-card-label">Sua escolha</span>
                                        <VoteCard
                                            candidate={section.candidate}
                                            fallbackName="CANDIDATO"
                                            defaultNumber={section.defaultNumber}
                                            tone={section.tone}
                                        />
                                    </div>

                                    {isComparing && section.recommendation && (
                                        <div className="vote-card-column vote-card-column--recommended">
                                            <span className="vote-card-label">{section.recommendationLabel}</span>
                                            <VoteCard
                                                candidate={section.recommendation}
                                                fallbackName="CANDIDATO"
                                                defaultNumber={section.defaultNumber}
                                                tone={getCandidateScoreTone(section.recommendation, 'success')}
                                            />
                                            <div className="vote-recommendation-actions">
                                                <button type="button" onClick={() => handleSwapCandidate(section)}>
                                                    Trocar por este candidato
                                                </button>
                                                <button type="button" onClick={() => setOpenComparison(null)}>
                                                    Manter minha escolha
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}

                    <section className="vote-final-actions" aria-live="polite">
                        {submitStatus.message && (
                            <p className={`vote-submit-message vote-submit-message--${submitStatus.type}`}>
                                {submitStatus.message}
                            </p>
                        )}
                        {shareStatus.message && (
                            <p className={`vote-submit-message vote-submit-message--${shareStatus.type}`}>
                                {shareStatus.message}
                            </p>
                        )}
                        <button
                            className="vote-confirm-button"
                            type="button"
                            onClick={handleConfirmVote}
                            disabled={submitting || voteAlreadyConfirmed}
                        >
                            {voteAlreadyConfirmed ? 'Voto confirmado' : submitting ? 'Confirmando...' : 'Confirmar meu voto'}
                        </button>
                        {voteAlreadyConfirmed && (
                            <div className="vote-post-confirm-actions">
                                <button className="vote-secondary-action" type="button" onClick={handleEditChoices}>
                                    Editar escolhas
                                </button>
                                <button className="vote-secondary-action vote-secondary-action--share" type="button" onClick={handleShareVote} disabled={sharing}>
                                    <ShareSolidIcon />
                                    <span>{sharing ? 'Preparando...' : 'Compartilhar'}</span>
                                </button>
                            </div>
                        )}
                    </section>
                </div>
                <div className="share-preview-hidden" aria-hidden="true">
                    <ShareResultSvg ref={shareSvgRef} score={shareScore} />
                </div>
                <AppFooter className="app-footer--scroll-content" />
            </main>

            <BottomNavigation currentStep="senador" placement="footer" />
        </div>
    );
}
