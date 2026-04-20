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
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f8e464" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    
    const data = tema === 'renovar' 
        ? [
            { value: 1, color: '#C5D6EA' },
            { value: 1, color: '#9BB8D9' },
            { value: 1, color: '#729BC8' },
            { value: 1, color: '#487DB6' },
            { value: 1, color: '#3B5B8B' },
          ]
        : [
            { value: 1, color: '#ff3b3b' },
            { value: 1, color: '#ff9800' },
            { value: 1, color: '#ffeb3b' },
            { value: 1, color: '#8bc34a' },
            { value: 1, color: '#4caf50' },
          ];

    return (
        <div className="gauge-container" id="tour-gauge">
            <PieChart width={320} height={320}>
                <Pie
                    data={data}
                    cx={160}
                    cy={150}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={90}
                    outerRadius={130}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={1500} 
                    animationEasing="ease"   
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>

            <svg className="gauge-needle-svg" viewBox="0 0 320 320">
                <g className="gauge-needle-group" style={{ transform: `rotate(${currentAngle}deg)` }}>
                    <polygon points="148,20 172,20 160,60" fill="#111" />
                </g>
            </svg>

            <div className="gauge-text-wrapper">
                <div className="gauge-text-label">NOTA</div>
                <div className="gauge-text-value">
                    {normalizedValue.toFixed(2).replace('.', ',')}
                </div>
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
        { target: '#tour-gauge', title: 'Termômetro de Qualidade', content: 'Mede a qualidade do seu voto com base nas notas dos candidatos escolhidos. <br/><br/><b>Acima de 7 = Golaço!</b><br/>Abaixo de 7 = Precisa melhorar.' },
        { target: '#tour-lista-resultado', title: 'Seus Escolhidos', content: 'Aqui estão os candidatos que você selecionou para Deputado Federal e Senadores.' },
        { target: '#tour-footer-resultado', title: 'Mudar ou Compartilhar', content: 'Se a nota não estiver boa, você pode <b>MUDAR</b> seus candidatos. Se estiver ótima, <b>COMPARTILHE</b> com seus amigos!' }
    ];

    const handleHelpPress = (e) => {
        const btn = e.currentTarget;
        btn.classList.add('pulse-anim');
        setTimeout(() => btn.classList.remove('pulse-anim'), 400); 
        setIsTourOpen(true);
    };

    useEffect(() => {
        if (userLoading || !userData) return;

        const carregarDados = async () => {
            try {
                const dep = userData.candidatos_escolhidos?.deputado_federal;
                const sen = userData.candidatos_escolhidos?.senadores || [];
                const nomes = [];

                if (dep) nomes.push(dep);
                if (sen.length > 0) nomes.push(...sen);

                if (nomes.length === 0) {
                    setLoading(false);
                    return;
                }

                const q = query(collection(db, "candidatos"), where("Nome", "in", nomes));
                const snap = await getDocs(q);

                let soma = 0;
                const lista = [];

                snap.forEach(doc => {
                    const d = doc.data();
                    
                    const valCand = d["Nota candidato"];
                    const valPart = d["Nota partido"];
                    const isNotaValida = (val) => val !== undefined && val !== null && val !== "" && val !== "-";
                    
                    let notaFinal = 0;
                    if (isNotaValida(valCand) && Number(valCand) !== 0) notaFinal = parseFloat(valCand);
                    else if (isNotaValida(valPart)) notaFinal = parseFloat(valPart);

                    const votos = d.votos_recebidos || 0;
                    const porcentagem = (votos / MEDIA_TESTE) * 100;

                    soma += notaFinal;
                    
                    let cardColorClass = 'card-yellow';
                    if (notaFinal < 6) cardColorClass = 'card-red';
                    else if (notaFinal >= 7) cardColorClass = 'card-green';

                    const classificacaoOriginal = d["Classificação"] || d["Classificacao"] || "-";

                    lista.push({
                        id: doc.id,
                        ...d,
                        ClassificacaoOficial: classificacaoOriginal,
                        notaFinal: notaFinal,
                        cardColorClass: cardColorClass,
                        porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0)
                    });
                });

                setMedia(nomes.length > 0 ? soma / nomes.length : 0);
                lista.sort((a, b) => a.Cargo.localeCompare(b.Cargo));
                setCandidatosCompletos(lista);
                
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoading(false);
            }
        };

        carregarDados();
    }, [userData, userLoading]);

    if (loading) return <div className="loading">CARREGANDO...</div>;

    let config = {};
    if (media >= 7) {
        config = { titulo: "GOLAÇO!!!", subtitulo: "SEU VOTO MELHORA O CONGRESSO", pergunta: "QUE TAL COMPARTILHAR ANTES DE CONTINUAR?" };
    } else if (media >= 6) {
        config = { titulo: "NA TRAVE!!!", subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO", pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?" };
    } else {
        config = { titulo: "BOLA FORA!!!", subtitulo: "SEU VOTO PIORA O CONGRESSO", pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?" };
    }

    const themeClass = filtroAtivo === 'renovar' ? 'theme-renovar' : 'theme-reeleger';

    return (
        <div className={`select-base-container resultado-scrollable ${themeClass}`}>
            <Sidebar />
            <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

            <div className="green-banner-selection banner-resultado">
                <h2>{config.titulo}</h2>
                <div className="triangle-down"></div>
                
                {/* BOTÃO DÚVIDAS NO RESULTADO COM A ANIMAÇÃO */}
                <button className="btn-help-floating" onClick={handleHelpPress}>
                    <div className="help-icon">?</div>
                    <span>Dúvidas</span>
                </button>
            </div>

            <div className="resultado-subtitle-wrapper">
                <div className="resultado-subtitle">
                    {config.subtitulo}
                </div>
            </div>

            <div className="gauge-wrapper-margin">
                <Gauge value={media} tema={filtroAtivo} />
            </div>

            <div className="list-wrapper resultado-list-wrapper">
                <div className="list-scroll-box resultado-scroll-box" id="tour-lista-resultado">
                    {candidatosCompletos.map((cand) => {
                        return (
                            <div className={`base-card ${cand.cardColorClass}`} key={cand.id}>
                                <div className="cand-item-layout">
                                    <div className="cand-data-left">
                                        <div className="res-card-cargo">
                                            {cand.Cargo} | {cand.Partido}
                                        </div>
                                        <div className="res-card-numero">
                                            {cand.Numero || '0000'}
                                        </div>
                                        <div className="cand-name res-card-nome">
                                            {cand.Nome.toUpperCase()}
                                        </div>
                                    </div>
                                    
                                    <div className="cand-rank-score-middle">
                                        <div className="badge-rank">
                                            {cand.ClassificacaoOficial === "-" ? "-" : `${cand.ClassificacaoOficial}º`}
                                        </div>
                                        <div className="badge-score">
                                            {cand.notaFinal.toFixed(2).replace('.', ',')}
                                        </div>
                                    </div>
                                    
                                    <div className="cand-divider-vertical"></div>
                                    
                                    <div className="cand-chart-right">
                                        <svg viewBox="0 0 36 36" className="circular-chart">
                                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="resultado-footer-wrapper" id="tour-footer-resultado">
                <div className="resultado-footer-pergunta">
                    {config.pergunta}
                </div>

                <footer className="navigation-footer resultado-nav-footer">
                    <button className="nav-btn" onClick={() => navigate(-1)} style={{ borderRight: media >= 7 ? '1px solid rgba(248, 228, 100, 0.4)' : 'none' }}>
                        <i className="arrow-left"></i>
                    </button>
                    
                    {media >= 7 && (
                        <button className="nav-btn" onClick={() => alert("Link copiado para a área de transferência!")}>
                            <ShareIcon />
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}