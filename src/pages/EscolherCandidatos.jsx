import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/useUser';
import { useNavigate } from 'react-router-dom';
import {
  getBallotEstado,
  getBallotProgress,
  getVotingErrorMessage,
  readBallotDraft,
  readLastVoteReceipt,
  saveBallotOfficeSelection
} from '../services/votingService';
import { getCandidateProjection, getCandidateScore, parseMetricNumber } from '../services/candidateMetrics';
import { flowError, flowLog, flowWarn } from '../services/debugFlow';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import TourModal from '../components/TourModal'; 

const normalizarBusca = (valor) => (
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export default function EscolherCandidatos({ cargo, limite, titulo, proximaRota, chaveBanco }) {
  const { user, userData, userEligibility, loading: userLoading, filtroAtivo, setFiltroAtivo } = useUser();
  const navigate = useNavigate();
  
  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionadosNaTela, setSelecionadosNaTela] = useState([]);

  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [modalTroca, setModalTroca] = useState({ aberto: false, novoCandidato: null });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const estadoDoFluxo = user?.uid ? getBallotEstado(user.uid, userData?.estado) : userData?.estado;

  const tourSteps = [
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa candidatos por nome ou partido.' },
    { target: '#tour-reeleger', title: 'REELEGER', content: 'Mostra candidatos que atuaram como deputado federal ou senador na última legislatura.<br/><br/><b>Obs.:</b> a classificação considera a nota do candidato no Ranking dos Políticos.' },
    { target: '#tour-renovar', title: 'RENOVAR', content: 'Mostra candidatos que não atuaram como deputado federal ou senador na última legislatura.<br/><br/><b>Obs.:</b> a classificação considera a nota do partido no Ranking dos Políticos.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os candidatos a serem selecionados.<br/><br/><b>Obs.:</b> ordenados da maior para menor nota no Ranking dos Políticos (nota &ge;7,00 em verde e nota &lt;7,00 em vermelho).' },
    { target: '.tour-grafico', title: 'CHANCE', content: 'Mostra as chances do candidato se eleger.<br/><br/><b>Obs.:</b> compara a intenção de voto no meuvoto.org com a média de votos dos eleitos nas eleições passadas.' }
  ];

  // Garante que o filtro padrão é válido ao carregar a página
  useEffect(() => {
    if (!['reeleger', 'renovar'].includes(filtroAtivo)) {
      setFiltroAtivo('reeleger');
    }
  }, [filtroAtivo, setFiltroAtivo]);

  useEffect(() => {
    if (user?.uid && userEligibility?.has_voted && readLastVoteReceipt(user.uid)) {
      flowLog('candidates.redirect.result-with-receipt', { userId: user.uid, cargo });
      navigate('/finalizacao', { replace: true });
    }
  }, [cargo, user?.uid, userEligibility?.has_voted, navigate]);

  useEffect(() => {
    if (!userLoading && user?.uid && !estadoDoFluxo) {
      flowWarn('candidates.missing-state.redirect-home', { userId: user.uid, cargo });
      navigate('/home', { replace: true });
    }
  }, [cargo, estadoDoFluxo, navigate, user?.uid, userLoading]);

  // BUSCA DADOS NO FIREBASE: Apenas quando o cargo muda (ex: Federal para Senador)
  // Removido o filtroAtivo daqui para evitar que a tela "pisque" ao trocar de aba
  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true);
      try {
        const qTodos = query(collection(db, "candidatos"), where("Cargo", "==", cargo));
        const snapTodos = await getDocs(qTodos);
        const lista = snapTodos.docs.map(doc => {
          const d = doc.data();
          const { score: notaFinal, hasCandidateScore: temNotaCandidato } = getCandidateScore(d);
          const projection = getCandidateProjection(d, cargo);
          
          let cardColorClass = 'card-green'; 
          if (notaFinal < 7) {
              cardColorClass = 'card-red';
          }

          const classificacaoOriginal = d["Classificação"] || d["Classificacao"] || "-";
          const classificacaoNum = parseMetricNumber(classificacaoOriginal) ?? 999999;
          const ufLimpa = d.Estado ? d.Estado.replace(/[\s\u00A0]+/g, '') : "TODOS";

          return { 
            id: doc.id, 
            ...d, 
            ClassificacaoOficial: classificacaoOriginal, 
            classificacaoNum: classificacaoNum, 
            ufLimpa: ufLimpa, 
            temNotaCandidato: temNotaCandidato, 
            notaFinal: notaFinal, 
            cardColorClass: cardColorClass, 
            projectionPercent: projection.percent,
            projectionVotes: projection.votes,
            projectionBaseline: projection.baseline,
            projectionReliable: projection.isReliable,
            projectionBaselineSource: projection.baselineSource,
            projectionCapped: projection.isCapped,
            porcentagemCalculada: projection.displayPercent
          };
        });
        flowLog('candidates.fetch.success', { cargo, total: lista.length });
        setTodosCandidatos(lista);
      } catch (e) { 
        flowError('candidates.fetch.error', e, { cargo });
        console.error("Erro ao buscar candidatos:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDados();
  }, [cargo]);

  // Sincroniza candidatos selecionados do rascunho local, sem gravar voto ligado ao usuário.
  useEffect(() => {
    if (!user?.uid || todosCandidatos.length === 0) {
      setSelecionadosNaTela([]);
      return;
    }

    const draft = readBallotDraft(user.uid, estadoDoFluxo);
    const idsSalvos = (draft.selections?.[chaveBanco] || []).map((candidate) => candidate.id);
    flowLog('candidates.restore-selection', {
      cargo,
      chaveBanco,
      estado: estadoDoFluxo,
      idsSalvos
    });
    setSelecionadosNaTela(todosCandidatos.filter((candidate) => idsSalvos.includes(candidate.id)));
  }, [cargo, user?.uid, estadoDoFluxo, todosCandidatos, chaveBanco]);

  // FILTRAGEM LOCAL: Ocorre instantaneamente na memória ao trocar de aba ou pesquisar
  const candidatosFiltrados = useMemo(() => {
    const meuEstado = estadoDoFluxo?.replace(/[\s\u00A0]+/g, '') || "";
    let filtrados = todosCandidatos.filter(c => c.ufLimpa === meuEstado || c.ufLimpa === "TODOS");
    
    if (filtroAtivo === 'renovar') {
      filtrados.sort((a, b) => b.notaFinal - a.notaFinal);
    } else {
      filtrados.sort((a, b) => a.classificacaoNum - b.classificacaoNum);
    }
    return filtrados;
  }, [todosCandidatos, estadoDoFluxo, filtroAtivo]);

  const listaExibida = useMemo(() => {
    let disponiveis = [...candidatosFiltrados];
    
    // Separa quem tem nota de candidato (REELEGER) de quem usa nota de partido (RENOVAR)
    if (filtroAtivo === 'renovar') {
      disponiveis = disponiveis.filter(c => !c.temNotaCandidato);
    } else {
      disponiveis = disponiveis.filter(c => c.temNotaCandidato);
    }

    if (busca.trim()) {
        const textoBusca = normalizarBusca(busca);
        disponiveis = disponiveis.filter(c => 
          normalizarBusca(c.Nome || '').includes(textoBusca) || 
          normalizarBusca(c.Partido || '').includes(textoBusca)
        );
    }
    return disponiveis;
  }, [candidatosFiltrados, filtroAtivo, busca]);

  const handleConfirmarFinal = async (listaFinalDaTela) => {
    flowLog('candidates.confirm.start', {
      cargo,
      chaveBanco,
      totalSelecionados: listaFinalDaTela.length,
      limite,
      estado: estadoDoFluxo,
      userId: user?.uid
    });

    if (!user?.uid) {
      flowWarn('candidates.confirm.no-user', { cargo });
      navigate('/', { replace: true });
      return;
    }

    if (!estadoDoFluxo) {
      flowWarn('candidates.confirm.no-state', { cargo });
      navigate('/home', { replace: true });
      return;
    }

    if (listaFinalDaTela.length < limite) { 
      flowWarn('candidates.confirm.incomplete-office', {
        cargo,
        totalSelecionados: listaFinalDaTela.length,
        limite
      });
      setModalAviso({ 
        aberto: true, 
        mensagem: cargo === "Senador" ? "Tem de selecionar 2 Senadores." : "Tem de selecionar pelo menos 1 Deputado Federal." 
      }); 
      return; 
    }
    setLoading(true);
    try {
      const draftAtualizado = saveBallotOfficeSelection(user.uid, chaveBanco, listaFinalDaTela, estadoDoFluxo);
      const progress = getBallotProgress(draftAtualizado);

      flowLog('candidates.confirm.saved', {
        cargo,
        chaveBanco,
        proximaRota,
        progress,
        hasVoted: userEligibility?.has_voted === true
      });
      navigate(proximaRota);
    } catch (e) { 
      flowError('candidates.confirm.error', e, { cargo, chaveBanco });
      console.error("Erro ao salvar seleções:", e); 
      setModalAviso({
        aberto: true,
        mensagem: getVotingErrorMessage(e)
      });
    } finally {
      setLoading(false);
    }
  };

  const executarTroca = (candidatoParaRemover) => {
    const novaLista = selecionadosNaTela.filter(c => c.id !== candidatoParaRemover.id);
    setSelecionadosNaTela([...novaLista, modalTroca.novoCandidato]);
    setModalTroca({ aberto: false, novoCandidato: null });
  };

  return (
    <>
      <Sidebar />
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      <SelectBase
        titulo={titulo} 
        dados={listaExibida} 
        limiteSelecao={limite} 
        selecaoInicial={selecionadosNaTela}
        carregando={userLoading || loading} 
        abas={['reeleger', 'renovar']} 
        abaAtiva={filtroAtivo} 
        setAbaAtiva={setFiltroAtivo}
        mostrarBusca={true} 
        valorBusca={busca} 
        onChangeBusca={setBusca}
        onHelpClick={() => setIsTourOpen(true)} 
        onLimiteAtingido={(c) => setModalTroca({ aberto: true, novoCandidato: c })}
        onConfirmar={handleConfirmarFinal} 
        onVoltar={() => navigate(cargo === "Senador" ? '/escolher-deputado-federal' : '/home')}
        linhasVisiveis={5}
        renderItem={(cand) => (
          <div className="cand-item-layout">
            <div className="cand-data-left">
              <div className="cand-name">{(cand.Nome || 'Sem nome').toUpperCase()}</div>
              <div className="cand-party">{cand.Partido || '-'}</div>
            </div>
            <div className="cand-rank-score-middle">
              <div className="badge-rank">{cand.ClassificacaoOficial === "-" ? "-" : `${cand.ClassificacaoOficial}º`}</div>
              <div className="badge-score">{cand.notaFinal.toFixed(2).replace('.', ',')}</div>
            </div>
            <div className="cand-divider-vertical"></div>
            <div className="cand-chart-right tour-grafico">
              <svg viewBox="0 0 36 36" className="circular-chart" role="img" aria-label={`Chance de eleição ${cand.porcentagemCalculada}%`}>
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${cand.projectionPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text>
              </svg>
            </div>
          </div>
        )}
      />

      <ConfirmModal 
        isOpen={modalAviso.aberto} 
        titulo="OPS!" 
        mensagem={modalAviso.mensagem} 
        textoConfirmar="OK, ENTENDI" 
        mostrarCancelar={false} 
        onConfirm={() => setModalAviso({ aberto: false, mensagem: '' })} 
      />

      <ConfirmModal 
        isOpen={modalTroca.aberto} 
        titulo="LIMITE ATINGIDO" 
        mensagem={`Apenas pode selecionar ${limite} candidatos. Qual destes deseja trocar por ${modalTroca.novoCandidato?.Nome}?`} 
        onCancel={() => setModalTroca({ aberto: false, novoCandidato: null })}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {selecionadosNaTela.map(cand => (
            <button 
              key={cand.id} 
              className="btn-modal btn-confirmar aviso" 
              type="button"
              onClick={() => executarTroca(cand)} 
              style={{ fontSize: '0.85rem', padding: '15px' }}
            >
              TROCAR: {cand.Nome}
            </button>
          ))}
        </div>
      </ConfirmModal>
    </>
  );
}
