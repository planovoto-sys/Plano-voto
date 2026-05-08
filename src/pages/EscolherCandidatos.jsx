import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AVERAGE_ELECTED_VOTES_BY_OFFICE, CANDIDATE_FILTERS } from '@/constants/candidates';
import { useUser } from '@/hooks/useUser';
import {
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
import { calculateCandidateChance, parseNumeric } from '@/utils/candidateMetrics';
import { normalizeSearch } from '@/utils/search';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import TourModal from '@/components/feedback/TourModal';
import SelectBase from '@/components/selection/SelectBase';

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
  const isSenadoresUnificados = chaveBanco === 'senadores' && Array.isArray(chaveGrupos) && chaveGrupos.length > 1;
  const currentStep = chaveBanco === 'deputado_federal'
    ? 'deputado'
    : 'senador';

  const tourSteps = [
    { target: '.app-help-action', title: 'AJUDA', content: 'Abre este guia sempre que você quiser revisar a tela.' },
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa candidatos por nome ou partido.' },
    { target: '.candidate-filter-tabs', title: 'FILTROS', content: '<b>Reeleição:</b> Exibe candidatos que atuaram na última legislatura.<br><b>Renovação:</b> Exibe candidatos que não atuaram na última legislatura.' },
    { target: '.prototype-candidate-card.is-fire-featured .metric-badge--featured', title: 'FOGUINHO', content: 'O foguinho destaca o candidato bem avaliado com a maior chance entre as opções disponíveis.' },
    { target: '.prototype-candidate-card.is-chance-complete .metric-badge:last-child', title: 'CHANCE 100', content: 'Quando a chance está em 100, esse candidato já possui grandes chances e não precisa de mais voto.' }
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
      setSelecionadosNaTela(todosCandidatos.filter((candidate) => idsSalvos.includes(candidate.id)));
    });

    return () => {
      cancelled = true;
    };
  }, [cargo, userId, estadoDoFluxo, todosCandidatos, chaveGrupo, chaveGrupos, isSenadoresUnificados]);

  const candidatosDoEstado = useMemo(() => {
    const meuEstado = estadoDoFluxo?.replace(/[\s\u00A0]+/g, '') || '';
    return todosCandidatos.filter((candidate) => (
      candidate.ufLimpa === meuEstado || candidate.ufLimpa === 'TODOS'
    ));
  }, [todosCandidatos, estadoDoFluxo]);

  const selectedCandidateIdsInOtherSteps = useMemo(() => {
    if (!userId) return new Set();

    const draft = readBallotDraft(userId, estadoDoFluxo);
    const gruposDaTela = new Set(isSenadoresUnificados ? chaveGrupos : [chaveGrupo]);
    const ids = Object.entries(draft.candidate_groups || {})
      .filter(([stepId]) => !gruposDaTela.has(stepId))
      .flatMap(([, candidates]) => candidates.map((candidate) => candidate.id));

    return new Set(ids);
  }, [chaveGrupo, chaveGrupos, estadoDoFluxo, isSenadoresUnificados, userId]);

  const listaExibida = useMemo(() => {
    let disponiveis = candidatosDoEstado;

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
        notaSistema(candidate) >= 7 &&
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
  }, [candidatosDoEstado, filtroLista, buscaDiferida, selectedCandidateIdsInOtherSteps]);

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
      if (isSenadoresUnificados) {
        const [primeiroSenador, segundoSenador] = listaFinalDaTela.slice(0, 2);
        saveBallotStepSelection(userId, 'senadores_1', primeiroSenador ? [primeiroSenador] : [], estadoDoFluxo, { markCompleted });
        return saveBallotStepSelection(userId, 'senadores_2', segundoSenador ? [segundoSenador] : [], estadoDoFluxo, { markCompleted });
      }

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

    if (isSenadoresUnificados) return;

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
        titulo={titulo}
        subtitulo={subtitulo}
        dados={listaExibida}
        emptyMessage={erroCarregamento || 'Nenhum candidato encontrado.'}
        limiteSelecao={isSenadoresUnificados ? 2 : 1}
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
