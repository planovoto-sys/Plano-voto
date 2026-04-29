import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ShareSolidIcon } from '../components/AppIcons';
import ShareResultSvg from '../components/ShareResultSvg';
import {
    castAnonymousVote,
    fetchCandidatesByIds,
    getBallotProgress,
    getCandidateIdsFromDraft,
    getVotingErrorMessage,
    readBallotDraft,
    readLastVoteReceipt,
    saveLastVoteReceipt,
    validateCompleteBallot
} from '../services/votingService';
import { flowError, flowLog, flowWarn } from '../services/debugFlow';
import {
    GAUGE_PATH,
    GAUGE_POINTER_LENGTH,
    GAUGE_SEGMENTS,
    getGaugePointerOffset,
    getGaugeProgress,
    getGaugeSegmentFill,
    normalizeGaugeScore
} from '../utils/gaugeSvg';
import { shareResult, svgToPngBlob } from '../utils/shareResultImage';
import './Resultado.css';

const MEDIA_TESTE = 4;

const CHANCE_RING_PATH = 'M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831';

const formatScore = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

const formatRank = (value) => (value === '-' ? '-' : `${value}º`);

const Gauge = ({ value }) => {
    const normalizedValue = normalizeGaugeScore(value);
    const progress = getGaugeProgress(normalizedValue);
    const pointerOffset = getGaugePointerOffset(progress);

    return (
        <div className="resultado-gauge" id="tour-gauge">
            <svg className="resultado-gauge__svg" viewBox="0 0 320 188" role="img" aria-label={`Nota do voto ${formatScore(normalizedValue)}`}>
                {GAUGE_SEGMENTS.map((segment) => (
                    <path
                        key={`track-${segment.offset}-${segment.length}`}
                        className="resultado-gauge__segment resultado-gauge__segment--track"
                        d={GAUGE_PATH}
                        pathLength="100"
                        strokeDasharray={`${segment.length} 100`}
                        strokeDashoffset={-segment.offset}
                        stroke={segment.color}
                    />
                ))}

                {GAUGE_SEGMENTS.map((segment) => {
                    const filledLength = getGaugeSegmentFill(segment, progress);
                    if (filledLength <= 0) return null;

                    return (
                        <path
                            key={`fill-${segment.offset}-${segment.length}`}
                            className="resultado-gauge__segment resultado-gauge__segment--fill"
                            d={GAUGE_PATH}
                            pathLength="100"
                            strokeDasharray={`${filledLength} 100`}
                            strokeDashoffset={-segment.offset}
                            stroke={segment.color}
                        />
                    );
                })}

                <path
                    className="resultado-gauge__pointer"
                    d={GAUGE_PATH}
                    pathLength="100"
                    strokeDasharray={`${GAUGE_POINTER_LENGTH} 100`}
                    strokeDashoffset={-pointerOffset}
                />

                <text x="160" y="96" className="resultado-gauge__label">NOTA</text>
                <text x="160" y="146" className="resultado-gauge__value">{formatScore(normalizedValue)}</text>
            </svg>
        </div>
    );
};

