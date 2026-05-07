import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import AppFooter from '../components/AppFooter';
import {
    BALLOT_ROUTES,
    castAnonymousVote,
    getBallotCandidateGroups,
    getBallotProgress,
    getVotingErrorMessage,
    readBallotDraft,
    saveLastVoteReceipt,
    saveBallotStepSelection
} from '../services/votingService';
import {
    fetchCandidatesByOffice,
    fetchCandidateTallies,
    readCachedCandidatesByOffice,
    readCachedTallies
} from '../services/candidateService';
import { flowLog, flowWarn } from '../services/debugFlow';
import './Resultado.css';

const AVERAGE_ELECTED_VOTES_BY_OFFICE = {
    deputado_federal: 3,
    senadores: 3
};
const STATE_NAMES = {
    AC: 'Acre',
    AL: 'Alagoas',
    AM: 'Amazonas',
    AP: 'Amapá',
    BA: 'Bahia',
    CE: 'Ceará',
    DF: 'Distrito Federal',
    ES: 'Espírito Santo',
    GO: 'Goiás',
    MA: 'Maranhão',
    MG: 'Minas Gerais',
    MS: 'Mato Grosso do Sul',
    MT: 'Mato Grosso',
    PA: 'Pará',
    PB: 'Paraíba',
    PE: 'Pernambuco',
    PI: 'Piauí',
    PR: 'Paraná',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RO: 'Rondônia',
    RR: 'Roraima',
    RS: 'Rio Grande do Sul',
    SC: 'Santa Catarina',
    SE: 'Sergipe',
    SP: 'São Paulo',
    TO: 'Tocantins'
};

const parseNumeric = (...values) => {
    for (const value of values) {
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) return numericValue;
    }

    return 0;
};

const normalizeState = (value) => (
    String(value || '')
        .replace(/[\s\u00A0]+/g, '')
        .toUpperCase()
);

const getCandidateId = (candidate) => candidate?.id || null;

const formatScore = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

const getCandidateScore = (candidate) => {
    if (!candidate) return 0;
    if (candidate.temNotaCandidato === false) return 0;

    const candidateScore = candidate.nota_final ?? candidate.notaFinal ?? candidate['Nota candidato'];
    const partyScore = candidate['Nota partido'];
    const numericCandidateScore = Number(candidateScore);

    if (Number.isFinite(numericCandidateScore) && numericCandidateScore !== 0) {
        return numericCandidateScore;
    }

    const numericPartyScore = Number(partyScore);
    return Number.isFinite(numericPartyScore) ? numericPartyScore : 0;
};

const getCandidateChance = (candidate) => {
    if (!candidate) return 0;

    const directValue = candidate.chance ?? candidate.Chance;
    const directNumeric = Number(directValue);
    if (Number.isFinite(directNumeric)) return Math.max(0, Math.min(100, Math.round(directNumeric)));

    const selectedByUsers = Number(
        candidate.selected_by_users ??
        candidate.selectedByUsers ??
        candidate.total_selecoes ??
        candidate.votos_recebidos ??
        0
    );
    const averageElectedVotes = Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 3);
    if (!Number.isFinite(selectedByUsers) || !Number.isFinite(averageElectedVotes) || averageElectedVotes <= 0) return 0;

    return Math.max(0, Math.min(100, Math.round((selectedByUsers / averageElectedVotes) * 100)));
};

const getCandidateTone = (candidate, fallback = 'neutral') => {
    if (!candidate) return fallback;
    if (getCandidateChance(candidate) >= 100) return 'neutral';
    if (getCandidateScore(candidate) <= 0) return 'new';
    return getCandidateScore(candidate) < 7 ? 'danger' : 'success';
};

const getDisplayCandidate = (candidate, fallbackName, defaultNumber) => ({
    numero: candidate?.numero || candidate?.Numero || defaultNumber,
    nome: candidate?.nome || candidate?.Nome || fallbackName,
    partido: candidate?.partido || candidate?.Partido || 'PARTIDO',
    nota: getCandidateScore(candidate),
    chance: getCandidateChance(candidate)
});

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
    const chance = Math.max(0, Math.min(100, Math.round((selectedByUsers / averageElectedVotes) * 100)));

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
    const [draft, setDraft] = useState(null);
    const [rankedCandidates, setRankedCandidates] = useState({ deputadoFederal: [], senadores: [] });
    const [openComparison, setOpenComparison] = useState(null);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
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
            tone: getCandidateTone(deputado, 'success'),
            recommendationLabel: 'Candidato em destaque'
        },
        {
            id: 'senadores_1',
            title: 'Senador 1/2',
            stepKey: 'senadores_1',
            candidate: senador1,
            recommendation: getSlotRecommendation(rankedCandidates.senadores, senador1, [senador2], 0),
            defaultNumber: '000',
            tone: getCandidateTone(senador1, 'success'),
            recommendationLabel: 'Senador em destaque'
        },
        {
            id: 'senadores_2',
            title: 'Senador 2/2',
            stepKey: 'senadores_2',
            candidate: senador2,
            recommendation: getSlotRecommendation(rankedCandidates.senadores, senador2, [senador1], 1),
            defaultNumber: '000',
            tone: getCandidateTone(senador2, 'danger'),
            recommendationLabel: '2º melhor senador'
        }
    ]), [deputado, rankedCandidates.deputadoFederal, rankedCandidates.senadores, senador1, senador2]);

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

    const voteAlreadyConfirmed = userEligibility?.has_voted === true || submitStatus.type === 'success';

    if (loading || userLoading) return <div className="loading">CARREGANDO...</div>;

    return (
        <div className="resultado-page prototype-page">
            <header className="prototype-header app-page-header">
                <div className="app-page-header__copy">
                    <h1>MEU VOTO</h1>
                    <p>Confirme seus candidatos antes de votar</p>
                </div>

                <div className="app-page-header__side">
                    <BottomNavigation currentStep="resultado" placement="header" />
                    <div className="app-page-header__actions">
                        <button
                            className="app-header-action app-header-action--secondary"
                            type="button"
                            onClick={() => navigateToStep(BALLOT_ROUTES.senador2)}
                        >
                            ← Voltar
                        </button>
                    </div>
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
                                                    : section.id === 'senadores_1'
                                                        ? BALLOT_ROUTES.senador1
                                                        : BALLOT_ROUTES.senador2
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
                                                tone={getCandidateTone(section.recommendation, 'success')}
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
                        <button
                            className="vote-confirm-button"
                            type="button"
                            onClick={handleConfirmVote}
                            disabled={submitting || voteAlreadyConfirmed}
                        >
                            {voteAlreadyConfirmed ? 'Voto confirmado' : submitting ? 'Confirmando...' : 'Confirmar meu voto'}
                        </button>
                    </section>
                </div>
                <AppFooter className="app-footer--mobile-only" />
            </main>

            <BottomNavigation currentStep="resultado" placement="footer" />
        </div>
    );
}
