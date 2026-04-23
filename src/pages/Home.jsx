import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/useUser';
import { db } from '../services/firebaseConfig';
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  clearVoteReceipt,
  draftHasBallotSelections,
  getBallotEstado,
  getBallotSelectionCounts,
  readBallotDraft,
  readLastVoteReceipt,
  resetBallotForState,
  saveBallotState
} from '../services/votingService';
import { flowError, flowLog, flowWarn } from '../services/debugFlow';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import TourModal from '../components/TourModal'; // IMPORTADO O TOUR MODAL

const LISTA_ESTADOS = [
  { id: 'AC', nome: 'Acre', sigla: 'AC' }, { id: 'AL', nome: 'Alagoas', sigla: 'AL' },
  { id: 'AP', nome: 'Amapá', sigla: 'AP' }, { id: 'AM', nome: 'Amazonas', sigla: 'AM' },
  { id: 'BA', nome: 'Bahia', sigla: 'BA' }, { id: 'CE', nome: 'Ceará', sigla: 'CE' },
  { id: 'DF', nome: 'Distrito Federal', sigla: 'DF' }, { id: 'ES', nome: 'Espírito Santo', sigla: 'ES' },
  { id: 'GO', nome: 'Goiás', sigla: 'GO' }, { id: 'MA', nome: 'Maranhão', sigla: 'MA' },
  { id: 'MT', nome: 'Mato Grosso', sigla: 'MT' }, { id: 'MS', nome: 'Mato Grosso do Sul', sigla: 'MS' },
  { id: 'MG', nome: 'Minas Gerais', sigla: 'MG' }, { id: 'PA', nome: 'Pará', sigla: 'PA' },
  { id: 'PB', nome: 'Paraíba', sigla: 'PB' }, { id: 'PR', nome: 'Paraná', sigla: 'PR' },
  { id: 'PE', nome: 'Pernambuco', sigla: 'PE' }, { id: 'PI', nome: 'Piauí', sigla: 'PI' },
  { id: 'RJ', nome: 'Rio de Janeiro', sigla: 'RJ' }, { id: 'RN', nome: 'Rio Grande do Norte', sigla: 'RN' },
  { id: 'RS', nome: 'Rio Grande do Sul', sigla: 'RS' }, { id: 'RO', nome: 'Rondônia', sigla: 'RO' },
  { id: 'RR', nome: 'Roraima', sigla: 'RR' }, { id: 'SC', nome: 'Santa Catarina', sigla: 'SC' },
  { id: 'SP', nome: 'São Paulo', sigla: 'SP' }, { id: 'SE', nome: 'Sergipe', sigla: 'SE' },
  { id: 'TO', nome: 'Tocantins', sigla: 'TO' }
];