export default function Resultado() {
    const { user, userData, userEligibility, loading: userLoading, filtroAtivo } = useUser();
    const navigate = useNavigate();
    const shareSvgRef = useRef(null);
    const [candidatosCompletos, setCandidatosCompletos] = useState([]);
    const [media, setMedia] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submissionError, setSubmissionError] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [voteReceipt, setVoteReceipt] = useState(null);

    const handleShare = async () => {
        if (!shareSvgRef.current || isSharing) return;

        setIsSharing(true);
        try {
            const imageBlob = await svgToPngBlob(shareSvgRef.current);
            const formattedScore = formatScore(media);
            const normalizedFileScore = formattedScore.replace(',', '-');

            await shareResult(imageBlob, {
                fileName: `meuvoto-${normalizedFileScore}.png`,
                title: `${config.titulo} ${formattedScore}`,
                text: config.subtitulo
            });
        } catch (error) {
            flowError('result.share-image.error', error, { media });
            alert('Nao foi possivel gerar a imagem para compartilhar agora.');
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        if (userLoading || !user?.uid) return;
        let isMounted = true;

        const carregarDados = async () => {
            try {
                setLoading(true);
                setSubmissionError('');

                const draft = readBallotDraft(user.uid, userData?.estado);
                const receipt = readLastVoteReceipt(user.uid);
                const progress = getBallotProgress(draft);
                const idsDoRecibo = receipt?.candidate_ids || [];
                const idsDoRascunho = getCandidateIdsFromDraft(draft);
                const candidateIds = idsDoRecibo.length > 0 ? idsDoRecibo : idsDoRascunho;
                const hasReceipt = Boolean(receipt);

                flowLog('result.load.start', {
                    userId: user.uid,
                    hasReceipt,
                    hasVoted: userEligibility?.has_voted === true,
                    progress,
                    candidateIds
                });

                if (candidateIds.length === 0) {
                    flowWarn('result.no-candidates.redirect', { to: progress.nextRoute });
                    navigate(progress.nextRoute, { replace: true });
                    return;
                }

                const validation = validateCompleteBallot(draft);
                if (!hasReceipt && !validation.ok) {
                    flowWarn('result.incomplete-draft.redirect', {
                        code: validation.code,
                        missingOffices: validation.missingOffices,
                        to: progress.nextRoute
                    });
                    navigate(progress.nextRoute, { replace: true });
                    return;
                }

                if (!hasReceipt && userEligibility?.has_voted) {
                    flowWarn('result.vote-submit.skipped-already-voted-no-receipt', { userId: user.uid });
                    setVoteReceipt(null);
                    setPendingDraft(null);
                    setIsAwaitingConfirmation(false);
                    setSubmissionError('Seu voto consta como registrado, mas este navegador nao tem o recibo local. Por seguranca, nao exibimos um resultado que nao conseguimos confirmar.');
                    setCandidatosCompletos([]);
                    return;
                }

                const candidatos = await fetchCandidatesByIds(candidateIds);
                flowLog('result.candidates.loaded', { requested: candidateIds.length, loaded: candidatos.length });
                let soma = 0; const lista = [];

                candidatos.forEach((candidate) => {
                    const d = candidate;
                    const valCand = d["Nota candidato"]; const valPart = d["Nota partido"];
                    const isNotaValida = (val) => val !== undefined && val !== null && val !== "" && val !== "-";
                    let notaFinal = 0;
                    if (isNotaValida(valCand) && Number(valCand) !== 0) notaFinal = parseFloat(valCand);
                    else if (isNotaValida(valPart)) notaFinal = parseFloat(valPart);

                    const votos = d.votos_recebidos || 0; const porcentagem = (votos / MEDIA_TESTE) * 100;
                    soma += notaFinal;
                    
                    let cardColorClass = 'card-green';
                    if (notaFinal < 7) {
                        cardColorClass = 'card-red'; 
                    }

                    lista.push({ id: candidate.id, ...d, ClassificacaoOficial: d["Classificação"] || d["Classificacao"] || "-", notaFinal: notaFinal, cardColorClass: cardColorClass, porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0) });
                });
                if (!isMounted) return;
                setMedia(lista.length > 0 ? soma / lista.length : 0);
                setCandidatosCompletos(lista);
                setVoteReceipt(receipt || null);
                setPendingDraft(!hasReceipt && validation.ok ? validation.normalizedDraft : null);
                setIsAwaitingConfirmation(!hasReceipt && validation.ok);
            } catch (error) {
                flowError('result.load.error', error, { userId: user?.uid }); 
                console.error("Erro:", error);
                if (isMounted) setSubmissionError(getVotingErrorMessage(error));
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        carregarDados();
        return () => {
            isMounted = false;
        };
    }, [navigate, user, userData?.estado, userEligibility?.has_voted, userLoading]);

    const handleConfirmVote = async () => {
        if (!user?.uid || !pendingDraft || isSubmittingVote) return;

        setIsSubmittingVote(true);
        setSubmissionError('');
        try {
            flowLog('result.vote-submit.start', { userId: user.uid });
            const newReceipt = await castAnonymousVote({
                user,
                estado: userData?.estado,
                draft: pendingDraft
            });
            const storedReceipt = saveLastVoteReceipt(user.uid, newReceipt, pendingDraft);
            setVoteReceipt(storedReceipt);
            setIsAwaitingConfirmation(false);
            setPendingDraft(null);
            flowLog('result.vote-submit.success', { receiptCode: newReceipt.receiptCode });
        } catch (error) {
            flowError('result.vote-submit.error', error, { userId: user.uid });
            setVoteReceipt(null);
            setIsAwaitingConfirmation(true);
            setSubmissionError(getVotingErrorMessage(error));
        } finally {
            setIsSubmittingVote(false);
        }
    };

    if (loading) return <div className="loading">CARREGANDO...</div>;
    if (submissionError && candidatosCompletos.length === 0) return <div className="loading">{submissionError}</div>;

    const isConfirmedResult = Boolean(voteReceipt) && !isAwaitingConfirmation;
    const showConfirmButton = isAwaitingConfirmation;
    const showShareButton = isConfirmedResult && media >= 7;
    const footerClass = showConfirmButton || showShareButton ? 'resultado-page__footer--share' : 'resultado-page__footer--single';

    let config = {};
    if (showConfirmButton) config = { titulo: "REVISAR VOTO", subtitulo: "CONFIRME PARA REGISTRAR SEU VOTO" };
    else if (media >= 7) config = { titulo: "GOLAÇO!!!", subtitulo: "MEU VOTO MELHORA O CONGRESSO" };
    else if (media >= 6) config = { titulo: "NA TRAVE!!!", subtitulo: "MEU VOTO NÃO MELHORA O CONGRESSO" };
    else config = { titulo: "BOLA FORA!!!", subtitulo: "MEU VOTO PIORA O CONGRESSO" };

    return (
        <div className={`resultado-page ${filtroAtivo === 'renovar' ? 'theme-renovar' : 'theme-reeleger'}`}>
            <Sidebar />
            <div className="share-result-svg-host" aria-hidden="true">
                <ShareResultSvg ref={shareSvgRef} score={media} />
            </div>

            <header className="resultado-page__topbar">
                <div className="resultado-page__topbar-slot" aria-hidden="true"></div>
                <div className="resultado-page__search-pill">
                    <input type="text" value="meuvoto.org" disabled={true} aria-label="Site" />
                </div>
            </header>

            <section className="resultado-page__banner">
                <h1>{config.titulo}</h1>
                <div className="resultado-page__banner-notch"></div>
            </section>

            <main className="resultado-page__content">
                <section className="resultado-page__score-block">
                    <Gauge value={media} />
                    <p className="resultado-page__subtitle">{config.subtitulo}</p>
                </section>

                <section className="resultado-page__cards-section">
                    <div className="resultado-page__cards" id="tour-lista-resultado">
                        {candidatosCompletos.map((cand) => {
                            const cardTone = cand.cardColorClass === 'card-red' ? 'resultado-page__card--negative' : 'resultado-page__card--positive';

                            return (
                                <article className={`resultado-page__card ${cardTone}`} key={cand.id}>
                                    <div className="resultado-page__card-main">
                                        <p className="resultado-page__card-meta">{`${(cand.Cargo || '').toUpperCase()} | ${(cand.Partido || '').toUpperCase()}`}</p>
                                        <p className="resultado-page__card-number">{cand.Numero || '00000'}</p>
                                        <h2 className="resultado-page__card-name">{(cand.Nome || '').toUpperCase()}</h2>
                                    </div>

                                    <div className="resultado-page__card-badges">
                                        <span className="resultado-page__badge">
                                            <span className="resultado-page__indicator-label">Ranking</span>
                                            <span className="resultado-page__indicator-value">{formatRank(cand.ClassificacaoOficial)}</span>
                                        </span>
                                        <span className="resultado-page__badge">
                                            <span className="resultado-page__indicator-label">Nota</span>
                                            <span className="resultado-page__indicator-value">{formatScore(cand.notaFinal)}</span>
                                        </span>
                                    </div>

                                    <div className="resultado-page__card-divider"></div>

                                    <div className="resultado-page__card-chart">
                                        <svg viewBox="0 0 36 36" className="resultado-page__chance-chart" aria-label={`Chance de eleicao ${cand.porcentagemCalculada}`}>
                                            <path className="resultado-page__chance-track" d={CHANCE_RING_PATH} />
                                            <path className="resultado-page__chance-progress" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d={CHANCE_RING_PATH} />
                                            <text x="18" y="14.25" className="resultado-page__chance-caption">Chance</text>
                                            <text x="18" y="23.7" className="resultado-page__chance-label">{cand.porcentagemCalculada}</text>
                                        </svg>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {submissionError && candidatosCompletos.length > 0 && (
                    <div className="resultado-page__notice" role="status">{submissionError}</div>
                )}

                {showConfirmButton && !submissionError && (
                    <div className="resultado-page__notice" role="status">Confira suas escolhas. Seu voto ainda nao foi registrado.</div>
                )}
            </main>

            <div className="resultado-page__footer-wrap">
                <footer className={`resultado-page__footer ${footerClass}`} id="tour-footer-resultado">
                    <button className="resultado-page__footer-button" type="button" onClick={() => navigate('/escolher-senadores', { state: { bypassVoteRedirect: true } })} aria-label="Voltar">
                        <span className="resultado-page__arrow resultado-page__arrow--left"></span>
                    </button>

                    {showConfirmButton && (
                        <button className="resultado-page__footer-button resultado-page__footer-button--confirm" type="button" onClick={handleConfirmVote} aria-label="Confirmar voto" disabled={isSubmittingVote}>
                            <span className="resultado-page__footer-confirm-label">{isSubmittingVote ? 'ENVIANDO' : 'CONFIRMAR'}</span>
                        </button>
                    )}

                    {showShareButton && (
                        <button className="resultado-page__footer-button" type="button" onClick={handleShare} aria-label="Compartilhar" disabled={isSharing}>
                            <ShareSolidIcon className="resultado-page__share-icon" />
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
