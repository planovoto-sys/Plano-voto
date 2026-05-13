import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE, CANDIDATE_FILTERS } from '@/constants/candidates';
import { STATE_NAMES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import {
  fetchRemoteBallotDraft,
  getBallotEstado,
  getVotingErrorMessage,
  readBallotDraft,
  saveBallotStepSelection
} from '@/services/voting/votingService';
import {
  fetchCandidatesByOffice,
  fetchCandidateTallies,
  readCachedCandidatesByOffice,
  readCachedTallies
} from '@/services/candidates/candidateService';
import { flowError, flowLog, flowWarn } from '@/utils/debugFlow';
import {
  calculateCandidateChance,
  getCandidateChance,
  getCandidateName,
  getCandidateSystemScore,
  parseNumeric
} from '@/utils/candidateMetrics';
import { normalizeSearch } from '@/utils/search';
import { getCandidateStateCode, normalizeStateCode } from '@/utils/state';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import FlowToast from '@/components/feedback/FlowToast';
import TourModal from '@/components/feedback/TourModal';
import SelectBase from '@/components/selection/SelectBase';

const buildSelectionIdCounts = (candidates) => (
  candidates.reduce((counts, candidate) => {
    if (!candidate?.id) return counts;
    counts.set(candidate.id, (counts.get(candidate.id) || 0) + 1);
    return counts;
  }, new Map())
);

const getCandidateElectionFilter = (candidate) => {
  const values = [
    candidate.filtro,
    candidate.Filtro,
    candidate.tipo,
    candidate.Tipo,
    candidate.categoria,
    candidate.Categoria,
    candidate.perfil,
    candidate.Perfil,
    candidate.situacao,
    candidate.Situacao,
    candidate['Situação'],
    candidate.mandato,
    candidate.Mandato,
    candidate.reeleicao,
    candidate.Reeleicao,
    candidate['Reeleição'],
    candidate['À reeleição'],
    candidate.renovacao,
    candidate.Renovacao,
    candidate['Renovação'],
    candidate['À renovação']
  ];

  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 'reeleger' : 'renovar';
    }

    const normalizedValue = normalizeSearch(String(value ?? ''));
    if (!normalizedValue) continue;
    if (['true', 'sim', '1'].includes(normalizedValue)) return 'reeleger';
    if (['false', 'nao', 'não', '0'].includes(normalizedValue)) return 'renovar';

    if (
      normalizedValue.includes('renov') ||
      normalizedValue.includes('novo') ||
      normalizedValue.includes('fora') ||
      normalizedValue.includes('nao eleito') ||
      normalizedValue.includes('sem mandato')
    ) {
      return 'renovar';
    }

    if (
      normalizedValue.includes('reele') ||
      normalizedValue.includes('mandato') ||
      normalizedValue.includes('legislatura') ||
      normalizedValue.includes('eleito')
    ) {
      return 'reeleger';
    }
  }

  return candidate.temNotaCandidato ? 'reeleger' : 'renovar';
};

const getFeaturedSelectionCandidates = (candidates, limit) => {
  const groupWeight = (candidate) => {
    const score = getCandidateSystemScore(candidate);
    const chance = getCandidateChance(candidate);

    if (score > 7 && chance > 0 && chance < 100) return 0;
    if (score >= 7 && chance < 100) return 1;
    if (score >= 7 && chance >= 100) return 2;
    if (score > 0 && score < 7) return 3;
    return 4;
  };

  return [...candidates]
    .sort((a, b) => {
      const groupDiff = groupWeight(a) - groupWeight(b);
      if (groupDiff !== 0) return groupDiff;

      const chanceDiff = getCandidateChance(b) - getCandidateChance(a);
      if (chanceDiff !== 0) return chanceDiff;

      const scoreDiff = getCandidateSystemScore(b) - getCandidateSystemScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      return getCandidateName(a).localeCompare(getCandidateName(b));
    })
    .slice(0, limit);
};

