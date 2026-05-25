import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import AppFooter from '@/components/layout/AppFooter';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import { BackIcon, CheckIcon, ChevronDownIcon, FilterIcon, InfoIcon, SearchIcon } from '@/components/icons/AppIcons';
import ShareChoicePanel from '@/components/share/ShareChoicePanel';
import { flowLog, flowWarn } from '@/utils/debugFlow';
import {
  getCandidateChance,
  getCandidateName,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';
import CandidateCard from './CandidateCard';
import './SelectBase.css';

const INITIAL_CANDIDATE_RENDER_LIMIT = 80;
const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)';

const getScreenCopy = ({ variant, titulo, subtitulo }) => {
  if (variant === 'home-state') {
    return {
      title: 'Estado',
      subtitle: ''
    };
  }

  if (variant === 'office-senado') {
    return {
      title: 'Senadores',
      subtitle: ''
    };
  }

  if (variant === 'office-deputado') {
    return {
      title: 'Deputado Federal',
      subtitle: ''
    };
  }

  return {
    title: titulo || '',
    subtitle: subtitulo || ''
  };
};

const getSubNavLabel = (item) => {
  if (item.mode === 'selecionados' || item.id?.includes('selecionados')) return 'Selecionados';
  if (item.mode === 'renovar' || item.id?.includes('renovar')) return 'À renovação';
  return 'À reeleição';
};

const haveSameSelectionIds = (currentItems = [], nextItems = []) => {
  if (currentItems.length !== nextItems.length) return false;

  const getSignature = (item) => [
    item.id,
    getCandidateChance(item),
    getCandidateSystemScore(item),
    item.isChanceFeatured ? 1 : 0
  ].join(':');

  const currentIds = currentItems.map(getSignature).sort();
  const nextIds = nextItems.map(getSignature).sort();
  return currentIds.every((id, index) => id === nextIds[index]);
};

