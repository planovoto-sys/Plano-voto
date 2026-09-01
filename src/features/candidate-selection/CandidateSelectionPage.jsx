import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE, CANDIDATE_FILTERS } from '@/shared/constants/candidates';
import { STATE_NAMES } from '@/shared/constants/states';
import { useUser } from '@/shared/hooks/useUser';
import {
  fetchRemoteBallotDraft,
  getBallotEstado,
  getVisitorBallotEstado,
  getVotingErrorMessage,
  readBallotDraft,
  readVisitorBallotDraft,
  saveBallotStepSelection,
  saveVisitorBallotStepSelection
} from '@/features/ballot';
import {
  fetchCandidatesByOffice,
  fetchCandidateTallies,
  invalidateCandidateTalliesCache,
  readCachedCandidatesByOffice,
  readCachedTallies
} from '@/features/candidate-selection/candidateService';
import { flowError, flowLog, flowWarn } from '@/shared/utils/debugFlow';
import {
  calculateCandidateChance,
  compareCandidatesByScorePriority,
  getCandidateChance,
  getCandidateSystemScore,
  parseNumeric
} from '@/shared/utils/candidateMetrics';
import { normalizeSearch } from '@/shared/utils/search';
import { getCandidateStateCode, normalizeStateCode } from '@/shared/utils/state';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import FlowToast from '@/shared/ui/feedback/FlowToast';
import { STEP_GUIDANCE_MESSAGES } from '@/features/notifications/notificationMessages';
import TourModal from '@/shared/ui/feedback/TourModal';
import SelectBase from '@/features/candidate-selection/SelectBase';
import DesktopCandidateSelection from '@/features/desktop/DesktopCandidateSelection';
import { useDesktopLayout } from '@/features/desktop/useDesktopLayout';

const getFeaturedSelectionCandidates = (candidates, limit) => {
  return [...candidates]
    .sort(compareCandidatesByScorePriority)
    .slice(0, limit);
};

const compareByScoreAndName = (a, b) => {
  return compareCandidatesByScorePriority(a, b);
};

const getFeaturedCandidateId = (candidates) => {
  const featuredCandidate = [...candidates]
    .filter((candidate) => (
      !candidate.isAlreadyChosen &&
      getCandidateSystemScore(candidate) > 7 &&
      getCandidateChance(candidate) > 0 &&
      getCandidateChance(candidate) < 100
    ))
    .sort(compareByScoreAndName)[0];

  return featuredCandidate?.id || null;
};

const getChangedSelectionIds = (previousCandidates, nextCandidates) => {
  const previousIds = new Set(previousCandidates.map((candidate) => candidate.id).filter(Boolean));
  const nextIds = new Set(nextCandidates.map((candidate) => candidate.id).filter(Boolean));

  return [...new Set([...previousIds, ...nextIds])]
    .filter((candidateId) => previousIds.has(candidateId) !== nextIds.has(candidateId));
};

