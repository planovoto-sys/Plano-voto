import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';

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

  useEffect(() => {
    if (!['manter', 'mudar'].includes(filtroAtivo)) {
       setFiltroAtivo('manter');
    }

    const fetchDados = async () => {
      setLoading(true);
      try {
        const qTodos = query(collection(db, "candidatos"), where("Cargo", "==", cargo));
        const snapTodos = await getDocs(qTodos);
        const lista = snapTodos.docs.map(doc => {
          const d = doc.data();
          const votos = d.votos_recebidos || 0;
          return {
            id: doc.id,
            ...d, 
            ClassificacaoOficial: d["Classificação"] || d["Classificacao"] || 0,
            ufLimpa: d.Estado ? d.Estado.replace(/[\s\u00A0]+/g, '') : "SP",
            notaFinal: parseFloat(d["Nota candidato"] || d["Nota partido"] || 0),
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
    let filtrados = todosCandidatos.filter(c => c.ufLimpa === meuEstado);
    
    // ORDENA PELA CLASSIFICAÇÃO OFICIAL DO BANCO
    filtrados.sort((a, b) => Number(a.ClassificacaoOficial) - Number(b.ClassificacaoOficial));
    
    return filtrados;
  }, [todosCandidatos, userData]);

  const listaExibida = useMemo(() => {
    if (filtroAtivo === 'mudar') return []; 
    return candidatosFiltrados.filter(c => parseInt(c.porcentagemCalculada) < 100).slice(0, 4);
  }, [candidatosFiltrados, filtroAtivo]);

  const { listaBusca, buscaNaPrincipal, buscaVazia } = useMemo(() => {
    if (!busca.trim() || filtroAtivo === 'mudar') {
      return { listaBusca: [], buscaNaPrincipal: false, buscaVazia: false };
    }

    const textoBusca = busca.toLowerCase();
    const matches = candidatosFiltrados.filter(c => c.Nome.toLowerCase().includes(textoBusca));

    if (matches.length === 0) {
      return { listaBusca: [], buscaNaPrincipal: false, buscaVazia: true };
    }

    const idsPrincipal = listaExibida.map(c => c.id);
    const naPrincipal = matches.filter(c => idsPrincipal.includes(c.id));
    const foraPrincipal = matches.filter(c => !idsPrincipal.includes(c.id));

    return {
      listaBusca: foraPrincipal,
      buscaNaPrincipal: naPrincipal.length > 0,
      buscaVazia: false
    };
  }, [candidatosFiltrados, busca, filtroAtivo, listaExibida]);

  const handleConfirmarFinal = async (listaFinalDaTela) => {
    if (listaFinalDaTela.length < limite) {
      const msg = cargo === "Senador" 
        ? "Tem de selecionar 2 Senadores para continuar." 
        : "Tem de selecionar pelo menos 1 Deputado Federal para continuar.";
      setModalAviso({ aberto: true, mensagem: msg });
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
    } catch (e) { 
      console.error(e); 
      setLoading(false); 
    }
  };

  const abrirModalTroca = (candidatoClicado) => {
    setModalTroca({ aberto: true, novoCandidato: candidatoClicado });
  };

  const executarTroca = (candidatoParaRemover) => {
    const novaLista = selecionadosNaTela.filter(c => c.id !== candidatoParaRemover.id);
    setSelecionadosNaTela([...novaLista, modalTroca.novoCandidato]);
    setModalTroca({ aberto: false, novoCandidato: null });
  };

  return (
    <>
      <Sidebar />
      <SelectBase
        titulo={titulo}
        dados={listaExibida}
        dadosBusca={listaBusca} 
        buscaNaPrincipal={buscaNaPrincipal} 
        buscaVazia={buscaVazia} 
        limiteSelecao={limite}
        selecaoInicial={selecionadosNaTela}
        carregando={userLoading || loading}
        abas={['manter', 'mudar']}
        abaAtiva={filtroAtivo}
        setAbaAtiva={setFiltroAtivo}
        mostrarBusca={filtroAtivo === 'manter'}
        valorBusca={busca}
        onChangeBusca={setBusca}
        onLimiteAtingido={abrirModalTroca}
        onConfirmar={handleConfirmarFinal}
        onVoltar={() => navigate(cargo === "Senador" ? '/escolher-deputado-federal' : '/home')}
        renderItem={(cand) => {
          
          let corNota = 'score-neutral';
          if (cand.notaFinal < 6) corNota = 'score-red';
          else if (cand.notaFinal >= 7) corNota = 'score-green';

          return (
            <div className="cand-item-layout">
              <div className="cand-data-left">
                <div className="cand-name">{cand.Nome.toUpperCase()}</div>
                <div className="cand-party">{cand.Partido}</div>
              </div>
              <div className="cand-rank-score-middle">
                
                <div className="badge-rank">{cand.ClassificacaoOficial}º</div>
                
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
          );
        }}
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