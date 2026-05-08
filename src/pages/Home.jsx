import { useDeferredValue, useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { BRAZILIAN_STATES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import { db } from '@/services/firebase/firebase';
import {
  clearVoteReceipt,
  draftHasBallotSelections,
  getBallotEstado,
  getBallotSelectionCounts,
  readBallotDraft,
  resetBallotForState,
  saveBallotState
} from '@/services/voting/votingService';
import { flowError, flowLog, flowWarn } from '@/utils/debugFlow';
import { normalizeSearch } from '@/utils/search';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import TourModal from '@/components/feedback/TourModal';
import SelectBase from '@/components/selection/SelectBase';

export default function Home() {
  const { user, userData, userEligibility, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);
  
  const [isTourOpen, setIsTourOpen] = useState(false);
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : userData?.estado;
  const bypassVoteRedirect = location.state?.bypassVoteRedirect === true;

  useEffect(() => {
    if (!bypassVoteRedirect && user?.uid && userEligibility?.has_voted) {
      flowLog('home.redirect.result-after-vote', { userId: user.uid });
      navigate('/finalizacao', { replace: true });
    }
  }, [bypassVoteRedirect, user?.uid, userEligibility?.has_voted, navigate]);

  const tourSteps = [
    { target: '.app-help-action', title: 'AJUDA', content: 'Abre este guia sempre que você quiser revisar a tela.' },
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa o estado em que você vota.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os estados a serem selecionados.' }
  ];

  const selecaoInicial = estadoSelecionado ? BRAZILIAN_STATES.filter(estado => estado.sigla === estadoSelecionado) : [];

  const listaExibida = useMemo(() => {
    const termo = normalizeSearch(buscaDiferida);
    if (!termo) return BRAZILIAN_STATES;

    return BRAZILIAN_STATES.filter((estado) => {
      const nome = normalizeSearch(estado.nome);
      const sigla = normalizeSearch(estado.sigla);
      const nomeCompleto = normalizeSearch(`${estado.nome} ${estado.sigla}`);

      return nome.includes(termo) || sigla.includes(termo) || nomeCompleto.includes(termo);
    });
  }, [buscaDiferida]);

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

      flowLog('home.change-state.saved', { novoEstado });
    } catch (e) {
      flowError('home.change-state.local-error', e, { novoEstado });
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar estado: ", e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      
      <SelectBase
        titulo="SELECIONE SEU ESTADO" dados={listaExibida} limiteSelecao={1} selecaoInicial={selecaoInicial}
        carregando={userLoading || loading} mostrarBusca={true} valorBusca={busca} onChangeBusca={setBusca}
        onConfirmar={handleConfirmar}
        linhasVisiveis={6}
        variant="home-state"
        currentStep="estado"
        autoAvancarAoSelecionar={false}
        onHelpClick={() => setIsTourOpen(true)}
        renderItem={(estado) => (
          <div className="state-centered-name">
            <span className="state-full-name">{estado.nome}</span>
            <span className="state-sigla">{estado.sigla}</span>
          </div>
        )}
      />
      <ConfirmModal isOpen={modalOpen} titulo="MUDANÇA DE ESTADO" mensagem="Ao mudar de estado, suas seleções atuais serão apagadas. Deseja continuar?" textoConfirmar="SIM" textoCancelar="NÃO" tipo="perigo" onConfirm={() => executarMudanca(pendingEstado)} onCancel={() => setModalOpen(false)} />
    </>
  );
}
