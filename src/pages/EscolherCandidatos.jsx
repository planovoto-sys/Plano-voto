import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import TourModal from '../components/TourModal'; 

const MEDIA_TESTE = 4;

export default function EscolherCandidatos({ cargo, limite, titulo, proximaRota, chaveBanco }) {
  const { user, userData, loading: userLoading, filtroAtivo, setFiltroAtivo } = useUser();
  const navigate = useNavigate();
  
  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  const [selecionadosNaTela, setSelecionadosNaTela] = useState([]);

  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [modalTroca, setModalTroca] = useState({ aberto: false, novoCandidato: null });
  
  const [isTourOpen, setIsTourOpen] = useState(false);

  const tourSteps = [
    { target: '#tour-reeleger', title: 'Filtro Reeleger', content: 'Mostra candidatos que <b>já foram eleitos</b> anteriormente (últimas eleições).' },
    { target: '#tour-renovar', title: 'Filtro Renovar', content: 'Apresenta candidatos que <b>nunca foram eleitos</b>.' },
    { target: '#tour-lista', title: 'Lista de Candidatos', content: 'Exibe os dados: Nome, Partido e Posição no ranking.<br/><br/>Base do ranking: <a href="https://ranking.org.br/" target="_blank">ranking.org.br</a><br/>(<a href="https://ranking.org.br/quem-somos" target="_blank">Quem Somos</a>)' },
    { target: '.tour-grafico', title: 'Gráfico de Intenção (%)', content: 'Representa uma estimativa de intenção de votos baseada na média de votos da eleição passada no estado.<br/><br/>Quando um candidato atinge <b>100%</b>, ele sai da lista (limitada a 4 posições) e o próximo do ranking entra.' },
    { target: '#tour-busca', title: 'Pesquisa Inteligente', content: 'Permite buscar candidatos rapidamente por:<br/><br/>- Nome<br/>- Sigla do Partido<br/>- Nome do Partido' }
  ];

  useEffect(() => {
    if (!['reeleger', 'renovar'].includes(filtroAtivo)) {
       setFiltroAtivo('reeleger');
    }

    const fetchDados = async () => {
      setLoading(true);
      try {
        const qTodos = query(collection(db, "candidatos"), where("Cargo", "==", cargo));
        const snapTodos = await getDocs(qTodos);
        const lista = snapTodos.docs.map(doc => {
          const d = doc.data();
          const votos = d.votos_recebidos || 0;
          
          const valCand = d["Nota candidato"];
          const valPart = d["Nota partido"];
          const isNotaValida = (val) => val !== undefined && val !== null && val !== "" && val !== "-";
          const temNotaCandidato = isNotaValida(valCand) && Number(valCand) !== 0;
          
          let notaFinal = 0;
          if (temNotaCandidato) notaFinal = parseFloat(valCand);
          else if (isNotaValida(valPart)) notaFinal = parseFloat(valPart);
          
          let cardColorClass = 'card-yellow';
          if (notaFinal < 6) cardColorClass = 'card-red';
          else if (notaFinal >= 7) cardColorClass = 'card-green';

          const classificacaoOriginal = d["Classificação"] || d["Classificacao"] || "-";
          const classificacaoNum = classificacaoOriginal === "-" ? 999999 : Number(classificacaoOriginal);
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
            porcentagemCalculada: Math.min((votos / MEDIA_TESTE) * 100, 100).toFixed(0)
          };
        });
        setTodosCandidatos(lista);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDados();
  }, [cargo, filtroAtivo, setFiltroAtivo]);

  useEffect(() => {
    if (userData?.candidatos_escolhidos?.[chaveBanco] && todosCandidatos.length > 0) {
      const salvo = userData.candidatos_escolhidos[chaveBanco];
      const nomesArray = Array.isArray(salvo) ? salvo : [salvo];
      setSelecionadosNaTela(todosCandidatos.filter(c => nomesArray.includes(c.Nome)));
    }
  }, [userData, todosCandidatos, chaveBanco]);

  const candidatosFiltrados = useMemo(() => {
    const meuEstado = userData?.estado?.replace(/[\s\u00A0]+/g, '') || "SP";
    let filtrados = todosCandidatos.filter(c => c.ufLimpa === meuEstado || c.ufLimpa === "TODOS");
    
    if (filtroAtivo === 'renovar') {
      filtrados.sort((a, b) => b.notaFinal - a.notaFinal);
    } else {
      filtrados.sort((a, b) => a.classificacaoNum - b.classificacaoNum);
    }
    
    return filtrados;
  }, [todosCandidatos, userData, filtroAtivo]);

  const listaExibida = useMemo(() => {
    const disponiveis = candidatosFiltrados.filter(c => parseInt(c.porcentagemCalculada) < 100);
    if (filtroAtivo === 'renovar') return disponiveis.filter(c => !c.temNotaCandidato).slice(0, 4);
    else return disponiveis.filter(c => c.temNotaCandidato).slice(0, 4);
  }, [candidatosFiltrados, filtroAtivo]);

  const { listaBusca, buscaNaPrincipal, buscaVazia } = useMemo(() => {
    if (!busca.trim()) {
      return { listaBusca: [], buscaNaPrincipal: false, buscaVazia: false };
    }

    const textoBusca = busca.toLowerCase();
    
    let matches = candidatosFiltrados.filter(c => {
        const nome = (c.Nome || '').toLowerCase();
        const partido = (c.Partido || '').toLowerCase();
        return nome.includes(textoBusca) || partido.includes(textoBusca);
    });

    if (filtroAtivo === 'renovar') matches = matches.filter(c => !c.temNotaCandidato);
    else matches = matches.filter(c => c.temNotaCandidato);

    if (matches.length === 0) return { listaBusca: [], buscaNaPrincipal: false, buscaVazia: true };

    const idsPrincipal = listaExibida.map(c => c.id);
    const naPrincipal = matches.filter(c => idsPrincipal.includes(c.id));
    const foraPrincipal = matches.filter(c => !idsPrincipal.includes(c.id));

    return { listaBusca: foraPrincipal, buscaNaPrincipal: naPrincipal.length > 0, buscaVazia: false };
  }, [candidatosFiltrados, busca, filtroAtivo, listaExibida]);

  const handleConfirmarFinal = async (listaFinalDaTela) => {
    if (listaFinalDaTela.length < limite) {
      setModalAviso({ aberto: true, mensagem: cargo === "Senador" ? "Tem de selecionar 2 Senadores." : "Tem de selecionar pelo menos 1 Deputado Federal." });
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const salvoNoBanco = userData?.candidatos_escolhidos?.[chaveBanco];
      const nomesNoBanco = salvoNoBanco ? (Array.isArray(salvoNoBanco) ? salvoNoBanco : [salvoNoBanco]) : [];
      const nomesFinais = listaFinalDaTela.map(c => c.Nome);
      const paraAdicionar = listaFinalDaTela.filter(c => !nomesNoBanco.includes(c.Nome));
      const paraRemover = todosCandidatos.filter(c => nomesNoBanco.filter(nome => !nomesFinais.includes(nome)).includes(c.Nome));

      const valorParaSalvar = limite === 1 ? nomesFinais[0] : nomesFinais;
      await updateDoc(userRef, { [`candidatos_escolhidos.${chaveBanco}`]: valorParaSalvar });

      for (const c of paraAdicionar) await updateDoc(doc(db, "candidatos", c.id), { votos_recebidos: increment(1) });
      for (const c of paraRemover) await updateDoc(doc(db, "candidatos", c.id), { votos_recebidos: increment(-1) });

      navigate(proximaRota);
    } catch (e) { console.error(e); setLoading(false); }
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
        dadosBusca={listaBusca} 
        buscaNaPrincipal={buscaNaPrincipal} 
        buscaVazia={buscaVazia} 
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
        renderItem={(cand) => (
          <div className="cand-item-layout">
            <div className="cand-data-left">
              <div className="cand-name">{cand.Nome.toUpperCase()}</div>
              <div className="cand-party">{cand.Partido}</div>
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
            <div className="cand-chart-right tour-grafico">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${cand.porcentagemCalculada}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.35" className="percentage">{cand.porcentagemCalculada}%</text>
              </svg>
            </div>
          </div>
        )}
      />

      <ConfirmModal isOpen={modalAviso.aberto} titulo="OPS!" mensagem={modalAviso.mensagem} textoConfirmar="OK, ENTENDI" mostrarCancelar={false} onConfirm={() => setModalAviso({ aberto: false, mensagem: '' })} />
      <ConfirmModal isOpen={modalTroca.aberto} titulo="LIMITE ATINGIDO" mensagem={`Apenas pode selecionar ${limite} candidatos. Qual destes deseja trocar por ${modalTroca.novoCandidato?.Nome}?`} onCancel={() => setModalTroca({ aberto: false, novoCandidato: null })}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {selecionadosNaTela.map(cand => (
            <button key={cand.id} className="btn-modal btn-confirmar aviso" onClick={() => executarTroca(cand)} style={{ fontSize: '0.85rem', padding: '15px' }}>
              TROCAR: {cand.Nome}
            </button>
          ))}
        </div>
      </ConfirmModal>
    </>
  );
}