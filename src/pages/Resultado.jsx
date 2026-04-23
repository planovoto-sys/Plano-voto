import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import TourModal from '../components/TourModal'; 
import { InfoIcon, ShareSolidIcon } from '../components/AppIcons';
import { auth } from '../services/firebaseConfig';
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

const MEDIA_TESTE = 4;

const Gauge = ({ value, tema }) => {
    const normalizedValue = Math.min(Math.max(value, 0), 10);
    const percent = normalizedValue / 10;
    const targetAngle = (percent * 180) - 90;
    const [currentAngle, setCurrentAngle] = useState(-90);

    useEffect(() => {
        const timer = setTimeout(() => setCurrentAngle(targetAngle), 50);
        return () => clearTimeout(timer);
    }, [targetAngle]);
    
    const data = [ 
        { value: 1, color: '#ff5a36' }, 
        { value: 1, color: '#ffb617' }, 
        { value: 1, color: '#f9e507' }, 
        { value: 1, color: '#abce00' }, 
        { value: 1, color: '#00b71e' } 
    ];

    const colorMode = tema === 'renovar' ? '#ffffff' : '#111111';

    return (
        <div className="gauge-container" id="tour-gauge">
            <div className="gauge-scale-shell">
                <PieChart width={320} height={320}>
                    <Pie data={data} cx={160} cy={150} startAngle={180} endAngle={0} innerRadius={102} outerRadius={130} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={1500} animationEasing="ease" >
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                </PieChart>
                <svg className="gauge-needle-svg" viewBox="0 0 320 320">
                    <g className="gauge-needle-group" style={{ transform: `rotate(${currentAngle}deg)` }}>
                        <polygon points="150,14 170,14 160,62" fill={colorMode} />
                    </g>
                </svg>
                <div className="gauge-text-wrapper">
                    <div className="gauge-text-label" style={{ color: colorMode }}>NOTA</div>
                    <div className="gauge-text-value" style={{ color: colorMode }}>{normalizedValue.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
        </div>
    );
};

export default function Resultado() {
    const { user, userData, userEligibility, loading: userLoading, filtroAtivo } = useUser();
    const navigate = useNavigate();
    const [candidatosCompletos, setCandidatosCompletos] = useState([]);
    const [media, setMedia] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submissionError, setSubmissionError] = useState('');
    const [isTourOpen, setIsTourOpen] = useState(false); 

    const tourSteps = [
        { target: '#tour-gauge', title: 'NOTA', content: 'Mostra a nota do seu voto.<br/><br/><b>Obs.:</b> considera a média das notas dos candidatos selecionados.' },
        { target: '#tour-lista-resultado', title: 'LISTA', content: 'Mostra os candidatos selecionados, sua classificação/nota no Ranking dos Políticos e chances de se eleger.<br/><br/><b>Obs.:</b> compara a intenção de voto no meuvoto.org com a média de votos dos eleitos nas eleições passadas.' }
    ];

    const handleHelpPress = (e) => { const btn = e.currentTarget; btn.classList.add('pulse-anim'); setTimeout(() => btn.classList.remove('pulse-anim'), 400); setIsTourOpen(true); };
    const handleLogout = () => {
        auth.signOut();
        navigate('/');
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

                flowLog('result.load.start', {
                    userId: user.uid,
                    hasReceipt: Boolean(receipt),
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
                if (!receipt && !validation.ok) {
                    flowWarn('result.incomplete-draft.redirect', {
                        code: validation.code,
                        missingOffices: validation.missingOffices,
                        to: progress.nextRoute
                    });
                    navigate(progress.nextRoute, { replace: true });
                    return;
                }

                if (!receipt && !userEligibility?.has_voted && validation.ok) {
                    try {
                        flowLog('result.vote-submit.start', { userId: user.uid });
                        const newReceipt = await castAnonymousVote({
                            user,
                            estado: userData?.estado,
                            draft
                        });
                        saveLastVoteReceipt(user.uid, newReceipt, draft);
                        flowLog('result.vote-submit.success', { receiptCode: newReceipt.receiptCode });
                    } catch (error) {
                        if (error?.code === 'VOTE_ALREADY_CAST') {
                            flowWarn('result.vote-submit.already-voted-showing-local-result', { userId: user.uid });
                        } else {
                            flowError('result.vote-submit.error-showing-local-result', error, { userId: user.uid });
                            setSubmissionError(getVotingErrorMessage(error));
                        }
                    }
                } else if (!receipt && userEligibility?.has_voted) {
                    flowWarn('result.vote-submit.skipped-already-voted-no-receipt', { userId: user.uid });
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

    if (loading) return <div className="loading">CARREGANDO...</div>;
    if (submissionError && candidatosCompletos.length === 0) return <div className="loading">{submissionError}</div>;

    let config = {};
    if (media >= 7) config = { titulo: "GoLAÇO!!!", subtitulo: "SEU VOTO MELHORA O CONGRESSO" };
    else if (media >= 6) config = { titulo: "NA TRAVE!!!", subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO" };
    else config = { titulo: "BOLA FORA!!!", subtitulo: "SEU VOTO PIORA O CONGRESSO" };

    const themeClass = filtroAtivo === 'renovar' ? 'theme-renovar' : 'theme-reeleger';

    return (
        <div className={`select-base-container resultado-scrollable ${themeClass}`}>
            <Sidebar />
            <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

            <div className="top-nav-bar">
                <div className="nav-spacer"></div>
                <div className="top-search-wrapper"><input type="text" value="meuvoto.org" disabled={true} aria-label="Site" /></div>
                <div className="nav-action-right">
                    <button className="desktop-utility-btn" type="button" onClick={handleLogout}>Sair</button>
                    <button className="btn-help-icon top-icon-button" type="button" onClick={handleHelpPress} aria-label="Abrir ajuda"><InfoIcon /></button>
                </div>
            </div>
            <div className="green-banner-selection banner-resultado"><h2>{config.titulo}</h2><div className="triangle-down"></div></div>

            <div className="gauge-wrapper-margin"><Gauge value={media} tema={filtroAtivo} /></div>

            <div className="resultado-subtitle-wrapper"><div className="resultado-subtitle">{config.subtitulo}</div></div>

            <div className="list-wrapper resultado-list-wrapper"><div className="list-scroll-box resultado-scroll-box" id="tour-lista-resultado">
                {candidatosCompletos.map((cand) => (
                    <div className={`base-card ${cand.cardColorClass}`} key={cand.id}><div className="cand-item-layout"><div className="cand-data-left"><div className="res-card-cargo">{cand.Cargo} | {cand.Partido}</div><div className="res-card-numero">{cand.Numero || '0000'}</div><div className="cand-name res-card-nome">{cand.Nome.toUpperCase()}</div></div><div className="cand-rank-score-middle"><div className="badge-rank">{cand.ClassificacaoOficial === "-" ? "-" : `${cand.ClassificacaoOficial}º`}</div><div className="badge-score">{cand.notaFinal.toFixed(2).replace('.', ',')}</div></div><div className="cand-divider-vertical"></div><div className="cand-chart-right"><svg viewBox="0 0 36 36" className="circular-chart"><path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text></svg></div></div></div>
                ))}
            </div></div>

            <div className="resultado-footer-wrapper" id="tour-footer-resultado">
                <footer className="navigation-footer resultado-nav-footer"><button className="nav-btn" type="button" onClick={() => navigate('/escolher-senadores', { state: { bypassVoteRedirect: true } })} aria-label="Voltar" style={{ borderRight: media >= 7 ? '1px solid rgba(244, 235, 147, 0.4)' : 'none' }}><i className="arrow-left"></i></button>{media >= 7 && (<button className="nav-btn" type="button" onClick={() => alert("Link copiado para a área de transferência!")} aria-label="Compartilhar"><ShareSolidIcon /></button>)}</footer>
            </div>
        </div>
    );
}
