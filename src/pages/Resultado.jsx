import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import {
    getBallotCandidateGroups,
    getBallotProgress,
    readBallotDraft
} from '../services/votingService';
import { flowLog, flowWarn } from '../services/debugFlow';
import './Resultado.css';

const formatScore = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

const getCandidateScore = (candidate = {}) => {
    const value = candidate.nota_final ?? candidate.notaFinal ?? 0;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const getCandidateChance = (candidate = {}) => {
    const directValue = candidate.chance ?? candidate.Chance;
    const directNumeric = Number(directValue);
    if (Number.isFinite(directNumeric)) return Math.max(0, Math.min(100, Math.round(directNumeric)));

    const selectedByUsers = Number(candidate.selected_by_users ?? candidate.selectedByUsers ?? 0);
    const averageElectedVotes = Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 3);
    if (!Number.isFinite(selectedByUsers) || !Number.isFinite(averageElectedVotes) || averageElectedVotes <= 0) return 0;

    return Math.max(0, Math.min(100, Math.round((selectedByUsers / averageElectedVotes) * 100)));
};

const getCandidateTone = (candidate, fallback = 'neutral') => {
    if (!candidate) return fallback;
    if (getCandidateChance(candidate) >= 100) return 'neutral';
    return getCandidateScore(candidate) < 7 ? 'danger' : 'success';
};

const getDisplayCandidate = (candidate, fallbackName, defaultNumber) => ({
    numero: candidate?.numero || candidate?.Numero || defaultNumber,
    nome: candidate?.nome || candidate?.Nome || fallbackName,
    partido: candidate?.partido || candidate?.Partido || 'PARTIDO',
    nota: getCandidateScore(candidate),
    chance: getCandidateChance(candidate)
});

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

    return (
        <article className={`vote-card vote-card--${tone}`}>
            <div className="vote-card__identity">
                <span>{displayCandidate.numero}</span>
                <strong>{displayCandidate.nome}</strong>
                <small>{displayCandidate.partido}</small>
            </div>

            <div className="vote-card__metrics">
                <ResultMetric label="Nota" value={formatScore(displayCandidate.nota)} tone={tone} />
                <ResultMetric label="Chance" value={displayCandidate.chance} tone={tone} />
            </div>
        </article>
    );
}

export default function Resultado() {
    const { user, userData, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const [draft, setDraft] = useState(null);
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
                </div>
            </header>

            <main className="prototype-scroll resultado-scroll">
                <div className="resultado-review-grid">
                    <section className="vote-review-section">
                        <h2>Deputado federal</h2>
                        <div className="vote-chip-row">
                            <span className="vote-chip">Escolhido</span>
                        </div>
                        <VoteCard
                            candidate={deputado}
                            fallbackName="CANDIDATO"
                            defaultNumber="00000"
                            tone="neutral"
                        />
                    </section>

                    <section className="vote-review-section">
                        <h2>Senador 1/2</h2>
                        <div className="vote-chip-row">
                            <span className="vote-chip">Escolhido</span>
                            <span className="vote-chip vote-chip--wide">Candidato bem avaliado com maior chance</span>
                        </div>
                        <VoteCard
                            candidate={senador1}
                            fallbackName="CANDIDATO"
                            defaultNumber="000"
                            tone={getCandidateTone(senador1, 'success')}
                        />
                    </section>

                    <section className="vote-review-section">
                        <h2>Senador 2/2</h2>
                        <div className="vote-chip-row">
                            <span className="vote-chip">Escolhido</span>
                            <span className="vote-chip vote-chip--wide">Candidato bem avaliado com maior chance</span>
                        </div>
                        <VoteCard
                            candidate={senador2}
                            fallbackName="CANDIDATO"
                            defaultNumber="000"
                            tone={getCandidateTone(senador2, 'danger')}
                        />
                    </section>
                </div>
            </main>

            <BottomNavigation currentStep="resultado" placement="footer" />
        </div>
    );
}
