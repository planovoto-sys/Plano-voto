import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import TourModal from '../components/TourModal'; 

const MEDIA_TESTE = 4;

const ShareIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f5eea9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
);

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
    const { userData, loading: userLoading, filtroAtivo } = useUser();
    const navigate = useNavigate();
    const [candidatosCompletos, setCandidatosCompletos] = useState([]);
    const [media, setMedia] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isTourOpen, setIsTourOpen] = useState(false); 

    const tourSteps = [
        { target: '#tour-gauge', title: 'NOTA', content: 'Mostra a nota do seu voto.<br/><br/><b>Obs.:</b> considera a média das notas dos candidatos selecionados.' },
        { target: '#tour-lista-resultado', title: 'LISTA', content: 'Mostra os candidatos selecionados, sua classificação/nota no Ranking dos Políticos e chances de se eleger.<br/><br/><b>Obs.:</b> compara a intenção de voto no meuvoto.org com a média de votos dos eleitos nas eleições passadas.' }
    ];

    const handleHelpPress = (e) => { const btn = e.currentTarget; btn.classList.add('pulse-anim'); setTimeout(() => btn.classList.remove('pulse-anim'), 400); setIsTourOpen(true); };

    useEffect(() => {
        if (userLoading || !userData) return;
        const carregarDados = async () => {
            try {
                const dep = userData.candidatos_escolhidos?.deputado_federal;
                const sen = userData.candidatos_escolhidos?.senadores || [];
                const nomes = [];
                if (dep) nomes.push(dep);
                if (sen.length > 0) nomes.push(...sen);
                if (nomes.length === 0) { setLoading(false); return; }

                const q = query(collection(db, "candidatos"), where("Nome", "in", nomes));
                const snap = await getDocs(q);
                let soma = 0; const lista = [];

                snap.forEach(doc => {
                    const d = doc.data();
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

                    lista.push({ id: doc.id, ...d, ClassificacaoOficial: d["Classificação"] || d["Classificacao"] || "-", notaFinal: notaFinal, cardColorClass: cardColorClass, porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0) });
                });
                setMedia(nomes.length > 0 ? soma / nomes.length : 0);
                lista.sort((a, b) => a.Cargo.localeCompare(b.Cargo));
                setCandidatosCompletos(lista);
            } catch (error) { console.error("Erro:", error); } finally { setLoading(false); }
        };
        carregarDados();
    }, [userData, userLoading]);

    if (loading) return <div className="loading">CARREGANDO...</div>;

    let config = {};
    if (media >= 7) config = { titulo: "PARABÉNS!", subtitulo: "SEU VOTO MELHORA O CONGRESSO" };
    else if (media >= 6) config = { titulo: "NA TRAVE!!!", subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO" };
    else config = { titulo: "BOLA FORA!!!", subtitulo: "SEU VOTO PIORA O CONGRESSO" };

    const themeClass = filtroAtivo === 'renovar' ? 'theme-renovar' : 'theme-reeleger';

    return (
        <div className={`select-base-container resultado-scrollable ${themeClass}`}>
            <Sidebar />
            <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

            <div className="top-nav-bar"><div className="nav-spacer"></div><div className="top-search-wrapper"><input type="text" value="plano-voto.vercel.app" disabled={true} /></div><div className="nav-action-right"><button className="btn-help-icon" onClick={handleHelpPress}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><line x1="12" y1="8" x2="12" y2="8"></line><line x1="12" y1="12" x2="12" y2="16"></line></svg></button></div></div>
            <div className="green-banner-selection banner-resultado"><h2>{config.titulo}</h2><div className="triangle-down"></div></div>

            <div className="gauge-wrapper-margin"><Gauge value={media} tema={filtroAtivo} /></div>

            <div className="resultado-subtitle-wrapper"><div className="resultado-subtitle">{config.subtitulo}</div></div>

            <div className="list-wrapper resultado-list-wrapper"><div className="list-scroll-box resultado-scroll-box" id="tour-lista-resultado">
                {candidatosCompletos.map((cand) => (
                    <div className={`base-card ${cand.cardColorClass}`} key={cand.id}><div className="cand-item-layout"><div className="cand-data-left"><div className="res-card-cargo">{cand.Cargo} | {cand.Partido}</div><div className="res-card-numero">{cand.Numero || '0000'}</div><div className="cand-name res-card-nome">{cand.Nome.toUpperCase()}</div></div><div className="cand-rank-score-middle"><div className="badge-rank">{cand.ClassificacaoOficial === "-" ? "-" : `${cand.ClassificacaoOficial}º`}</div><div className="badge-score">{cand.notaFinal.toFixed(2).replace('.', ',')}</div></div><div className="cand-divider-vertical"></div><div className="cand-chart-right"><svg viewBox="0 0 36 36" className="circular-chart"><path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text></svg></div></div></div>
                ))}
            </div></div>

            <div className="resultado-footer-wrapper" id="tour-footer-resultado">
                <footer className="navigation-footer resultado-nav-footer"><button className="nav-btn" onClick={() => navigate(-1)} style={{ borderRight: media >= 7 ? '1px solid rgba(248, 228, 100, 0.4)' : 'none' }}><i className="arrow-left"></i></button>{media >= 7 && (<button className="nav-btn" onClick={() => alert("Link copiado para a área de transferência!")}><ShareIcon /></button>)}</footer>
            </div>
        </div>
    );
}