const normalizarBusca = (valor) => (
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export default function Home() {
  const { user, userData, userEligibility, loading: userLoading, filtroAtivo } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);
  const [busca, setBusca] = useState('');
  
  // ESTADO PARA O TOUR NA HOME
  const [isTourOpen, setIsTourOpen] = useState(false);
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : userData?.estado;

  useEffect(() => {
    if (user?.uid && userEligibility?.has_voted && readLastVoteReceipt(user.uid)) {
      flowLog('home.redirect.result-with-receipt', { userId: user.uid });
      navigate('/finalizacao', { replace: true });
    }
  }, [user?.uid, userEligibility?.has_voted, navigate]);

  // TEXTOS DO TOUR ESPECÍFICOS PARA A HOME (Baseados no PDF)
  const tourSteps = [
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa o estado em que você vota.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os estados a serem selecionados.' }
  ];

  const selecaoInicial = estadoSelecionado ? LISTA_ESTADOS.filter(estado => estado.sigla === estadoSelecionado) : [];

  const listaExibida = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return LISTA_ESTADOS;

    return LISTA_ESTADOS.filter((estado) => {
      const nome = normalizarBusca(estado.nome);
      const sigla = normalizarBusca(estado.sigla);
      const nomeCompleto = normalizarBusca(`${estado.nome} ${estado.sigla}`);

      return nome.includes(termo) || sigla.includes(termo) || nomeCompleto.includes(termo);
    });
  }, [busca]);

  const handleConfirmar = async (selecionados) => {
    flowLog('home.confirm-state.start', {
      userId: user?.uid,
      selecionados: selecionados.map((estado) => estado.sigla)
    });

    if (selecionados.length === 0) {
      flowWarn('home.confirm-state.empty-selection');
      return;
    }

    if (!user?.uid) {
      flowWarn('home.confirm-state.no-user');
      navigate('/', { replace: true });
      return;
    }

    const novoEstado = selecionados[0].sigla;
    const draft = readBallotDraft(user.uid, estadoSelecionado);
    const estadoAtual = draft.estado || estadoSelecionado || null;
    const selectionCounts = getBallotSelectionCounts(draft);

    flowLog('home.confirm-state.draft-status', {
      estadoAtual,
      novoEstado,
      selectionCounts
    });

    if (estadoAtual && estadoAtual !== novoEstado) {
      if (draftHasBallotSelections(draft)) {
        flowWarn('home.confirm-state.requires-reset', { estadoAtual, novoEstado, selectionCounts });
        setPendingEstado(novoEstado);
        setModalOpen(true);
        return;
      }
    }
    executarMudanca(novoEstado);
  };

  const executarMudanca = async (novoEstado) => {
    if (!user?.uid) {
      flowWarn('home.change-state.no-user');
      navigate('/', { replace: true });
      return;
    }

    flowLog('home.change-state.start', {
      userId: user.uid,
      novoEstado,
      estadoFirestore: userData?.estado || null
    });

    setLoading(true); setModalOpen(false);
    try {
      const userRef = doc(db, "users", user.uid);
      const estadoAtual = readBallotDraft(user.uid, estadoSelecionado).estado || estadoSelecionado || null;
      const estadoPatch = {
        estado: novoEstado,
        role: userData?.role || 'voter',
        schema_version: 1,
        updated_at: serverTimestamp(),
        candidatos_escolhidos: deleteField()
      };

      if (estadoAtual && estadoAtual !== novoEstado) {
        resetBallotForState(user.uid, novoEstado);
        clearVoteReceipt(user.uid);
      } else {
        saveBallotState(user.uid, novoEstado);
      }

      updateDoc(userRef, estadoPatch)
        .then(() => {
          flowLog('home.change-state.firestore-success', { userId: user.uid, novoEstado });
        })
        .catch((error) => {
          flowError('home.change-state.firestore-error', error, { userId: user.uid, novoEstado });
        });

      flowLog('home.change-state.navigate', { to: '/escolher-deputado-federal', novoEstado });
      navigate('/escolher-deputado-federal');
    } catch (e) {
      flowError('home.change-state.local-error', e, { novoEstado });
      console.error("Erro ao salvar estado: ", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      
      <SelectBase
        titulo="SELECIONE SEU ESTADO" dados={listaExibida} limiteSelecao={1} selecaoInicial={selecaoInicial}
        carregando={userLoading || loading} mostrarBusca={true} valorBusca={busca} onChangeBusca={setBusca}
        onConfirmar={handleConfirmar} onVoltar={() => navigate(-1)}
        linhasVisiveis={6} 
        abaAtiva={filtroAtivo}
        onHelpClick={() => setIsTourOpen(true)} /* ATIVA O BOTÃO "i" NA TELA DE ESTADOS */
        renderItem={(estado) => (
          <div className="state-centered-name">
            <span className="state-sigla">{estado.sigla}</span>
            <span className="state-full-name">{estado.nome}</span>
          </div>
        )}
      />
      <ConfirmModal isOpen={modalOpen} titulo="MUDANÇA DE ESTADO" mensagem="Ao mudar de estado, suas seleções atuais serão apagadas. Deseja continuar?" textoConfirmar="SIM" textoCancelar="NÃO" tipo="perigo" onConfirm={() => executarMudanca(pendingEstado)} onCancel={() => setModalOpen(false)} />
    </>
  );
}
