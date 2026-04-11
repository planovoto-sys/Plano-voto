import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import GaugeChart from 'react-gauge-chart';
import Sidebar from '../components/Sidebar';
import './Resultado.css';

const MEDIA_TESTE = 3;

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
                    
                    // Lógica para manter o velocímetro funcionando corretamente
                    const notaParaMedia = d["Nota candidato"] || d["Nota partido"] || 0;
                    const porcentagem = ((d.votos_recebidos || 0) / MEDIA_TESTE) * 100;

                    soma += notaParaMedia;
                    lista.push({
                        id: doc.id,
                        ...d,
                        notaCandidato: d["Nota candidato"] || 0,
                        notaPartido: d["Nota partido"] || 0,
                        porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0)
                    });
                });

                // CORREÇÃO AQUI: Dividindo obrigatoriamente por 3 para compor a média real do voto
                setMedia(nomes.length > 0 ? soma / 3 : 0);
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
        config = {
            classe: "boa",
            titulo: "GOLAÇO!!!",
            subtitulo: "SEU VOTO MELHORA O CONGRESSO",
            pergunta: "QUE TAL COMPARTILHAR ANTES DE CONTINUAR?"
        };
    } else if (media >= 4) { 
        config = {
            classe: "neutra",
            titulo: "NA TRAVE!!!",
            subtitulo: "SEU VOTO NÃO MELHORA O CONGRESSO",
            pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?"
        };
    } else { 
        config = {
            classe: "ruim",
            titulo: "BOLA FORA!!!",
            subtitulo: "SEU VOTO PIORA O CONGRESSO",
            pergunta: "QUE TAL SELECIONAR CANDIDATOS MELHORES?"
        };
    }

    return (
        <div className={`resultado-main-container theme-${config.classe}`}>
            <Sidebar />
            
            <div className="result-green-banner">
                <div className="slant-bg"></div>
                <div className="banner-text">
                    <h2>{config.titulo}</h2>
                    <p>{config.subtitulo}</p>
                </div>
                <div className="triangle-down-classic"></div>
            </div>

            <div className="velocimetro-card">
                <div className="velocimetro-gauge">
                    <GaugeChart 
                        id="gauge-voto" 
                        nrOfLevels={3} 
                        colors={["#FF4D4D", "#FDF001", "#4CAF50"]} 
                        percent={media / 10} 
                        arcPadding={0.02} 
                        needleColor="#1a1a1a"
                        needleBaseColor="#1a1a1a"
                        hideText={true}
                    />
                    <div className="gauge-score">
                        <span>NOTA</span>
                        <strong>{media.toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>
                <p className="pergunta">{config.pergunta}</p>
            </div>

            <div className="lista-selecionados-container">
                {candidatosCompletos.map((cand) => (
                    <div key={cand.id} className="card-resultado-candidato">
                        <div className="cand-info-texto" style={{ flex: 1 }}>
                            {/* Mantive o cargo e número em cima, pois já fazia parte do seu layout */}
                            <div style={{ marginBottom: '6px' }}>
                                <span className="res-cargo">{cand.Cargo?.toUpperCase()}</span>
                                <span className="res-numero" style={{ marginLeft: '8px', fontWeight: 'bold' }}>{cand.Numero || "0000"}</span>
                            </div>
                            
                            {/* LINHA 1: NOME E NOTA CANDIDATO */}
                            <div className="cand-row">
                                <span className="res-nome" style={{ fontWeight: '900' }}>{cand.Nome?.toUpperCase()}</span>
                                <span className="cand-badge"> {cand.notaCandidato}</span>
                            </div>

                            {/* LINHA 2: PARTIDO E NOTA PARTIDO */}
                            <div className="cand-row" style={{ marginTop: '4px', opacity: 0.9 }}>
                                <span className="res-partido" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#666' }}>
                                    PARTIDO: {cand.Partido}
                                </span>
                                <span className="cand-badge party-badge"> {cand.notaPartido}</span>
                            </div>
                        </div>

                        {/* GRÁFICO CIRCULAR DE VOTOS */}
                        <div className="cand-chart" style={{ width: '58px', height: '58px', marginLeft: '15px' }}>
                            <svg viewBox="0 0 36 36" className="circular-chart">
                                <path className="circle-bg" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3.5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="circle" fill="none" stroke="var(--primary-green, #4CAF50)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" fill="#1a1a1a" fontSize="0.65rem" fontWeight="800" textAnchor="middle">{cand.porcentagemCalculada}%</text>
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="resultado-footer-acoes">
                <button className="btn-nav-texto" onClick={() => navigate('/escolher-senadores')}>
                    MUDAR
                </button>
                
                <button className="btn-share" onClick={() => alert("Link copiado!")}>
                    COMPARTILHAR
                </button>
            </footer>
        </div>
    );
}