export default function EscolherCandidatos({
  cargo,
  titulo,
  subtitulo,
  proximaRota,
  rotaAnterior,
  chaveBanco,
  chaveGrupo,
  chaveGrupos
}) {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [todosCandidatos, setTodosCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);
  const [filtroLista, setFiltroLista] = useState('reeleger');
  const [selecionadosNaTela, setSelecionadosNaTela] = useState([]);
  const [ballotDraft, setBallotDraft] = useState(null);
  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [isTourOpen, setIsTourOpen] = useState(false);

  const userId = user?.uid;
  const estadoDoFluxo = userId ? getBallotEstado(userId, userData?.estado) : userData?.estado;
  const isSenadoresUnificados = chaveBanco === 'senadores' && Array.isArray(chaveGrupos) && chaveGrupos.length > 1;
  const currentStep = chaveBanco === 'deputado_federal'
    ? 'deputado'
    : 'senador';

  const tourSteps = [
    { target: '.app-help-action', title: 'AJUDA', content: 'Abre este guia sempre que você quiser revisar a tela.' },
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa candidatos por nome ou partido.' },
    { target: '.candidate-filter-tabs', title: 'FILTROS', content: '<b>Reeleição:</b> Exibe candidatos que atuaram na última legislatura.<br><b>Renovação:</b> Exibe candidatos que não atuaram na última legislatura.' },
    { target: '.prototype-candidate-card.is-fire-featured .candidate-viability', title: 'FOGUINHO', content: 'O foguinho destaca o candidato bem avaliado com a maior viabilidade entre as opções disponíveis.' },
    { target: '.prototype-candidate-card.is-viability-complete .candidate-viability', title: 'VIÁVEL 100', content: 'Quando a viabilidade está em 100, esse candidato já possui grandes chances e não precisa de mais voto.' }
  ];

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
          const ufLimpa = getCandidateStateCode(d, { allowPartyFallback: chaveBanco === 'senadores' }) || (
            chaveBanco === 'senadores' ? '' : 'TODOS'
          );
          const selectedByUsers = parseNumeric(tally.active_selections, d.active_selections);
          const averageElectedVotes = AVERAGE_ELECTED_VOTES_BY_OFFICE[chaveBanco] || 3;
          const chance = calculateCandidateChance(selectedByUsers, averageElectedVotes);

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
          tallies = await fetchCandidateTallies(candidateDocs.map((candidateDoc) => candidateDoc.id), { forceRefresh: true });
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

  const candidatosDoEstado = useMemo(() => {
    const meuEstado = normalizeStateCode(estadoDoFluxo);
    return todosCandidatos.filter((candidate) => (
      candidate.ufLimpa === meuEstado || (chaveBanco !== 'senadores' && candidate.ufLimpa === 'TODOS')
    ));
  }, [chaveBanco, todosCandidatos, estadoDoFluxo]);

  useEffect(() => {
    let cancelled = false;

    const restoreSelection = async () => {
      if (!userId || todosCandidatos.length === 0) {
        setSelecionadosNaTela([]);
        setBallotDraft(null);
        return;
      }

      let draft = readBallotDraft(userId, estadoDoFluxo);
      try {
        draft = await fetchRemoteBallotDraft(userId, estadoDoFluxo);
      } catch (error) {
        flowWarn('candidates.remote-draft.fetch-error', { cargo, chaveGrupo, message: error?.message });
      }

      if (cancelled) return;
      setBallotDraft(draft);

      const gruposDaTela = isSenadoresUnificados ? chaveGrupos : [chaveGrupo];
      const idsSalvos = gruposDaTela
        .flatMap((groupKey) => draft.candidate_groups?.[groupKey] || [])
        .map((candidate) => candidate.id);
      flowLog('candidates.restore-selection', {
        cargo,
        chaveGrupo: isSenadoresUnificados ? chaveGrupos.join(',') : chaveGrupo,
        estado: estadoDoFluxo,
        idsSalvos
      });
      setSelecionadosNaTela(candidatosDoEstado.filter((candidate) => idsSalvos.includes(candidate.id)));
    };

    restoreSelection();

    return () => {
      cancelled = true;
    };
  }, [cargo, userId, estadoDoFluxo, todosCandidatos, candidatosDoEstado, chaveGrupo, chaveGrupos, isSenadoresUnificados]);

  const selectedCandidateIdsInOtherSteps = useMemo(() => {
    if (!userId) return new Set();

    const draft = ballotDraft || readBallotDraft(userId, estadoDoFluxo);
    const gruposDaTela = new Set(isSenadoresUnificados ? chaveGrupos : [chaveGrupo]);
    const ids = Object.entries(draft.candidate_groups || {})
      .filter(([stepId]) => !gruposDaTela.has(stepId))
      .flatMap(([, candidates]) => candidates.map((candidate) => candidate.id));

    return new Set(ids);
  }, [ballotDraft, chaveGrupo, chaveGrupos, estadoDoFluxo, isSenadoresUnificados, userId]);

  const listaExibida = useMemo(() => {
    let disponiveis = candidatosDoEstado;

    if (filtroLista === 'selecionados') {
      const idsSelecionados = new Set(selecionadosNaTela.map((candidate) => candidate.id));
      disponiveis = disponiveis.filter((candidate) => idsSelecionados.has(candidate.id));
    } else if (filtroLista === 'renovar') {
      disponiveis = disponiveis.filter((candidate) => getCandidateElectionFilter(candidate) === 'renovar');
    } else {
      disponiveis = disponiveis.filter((candidate) => getCandidateElectionFilter(candidate) === 'reeleger');
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

    const listaComEstado = disponiveis.map((candidate) => ({
      ...candidate,
      isAlreadyChosen: selectedCandidateIdsInOtherSteps.has(candidate.id)
    }));

    const desempatarPorNome = (a, b) => (a.Nome || '').localeCompare(b.Nome || '');
    const notaSistema = (candidate) => {
      const score = Number(candidate.notaFinal ?? candidate.nota_final ?? candidate['Nota partido'] ?? 0);
      return Number.isFinite(score) ? score : 0;
    };

    const desempatarPorChanceNotaNome = (a, b) => {
      const chanceDiff = b.chance - a.chance;
      if (chanceDiff !== 0) return chanceDiff;

      const scoreDiff = notaSistema(b) - notaSistema(a);
      if (scoreDiff !== 0) return scoreDiff;

      return desempatarPorNome(a, b);
    };

    const candidatoFoguinho = [...listaComEstado]
      .filter((candidate) => (
        !candidate.isAlreadyChosen &&
        notaSistema(candidate) > 7 &&
        candidate.chance > 0 &&
        candidate.chance < 100
      ))
      .sort(desempatarPorChanceNotaNome)[0];
    const foguinhoId = candidatoFoguinho?.id || null;

    const grupoVisual = (candidate) => {
      const score = notaSistema(candidate);

      if (candidate.id === foguinhoId) return 0;
      if (score >= 7 && candidate.chance < 100) return 1;
      if (score >= 7 && candidate.chance >= 100) return 2;
      if (score > 0 && score < 7) return 3;
      return 4;
    };

    return listaComEstado
      .map((candidate) => ({
        ...candidate,
        isChanceFeatured: candidate.id === foguinhoId
      }))
      .sort((a, b) => {
        const blockedDiff = Number(a.isAlreadyChosen) - Number(b.isAlreadyChosen);
        if (blockedDiff !== 0) return blockedDiff;

        const groupDiff = grupoVisual(a) - grupoVisual(b);
        if (groupDiff !== 0) return groupDiff;

        const chanceDiff = b.chance - a.chance;
        if (chanceDiff !== 0) return chanceDiff;

        const scoreDiff = notaSistema(b) - notaSistema(a);
        if (scoreDiff !== 0) return scoreDiff;

        return desempatarPorNome(a, b);
      });
  }, [candidatosDoEstado, filtroLista, buscaDiferida, selectedCandidateIdsInOtherSteps, selecionadosNaTela]);

  const persistirEtapa = async (listaFinalDaTela, { markCompleted = false } = {}) => {
    if (!userId) {
      flowWarn('candidates.persist.no-user', { cargo, chaveGrupo });
      navigate('/', { replace: true });
      throw new Error('Faça login para continuar.');
    }

    if (!estadoDoFluxo) {
      flowWarn('candidates.persist.no-state', { cargo, chaveGrupo });
      navigate('/home', { replace: true });
      throw new Error('Escolha um estado antes de selecionar candidatos.');
    }

    try {
      let draftAtualizado;

      if (isSenadoresUnificados) {
        draftAtualizado = await saveBallotStepSelection(userId, 'senadores_1', listaFinalDaTela, estadoDoFluxo, { markCompleted });
      } else {
        draftAtualizado = await saveBallotStepSelection(userId, chaveGrupo, listaFinalDaTela, estadoDoFluxo, { markCompleted });
      }

      setBallotDraft(draftAtualizado);
      return draftAtualizado;
    } catch (error) {
      flowError('candidates.persist.error', error, { cargo, chaveGrupo });
      setModalAviso({
        aberto: true,
        mensagem: getVotingErrorMessage(error)
      });
      throw error;
    }
  };

  const applyLocalChanceDelta = (listaAnterior, listaAtualizada) => {
    const previousCounts = buildSelectionIdCounts(listaAnterior);
    const nextCounts = buildSelectionIdCounts(listaAtualizada);

    const adjustCandidateChance = (candidate) => {
      const delta = (nextCounts.get(candidate.id) || 0) - (previousCounts.get(candidate.id) || 0);
      if (delta === 0) return candidate;

      const selectedByUsers = Math.max(
        0,
        parseNumeric(candidate.selectedByUsers, candidate.selected_by_users, candidate.active_selections) + delta
      );
      const averageElectedVotes = parseNumeric(
        candidate.averageElectedVotes,
        candidate.average_elected_votes,
        AVERAGE_ELECTED_VOTES_BY_OFFICE[chaveBanco],
        3
      );
      const chance = calculateCandidateChance(selectedByUsers, averageElectedVotes);

      return {
        ...candidate,
        selectedByUsers,
        selected_by_users: selectedByUsers,
        active_selections: selectedByUsers,
        chance
      };
    };

    setTodosCandidatos((currentCandidates) => currentCandidates.map(adjustCandidateChance));
    return listaAtualizada.map(adjustCandidateChance);
  };

  const handleSelectionChange = async (listaAtualizada, options = {}) => {
    const listaAnterior = selecionadosNaTela;
    const listaAtualizadaComChance = applyLocalChanceDelta(listaAnterior, listaAtualizada);
    setSelecionadosNaTela(listaAtualizadaComChance);

    try {
      return await persistirEtapa(listaAtualizadaComChance, { markCompleted: options.completed === true });
    } catch (error) {
      const listaRestaurada = applyLocalChanceDelta(listaAtualizadaComChance, listaAnterior);
      setSelecionadosNaTela(listaRestaurada);
      throw error;
    }
  };

  const handleAvancar = async (listaFinalDaTela, options = {}) => {
    if (isSenadoresUnificados) {
      if (listaFinalDaTela.length < 2) return false;

      if (!options.alreadySaved) {
        const draftAtualizado = await persistirEtapa(listaFinalDaTela, { markCompleted: true });
        if (!draftAtualizado) return false;
      }

      setSelecionadosNaTela(listaFinalDaTela);
      flowLog('candidates.flow.saved-on-senators', {
        cargo,
        chaveGrupo,
        totalSelecionados: listaFinalDaTela.length
      });
      return true;
    }

    if (!options.alreadySaved) {
      const draftAtualizado = await persistirEtapa(listaFinalDaTela, { markCompleted: true });
      if (!draftAtualizado) return false;
      setSelecionadosNaTela(listaFinalDaTela);
    }

    flowLog('candidates.step.next', {
      cargo,
      chaveGrupo,
      totalSelecionados: listaFinalDaTela.length,
      proximaRota
    });
    if (proximaRota) navigate(proximaRota, { state: { bypassVoteRedirect: true } });
    return true;
  };

  const handleVoltar = async (listaAtualDaTela) => {
    await persistirEtapa(listaAtualDaTela);
    navigate(rotaAnterior, { state: { bypassVoteRedirect: true } });
  };

  const handleSubNavigation = async (item) => {
    setFiltroLista(item.mode);
  };

  const shareData = useMemo(() => {
    if (!isSenadoresUnificados || selecionadosNaTela.length < 2 || !estadoDoFluxo) return null;

    const draft = ballotDraft || (userId ? readBallotDraft(userId, estadoDoFluxo) : null);
    const deputado = getFeaturedSelectionCandidates(draft?.candidate_groups?.deputado_federal || [], 1)[0] || null;
    if (!deputado) return null;

    return {
      estadoSigla: estadoDoFluxo,
      estadoNome: STATE_NAMES[estadoDoFluxo] || estadoDoFluxo,
      deputado,
      senadores: getFeaturedSelectionCandidates(selecionadosNaTela, 2)
    };
  }, [ballotDraft, estadoDoFluxo, isSenadoresUnificados, selecionadosNaTela, userId]);

  return (
    <>
      <FlowToast key={`${location.key}-${location.state?.flowNotice || ''}`} message={location.state?.flowNotice || ''} />
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      <SelectBase
        titulo={titulo}
        subtitulo={subtitulo}
        dados={listaExibida}
        emptyMessage={erroCarregamento || 'Nenhum candidato encontrado.'}
        limiteSelecao={null}
        minimoSelecao={isSenadoresUnificados ? 2 : 1}
        selecaoInicial={selecionadosNaTela}
        carregando={userLoading || loading}
        mostrarBusca={true}
        valorBusca={busca}
        onChangeBusca={setBusca}
        onHelpClick={() => setIsTourOpen(true)}
        onConfirmar={handleAvancar}
        onSelectionChange={handleSelectionChange}
        onVoltar={handleVoltar}
        linhasVisiveis={5}
        currentStep={currentStep}
        autoAvancarAoSelecionar={false}
        variant={chaveBanco === 'deputado_federal' ? 'office-deputado' : 'office-senado'}
        subNavigationItems={CANDIDATE_FILTERS}
        activeSubNavigationId={filtroLista}
        onSubNavigationSelect={handleSubNavigation}
        shareData={shareData}
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
