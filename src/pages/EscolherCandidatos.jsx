import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { auth } from '../services/firebaseConfig';
import { useUser } from '../contexts/useUser';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getBallotEstado,
  getVotingErrorMessage,
  readBallotDraft,
  saveBallotStepSelection
} from '../services/votingService';
import {
  fetchCandidatesByOffice,
  fetchCandidateTallies,
  readCachedCandidatesByOffice,
  readCachedTallies
} from '../services/candidateService';
import { flowError, flowLog, flowWarn } from '../services/debugFlow';
import SelectBase from '../components/SelectBase';
import ConfirmModal from '../components/ConfirmModal';
import TourModal from '../components/TourModal';

const CANDIDATE_FILTERS = [
  { id: 'reeleger', mode: 'reeleger', shortLabel: 'Reeleger' },
  { id: 'renovar', mode: 'renovar', shortLabel: 'Renovar' }
];

const AVERAGE_ELECTED_VOTES_BY_OFFICE = {
  deputado_federal: 3,
  senadores: 3
};

const parseNumeric = (...values) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return 0;
};

const calculateChance = (selectedByUsers, averageElectedVotes) => {
  if (!Number.isFinite(averageElectedVotes) || averageElectedVotes <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((selectedByUsers / averageElectedVotes) * 100)));
};

