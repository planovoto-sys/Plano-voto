import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import SelectBase from '../components/SelectBase';
/* =========================================================
TABELA ATUALIZADA DE MÉDIA DE VOTOS (Comentada para testes)
Deixei estruturado para Deputados (coluna 1) e Senadores (coluna 2) 
para facilitar a reativação no futuro.
=========================================================
const MEDIAS_VOTOS_REAIS = {
  "AM": { deputado: 133905, senador: 953880 },
  "AP": { deputado: 13092, senador: 196492 },
  "BA": { deputado: 120871, senador: 3829822 },
  "CE": { deputado: 141054, senador: 2277160 },
  "DF": { deputado: 103509, senador: 435761 },
  "ES": { deputado: 67795, senador: 990198 },
  "GO": { deputado: 103609, senador: 1711410 },
  "MA": { deputado: 109825, senador: 1703403 },
  "MG": { deputado: 130647, senador: 3503339 },
  "MS": { deputado: 70763, senador: 398899 },
  "MT": { deputado: 74785, senador: 584621 },
  "PA": { deputado: 138120, senador: 1689152 },
  "PB": { deputado: 103885, senador: 830806 },
  "PE": { deputado: 117673, senador: 1507871 },
  "PI": { deputado: 109598, senador: 810622 },
  "PR": { deputado: 122461, senador: 3442637 },
  "RJ": { deputado: 95313, senador: 3380640 },
  "RN": { deputado: 94279, senador: 703071 },
  "RO": { deputado: 39450, senador: 422439 },
  "RR": { deputado: 13538, senador: 101831 },
  "RS": { deputado: 117871, senador: 2092029 },
  "SC": { deputado: 111595, senador: 2356334 },
  "SE": { deputado: 69695, senador: 441639 },
  "SP": { deputado: 199013, senador: 7767847 },
  "TO": { deputado: 44628, senador: 200276 }
};
*/
// Média fixa para TESTES (3 pessoas para qualquer estado e qualquer cargo)
const MEDIA_TESTE = 3;

export default function EscolherCandidatos({ cargo, limite, titulo, proximaRota, chaveBanco }) {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lê do banco o que foi selecionado anteriormente
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

          const media = MEDIA_TESTE;
          const porcentagem = ((data.votos_recebidos || 0) / media) * 100;

          const notaCand = data["Nota candidato"];
          const notaPart = data["Nota partido"];

          let layer = 3;
          let notaCandNum = -1;
          let notaPartNum = typeof notaPart === 'number' ? notaPart : -1;

          if (typeof notaCand === 'number') {
            notaCandNum = notaCand;
            layer = notaCand > 7 ? 1 : 3;
          } else if (notaCand === "-" || isNaN(parseFloat(notaCand))) {
            layer = 2;
          }

          return {
            id: doc.id, ...data, ufLimpa,
            porcentagemCalculada: Math.min(porcentagem, 100).toFixed(0),
            layer, notaCandNum, notaPartNum
          };
        }).sort((a, b) => {
          if (a.layer !== b.layer) return a.layer - b.layer;
          if (a.layer === 1 || a.layer === 3) return b.notaCandNum - a.notaCandNum;
          if (a.layer === 2) return b.notaPartNum - a.notaPartNum;
          return 0;
        });

        setTodosCandidatos(listaProcessada);
      } catch (error) {
        console.error("Erro ao carregar:", error);
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

  // FUNÇÃO CORRIGIDA COM LÓGICA DE DIFF E TRAVA DE LOADING
  const handleConfirmar = async (selecionados) => {
    setLoading(true); // Trava a tela para evitar duplo clique
    try {
      const userRef = doc(db, "users", user.uid);

      // 1. Descobre quem perde o voto (estava na seleção inicial, mas não está na nova)
      const candidatosParaRemover = selecaoInicial.filter(
        (velho) => !selecionados.some((novo) => novo.id === velho.id)
      );

      // 2. Descobre quem ganha o voto (foi selecionado agora, mas não estava na inicial)
      const candidatosParaAdicionar = selecionados.filter(
        (novo) => !selecaoInicial.some((velho) => velho.id === novo.id)
      );

      // 3. Atualiza os dados no perfil do usuário
      const valorParaSalvar = limite === 1
        ? selecionados[0].Nome
        : selecionados.map(s => s.Nome);

      await updateDoc(userRef, {
        [`candidatos_escolhidos.${chaveBanco}`]: valorParaSalvar
      });

      // 4. Subtrai 1 voto de quem foi desmarcado
      for (const candidato of candidatosParaRemover) {
        await updateDoc(doc(db, "candidatos", candidato.id), {
          votos_recebidos: increment(-1)
        });
      }

      // 5. Adiciona 1 voto em quem foi marcado de forma inédita
      for (const candidato of candidatosParaAdicionar) {
        await updateDoc(doc(db, "candidatos", candidato.id), {
          votos_recebidos: increment(1)
        });
      }

      navigate(proximaRota);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar escolha.");
      setLoading(false); // Só remove o loading se der erro, pois o sucesso muda a rota
    }
  };

  const listaExibida = mostrarTodos ? todosCandidatos : candidatosFiltrados;

  return (
    <SelectBase
      titulo={titulo}
      dados={listaExibida}
      limiteSelecao={limite}
      selecaoInicial={selecaoInicial}
      mostrarFiltros={true}
      carregando={userLoading || loading}
      mostrarBotaoTodos={true}
      textoBotaoTodos={mostrarTodos ? 'VER APENAS O MEU ESTADO' : 'VISUALIZAR TODOS OS CANDIDATOS'}
      onToggleTodos={() => setMostrarTodos(!mostrarTodos)}
      onVoltar={() => navigate(-1)}
      onConfirmar={handleConfirmar}
      renderItem={(cand) => (
        <>
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
        </>
      )}
    />
  );
}