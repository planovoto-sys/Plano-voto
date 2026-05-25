import { User as UserIcon, Users } from 'lucide-react';
import { useDeferredValue, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAZILIAN_STATES } from '@/constants/states';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import {
  fetchCandidatesByOffice,
  fetchStateChoiceCounts,
  readCachedCandidatesByOffice,
  readCachedStateChoiceCounts
} from '@/services/candidates/candidateService';
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
import { getCandidateStateCode, normalizeStateCode } from '@/utils/state';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import TourModal from '@/components/feedback/TourModal';
import SelectBase from '@/components/selection/SelectBase';

const STATE_CANDIDATE_OFFICES = ['Deputado Federal', 'Senador'];

const numberFormatter = new Intl.NumberFormat('pt-BR');

const getOfficeStateCode = (candidate, officeName) => {
  const isSenateOffice = officeName === 'Senador';
  return getCandidateStateCode(candidate, { allowPartyFallback: isSenateOffice }) || (
    isSenateOffice ? '' : 'TODOS'
  );
};

const buildCandidateCountsByState = (officeGroups) => {
  const counts = Object.fromEntries(BRAZILIAN_STATES.map((state) => [state.sigla, 0]));
  const stateCodes = Object.keys(counts);

  officeGroups.forEach(({ officeName, candidates }) => {
    candidates.forEach((candidate) => {
      const stateCode = getOfficeStateCode(candidate, officeName);

      if (stateCode === 'TODOS') {
        stateCodes.forEach((code) => {
          counts[code] += 1;
        });
        return;
      }

      if (counts[stateCode] !== undefined) {
        counts[stateCode] += 1;
      }
    });
  });

  return counts;
};

const mapChoiceCountsByState = (counts) => {
  const mappedCounts = {};

  counts.forEach((value, stateCode) => {
    mappedCounts[stateCode] = Math.max(0, Number(value?.active_voters) || 0);
  });

  return mappedCounts;
};

const formatInteger = (value) => {
  if (!Number.isFinite(value)) return '--';
  return numberFormatter.format(value);
};

export default function Home() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [pendingEstado, setPendingEstado] = useState(null);
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);
  const [candidateCountsByState, setCandidateCountsByState] = useState({});
  const [candidateCountsStatus, setCandidateCountsStatus] = useState('loading');
  const [voterCountsByState, setVoterCountsByState] = useState({});
  const [voterCountsStatus, setVoterCountsStatus] = useState('loading');
  
  const [isTourOpen, setIsTourOpen] = useState(false);
  const isVisitorMode = !user?.uid;
  const estadoSelecionado = normalizeStateCode(user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado());

  const tourSteps = [
    { target: '.app-help-action', title: 'AJUDA', content: 'Abre este guia sempre que você quiser revisar a tela.' },
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa o estado em que você vota.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os estados a serem selecionados.' }
  ];

  useEffect(() => {
    let cancelled = false;

    const cachedOfficeGroups = STATE_CANDIDATE_OFFICES
      .map((officeName) => {
        const cached = readCachedCandidatesByOffice(officeName);
        return cached?.value?.length ? { officeName, candidates: cached.value, isFresh: cached.isFresh } : null;
      })
      .filter(Boolean);

    if (cachedOfficeGroups.length === STATE_CANDIDATE_OFFICES.length) {
      queueMicrotask(() => {
        if (cancelled) return;
        setCandidateCountsByState(buildCandidateCountsByState(cachedOfficeGroups));
        setCandidateCountsStatus('ready');
      });
    }

    const loadCandidateCounts = async () => {
      try {
        const officeGroups = await Promise.all(STATE_CANDIDATE_OFFICES.map(async (officeName) => {
          const cached = readCachedCandidatesByOffice(officeName);
          const shouldUseCache = cached?.isFresh && cached.value?.length;
          const candidates = shouldUseCache ? cached.value : await fetchCandidatesByOffice(officeName);
          return { officeName, candidates };
        }));

        if (cancelled) return;
        setCandidateCountsByState(buildCandidateCountsByState(officeGroups));
        setCandidateCountsStatus('ready');
      } catch (error) {
        flowWarn('home.state-candidate-counts.error', { message: error?.message });
        if (!cancelled && cachedOfficeGroups.length !== STATE_CANDIDATE_OFFICES.length) {
          setCandidateCountsStatus('error');
        }
      }
    };

    loadCandidateCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cachedChoiceCounts = readCachedStateChoiceCounts(BRAZILIAN_STATES);

    if (cachedChoiceCounts.size === BRAZILIAN_STATES.length) {
      queueMicrotask(() => {
        if (cancelled) return;
        setVoterCountsByState(mapChoiceCountsByState(cachedChoiceCounts));
        setVoterCountsStatus('ready');
      });
    }

    const loadVoterCounts = async () => {
      try {
        const choiceCounts = await fetchStateChoiceCounts(BRAZILIAN_STATES);

        if (cancelled) return;
        setVoterCountsByState(mapChoiceCountsByState(choiceCounts));
        setVoterCountsStatus('ready');
      } catch (error) {
        flowWarn('home.state-voter-counts.error', { message: error?.message });
        if (!cancelled && cachedChoiceCounts.size !== BRAZILIAN_STATES.length) {
          setVoterCountsStatus('error');
        }
      }
    };

    loadVoterCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const estadosComMetricas = useMemo(() => {
    return BRAZILIAN_STATES.map((estado) => {
      const candidateCount = candidateCountsByState[estado.sigla];
      const voterCount = voterCountsByState[estado.sigla];

      return {
        ...estado,
        candidateCount: Number.isFinite(candidateCount) ? candidateCount : null,
        candidateCountLoading: candidateCountsStatus === 'loading',
        voterCount: Number.isFinite(voterCount) ? voterCount : null,
        voterCountLoading: voterCountsStatus === 'loading'
      };
    });
  }, [candidateCountsByState, candidateCountsStatus, voterCountsByState, voterCountsStatus]);

  const selecaoInicial = estadoSelecionado ? estadosComMetricas.filter(estado => estado.sigla === estadoSelecionado) : [];

  const listaExibida = useMemo(() => {
    const termo = normalizeSearch(buscaDiferida);
    if (!termo) return estadosComMetricas;

    return estadosComMetricas.filter((estado) => {
      const nome = normalizeSearch(estado.nome);
      const sigla = normalizeSearch(estado.sigla);
      const nomeCompleto = normalizeSearch(`${estado.nome} ${estado.sigla}`);

      return nome.includes(termo) || sigla.includes(termo) || nomeCompleto.includes(termo);
    });
  }, [buscaDiferida, estadosComMetricas]);

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
            <span className="state-card__stats">
              <span className="state-card__pill">
                <Users aria-hidden="true" />
                <span>Candidatos: {estado.candidateCountLoading ? '...' : formatInteger(estado.candidateCount)}</span>
              </span>
              <span className="state-card__pill">
                <UserIcon aria-hidden="true" />
                <span>Eleitores: {estado.voterCountLoading ? '...' : formatInteger(estado.voterCount)}</span>
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
