import { useDeferredValue, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAZILIAN_STATES } from '@/constants/states';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import {
  clearVoteReceipt,
  draftHasBallotSelections,
  getBallotEstado,
  getBallotSelectionCounts,
  getVisitorBallotEstado,
  readBallotDraft,
  readVisitorBallotDraft,
  saveBallotState,
  saveVisitorBallotState
} from '@/services/voting/votingService';
import { flowError, flowLog, flowWarn } from '@/utils/debugFlow';
import { normalizeSearch } from '@/utils/search';
import { normalizeStateCode } from '@/utils/state';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import TourModal from '@/components/feedback/TourModal';
import SelectBase from '@/components/selection/SelectBase';

export default function Home() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [pendingEstado, setPendingEstado] = useState(null);
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);
  
  const [isTourOpen, setIsTourOpen] = useState(false);
  const isVisitorMode = !user?.uid;
  const estadoSelecionado = normalizeStateCode(user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado());

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

    const novoEstado = selecionados[0].sigla;
    const draft = user?.uid
      ? readBallotDraft(user.uid, estadoSelecionado)
      : readVisitorBallotDraft(estadoSelecionado);
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
    await executarMudanca(novoEstado);
  };

  const executarMudanca = async (novoEstado) => {
    flowLog('home.change-state.start', {
      userId: user?.uid || 'visitor',
      novoEstado,
      estadoFirestore: user?.uid ? userData?.estado || null : null
    });

    setLoading(true); setModalOpen(false);
    try {
      const estadoAtual = user?.uid
        ? readBallotDraft(user.uid, estadoSelecionado).estado || estadoSelecionado || null
        : readVisitorBallotDraft(estadoSelecionado).estado || estadoSelecionado || null;

      if (user?.uid) {
        await saveBallotState(user.uid, novoEstado);
      } else {
        await saveVisitorBallotState(novoEstado);
      }

      if (user?.uid && estadoAtual !== novoEstado) {
        clearVoteReceipt(user.uid);
      }

      flowLog('home.change-state.saved', { novoEstado });
      navigate(BALLOT_ROUTES.deputadoFederal, { state: { bypassVoteRedirect: true } });
    } catch (e) {
      flowError('home.change-state.error', e, { novoEstado });
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar estado: ", e);
      }
      setModalAviso({
        aberto: true,
        mensagem: 'Não foi possível salvar seu estado agora. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      
      <SelectBase
        titulo="SELECIONE SEU ESTADO" dados={listaExibida} limiteSelecao={1} selecaoInicial={selecaoInicial}
        carregando={(!isVisitorMode && userLoading) || loading} mostrarBusca={true} valorBusca={busca} onChangeBusca={setBusca}
        onConfirmar={handleConfirmar}
        linhasVisiveis={6}
        variant="home-state"
        currentStep="estado"
        autoAvancarAoSelecionar={true}
        onHelpClick={() => setIsTourOpen(true)}
        renderItem={(estado) => (
          <div className="state-card__content">
            <span className="state-card__identity">
              <span className="state-card__name-row">
                <span className="state-centered-name">
                  <span className="state-full-name">{estado.nome}</span>
                  <span className="state-sigla">{estado.sigla}</span>
                </span>
              </span>
            </span>
          </div>
        )}
      />
      <ConfirmModal isOpen={modalOpen} titulo="MUDANÇA DE ESTADO" mensagem="Ao mudar de estado, suas seleções atuais serão apagadas. Deseja continuar?" textoConfirmar="SIM" textoCancelar="NÃO" tipo="perigo" onConfirm={() => executarMudanca(pendingEstado)} onCancel={() => setModalOpen(false)} />
      <ConfirmModal
        isOpen={modalAviso.aberto}
        titulo="OPS!"
        mensagem={modalAviso.mensagem}
        textoConfirmar="OK, ENTENDI"
        mostrarCancelar={false}
        onConfirm={() => setModalAviso({ aberto: false, mensagem: '' })}
      />
    </>
  );
}
