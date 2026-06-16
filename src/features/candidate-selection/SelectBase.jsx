import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import AppFooter from '@/shared/ui/layout/AppFooter';
import BottomNavigation from '@/app/shell/BottomNavigation';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import { BackIcon, CheckIcon, ChevronDownIcon, FilterIcon, InfoIcon, SearchIcon } from '@/shared/icons/AppIcons';
import ShareChoicePanel from '@/features/sharing/ShareChoicePanel';
import { useNotify } from '@/features/notifications/useNotify';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import { flowLog, flowWarn } from '@/shared/utils/debugFlow';
import {
  getCandidateChance,
  getCandidateName,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';
import CandidateCard from './CandidateCard';
import {
  INITIAL_CANDIDATE_RENDER_LIMIT,
  getScreenCopy,
  getSubNavLabel,
  haveSameSelectionIds
} from './selectBaseViewModel';
import './SelectBase.css';

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
  renderItem
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const isHomeState = variant === 'home-state';
  const isCandidateOffice = variant === 'office-deputado' || variant === 'office-senado';
  const isDeputyOffice = variant === 'office-deputado';
  const isSenateOffice = variant === 'office-senado';
  const candidateCardMode = isCandidateOffice ? 'detailed' : 'compact';
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
      if (!cancelled) {
        setContinueVisible(false);
      }
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
  const hasAnySelection = selecionados.length > 0;
  const selectedSignature = useMemo(() => (
    selecionados.map((candidate) => candidate.id).filter(Boolean).sort().join('|')
  ), [selecionados]);
  const showSavedSenateSharePanel = isSenateOffice && senateChoicesSaved && hasRequiredSelection && Boolean(shareData);
  const shouldRenderContinue = hasAnySelection && !isHomeState && !isCandidateOffice;
  const shouldShowContinue = shouldRenderContinue && continueVisible;
  const shouldShowDesktopContinue = shouldRenderContinue;
  const candidateListInstruction = 'Todos que voce aceita votar';
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        lastScrollTopRef.current = 0;
        setContinueVisible(hasAnySelection);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasAnySelection, selectedSignature]);

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

  const getRequiredSelectionMessage = () => {
    if (isSenateOffice) {
      return selecionados.length === 1
        ? 'Escolha mais 1 senador para continuar.'
        : 'Escolha 2 senadores para continuar.';
    }

    if (isDeputyOffice) {
      return 'Escolha 1 deputado federal para continuar.';
    }

    return 'Escolha uma opção para continuar.';
  };

  const notifyMissingSelection = () => {
    notify.warning(getRequiredSelectionMessage(), {
      dedupeKey: `missing-selection-${variant}`,
      duration: 4200
    });
  };

  const handleScroll = (event) => {
    const currentTop = event.currentTarget.scrollTop;
    const diff = currentTop - lastScrollTopRef.current;

    if (!hasAnySelection) {
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
      notify.error('Não foi possível salvar sua escolha. Seleção revertida.', {
        dedupeKey: `selection-save-error-${variant}`,
        duration: 5200
      });
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
    const didCommit = await commitSelection(nextSelecionados, { autoConfirm: autoAvancarAoSelecionar && completed, completed });
    return didCommit;
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

    setContinueVisible(true);
    setSelecionados([item]);
  };

  const handleContinue = async () => {
    if (salvandoSelecao || !onConfirmar) return;

    if (!hasRequiredSelection) {
      notifyMissingSelection();
      return;
    }

    try {
      setSalvandoSelecao(true);
      const confirmed = await onConfirmar(selecionados);
      if (confirmed === false) {
        notifyMissingSelection();
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

    if (isHomeState) {
      return (
        <div className={`candidate-search-filter candidate-search-filter--state ${className}`} id="tour-busca">
          <label className="candidate-search-filter__search">
            <SearchIcon />
            <span>Pesquisar</span>
            <input
              type="search"
              value={valorBusca}
              onChange={handleSearchChange}
              placeholder="Pesquisar"
            />
          </label>
        </div>
      );
    }

    return (
      <label className={`select-search-field ${className}`} id="tour-busca">
        <SearchIcon />
        <span>Pesquisar</span>
        <input
          type="search"
          value={valorBusca}
          onChange={handleSearchChange}
          placeholder={isHomeState ? '' : 'Pesquisar'}
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
            <span>Pesquisar</span>
            <input
              ref={candidateSearchInputRef}
              type="search"
              value={valorBusca}
              onChange={handleSearchChange}
              placeholder="Pesquisar"
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
    return (
      <div className="state-selection-flow nv-container">
        <section className="state-selection-panel" aria-label="Estados">
          <div className="prototype-section-heading prototype-section-heading--state">
           <h2>Selecione seu estado</h2>
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
    return (
      <div className={`candidate-flow nv-container ${isSenateOffice ? 'candidate-flow--senate' : 'candidate-flow--single'}`} id="tour-lista">
        <section className="candidate-list-section">
          <div className="prototype-section-heading">
            <h2>Selecione seus candidatos </h2>
            <p>{candidateListInstruction}</p>
          </div>

          <div className={`candidate-list-tools ${candidateFilterOpen ? 'is-filter-open' : ''}`}>
            <div className="candidate-list-tools__row">
              {renderCandidateSearchFilter()}
            </div>
          </div>

          {dados.length > 0 ? (
            <div className="candidate-card-list nv-card-grid">
              {visibleSecondaryCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selecionados.some((item) => item.id === candidate.id)}
                  featuredMetrics={featuredMetricsByCandidateId.get(candidate.id)}
                  showAssessmentSubtitle
                  lockPersonalizedFields={personalizedFieldsLocked}
                  displayMode={candidateCardMode}
                  interactionMode="select"
                  selectionActionLabel={selecionados.some((item) => item.id === candidate.id) ? 'Remover escolha' : 'Escolher candidato'}
                  onLockedMetricClick={handleLockedMetricClick}
                  disabled={salvandoSelecao}
                  onSelect={() => handleSelect(candidate)}
                />
              ))}
            </div>
            ) : (
            <div className="no-data">{emptyMessage}</div>
          )}

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
        disabled={salvandoSelecao}
      >
        Continuar
      </button>
    )
  );

  if (carregando && !isCandidateOffice) {
    return <LoadingScreen className="nv-screen" />;
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
          {!isCandidateOffice && !isHomeState && onHelpClick && (
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
