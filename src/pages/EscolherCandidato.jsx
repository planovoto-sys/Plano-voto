import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import './EscolherCandidato.css';

const MEDIAS_VOTOS = {
  "AC": 19414, "AL": 93731, "AM": 133905, "AP": 13092, "BA": 120871, "CE": 141054,
  "DF": 103509, "ES": 67795, "GO": 103609, "MA": 109825, "MG": 130647, "MS": 70763,
  "MT": 74785, "PA": 138120, "PB": 103885, "PE": 117673, "PI": 109598, "PR": 122461,
  "RJ": 95313, "RN": 94279, "RO": 39450, "RR": 13538, "RS": 117871, "SC": 111595,
  "SE": 69695, "SP": 199013, "TO": 44628
};

export default function EscolherCandidato() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    const fetchTodosCandidatos = async () => {
      setLoading(true);
      try {
        const qTodos = query(
          collection(db, "candidatos"), 
          where("Cargo", "==", "Deputado Federal")
        );

        const snapTodos = await getDocs(qTodos);

        const listaProcessada = snapTodos.docs.map(doc => {
          const data = doc.data();
          const ufLimpa = data.Estado ? data.Estado.replace(/[\s\u00A0]+/g, '') : "SP";
          const media = MEDIAS_VOTOS[ufLimpa] || 199013;
          const porcentagem = ((data.votos_recebidos || 0) / media) * 100;

          const notaCand = data["Nota candidato"];
          const notaPart = data["Nota partido"];
          
          let layer = 3; 
          let notaCandNum = -1;
          let notaPartNum = typeof notaPart === 'number' ? notaPart : -1;

          if (typeof notaCand === 'number') {
            notaCandNum = notaCand;
            if (notaCand > 7) {
              layer = 1; // Camada 1: Notas > 7
            } else {
              layer = 3; // Camada 3: Notas <= 7
            }
          } else if (notaCand === "-" || isNaN(parseFloat(notaCand))) {
            layer = 2; // Camada 2: Sem nota (novatos)
          }

          return {
            id: doc.id,
            ...data,
            ufLimpa,
            porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0),
            layer,
            notaCandNum,
            notaPartNum
          };
        }).sort((a, b) => {
          if (a.layer !== b.layer) return a.layer - b.layer;
          if (a.layer === 1 || a.layer === 3) return b.notaCandNum - a.notaCandNum;
          if (a.layer === 2) return b.notaPartNum - a.notaPartNum;
          return 0;
        });

        setTodosCandidatos(listaProcessada);
      } catch (error) {
        console.error("Erro ao carregar candidatos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodosCandidatos();
  }, []);

  const candidatosFiltrados = useMemo(() => {
    if (!userData?.estado) return [];
    const meuEstadoLimpo = userData.estado.replace(/[\s\u00A0]+/g, '');
    return todosCandidatos.filter(cand => cand.ufLimpa === meuEstadoLimpo);
  }, [todosCandidatos, userData?.estado]);

  const handleConfirmar = async () => {
    if (!selecionado || !user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "candidatos_escolhidos.deputado_federal": selecionado.Nome
      });
      await updateDoc(doc(db, "candidatos", selecionado.id), {
        votos_recebidos: increment(1)
      });
      alert(`Candidato ${selecionado.Nome} selecionado!`);
    } catch (e) {
      alert("Erro ao salvar escolha.");
    }
  };

  const listaExibida = mostrarTodos ? todosCandidatos : candidatosFiltrados;

  if (userLoading || loading) {
    return <div className="loading">Carregando candidatos...</div>;
  }

  return (
    <div className="escolher-container">
      <div className="top-pills">
        <span className="pill">mulheres</span>
        <span className="pill active">todos</span>
        <span className="pill">novatos</span>
      </div>

      <div className="green-banner-selection">
        <h2>SELECIONE<br/>1 DEPUTADO FEDERAL</h2>
        <div className="triangle-down"></div>
        <button 
          className={`btn-visualizar-todos ${mostrarTodos ? 'active-btn' : ''}`}
          onClick={() => {
            setMostrarTodos(!mostrarTodos);
            setSelecionado(null);
          }}
        >
          {mostrarTodos ? 'VER APENAS O MEU ESTADO' : 'VISUALIZAR TODOS OS CANDIDATOS'}
        </button>
      </div>

      <div className="candidatos-list">
        {listaExibida.length > 0 ? (
          listaExibida.map((cand) => (
            <div 
              key={cand.id} 
              className={`candidato-card layer-${cand.layer} ${selecionado?.id === cand.id ? 'selected' : ''}`}
              onClick={() => setSelecionado(cand)}
            >
              <div className="cand-info">
                <span className="cand-name">
                  {cand.Nome.toUpperCase()} {cand.notaCandNum !== -1 ? `(${cand.Classificação}º/${cand.notaCandNum.toFixed(2)})` : `(${cand.Classificação}º)`}
                </span>
                <span className="cand-party">
                  PARTIDO {cand.Partido} ({cand["Nota partido"]}) {mostrarTodos && `- ${cand.ufLimpa}`}
                </span>
              </div>
              <div className="cand-chart">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text>
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">Nenhum candidato encontrado para a sua região.</div>
        )}
      </div>

      <div className="navigation-footer">
        <button className="nav-btn" onClick={() => navigate('/home')}>
          <div className="arrow-left"></div>
        </button>
        <button className="nav-btn btn-confirm" onClick={handleConfirmar} disabled={!selecionado}>
          <div className="arrow-right"></div>
        </button>
      </div>
    </div>
  );
}