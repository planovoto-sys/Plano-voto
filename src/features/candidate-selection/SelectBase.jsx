import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import AppFooter from '@/shared/ui/layout/AppFooter';
import AppHeader from '@/shared/ui/layout/AppHeader';
import BottomNavigation from '@/app/shell/BottomNavigation';
import { SearchIcon } from '@/shared/icons/AppIcons';
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
  getSubNavLabel,
  haveSameSelectionIds
} from './selectBaseViewModel';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  limiteSelecao,
  selecaoInicial = [],
  carregando,
  onConfirmar,
  onLimiteAtingido,
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
  variant = '',
  emptyMessage = 'Nenhum resultado encontrado.',
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
  const [isSearchActive, setIsSearchActive] = useState(false);

  const candidateSearchInputRef = useRef(null);
  
  const [modalMalAvaliado, setModalMalAvaliado] = useState({ aberto: false, item: null });
  const [modalAltaChance, setModalAltaChance] = useState({ aberto: false, item: null });
  const [modalCandidatoRepetido, setModalCandidatoRepetido] = useState({ aberto: false, item: null });
  const [modalLimiteSelecao, setModalLimiteSelecao] = useState({ aberto: false });
  const [modalSubstituirSenador, setModalSubstituirSenador] = useState({ aberto: false, item: null });
  const [modalErroSalvar, setModalErroSalvar] = useState({ aberto: false, mensagem: '' });
  const [modalCampoBloqueado, setModalCampoBloqueado] = useState(false);
  const [salvandoSelecao, setSalvandoSelecao] = useState(false);
  const scrollContainerRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = el.scrollTop;
          if (currentY > 50 && currentY > lastScrollYRef.current + 10) {
            setHeaderVisible(false);
          } else if (currentY < lastScrollYRef.current - 10) {
            setHeaderVisible(true);
          }
          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchActive && candidateSearchInputRef.current) {
      candidateSearchInputRef.current.focus();
    }
  }, [isSearchActive]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsSearchActive(false);
        if (onChangeBusca) onChangeBusca('');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onChangeBusca]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSelecionados((currentItems) => (
          haveSameSelectionIds(currentItems, selecaoInicial) ? currentItems : selecaoInicial
        ));
      }
    });
    return () => { cancelled = true; };
  }, [selecaoInicial]);



  const effectiveLimit = Number.isFinite(limiteSelecao) ? limiteSelecao : null;
  
  const hasSelectionLimit = Number.isFinite(effectiveLimit) && effectiveLimit > 0;
  const visibleRows = Number.isFinite(linhasVisiveis) ? linhasVisiveis : 5;
  

  const featuredCandidate = useMemo(() => {
    if (!isCandidateOffice) return null;
    if (featuredCandidateId) return { id: featuredCandidateId };
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
    setSelecionados([item]);
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

  const renderStateList = () => {
    return (
      <div className="state-selection-flow nv-container">
        <section className="state-selection-panel" aria-label="Estados">
          <div className="prototype-section-heading">
            <h2>Estado</h2>
            <p>Selecione seu estado</p>
          </div>

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
    const headingTitle = isSenateOffice ? 'Senadores' : 'Deputados Federais';

    return (
      <div className={`candidate-flow nv-container ${isSenateOffice ? 'candidate-flow--senate' : 'candidate-flow--single'}`} id="tour-lista">
        <section className="candidate-list-section">
          <div className="prototype-section-heading">
            <h2>{headingTitle}</h2>
            <p>Selecione seus candidatos — todos que aceite votar</p>
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

  if (carregando && !isCandidateOffice) {
    return <LoadingScreen className="nv-screen" />;
  }

  return (
    <div className={`select-base-container prototype-page nv-screen variant-${variant}${!headerVisible ? ' is-header-hidden' : ''}`}>
      
      <AppHeader
        variant="default"
        className={`step-header-sticky ${!headerVisible ? 'is-header-hidden' : ''}`}
        searchActive={isSearchActive && mostrarBusca}
        searchValue={valorBusca}
        onSearchChange={handleSearchChange}
        onSearchClose={() => {
          setIsSearchActive(false);
          if (onChangeBusca) onChangeBusca('');
        }}
        searchRef={candidateSearchInputRef}
        searchPlaceholder="Pesquisar..."
        actions={mostrarBusca && !isSearchActive && (
          <button
            className="step-header__search-trigger nv-touch"
            onClick={() => setIsSearchActive(true)}
            aria-label="Buscar"
          >
            <SearchIcon />
          </button>
        )}
      >
        {!isHomeState && candidateFilterItems.length > 0 && (
          <div className="filter-chips">
            {candidateFilterItems.map((item) => {
              const isActive = isCandidateFilterActive(item);
              return (
                <button
                  key={item.id}
                  className={`filter-chip ${isActive ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => handleSubNavigation(item)}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>
        )}
      </AppHeader>

      <main ref={scrollContainerRef} className="prototype-scroll select-base__scroll nv-scroll">
        {isHomeState ? renderStateList() : renderCandidateList()}
        <AppFooter className="app-footer--scroll-content" />
      </main>

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
        onConfirm={() => setModalCandidatoRepetido({ aberto: false, item: null })}
      />
      <ConfirmModal
        isOpen={modalLimiteSelecao.aberto}
        titulo="LIMITE ATINGIDO"
        mensagem={isSenateOffice ? 'Você já escolheu 2 senadores. Remova um candidato em Meus candidatos para selecionar outro.' : 'Remova a escolha atual para selecionar outro candidato.'}
        textoConfirmar="OK, ENTENDI"
        mostrarCancelar={false}
        onConfirm={() => setModalLimiteSelecao({ aberto: false })}
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