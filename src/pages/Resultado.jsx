import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import TourModal from '../components/TourModal'; 
import { InfoIcon, ShareSolidIcon } from '../components/AppIcons';
import {
    castAnonymousVote,
    fetchCandidatesByIds,
    getCandidateIdsFromDraft,
    getVotingErrorMessage,
    readBallotDraft,
    readLastVoteReceipt,
    saveLastVoteReceipt,
    validateCompleteBallot
} from '../services/votingService';

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
        { value: 1, color: '#ff3b3b' }, 
        { value: 1, color: '#ff9800' }, 
        { value: 1, color: '#ffeb3b' }, 
        { value: 1, color: '#8bc34a' }, 
        { value: 1, color: '#4caf50' } 
    ];

    const colorMode = tema === 'renovar' ? '#ffffff' : '#111111';

    return (
        <div className="gauge-container" id="tour-gauge">
            <PieChart width={320} height={320}>
                {/* innerRadius alterado para 102 para deixar o arco cerca de 30% mais fino */}
                <Pie data={data} cx={160} cy={150} startAngle={180} endAngle={0} innerRadius={102} outerRadius={130} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={1500} animationEasing="ease" >
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
            </PieChart>
            <svg className="gauge-needle-svg" viewBox="0 0 320 320">
                <g className="gauge-needle-group" style={{ transform: `rotate(${currentAngle}deg)` }}>
                    <polygon points="148,20 172,20 160,60" fill={colorMode} />
                </g>
            </svg>
            <div className="gauge-text-wrapper">
                <div className="gauge-text-label" style={{ color: colorMode }}>NOTA</div>
                <div className="gauge-text-value" style={{ color: colorMode }}>{normalizedValue.toFixed(2).replace('.', ',')}</div>
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

    useEffect(() => {
        if (userLoading || !user?.uid) return;
        let isMounted = true;

        const carregarDados = async () => {
            try {
                setLoading(true);
                setSubmissionError('');

                const draft = readBallotDraft(user.uid, userData?.estado);
                const receipt = readLastVoteReceipt(user.uid);
                const idsDoRecibo = receipt?.candidate_ids || [];
                const idsDoRascunho = getCandidateIdsFromDraft(draft);
                const candidateIds = idsDoRecibo.length > 0 ? idsDoRecibo : idsDoRascunho;

                if (candidateIds.length === 0) {
                    navigate('/', { replace: true });
                    return;
                }

                const validation = validateCompleteBallot(draft);
                if (!receipt && !validation.ok) {
                    navigate('/', { replace: true });
                    return;
                }

                if (!receipt && userEligibility?.has_voted) {
                    navigate('/', { replace: true });
                    return;
                }

                if (!receipt && !userEligibility?.has_voted && validation.ok) {
                    try {
                        const newReceipt = await castAnonymousVote({
                            user,
                            estado: userData?.estado,
                            draft
                        });
                        saveLastVoteReceipt(user.uid, newReceipt, draft);
                    } catch (error) {
                        if (error?.code === 'VOTE_ALREADY_CAST') {
                            navigate('/', { replace: true });
                            return;
                        }
                        throw error;
                    }
                }

                const candidatos = await fetchCandidatesByIds(candidateIds);
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
    if (media >= 7) config = { titulo: "PARABÉNS!", subtitulo: "SEU VOTO MELHORA O CONGRESSO" };
    else if (media >= 6) config = { titulo: "NA TRAVE!!!", subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO" };
    else config = { titulo: "BOLA FORA!!!", subtitulo: "SEU VOTO PIORA O CONGRESSO" };

    const themeClass = filtroAtivo === 'renovar' ? 'theme-renovar' : 'theme-reeleger';

    return (
        <div className={`select-base-container resultado-scrollable ${themeClass}`}>
            <Sidebar />
            <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

            <div className="top-nav-bar"><div className="nav-spacer"></div><div className="top-search-wrapper"><input type="text" value="meuvoto.org" disabled={true} aria-label="Site" /></div><div className="nav-action-right"><button className="btn-help-icon top-icon-button" type="button" onClick={handleHelpPress} aria-label="Abrir ajuda"><InfoIcon /></button></div></div>
            <div className="green-banner-selection banner-resultado"><h2>{config.titulo}</h2><div className="triangle-down"></div></div>

            <div className="gauge-wrapper-margin"><Gauge value={media} tema={filtroAtivo} /></div>

            <div className="resultado-subtitle-wrapper"><div className="resultado-subtitle">{config.subtitulo}</div></div>

            <div className="list-wrapper resultado-list-wrapper"><div className="list-scroll-box resultado-scroll-box" id="tour-lista-resultado">
                {candidatosCompletos.map((cand) => (
                    <div className={`base-card ${cand.cardColorClass}`} key={cand.id}><div className="cand-item-layout"><div className="cand-data-left"><div className="res-card-cargo">{cand.Cargo} | {cand.Partido}</div><div className="res-card-numero">{cand.Numero || '0000'}</div><div className="cand-name res-card-nome">{cand.Nome.toUpperCase()}</div></div><div className="cand-rank-score-middle"><div className="badge-rank">{cand.ClassificacaoOficial === "-" ? "-" : `${cand.ClassificacaoOficial}º`}</div><div className="badge-score">{cand.notaFinal.toFixed(2).replace('.', ',')}</div></div><div className="cand-divider-vertical"></div><div className="cand-chart-right"><svg viewBox="0 0 36 36" className="circular-chart"><path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text></svg></div></div></div>
                ))}
            </div></div>

            <div className="resultado-footer-wrapper" id="tour-footer-resultado">
                <footer className="navigation-footer resultado-nav-footer"><button className="nav-btn" type="button" onClick={() => navigate(-1)} aria-label="Voltar" style={{ borderRight: media >= 7 ? '1px solid rgba(244, 235, 147, 0.4)' : 'none' }}><i className="arrow-left"></i></button>{media >= 7 && (<button className="nav-btn" type="button" onClick={() => alert("Link copiado para a área de transferência!")} aria-label="Compartilhar"><ShareSolidIcon /></button>)}</footer>
            </div>
        </div>
    );
}
