import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';

const MEDIA_TESTE = 4;

export default function EscolherCandidatos({ cargo, limite, titulo, proximaRota, chaveBanco }) {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [loading, setLoading] = useState(true);

  const selecaoInicial = useMemo(() => {
    const salvo = userData?.candidatos_escolhidos?.[chaveBanco];
    if (!salvo) return [];
    const nomesArray = Array.isArray(salvo) ? salvo : [salvo];
    return todosCandidatos.filter(cand => nomesArray.includes(cand.Nome));
  }, [userData, chaveBanco, todosCandidatos]);

  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true);
      try {
        const qTodos = query(collection(db, "candidatos"), where("Cargo", "==", cargo));
        const snapTodos = await getDocs(qTodos);

        const listaProcessada = snapTodos.docs.map(doc => {
          const data = doc.data();
          const ufLimpa = data.Estado ? data.Estado.replace(/[\s\u00A0]+/g, '') : "SP";
          const porcentagem = ((data.votos_recebidos || 0) / MEDIA_TESTE) * 100;

          // CORREÇÃO: Capturando a nota (se não tiver a do candidato, usa do partido)
          const nota = data["Nota candidato"] || data["Nota partido"] || 0;

          return {
            id: doc.id, ...data, ufLimpa,
            notaExibicao: nota,
            porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0)
          };
        });

        setTodosCandidatos(listaProcessada);
      } catch (error) {
        console.error("Erro ao carregar candidatos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [cargo]);

  const candidatosFiltrados = useMemo(() => {
    if (!userData?.estado) return [];
    const meuEstadoLimpo = userData.estado.replace(/[\s\u00A0]+/g, '');
    return todosCandidatos.filter(cand => cand.ufLimpa === meuEstadoLimpo);
  }, [todosCandidatos, userData?.estado]);

  const handleConfirmar = async (selecionados) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const candidatosParaRemover = selecaoInicial.filter(v => !selecionados.some(n => n.id === v.id));
      const candidatosParaAdicionar = selecionados.filter(n => !selecaoInicial.some(v => v.id === n.id));

      const valorParaSalvar = limite === 1 ? selecionados[0].Nome : selecionados.map(s => s.Nome);

      await updateDoc(userRef, { [`candidatos_escolhidos.${chaveBanco}`]: valorParaSalvar });

      for (const cand of candidatosParaRemover) {
        await updateDoc(doc(db, "candidatos", cand.id), { votos_recebidos: increment(-1) });
      }
      for (const cand of candidatosParaAdicionar) {
        await updateDoc(doc(db, "candidatos", cand.id), { votos_recebidos: increment(1) });
      }

      navigate(proximaRota);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const listaExibida = mostrarTodos ? todosCandidatos : candidatosFiltrados;

  return (
    <>
      <Sidebar />
      <SelectBase
        titulo={titulo}
        dados={listaExibida}
        limiteSelecao={limite}
        selecaoInicial={selecaoInicial}
        carregando={userLoading || loading}
        mostrarBotaoTodos={true}
        textoBotaoTodos={mostrarTodos ? 'VER APENAS O MEU ESTADO' : 'VISUALIZAR TODOS OS CANDIDATOS'}
        onToggleTodos={() => setMostrarTodos(!mostrarTodos)}
        onConfirmar={handleConfirmar}
        onVoltar={() => {
          if (cargo === "Senador") {
            navigate('/escolher-deputado-federal');
          } else {
            navigate('/home');
          }
        }}
        renderItem={(cand) => (
          <>
            <div className="cand-info">
              <span className="cand-name">{cand.Nome.toUpperCase()}</span>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <span className="cand-party">PARTIDO {cand.Partido}</span>
                <span style={{
                  background: 'var(--primary-green)', 
                  color: 'var(--bg-yellow)', 
                  padding: '2px 6px', 
                  borderRadius: '5px', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold'
                }}>
                  NOTA: {cand.notaExibicao}
                </span>
              </div>
            </div>
            <div className="cand-chart">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text>
              </svg>
            </div>
          </>
        )}
      />
    </>
  );
}