const normalizeSearch = (value) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export default function EscolherCandidatos({
  cargo,
  titulo,
  subtitulo,
  proximaRota,
  rotaAnterior,
  chaveBanco,
  chaveGrupo,
  etapa
}) {
  const { user, userData, userEligibility, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);
  const [filtroLista, setFiltroLista] = useState('reeleger');
  const [selecionadosNaTela, setSelecionadosNaTela] = useState([]);
  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [isTourOpen, setIsTourOpen] = useState(false);

  const userId = user?.uid;
  const estadoDoFluxo = userId ? getBallotEstado(userId, userData?.estado) : userData?.estado;
  const bypassVoteRedirect = location.state?.bypassVoteRedirect === true;
  const currentStep = chaveBanco === 'deputado_federal'
    ? 'deputado'
    : (chaveGrupo === 'senadores_2' ? 'senador2' : 'senador1');
  const tituloEtapa = titulo;

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const tourSteps = [
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa candidatos por nome ou partido.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os candidatos desta etapa em uma lista unica.' },
    { target: '.candidate-subnav-mobile', title: 'ETAPAS', content: 'Mostra as etapas internas de deputados federais e senadores.' }
  ];

  useEffect(() => {
    if (!bypassVoteRedirect && userId && userEligibility?.has_voted) {
      flowLog('candidates.redirect.result-after-vote', { userId, cargo, chaveGrupo });
      navigate('/finalizacao', { replace: true });
    }
  }, [bypassVoteRedirect, cargo, chaveGrupo, userId, userEligibility?.has_voted, navigate]);

  useEffect(() => {
    if (!userLoading && userId && !estadoDoFluxo) {
      flowWarn('candidates.missing-state.redirect-home', { userId, cargo, chaveGrupo });
      navigate('/home', { replace: true });
    }
  }, [cargo, chaveGrupo, estadoDoFluxo, navigate, userId, userLoading]);

  useEffect(() => {
    let cancelled = false;

    const buildCandidateList = (candidateDocs, tallies, source) => {
      const lista = candidateDocs.map((candidateDoc) => {
          const d = candidateDoc;
          const tally = tallies.get(candidateDoc.id) || {};
          const valCand = d['Nota candidato'];
          const valPart = d['Nota partido'];
          const isNotaValida = (val) => val !== undefined && val !== null && val !== '' && val !== '-';
          const temNotaCandidato = isNotaValida(valCand) && Number(valCand) !== 0;
          let notaFinal = 0;

          if (temNotaCandidato) notaFinal = parseFloat(valCand);
          else if (isNotaValida(valPart)) notaFinal = parseFloat(valPart);

          let indicatorTone = 'indicator-good';
          if (notaFinal < 7) indicatorTone = 'indicator-low';
          else if (notaFinal < 8.5) indicatorTone = 'indicator-attention';

          const classificacaoOriginal = d['Classificação'] || d.Classificacao || '-';
          const classificacaoNum = classificacaoOriginal === '-' ? 999999 : Number(classificacaoOriginal);
          const ufLimpa = d.Estado ? d.Estado.replace(/[\s\u00A0]+/g, '') : 'TODOS';
          const selectedByUsers = parseNumeric(
            tally.total_votes,
            tally.total_selections,
            d.total_selecoes,
            d.selecoes_recebidas,
            d.selecionado_por,
            d.selecionados,
            d.votos_recebidos
          );
          const averageElectedVotes = AVERAGE_ELECTED_VOTES_BY_OFFICE[chaveBanco] || 3;
          const chance = calculateChance(selectedByUsers, averageElectedVotes);

          return {
            id: candidateDoc.id,
            ...d,
            ClassificacaoOficial: classificacaoOriginal,
            classificacaoNum,
            ufLimpa,
            temNotaCandidato,
            notaFinal,
            selectedByUsers,
            averageElectedVotes,
            chance,
            cardColorClass: 'card-yellow',
            indicatorTone
          };
        });

        const rankingTotal = lista.length;
        const listaComRanking = lista.map((candidate) => ({ ...candidate, rankingTotal }));

        if (cancelled) return;

        flowLog('candidates.fetch.success', {
          cargo,
          chaveGrupo,
          total: listaComRanking.length,
          source
        });
        setTodosCandidatos(listaComRanking);
        setErroCarregamento('');
        setLoading(false);
    };

    const fetchDados = async () => {
      setLoading(true);
      setErroCarregamento('');

      const cachedCandidates = readCachedCandidatesByOffice(cargo);
      if (cachedCandidates?.value?.length) {
        const cachedTallies = readCachedTallies(cachedCandidates.value.map((candidateDoc) => candidateDoc.id));
        buildCandidateList(cachedCandidates.value, cachedTallies, cachedCandidates.isFresh ? 'cache' : 'stale-cache');
      }

      try {
        const candidateDocs = cachedCandidates?.isFresh
          ? cachedCandidates.value
          : await fetchCandidatesByOffice(cargo);
        let tallies = readCachedTallies(candidateDocs.map((candidateDoc) => candidateDoc.id));

        try {
          tallies = await fetchCandidateTallies(candidateDocs.map((candidateDoc) => candidateDoc.id));
        } catch (error) {
          flowWarn('candidates.tallies.fetch-error', { cargo, chaveGrupo, message: error?.message });
        }

        buildCandidateList(candidateDocs, tallies, cachedCandidates?.isFresh ? 'cache-refresh' : 'network');
      } catch (error) {
        flowError('candidates.fetch.error', error, { cargo, chaveGrupo });

        if (!cancelled && !cachedCandidates?.value?.length) {
          setErroCarregamento('Nao foi possivel carregar os candidatos. Verifique sua conexao e tente novamente.');
          setTodosCandidatos([]);
          setLoading(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDados();

    return () => {
      cancelled = true;
    };
  }, [cargo, chaveBanco, chaveGrupo]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (!userId || todosCandidatos.length === 0) {
        setSelecionadosNaTela([]);
        return;
      }

      const draft = readBallotDraft(userId, estadoDoFluxo);
      const idsSalvos = (draft.candidate_groups?.[chaveGrupo] || []).map((candidate) => candidate.id);
      flowLog('candidates.restore-selection', {
        cargo,
        chaveGrupo,
        estado: estadoDoFluxo,
        idsSalvos
      });
      setSelecionadosNaTela(todosCandidatos.filter((candidate) => idsSalvos.includes(candidate.id)));
    });

    return () => {
      cancelled = true;
    };
  }, [cargo, userId, estadoDoFluxo, todosCandidatos, chaveGrupo]);

  const candidatosDoEstado = useMemo(() => {
    const meuEstado = estadoDoFluxo?.replace(/[\s\u00A0]+/g, '') || '';
    return todosCandidatos.filter((candidate) => (
      candidate.ufLimpa === meuEstado || candidate.ufLimpa === 'TODOS'
    ));
  }, [todosCandidatos, estadoDoFluxo]);

  const candidatosFiltrados = useMemo(() => {
    if (filtroLista === 'renovar') {
      return [...candidatosDoEstado].sort((a, b) => (a.Nome || '').localeCompare(b.Nome || ''));
    }

    return [...candidatosDoEstado].sort((a, b) => b.notaFinal - a.notaFinal);
  }, [candidatosDoEstado, filtroLista]);

  const selectedCandidateIdsInOtherSteps = useMemo(() => {
    if (!userId) return new Set();

    const draft = readBallotDraft(userId, estadoDoFluxo);
    const ids = Object.entries(draft.candidate_groups || {})
      .filter(([stepId]) => stepId !== chaveGrupo)
      .flatMap(([, candidates]) => candidates.map((candidate) => candidate.id));

    return new Set(ids);
  }, [chaveGrupo, estadoDoFluxo, userId]);

  const listaExibida = useMemo(() => {
    let disponiveis = candidatosFiltrados;

    if (filtroLista === 'renovar') {
      disponiveis = disponiveis.filter((candidate) => !candidate.temNotaCandidato);
    } else {
      disponiveis = disponiveis.filter((candidate) => candidate.temNotaCandidato);
    }

    const termo = normalizeSearch(buscaDiferida);
    if (termo) {
      disponiveis = disponiveis.filter((candidate) => {
        const nome = normalizeSearch(candidate.Nome || '');
        const partido = normalizeSearch(candidate.Partido || '');
        const numero = normalizeSearch(candidate.Numero || candidate.numero || '');

        return nome.includes(termo) || partido.includes(termo) || numero.includes(termo);
      });
    }

    return disponiveis.map((candidate) => ({
      ...candidate,
      isAlreadyChosen: selectedCandidateIdsInOtherSteps.has(candidate.id)
    }));
  }, [candidatosFiltrados, filtroLista, buscaDiferida, selectedCandidateIdsInOtherSteps]);

  const listaDestaque = useMemo(() => (
    [...candidatosDoEstado]
      .filter((candidate) => candidate.temNotaCandidato)
      .sort((a, b) => {
        const scoreDiff = b.notaFinal - a.notaFinal;
        if (scoreDiff !== 0) return scoreDiff;
        return b.chance - a.chance;
      })
      .map((candidate) => ({
        ...candidate,
        isAlreadyChosen: selectedCandidateIdsInOtherSteps.has(candidate.id)
      }))
  ), [candidatosDoEstado, selectedCandidateIdsInOtherSteps]);

  const persistirEtapa = (listaFinalDaTela, { markCompleted = false } = {}) => {
    if (!userId) {
      flowWarn('candidates.persist.no-user', { cargo, chaveGrupo });
      navigate('/', { replace: true });
      return null;
    }

    if (!estadoDoFluxo) {
      flowWarn('candidates.persist.no-state', { cargo, chaveGrupo });
      navigate('/home', { replace: true });
      return null;
    }

    try {
      return saveBallotStepSelection(userId, chaveGrupo, listaFinalDaTela, estadoDoFluxo, { markCompleted });
    } catch (error) {
      flowError('candidates.persist.error', error, { cargo, chaveGrupo });
      setModalAviso({
        aberto: true,
        mensagem: getVotingErrorMessage(error)
      });
      return null;
    }
  };

  const handleSelectionChange = (listaAtualizada) => {
    setSelecionadosNaTela(listaAtualizada);
    persistirEtapa(listaAtualizada);
  };

  const handleAvancar = (listaFinalDaTela) => {
    const draftAtualizado = persistirEtapa(listaFinalDaTela, { markCompleted: true });
    if (!draftAtualizado) return;

    flowLog('candidates.step.next', {
      cargo,
      chaveGrupo,
      totalSelecionados: listaFinalDaTela.length,
      proximaRota
    });
    navigate(proximaRota, { state: { bypassVoteRedirect: true } });
  };

  const handleVoltar = (listaAtualDaTela) => {
    persistirEtapa(listaAtualDaTela);
    navigate(rotaAnterior, { state: { bypassVoteRedirect: true } });
  };

  const handleSubNavigation = (item, listaAtualDaTela) => {
    persistirEtapa(listaAtualDaTela);
    setFiltroLista(item.mode);
  };

  return (
    <>
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      <SelectBase
        titulo={tituloEtapa}
        subtitulo={subtitulo}
        dados={listaExibida}
        highlightDados={listaDestaque}
        emptyMessage={erroCarregamento || 'Nenhum candidato encontrado.'}
        limiteSelecao={null}
        selecaoInicial={selecionadosNaTela}
        carregando={userLoading || loading}
        mostrarBusca={true}
        valorBusca={busca}
        onChangeBusca={setBusca}
        topRightExtra={<button className="header-utility-btn" type="button" onClick={handleLogout}>Sair</button>}
        onHelpClick={() => setIsTourOpen(true)}
        onConfirmar={handleAvancar}
        onSelectionChange={handleSelectionChange}
        onVoltar={handleVoltar}
        linhasVisiveis={5}
        etapa={etapa}
        currentStep={currentStep}
        autoAvancarAoSelecionar={true}
        variant={chaveBanco === 'deputado_federal' ? 'office-deputado' : 'office-senado'}
        integratedListSearch={true}
        showListNavigation={true}
        subNavigationItems={CANDIDATE_FILTERS}
        activeSubNavigationId={filtroLista}
        onSubNavigationSelect={handleSubNavigation}
      />

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