const getSelectionDeltas = (previousCandidates, nextCandidates) => {
  const previousIds = new Set(previousCandidates.map((candidate) => candidate.id).filter(Boolean));
  const nextIds = new Set(nextCandidates.map((candidate) => candidate.id).filter(Boolean));
  const deltas = new Map();

  [...new Set([...previousIds, ...nextIds])].forEach((candidateId) => {
    if (previousIds.has(candidateId) === nextIds.has(candidateId)) return;
    deltas.set(candidateId, nextIds.has(candidateId) ? 1 : -1);
  });

  return deltas;
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
  const [filtroLista, setFiltroLista] = useState('avaliacao');
  const [selecionadosNaTela, setSelecionadosNaTela] = useState([]);
  const [ballotDraft, setBallotDraft] = useState(null);
  const [modalAviso, setModalAviso] = useState({ aberto: false, mensagem: '' });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const isDesktopLayout = useDesktopLayout();

  const userId = user?.uid;
  const isGuestMode = !userId;
  const estadoDoFluxo = userId ? getBallotEstado(userId, userData?.estado) : getVisitorBallotEstado();
  const isNationalOffice = chaveBanco === 'presidente';
  const isSenadoresUnificados = chaveBanco === 'senadores' && Array.isArray(chaveGrupos) && chaveGrupos.length > 1;
  const currentStep = chaveBanco === 'presidente'
    ? 'presidente'
    : chaveBanco === 'deputado_federal'
      ? 'deputado'
      : 'senador';
  const currentFilters = CANDIDATE_FILTERS.filter((f) => f.id !== 'todos');

  const tourSteps = [
    { target: '.app-help-action', title: 'AJUDA', content: 'Abre este guia sempre que você quiser revisar a tela.' },
    { target: '.step-header__search-trigger', title: 'PESQUISA', content: 'Pesquisa candidatos por nome ou partido.' },
    { target: '.filter-chip', title: 'FILTROS', content: '<b>Todos:</b> Ordena todos os candidatos pela nota.<br><b>Selecionados:</b> Exibe apenas os escolhidos.' },
    { target: '.candidate-card-list .prototype-candidate-card', title: 'AVALIAÇÃO', content: 'Os cards mostram a nota do candidato ou, quando ela não existe, a nota do partido.' }
  ];

  useEffect(() => {
    if (!userLoading && !estadoDoFluxo) {
      flowWarn('candidates.missing-state.redirect-home', { userId: userId || 'visitor', cargo, chaveGrupo });
      navigate('/home', { replace: true });
    }
  }, [cargo, chaveGrupo, estadoDoFluxo, navigate, userId, userLoading]);

  useEffect(() => {
    let cancelled = false;

    const buildCandidateList = (candidateDocs, tallies, source) => {
      const lista = candidateDocs.map((candidateDoc) => {
          const d = candidateDoc;
          const tally = tallies.get(candidateDoc.id) || {};
          const valCand = d['Nota candidato'] ?? d.nota_candidato ?? d.notaCandidato;
          const valPart = d['Nota partido'] ?? d.nota_partido ?? d.notaPartido;
          const isNotaValida = (val) => val !== undefined && val !== null && val !== '' && val !== '-';
          const temNotaCandidato = isNotaValida(valCand) && Number(valCand) !== 0;
          let notaFinal = 0;

          if (temNotaCandidato) notaFinal = parseFloat(valCand);
          else if (isNotaValida(valPart)) notaFinal = parseFloat(valPart);

          let indicatorTone = 'indicator-good';
          if (notaFinal < 7) indicatorTone = 'indicator-low';
          else if (notaFinal < 8.5) indicatorTone = 'indicator-attention';

          const classificacaoOriginal = d['Classificação'] ?? d.Classificacao ?? d.classificacao ?? '-';
          const classificacaoNum = classificacaoOriginal === '-' ? 999999 : Number(classificacaoOriginal);
          const ufLimpa = isNationalOffice
            ? 'TODOS'
            : getCandidateStateCode(d, { allowPartyFallback: chaveBanco === 'senadores' }) || (
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

      const getTallyTargets = (candidateDocs) => {
        const activeState = normalizeStateCode(estadoDoFluxo);
        if (!activeState) return [];

        return candidateDocs
          .map((candidateDoc) => {
            const candidateState = getCandidateStateCode(candidateDoc, { allowPartyFallback: chaveBanco === 'senadores' }) || (
              chaveBanco === 'senadores' ? '' : 'TODOS'
            );

            if (candidateState !== activeState && !(chaveBanco !== 'senadores' && candidateState === 'TODOS')) {
              return null;
            }

            return {
              ...candidateDoc,
              state: candidateState === 'TODOS' ? activeState : candidateState
            };
          })
          .filter(Boolean);
      };

      const candidateQueryState = isNationalOffice ? null : estadoDoFluxo;
      const cachedCandidates = readCachedCandidatesByOffice(cargo, candidateQueryState);
      if (cachedCandidates?.value?.length) {
        const cachedTallies = readCachedTallies(getTallyTargets(cachedCandidates.value), { estado: estadoDoFluxo });
        buildCandidateList(cachedCandidates.value, cachedTallies, cachedCandidates.isFresh ? 'cache' : 'stale-cache');
      }

      try {
        const candidateDocs = cachedCandidates?.isFresh && cachedCandidates.value?.length > 0
          ? cachedCandidates.value
          : await fetchCandidatesByOffice(cargo, candidateQueryState);
        const tallyTargets = getTallyTargets(candidateDocs);
        let tallies = readCachedTallies(tallyTargets, { estado: estadoDoFluxo });

        try {
          tallies = await fetchCandidateTallies(tallyTargets, { forceRefresh: true, estado: estadoDoFluxo });
        } catch (error) {
          flowWarn('candidates.tallies.fetch-error', { cargo, chaveGrupo, message: error?.message });
        }

        buildCandidateList(candidateDocs, tallies, cachedCandidates?.isFresh ? 'cache-refresh' : 'network');
      } catch (error) {
        flowError('candidates.fetch.error', error, { cargo, chaveGrupo });

        if (!cancelled && !cachedCandidates?.value?.length) {
          setErroCarregamento('Não foi possível carregar os candidatos. Verifique sua conexão e tente novamente.');
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
  }, [cargo, chaveBanco, chaveGrupo, estadoDoFluxo, isNationalOffice]);

  const candidatosDoEstado = useMemo(() => {
    if (isNationalOffice) return todosCandidatos;
    const meuEstado = normalizeStateCode(estadoDoFluxo);
    return todosCandidatos.filter((candidate) => (
      candidate.ufLimpa === meuEstado || (chaveBanco !== 'senadores' && candidate.ufLimpa === 'TODOS')
    ));
  }, [chaveBanco, todosCandidatos, estadoDoFluxo, isNationalOffice]);

  useEffect(() => {
    let cancelled = false;

    const restoreSelection = async () => {
      if (todosCandidatos.length === 0) {
        setSelecionadosNaTela([]);
        setBallotDraft(null);
        return;
      }

      let draft = userId
        ? readBallotDraft(userId, estadoDoFluxo)
        : readVisitorBallotDraft(estadoDoFluxo);

      if (userId) {
        try {
          draft = await fetchRemoteBallotDraft(userId, estadoDoFluxo);
        } catch (error) {
          flowWarn('candidates.remote-draft.fetch-error', { cargo, chaveGrupo, message: error?.message });
        }
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
    const draft = ballotDraft || (userId
      ? readBallotDraft(userId, estadoDoFluxo)
      : readVisitorBallotDraft(estadoDoFluxo));
    const gruposDaTela = new Set(isSenadoresUnificados ? chaveGrupos : [chaveGrupo]);
    const ids = Object.entries(draft.candidate_groups || {})
      .filter(([stepId]) => !gruposDaTela.has(stepId))
      .flatMap(([, candidates]) => candidates.map((candidate) => candidate.id));

    return new Set(ids);
  }, [ballotDraft, chaveGrupo, chaveGrupos, estadoDoFluxo, isSenadoresUnificados, userId]);

  const featuredCandidateId = useMemo(() => {
    if (isGuestMode) return null;

    const candidatesWithState = candidatosDoEstado.map((candidate) => ({
      ...candidate,
      isAlreadyChosen: selectedCandidateIdsInOtherSteps.has(candidate.id)
    }));

    return getFeaturedCandidateId(candidatesWithState);
  }, [candidatosDoEstado, isGuestMode, selectedCandidateIdsInOtherSteps]);

  const listaExibida = useMemo(() => {
    let disponiveis = candidatosDoEstado;

    if (filtroLista === 'selecao') {
      const idsSelecionados = new Set(selecionadosNaTela.map((candidate) => candidate.id));
      disponiveis = disponiveis.filter((candidate) => idsSelecionados.has(candidate.id));
    }

    const termo = normalizeSearch(buscaDiferida);
    if (termo) {
      disponiveis = disponiveis.filter((candidate) => {
        const nome = normalizeSearch(candidate.Nome || candidate.nome || candidate.nome_civil || '');
        const partido = normalizeSearch(candidate.Partido || candidate.partido || candidate.sigla_partido || '');
        const numero = normalizeSearch(candidate.Numero || candidate.numero || '');

        return nome.includes(termo) || partido.includes(termo) || numero.includes(termo);
      });
    }

    const listaComEstado = disponiveis.map((candidate) => ({
      ...candidate,
      isAlreadyChosen: selectedCandidateIdsInOtherSteps.has(candidate.id)
    }));

    return listaComEstado
      .map((candidate) => ({
        ...candidate,
        isChanceFeatured: !isGuestMode && candidate.id === featuredCandidateId
      }))
      .sort(compareCandidatesByScorePriority);
  }, [candidatosDoEstado, featuredCandidateId, filtroLista, buscaDiferida, isGuestMode, selectedCandidateIdsInOtherSteps, selecionadosNaTela]);

  const persistirEtapa = async (listaFinalDaTela, { markCompleted = false } = {}) => {
    if (!estadoDoFluxo) {
      flowWarn('candidates.persist.no-state', { cargo, chaveGrupo });
      navigate('/home', { replace: true });
      throw new Error('Escolha um estado antes de selecionar candidatos.');
    }

    try {
      let draftAtualizado;

      if (!userId) {
        draftAtualizado = await saveVisitorBallotStepSelection(
          isSenadoresUnificados ? 'senadores_1' : chaveGrupo,
          listaFinalDaTela,
          estadoDoFluxo,
          { markCompleted }
        );
      } else if (isSenadoresUnificados) {
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

  const applyServerTallies = (tallies, candidatesToUpdate = []) => {
    if (!tallies || tallies.size === 0) return candidatesToUpdate;

    const applyTally = (candidate) => {
      const tally = tallies.get(candidate.id);
      if (!tally) return candidate;

      const selectedByUsers = Math.max(0, parseNumeric(tally.active_selections, 0));
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

    setTodosCandidatos((currentCandidates) => currentCandidates.map(applyTally));
    return candidatesToUpdate.map(applyTally);
  };

  const applyLocalTallyDeltas = (selectionDeltas, candidatesToUpdate = []) => {
    if (!selectionDeltas || selectionDeltas.size === 0) return candidatesToUpdate;

    const applyDelta = (candidate) => {
      const delta = selectionDeltas.get(candidate.id);
      if (!delta) return candidate;

      const selectedByUsers = Math.max(0, parseNumeric(
        candidate.active_selections,
        candidate.selected_by_users,
        candidate.selectedByUsers,
        0
      ) + delta);
      const averageElectedVotes = parseNumeric(
        candidate.averageElectedVotes,
        candidate.average_elected_votes,
        AVERAGE_ELECTED_VOTES_BY_OFFICE[chaveBanco],
        3
      );

      return {
        ...candidate,
        selectedByUsers,
        selected_by_users: selectedByUsers,
        active_selections: selectedByUsers,
        chance: calculateCandidateChance(selectedByUsers, averageElectedVotes)
      };
    };

    setTodosCandidatos((currentCandidates) => currentCandidates.map(applyDelta));
    return candidatesToUpdate.map(applyDelta);
  };

  const refreshChangedTallies = async (candidateIds, candidatesToUpdate = []) => {
    const idsToRefresh = [...new Set(candidateIds)].filter(Boolean);
    if (idsToRefresh.length === 0) return candidatesToUpdate;

    invalidateCandidateTalliesCache(idsToRefresh, { estado: estadoDoFluxo });

    try {
      const tallies = await fetchCandidateTallies(idsToRefresh, { forceRefresh: true, estado: estadoDoFluxo });
      return applyServerTallies(tallies, candidatesToUpdate);
    } catch (error) {
      flowWarn('candidates.tallies.refresh-after-save-error', {
        cargo,
        chaveGrupo,
        message: error?.message
      });
      return candidatesToUpdate;
    }
  };

  const handleSelectionChange = async (listaAtualizada, options = {}) => {
    const listaAnterior = selecionadosNaTela;
    const changedCandidateIds = getChangedSelectionIds(listaAnterior, listaAtualizada);
    const selectionDeltas = userId ? getSelectionDeltas(listaAnterior, listaAtualizada) : new Map();
    setSelecionadosNaTela(listaAtualizada);

    try {
      const draftAtualizado = await persistirEtapa(listaAtualizada, { markCompleted: options.completed === true });
      const listaComTalliesLocais = applyLocalTallyDeltas(selectionDeltas, listaAtualizada);
      setSelecionadosNaTela(listaComTalliesLocais);
      const listaComTalliesAtualizados = await refreshChangedTallies(changedCandidateIds, listaComTalliesLocais);
      setSelecionadosNaTela(listaComTalliesAtualizados);
      return draftAtualizado;
    } catch (error) {
      setSelecionadosNaTela(listaAnterior);
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
      navigate(proximaRota || BALLOT_ROUTES.meuPlano, { state: { bypassVoteRedirect: true } });
      return 'navigated';
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

    const draft = ballotDraft || (userId ? readBallotDraft(userId, estadoDoFluxo) : readVisitorBallotDraft(estadoDoFluxo));
    const deputado = getFeaturedSelectionCandidates(draft?.candidate_groups?.deputado_federal || [], 1)[0] || null;
    if (!deputado) return null;

    return {
      estadoSigla: estadoDoFluxo,
      estadoNome: STATE_NAMES[estadoDoFluxo] || estadoDoFluxo,
      userName: userData?.name || user?.displayName || '',
      deputado,
      senadores: getFeaturedSelectionCandidates(selecionadosNaTela, 2)
    };
  }, [ballotDraft, estadoDoFluxo, isSenadoresUnificados, selecionadosNaTela, user?.displayName, userData?.name, userId]);
  const draftStateLabel = estadoDoFluxo
    ? `${STATE_NAMES[estadoDoFluxo] || estadoDoFluxo} (${estadoDoFluxo})`
    : '';

  const currentDraftForDesktop = ballotDraft || (userId
    ? readBallotDraft(userId, estadoDoFluxo)
    : readVisitorBallotDraft(estadoDoFluxo));

  const handleDesktopCandidateSelect = async (candidate) => {
    if (candidate.isAlreadyChosen) {
      setModalAviso({
        aberto: true,
        mensagem: 'Esse candidato já foi escolhido em outra etapa.'
      });
      return;
    }

    const alreadySelected = selecionadosNaTela.some((item) => item.id === candidate.id);
    let nextSelection;

    if (alreadySelected) {
      nextSelection = selecionadosNaTela.filter((item) => item.id !== candidate.id);
    } else if (isSenadoresUnificados) {
      if (selecionadosNaTela.length >= 2) {
        setModalAviso({
          aberto: true,
          mensagem: 'Você já escolheu 2 senadores. Remova um para trocar.'
        });
        return;
      }
      nextSelection = [...selecionadosNaTela, candidate];
    } else {
      nextSelection = [candidate];
    }

    await handleSelectionChange(nextSelection, {
      completed: isSenadoresUnificados ? nextSelection.length >= 2 : nextSelection.length >= 1
    });
  };

  const handleDesktopContinue = async () => {
    const minimumSelection = isSenadoresUnificados ? 2 : 1;

    if (selecionadosNaTela.length < minimumSelection) {
      setModalAviso({
        aberto: true,
        mensagem: isSenadoresUnificados
          ? STEP_GUIDANCE_MESSAGES.senador
          : chaveBanco === 'presidente'
            ? STEP_GUIDANCE_MESSAGES.presidente
            : STEP_GUIDANCE_MESSAGES.deputado
      });
      return;
    }

    await handleAvancar(selecionadosNaTela, { alreadySaved: true });
  };

  if (isDesktopLayout) {
    return (
      <>
        <FlowToast key={`${location.key}-${location.state?.flowNotice || ''}`} message={location.state?.flowNotice || ''} />
        <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

        <DesktopCandidateSelection
          variant={chaveBanco === 'deputado_federal' ? 'office-deputado' : chaveBanco === 'presidente' ? 'office-presidente' : 'office-senado'}
          candidates={listaExibida}
          selectedCandidates={selecionadosNaTela}
          featuredCandidateId={featuredCandidateId}
          searchValue={busca}
          onSearchChange={setBusca}
          filterItems={currentFilters}
          activeFilterId={filtroLista}
          onFilterSelect={handleSubNavigation}
          onCandidateSelect={handleDesktopCandidateSelect}
          onContinue={handleDesktopContinue}
          onBack={() => navigate(rotaAnterior || BALLOT_ROUTES.estado, { state: { bypassVoteRedirect: true } })}
          onReview={() => navigate(BALLOT_ROUTES.meuPlano, { state: { bypassVoteRedirect: true } })}
          loading={(!isGuestMode && userLoading) || loading}
          draft={currentDraftForDesktop}
          draftStateLabel={draftStateLabel}
          personalizedFieldsLocked={isGuestMode}
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

  return (
    <>
      <FlowToast key={`${location.key}-${location.state?.flowNotice || ''}`} message={location.state?.flowNotice || ''} />
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      <SelectBase
        titulo={titulo}
        subtitulo={subtitulo}
        dados={listaExibida}
        emptyMessage={loading ? 'Carregando candidatos...' : erroCarregamento || 'Nenhum candidato encontrado.'}
        limiteSelecao={null}
        minimoSelecao={isSenadoresUnificados ? 2 : 1}
        selecaoInicial={selecionadosNaTela}
        carregando={(!isGuestMode && userLoading) || loading}
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
        variant={chaveBanco === 'deputado_federal' ? 'office-deputado' : chaveBanco === 'presidente' ? 'office-presidente' : 'office-senado'}
        subNavigationItems={currentFilters}
        activeSubNavigationId={filtroLista}
        onSubNavigationSelect={handleSubNavigation}
        featuredCandidateId={featuredCandidateId}
        shareData={isGuestMode ? null : shareData}
        personalizedFieldsLocked={isGuestMode}
        draftStateLabel={draftStateLabel}
        draftIsLocal={isGuestMode}
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
