import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';

const MEDIA_TESTE = 4;

// Ícone de Compartilhar (SVG direto)
const ShareIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f8e464" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

const Gauge = ({ value }) => {
    const normalizedValue = Math.min(Math.max(value, 0), 10);
    const percent = normalizedValue / 10;
    
    // O ângulo final: -90 (Esquerda/0%), 0 (Centro/50%), 90 (Direita/100%)
    const targetAngle = (percent * 180) - 90;

    // Começa na posição zero (totalmente à esquerda)
    const [currentAngle, setCurrentAngle] = useState(-90);

    // Dispara a animação logo após o componente renderizar para sincronizar com o Recharts
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentAngle(targetAngle);
        }, 50);
        return () => clearTimeout(timer);
    }, [targetAngle]);
    
    const data = [
        { value: 1, color: '#ff3b3b' },
        { value: 1, color: '#ff9800' },
        { value: 1, color: '#ffeb3b' },
        { value: 1, color: '#8bc34a' },
        { value: 1, color: '#4caf50' },
    ];

    return (
        <div className="gauge-container">
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
                    animationDuration={1500} // Força duração cravada de 1.5s
                    animationEasing="ease"   // Mesma curva de transição
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>

            {/* Agulha sincronizada */}
            <svg className="gauge-needle-svg" viewBox="0 0 320 320">
                <g 
                    className="gauge-needle-group" 
                    style={{ transform: `rotate(${currentAngle}deg)` }}
                >
                    <polygon points="148,20 172,20 160,60" fill="#111" />
                </g>
            </svg>

            {/* Texto Central da Nota */}
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
    const { userData, loading: userLoading } = useUser();
    const navigate = useNavigate();

    const [candidatosCompletos, setCandidatosCompletos] = useState([]);
    const [media, setMedia] = useState(0);
    const [loading, setLoading] = useState(true);

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
                    const notaFinal = parseFloat(d["Nota candidato"] || d["Nota partido"] || 0);
                    const votos = d.votos_recebidos || 0;
                    const porcentagem = (votos / MEDIA_TESTE) * 100;

                    soma += notaFinal;

                    lista.push({
                        id: doc.id,
                        ...d,
                        notaFinal: notaFinal,
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

    // Configuração Dinâmica baseada na média
    let config = {};
    if (media >= 7) {
        config = {
            titulo: "GOLAÇO!!!",
            subtitulo: "SEU VOTO MELHORA O CONGRESSO",
            pergunta: "QUE TAL COMPARTILHAR ANTES DE CONTINUAR?"
        };
    } else if (media >= 6) {
        config = {
            titulo: "NA TRAVE!!!",
            subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO",
            pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?"
        };
    } else {
        config = {
            titulo: "BOLA FORA!!!",
            subtitulo: "SEU VOTO PIORA O CONGRESSO",
            pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?"
        };
    }

    return (
        <div className="select-base-container resultado-scrollable">
            <Sidebar />

            <div className="green-banner-selection banner-resultado">
                <h2>{config.titulo}</h2>
                <div className="triangle-down"></div>
            </div>

            <div className="resultado-subtitle-wrapper">
                <div className="resultado-subtitle">
                    {config.subtitulo}
                </div>
            </div>

            <div className="gauge-wrapper-margin">
                <Gauge value={media} />
            </div>

            <div className="list-wrapper resultado-list-wrapper">
                <div className="list-scroll-box resultado-scroll-box">
                    {candidatosCompletos.map((cand) => {
                        let corNota = 'score-neutral';
                        if (cand.notaFinal < 6) corNota = 'score-red';
                        else if (cand.notaFinal >= 7) corNota = 'score-green';

                        return (
                            <div className="base-card" key={cand.id}>
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
                                        <div className="badge-rank">-º</div>
                                        <div className={`badge-score ${corNota}`}>
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

            <div className="resultado-footer-wrapper">
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