export default function SelectBase({
  titulo,
  subtitulo = '',
  dados,
  limiteSelecao,
  minimoSelecao = 1,
  selecaoInicial = [],
  carregando,
  onConfirmar,
  onLimiteAtingido,
  onVoltar,
  mostrarBusca = false,
  valorBusca = '',
  onChangeBusca,
  linhasVisiveis = 5,
  currentStep,
  autoAvancarAoSelecionar = false,
  onSelecaoCompleta,
  onSelectionChange,
  subNavigationItems = [],
  activeSubNavigationId = '',
  onSubNavigationSelect,
  topRightExtra = null,
  onHelpClick,
  variant = '',
  emptyMessage = 'Nenhum resultado encontrado.',
  shareData = null,
  featuredCandidateId = null,
  personalizedFieldsLocked = false,
  draftStateLabel = '',
  draftIsLocal = false,
  renderItem
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeState = variant === 'home-state';
  const isCandidateOffice = variant === 'office-deputado' || variant === 'office-senado';
  const isSenateOffice = variant === 'office-senado';
  const [selecionados, setSelecionados] = useState(selecaoInicial);
  const [candidateRenderLimit, setCandidateRenderLimit] = useState(INITIAL_CANDIDATE_RENDER_LIMIT);
  const [candidateFilterOpen, setCandidateFilterOpen] = useState(false);
  const candidateSearchInputRef = useRef(null);
  const candidateFilterRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const [continueVisible, setContinueVisible] = useState(false);
  const [senateChoicesSaved, setSenateChoicesSaved] = useState(false);
  const [modalMalAvaliado, setModalMalAvaliado] = useState({ aberto: false, item: null });
  const [modalAltaChance, setModalAltaChance] = useState({ aberto: false, item: null });
  const [modalCandidatoRepetido, setModalCandidatoRepetido] = useState({ aberto: false, item: null });
  const [modalLimiteSelecao, setModalLimiteSelecao] = useState({ aberto: false });
  const [modalSubstituirSenador, setModalSubstituirSenador] = useState({ aberto: false, item: null });
  const [modalErroSalvar, setModalErroSalvar] = useState({ aberto: false, mensagem: '' });
  const [modalCampoBloqueado, setModalCampoBloqueado] = useState(false);
  const [salvandoSelecao, setSalvandoSelecao] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_LAYOUT_QUERY).matches
  ));
  const [showAllSelectedInCurrentSection, setShowAllSelectedInCurrentSection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setSelecionados((currentItems) => (
          haveSameSelectionIds(currentItems, selecaoInicial) ? currentItems : selecaoInicial
        ));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selecaoInicial]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_LAYOUT_QUERY);
    const handleChange = () => setIsDesktopLayout(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!candidateFilterOpen || typeof document === 'undefined') return undefined;

    const handlePointerDown = (event) => {
      if (candidateFilterRef.current?.contains(event.target)) return;
      setCandidateFilterOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCandidateFilterOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [candidateFilterOpen]);

  useEffect(() => {
    let cancelled = false;

    lastScrollTopRef.current = 0;
    queueMicrotask(() => {
      if (!cancelled) setContinueVisible(false);
    });

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const effectiveLimit = Number.isFinite(limiteSelecao) ? limiteSelecao : null;
  const requiredSelectionCount = isCandidateOffice ? minimoSelecao : (effectiveLimit || 1);
  const hasSelectionLimit = Number.isFinite(effectiveLimit) && effectiveLimit > 0;
  const visibleRows = Number.isFinite(linhasVisiveis) ? linhasVisiveis : 5;
  const screenCopy = getScreenCopy({ variant, titulo, subtitulo });
  const hasRequiredSelection = selecionados.length >= requiredSelectionCount;
  const selectedSignature = useMemo(() => (
    selecionados.map((candidate) => candidate.id).filter(Boolean).sort().join('|')
  ), [selecionados]);
  const showSavedSenateSharePanel = isSenateOffice && senateChoicesSaved && hasRequiredSelection && Boolean(shareData);
  const shouldRenderContinue = !isHomeState;
  const shouldShowContinue = shouldRenderContinue && hasRequiredSelection && continueVisible;
  const shouldShowDesktopContinue = shouldRenderContinue && hasRequiredSelection && continueVisible;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) setContinueVisible(hasRequiredSelection);
    });

    return () => {
      cancelled = true;
    };
  }, [hasRequiredSelection, isHomeState]);

  useEffect(() => {
    if (!isSenateOffice) return undefined;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSenateChoicesSaved(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isSenateOffice, selectedSignature]);

  const featuredCandidate = useMemo(() => {
    if (!isCandidateOffice) return null;

    if (featuredCandidateId) {
      return { id: featuredCandidateId };
    }

    if (dados.length === 0) return null;

    const eligibleCandidates = dados.filter((candidate) => (
      getCandidateName(candidate) &&
      !candidate.isAlreadyChosen &&
      getCandidateSystemScore(candidate) > 7 &&
      getCandidateChance(candidate) > 0 &&
      getCandidateChance(candidate) < 100
    ));

    const markedFeaturedCandidate = dados.find((candidate) => (
      candidate.isChanceFeatured &&
      getCandidateSystemScore(candidate) > 7 &&
      getCandidateChance(candidate) > 0 &&
      getCandidateChance(candidate) < 100
    ));

    return markedFeaturedCandidate || [...eligibleCandidates].sort((a, b) => {
      const chanceDiff = getCandidateChance(b) - getCandidateChance(a);
      if (chanceDiff !== 0) return chanceDiff;

      const scoreDiff = getCandidateSystemScore(b) - getCandidateSystemScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      return getCandidateName(a).localeCompare(getCandidateName(b));
    })[0];
  }, [dados, featuredCandidateId, isCandidateOffice]);

  const featuredMetricsByCandidateId = useMemo(() => {
    if (!isCandidateOffice) return new Map();

    const metricsById = new Map();
    [...dados, ...selecionados].forEach((candidate) => {
      metricsById.set(candidate.id, {
        chance: Boolean(featuredCandidate && candidate.id === featuredCandidate.id)
      });
    });

    return metricsById;
  }, [dados, featuredCandidate, isCandidateOffice, selecionados]);

  const visibleSecondaryCandidates = useMemo(() => (
    dados.slice(0, candidateRenderLimit)
  ), [candidateRenderLimit, dados]);

  const hasMoreCandidates = visibleSecondaryCandidates.length < dados.length;

  const selectedPreviewCandidates = useMemo(() => {
    if (!isCandidateOffice) return selecionados;

    const displayLimit = isSenateOffice ? 2 : 1;
    const groupWeight = (candidate) => {
      const score = getCandidateSystemScore(candidate);
      const chance = getCandidateChance(candidate);

      if (score > 7 && chance > 0 && chance < 100) return 0;
      if (score >= 7 && chance < 100) return 1;
      if (score >= 7 && chance >= 100) return 2;
      if (score > 0 && score < 7) return 3;
      return 4;
    };

    return [...selecionados]
      .sort((a, b) => {
        const groupDiff = groupWeight(a) - groupWeight(b);
        if (groupDiff !== 0) return groupDiff;

        const chanceDiff = getCandidateChance(b) - getCandidateChance(a);
        if (chanceDiff !== 0) return chanceDiff;

        const scoreDiff = getCandidateSystemScore(b) - getCandidateSystemScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        return getCandidateName(a).localeCompare(getCandidateName(b));
      })
      .slice(0, displayLimit);
  }, [isCandidateOffice, isSenateOffice, selecionados]);

  const selectedSubNavigationItem = useMemo(() => (
    subNavigationItems.find((item) => item.mode === 'selecionados' || item.id?.includes('selecionados')) || null
  ), [subNavigationItems]);

  const candidateFilterItems = useMemo(() => (
    subNavigationItems.map((item) => ({
      ...item,
      shortLabel: item.shortLabel || getSubNavLabel(item)
    }))
  ), [subNavigationItems]);

  const isCandidateFilterActive = (item) => (
    item.id === activeSubNavigationId || item.mode === activeSubNavigationId
  );

  const activeCandidateFilterItem = candidateFilterItems.find(isCandidateFilterActive) || candidateFilterItems[0] || null;

  const showSelectedInCurrentSection = Boolean(
    isDesktopLayout &&
    isCandidateOffice &&
    selectedSubNavigationItem &&
    showAllSelectedInCurrentSection &&
    selecionados.length > 0
  );

  const currentSectionCandidates = showSelectedInCurrentSection ? selecionados : selectedPreviewCandidates;

  const currentSelectionSubtitle = useMemo(() => {
    if (!isCandidateOffice || currentSectionCandidates.length === 0) return null;

    const hasLowScore = currentSectionCandidates.some((candidate) => {
      const score = getCandidateSystemScore(candidate);
      return score > 0 && score < 7;
    });
    const allHighViability = currentSectionCandidates.every((candidate) => getCandidateChance(candidate) >= 100);
    const hasFeaturedCandidate = currentSectionCandidates.some((candidate) => (
      candidate.isChanceFeatured || featuredMetricsByCandidateId.get(candidate.id)?.chance
    ));
    const allCurrentlyViable = currentSectionCandidates.every((candidate) => (
      getCandidateSystemScore(candidate) > 7 &&
      getCandidateChance(candidate) > 0 &&
      getCandidateChance(candidate) < 100
    ));

    if (hasLowScore) {
      return {
        prefix: 'Atenção: ',
        highlight: isSenateOffice ? 'revise as notas' : 'revise a nota',
        showFire: false
      };
    }

    if (allHighViability) {
      return {
        prefix: 'Salvo: ',
        highlight: 'alta viabilidade',
        showFire: false
      };
    }

    if (hasFeaturedCandidate) {
      return {
        prefix: 'Boa escolha: ',
        highlight: isSenateOffice ? 'mais viáveis' : 'mais viável',
        showFire: true
      };
    }

    if (allCurrentlyViable) {
      return {
        prefix: 'Boa escolha: ',
        highlight: 'boa viabilidade',
        showFire: true
      };
    }

    return {
      prefix: 'Dica: ',
      highlight: isSenateOffice ? 'compare destaques' : 'compare o destaque',
      showFire: true
    };
  }, [currentSectionCandidates, featuredMetricsByCandidateId, isCandidateOffice, isSenateOffice]);

  const revealContinue = () => setContinueVisible(true);

  const handleScroll = (event) => {
    const currentTop = event.currentTarget.scrollTop;
    const diff = currentTop - lastScrollTopRef.current;

    if (!hasRequiredSelection) {
      if (continueVisible) setContinueVisible(false);
      lastScrollTopRef.current = currentTop;
      return;
    }

    if (Math.abs(diff) < 8) {
      lastScrollTopRef.current = currentTop;
      return;
    }

    if (diff < 0 || currentTop < 20) {
      setContinueVisible(true);
    } else if (diff > 0) {
      setContinueVisible(false);
    }

    lastScrollTopRef.current = currentTop;
  };

  const commitSelection = async (nextSelecionados, { autoConfirm = false, completed = false } = {}) => {
    const previousSelecionados = selecionados;
    setSelecionados(nextSelecionados);

    try {
      setSalvandoSelecao(true);
      if (onSelectionChange) await onSelectionChange(nextSelecionados, { completed });

      if (completed && onSelecaoCompleta) {
        await onSelecaoCompleta(nextSelecionados);
        return true;
      }

      if (autoConfirm && onConfirmar) {
        flowLog('select.confirm.auto', {
          titulo,
          totalSelecionados: nextSelecionados.length,
          limiteSelecao: effectiveLimit,
          selecionados: nextSelecionados.map((selectedItem) => selectedItem.id)
        });
        await onConfirmar(nextSelecionados, { alreadySaved: Boolean(onSelectionChange) });
      }

      return true;
    } catch (error) {
      setSelecionados(previousSelecionados);
      setModalErroSalvar({
        aberto: true,
        mensagem: error?.message || 'Não foi possível salvar sua escolha. Tente novamente.'
      });
      return false;
    } finally {
      setSalvandoSelecao(false);
    }
  };

  const efetivarSelecao = async (item) => {
    if (!item) return false;

    if (!isCandidateOffice && effectiveLimit === 1) {
      return commitSelection([item], { autoConfirm: autoAvancarAoSelecionar, completed: true });
    }

    if (hasSelectionLimit && selecionados.length >= effectiveLimit) {
      flowWarn('select.limit-reached', { titulo, limiteSelecao: effectiveLimit, itemId: item.id });
      if (onLimiteAtingido) onLimiteAtingido(item, selecionados);
      else if (isSenateOffice) setModalSubstituirSenador({ aberto: true, item });
      else setModalLimiteSelecao({ aberto: true });
      return false;
    }

    const nextSelecionados = [...selecionados, item];
    const completed = hasSelectionLimit && nextSelecionados.length === effectiveLimit;
    return commitSelection(nextSelecionados, { autoConfirm: autoAvancarAoSelecionar && completed, completed });
  };

  const handleSelect = async (item) => {
    if (salvandoSelecao) return;

    const jaSelecionado = selecionados.find((v) => v.id === item.id);
    if (jaSelecionado) {
      flowLog('select.item.remove', { titulo, itemId: item.id, itemLabel: getCandidateName(item) || item.nome || item.sigla || item.id });
      await commitSelection(selecionados.filter((v) => v.id !== item.id));
      return;
    }

    if (isCandidateOffice && item.isAlreadyChosen) {
      setModalCandidatoRepetido({ aberto: true, item });
      return;
    }

    if (hasSelectionLimit && effectiveLimit > 1 && selecionados.length >= effectiveLimit) {
      flowWarn('select.limit-reached', { titulo, limiteSelecao: effectiveLimit, itemId: item.id });
      if (onLimiteAtingido) onLimiteAtingido(item, selecionados);
      else if (isSenateOffice) setModalSubstituirSenador({ aberto: true, item });
      else setModalLimiteSelecao({ aberto: true });
      return;
    }

    if (isCandidateOffice && getCandidateSystemScore(item) > 0 && getCandidateSystemScore(item) < 7) {
      setModalMalAvaliado({ aberto: true, item });
      return;
    }

    if (isCandidateOffice && getCandidateChance(item) >= 100) {
      setModalAltaChance({ aberto: true, item });
      return;
    }

    flowLog('select.item.add', { titulo, itemId: item.id, itemLabel: getCandidateName(item) || item.nome || item.sigla || item.id });
    await efetivarSelecao(item);
  };

  const handleStateSelect = async (item) => {
    if (salvandoSelecao) return;

    if (autoAvancarAoSelecionar) {
      await commitSelection([item], { autoConfirm: true, completed: true });
      return;
    }

    revealContinue();
    setSelecionados([item]);
  };

  const handleContinue = async () => {
    if (salvandoSelecao || !onConfirmar) return;

    if (!hasRequiredSelection) {
      setModalErroSalvar({
        aberto: true,
        mensagem: isSenateOffice ? 'Escolha pelo menos 2 senadores para continuar.' : 'Escolha pelo menos uma opção para continuar.'
      });
      return;
    }

    try {
      setSalvandoSelecao(true);
      const confirmed = await onConfirmar(selecionados);
      if (confirmed === false) {
        setModalErroSalvar({
          aberto: true,
          mensagem: isSenateOffice ? 'Escolha pelo menos 2 senadores para continuar.' : 'Escolha pelo menos uma opção para continuar.'
        });
      } else if (isSenateOffice && confirmed !== 'navigated') {
        setSenateChoicesSaved(true);
      }
    } catch (error) {
      setModalErroSalvar({
        aberto: true,
        mensagem: error?.message || 'Não foi possível continuar. Tente novamente.'
      });
    } finally {
      setSalvandoSelecao(false);
    }
  };

  const handleSubNavigation = async (item) => {
    if (!onSubNavigationSelect) return;

    try {
      await onSubNavigationSelect(item, selecionados);
    } catch (error) {
      setModalErroSalvar({
        aberto: true,
        mensagem: error?.message || 'Não foi possível salvar sua escolha antes de trocar o filtro.'
      });
    }
  };

  const handleHeaderBack = async () => {
    if (!onVoltar) {
      navigate(-1);
      return;
    }

    try {
      await onVoltar(selecionados);
    } catch (error) {
      setModalErroSalvar({
        aberto: true,
        mensagem: error?.message || 'Não foi possível salvar sua escolha antes de voltar.'
      });
    }
  };

  const handleReplaceSenator = async (indexToReplace) => {
    const itemToSelect = modalSubstituirSenador.item;
    if (!itemToSelect) return;

    const nextSelecionados = selecionados.map((selectedItem, index) => (
      index === indexToReplace ? itemToSelect : selectedItem
    ));
    setModalSubstituirSenador({ aberto: false, item: null });
    await commitSelection(nextSelecionados, { autoConfirm: autoAvancarAoSelecionar, completed: nextSelecionados.length === effectiveLimit });
  };

  const handleSearchChange = (event) => {
    if (onChangeBusca) onChangeBusca(event.target.value);
  };

  const handleLockedMetricClick = () => {
    setModalCampoBloqueado(true);
  };

  const handleLoginFromLockedMetric = () => {
    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`
      }
    });
  };

  const renderSearchField = (className = '') => {
    if (!mostrarBusca) return null;

    return (
      <label className={`select-search-field ${className}`} id="tour-busca">
        <SearchIcon />
        <span>Buscar</span>
        <input
          type="search"
          value={valorBusca}
          onChange={handleSearchChange}
          placeholder={isHomeState ? '' : 'Pesquisa'}
        />
      </label>
    );
  };

  const renderCandidateSearchFilter = () => {
    if (!mostrarBusca && candidateFilterItems.length === 0) return null;

    return (
      <div
        className={`candidate-search-filter ${candidateFilterOpen ? 'is-open' : ''}`}
        id="tour-busca"
        ref={candidateFilterRef}
      >
        {mostrarBusca && (
          <label className="candidate-search-filter__search">
            <SearchIcon />
            <span>Pesquisar candidatos</span>
            <input
              ref={candidateSearchInputRef}
              type="search"
              value={valorBusca}
              onChange={handleSearchChange}
              placeholder="Pesquisar candidatos"
            />
          </label>
        )}

        {mostrarBusca && candidateFilterItems.length > 0 && (
          <span className="candidate-search-filter__divider" aria-hidden="true" />
        )}

        {candidateFilterItems.length > 0 && (
          <div className="candidate-search-filter__menu">
            <button
              className="candidate-search-filter__trigger nv-touch"
              type="button"
              onClick={() => {
                setCandidateFilterOpen((currentValue) => !currentValue);
              }}
              aria-expanded={candidateFilterOpen}
              aria-haspopup="menu"
              aria-label="Filtrar candidatos"
              title="Filtrar candidatos"
            >
              <FilterIcon />
              <span>{activeCandidateFilterItem?.shortLabel || 'Atuais'}</span>
              <ChevronDownIcon />
            </button>

            {candidateFilterOpen && (
              <div className="candidate-search-filter__dropdown" role="menu" aria-label="Filtro de candidatos">
                {candidateFilterItems.map((item) => {
                  const isActive = isCandidateFilterActive(item);

                  return (
                    <button
                      key={item.id}
                      className={`candidate-search-filter__option ${isActive ? 'is-active' : ''}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={async () => {
                        await handleSubNavigation(item);
                        setCandidateFilterOpen(false);
                      }}
                    >
                      <span className="candidate-search-filter__check" aria-hidden="true">
                        {isActive && <CheckIcon />}
                      </span>
                      <span>{item.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStateList = () => {
    const estadoSelecionado = selecionados[0] || null;

    return (
      <div className={`state-selection-flow nv-container ${estadoSelecionado ? 'has-current-state' : ''}`}>
        {estadoSelecionado && (
          <section className="state-current-section state-current-section--mobile" aria-label="Meu estado">
            <div className="prototype-section-heading">
              <h2>Meu estado</h2>
              <p>Estado em que você vota</p>
            </div>

            <article className="state-card state-card--current">
              {renderItem ? renderItem(estadoSelecionado) : <span>{estadoSelecionado.sigla || estadoSelecionado.nome}</span>}
            </article>
          </section>
        )}

        <section className="state-selection-panel" aria-label="Estados">
          <div className="prototype-section-heading">
            <h2>Estados</h2>
            <p>Selecione o estado onde você vota</p>
          </div>

          {renderSearchField('select-search-field--state')}

          <div className="state-card-list nv-card-grid" id="tour-lista" style={{ '--visible-rows': visibleRows }}>
            {dados.length > 0 ? (
              dados.map((item) => {
                const isSelected = selecionados.some((selectedItem) => selectedItem.id === item.id);
                return (
                  <button
                    key={item.id}
                    className={`state-card nv-touch ${isSelected ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => handleStateSelect(item)}
                    disabled={salvandoSelecao}
                  >
                    {renderItem ? renderItem(item) : <span>{item.sigla || item.nome}</span>}
                  </button>
                );
              })
            ) : (
              <div className="no-data">{emptyMessage}</div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderCandidateList = () => {
    const currentTitle = 'Meu Candidato';
    const hasCurrentCandidates = currentSectionCandidates.length > 0;
    const showDraftSidebar = isCandidateOffice && (hasCurrentCandidates || isDesktopLayout);
    return (
      <div className={`candidate-flow nv-container ${showDraftSidebar ? 'has-current-selection' : ''} ${isSenateOffice ? 'candidate-flow--senate' : 'candidate-flow--single'} ${showSelectedInCurrentSection ? 'is-showing-all-selected' : ''}`} id="tour-lista">
        {showDraftSidebar && (
          <section className="candidate-current-section">
            <div className="prototype-section-heading prototype-section-heading--current">
              <div className="prototype-section-heading__copy">
                <h2>{currentTitle}</h2>
                <p>
                  {draftIsLocal ? (
                    <>
                      <span className="candidate-current-badge">Rascunho local</span>
                      <span>Entre para salvar na conta.</span>
                    </>
                  ) : currentSelectionSubtitle ? (
                    <>
                      {currentSelectionSubtitle.prefix}
                      <span className="candidate-current-highlight">{currentSelectionSubtitle.highlight}</span>
                      {currentSelectionSubtitle.showFire && (
                        <ChanceFlame className="candidate-current-highlight__flame" size={12} />
                      )}
                    </>
                  ) : (
                    <span>Escolha candidatos para montar seu plano.</span>
                  )}
                </p>
              </div>
              {selectedSubNavigationItem && (
                <button
                  className={`candidate-current-selected-toggle nv-touch ${showSelectedInCurrentSection ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => {
                    revealContinue();
                    setShowAllSelectedInCurrentSection((currentValue) => !currentValue);
                  }}
                >
                  {getSubNavLabel(selectedSubNavigationItem)}
                </button>
              )}
            </div>

            {draftStateLabel && (
              <div className="candidate-current-state">
                <span>Estado</span>
                <strong>{draftStateLabel}</strong>
              </div>
            )}

            <div className={`candidate-current-list ${isSenateOffice ? 'candidate-current-list--double' : ''}`}>
              {hasCurrentCandidates ? (
                currentSectionCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    summary
                    actionLabel="Remover"
                    selected
                    featuredMetrics={featuredMetricsByCandidateId.get(candidate.id)}
                    showAssessmentSubtitle={!personalizedFieldsLocked}
                    lockPersonalizedFields={false}
                    onLockedMetricClick={handleLockedMetricClick}
                    disabled={salvandoSelecao}
                    onSelect={() => handleSelect(candidate)}
                  />
                ))
              ) : (
                <div className="candidate-current-empty">
                  <strong>Nenhum candidato escolhido ainda</strong>
                  <span>Use a lista ao lado para adicionar nomes ao rascunho.</span>
                </div>
              )}
            </div>

          </section>
        )}

        <section className="candidate-list-section">
          <div className="prototype-section-heading">
            <h2>Candidatos</h2>
            <p>Selecione todos os candidatos que aceita votar</p>
          </div>

          <div className={`candidate-list-tools ${candidateFilterOpen ? 'is-filter-open' : ''}`}>
            <div className="candidate-list-tools__row">
              {renderCandidateSearchFilter()}
            </div>
          </div>

          <div className="candidate-card-list nv-card-grid">
            {dados.length > 0 ? (
              visibleSecondaryCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selecionados.some((item) => item.id === candidate.id)}
                  featuredMetrics={featuredMetricsByCandidateId.get(candidate.id)}
                  showAssessmentSubtitle
                  lockPersonalizedFields={personalizedFieldsLocked}
                  onLockedMetricClick={handleLockedMetricClick}
                  disabled={salvandoSelecao}
                  onSelect={() => handleSelect(candidate)}
                />
              ))
            ) : (
              <div className="no-data">{emptyMessage}</div>
            )}
          </div>

          {hasMoreCandidates && (
            <button
              className="candidate-load-more nv-touch"
              type="button"
              onClick={() => {
                setCandidateRenderLimit(dados.length);
              }}
            >
              Mostrar todos
            </button>
          )}
        </section>
      </div>
    );
  };

  const renderContinueContent = () => (
    showSavedSenateSharePanel ? (
      <ShareChoicePanel shareData={shareData} className="share-choice-panel--continue" />
    ) : (
      <button
        className="primary-continue-button select-base__continue nv-touch"
        type="button"
        onClick={handleContinue}
        disabled={salvandoSelecao || !hasRequiredSelection}
      >
        Continuar
      </button>
    )
  );

  if (carregando) {
    return (
      <div className="loading nv-screen" role="status" aria-live="polite">
        <div className="loading-intro" aria-label="Carregando">
          <span className="loading-intro__mark" aria-hidden="true">
            <ChanceFlame className="loading-intro__flame" size={82} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`select-base-container prototype-page nv-screen variant-${variant}`}>
      <header className="prototype-header app-page-header">
        {!isHomeState && (
          <button
            className="app-header-back-button nv-touch"
            type="button"
            onClick={handleHeaderBack}
            aria-label="Voltar"
          >
            <BackIcon />
            <span>Voltar</span>
          </button>
        )}

        <div className="app-page-header__brand" aria-hidden="true">
          <ChanceFlame className="app-page-header__brand-flame" size={30} />
          <strong>nossovoto<span>.org</span></strong>
        </div>

        <div className="app-page-header__copy">
          <h1>{screenCopy.title}</h1>
          {screenCopy.subtitle && <p>{screenCopy.subtitle}</p>}
        </div>

        <div className="app-page-header__actions">
          {onHelpClick && (
            <button
              className="app-header-icon-action app-help-action nv-touch"
              type="button"
              onClick={onHelpClick}
              aria-label="Ajuda"
              title="Ajuda"
            >
              <InfoIcon />
            </button>
          )}
          {topRightExtra}
        </div>

        <div className="app-page-header__side">
          <BottomNavigation currentStep={currentStep} placement="header" />
        </div>
      </header>

      <main className="prototype-scroll select-base__scroll nv-scroll" onScroll={handleScroll}>
        {isHomeState ? renderStateList() : renderCandidateList()}
        {shouldRenderContinue && (
          <div className={`select-base__desktop-action ${shouldShowDesktopContinue ? '' : 'is-hidden'}`}>
            {renderContinueContent()}
          </div>
        )}
        <AppFooter className="app-footer--scroll-content" />
      </main>

      {shouldRenderContinue && (
        <div className={`select-base__continue-shell ${showSavedSenateSharePanel ? 'has-share-panel' : ''} ${shouldShowContinue ? '' : 'is-hidden'}`}>
          {renderContinueContent()}
        </div>
      )}

      <BottomNavigation currentStep={currentStep} placement="footer" />

      <ConfirmModal
        isOpen={modalMalAvaliado.aberto}
        titulo="ATENÇÃO!"
        mensagem={
          <>
            <span>Você selecionou uma opção com</span>
            <strong className="low-score-highlight">NOTA MENOR QUE 7,00.</strong>
          </>
        }
        textoConfirmar="MUDAR"
        textoCancelar="MANTER"
        tipo="low-score"
        onConfirm={() => {
          setModalMalAvaliado({ aberto: false, item: null });
        }}
        onCancel={() => {
          const itemToSelect = modalMalAvaliado.item;
          setModalMalAvaliado({ aberto: false, item: null });
          efetivarSelecao(itemToSelect);
        }}
      />

      <ConfirmModal
        isOpen={modalAltaChance.aberto}
        titulo="ATENÇÃO!"
        mensagem={
          <>
            <span>Este candidato já chegou a 100% de viabilidade.</span>
            <strong className="low-score-highlight">Ele pode estar com votos suficientes.</strong>
          </>
        }
        textoConfirmar="MANTER ESCOLHA"
        textoCancelar="TROCAR"
        tipo="high-chance"
        onConfirm={() => {
          const itemToSelect = modalAltaChance.item;
          setModalAltaChance({ aberto: false, item: null });
          efetivarSelecao(itemToSelect);
        }}
        onCancel={() => {
          setModalAltaChance({ aberto: false, item: null });
        }}
      />

      <ConfirmModal
        isOpen={modalCandidatoRepetido.aberto}
        titulo="CANDIDATO JÁ ESCOLHIDO"
        mensagem="Esse candidato já foi escolhido em outra etapa. Escolha um nome diferente para continuar."
        textoConfirmar="ESCOLHER OUTRO"
        mostrarCancelar={false}
        onConfirm={() => {
          setModalCandidatoRepetido({ aberto: false, item: null });
        }}
      />

      <ConfirmModal
        isOpen={modalLimiteSelecao.aberto}
        titulo="LIMITE ATINGIDO"
        mensagem={isSenateOffice ? 'Você já escolheu 2 senadores. Remova um candidato em Meus candidatos para selecionar outro.' : 'Remova a escolha atual para selecionar outro candidato.'}
        textoConfirmar="OK, ENTENDI"
        mostrarCancelar={false}
        onConfirm={() => {
          setModalLimiteSelecao({ aberto: false });
        }}
      />

      <ConfirmModal
        isOpen={modalSubstituirSenador.aberto}
        titulo="SUBSTITUIR SENADOR"
        mensagem="Você já escolheu 2 senadores. Escolha qual posição deseja substituir."
        tipo="choice-saved"
        onCancel={() => setModalSubstituirSenador({ aberto: false, item: null })}
      >
        <div className="senator-replace-actions">
          <button type="button" onClick={() => handleReplaceSenator(0)} disabled={salvandoSelecao}>
            Substituir Senador 1
          </button>
          <button type="button" onClick={() => handleReplaceSenator(1)} disabled={salvandoSelecao}>
            Substituir Senador 2
          </button>
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={modalErroSalvar.aberto}
        titulo="NÃO FOI POSSÍVEL SALVAR"
        mensagem={modalErroSalvar.mensagem}
        textoConfirmar="OK, ENTENDI"
        mostrarCancelar={false}
        onConfirm={() => setModalErroSalvar({ aberto: false, mensagem: '' })}
      />

      <ConfirmModal
        isOpen={modalCampoBloqueado}
        titulo="Recurso disponível com login"
        mensagem="Faça login para liberar indicadores e salvar seu plano na conta."
        textoConfirmar="ENTRAR AGORA"
        textoCancelar="CONTINUAR EXPLORANDO"
        tipo="login-required"
        onConfirm={handleLoginFromLockedMetric}
        onCancel={() => setModalCampoBloqueado(false)}
      />
    </div>
  );
}
