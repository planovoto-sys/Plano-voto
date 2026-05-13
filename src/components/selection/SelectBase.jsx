import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '@/components/feedback/ConfirmModal';
import AppFooter from '@/components/layout/AppFooter';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import { BackIcon, InfoIcon, SearchIcon } from '@/components/icons/AppIcons';
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

const getScreenCopy = ({ variant, titulo, subtitulo }) => {
  if (variant === 'home-state') {
    return {
      title: 'DEPUTADO FEDERAL',
      subtitle: ''
    };
  }

  if (variant === 'office-senado') {
    return {
      title: 'SENADORES',
      subtitle: ''
    };
  }

  if (variant === 'office-deputado') {
    return {
      title: 'DEPUTADO FEDERAL',
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
  renderItem
}) {
  const navigate = useNavigate();
  const [selecionados, setSelecionados] = useState(selecaoInicial);
  const [candidateRenderLimit, setCandidateRenderLimit] = useState(INITIAL_CANDIDATE_RENDER_LIMIT);
  const [candidateSearchOpen, setCandidateSearchOpen] = useState(false);
  const candidateSearchInputRef = useRef(null);
  const [modalMalAvaliado, setModalMalAvaliado] = useState({ aberto: false, item: null });
  const [modalAltaChance, setModalAltaChance] = useState({ aberto: false, item: null });
  const [modalCandidatoRepetido, setModalCandidatoRepetido] = useState({ aberto: false, item: null });
  const [modalLimiteSelecao, setModalLimiteSelecao] = useState({ aberto: false });
  const [modalSubstituirSenador, setModalSubstituirSenador] = useState({ aberto: false, item: null });
  const [modalErroSalvar, setModalErroSalvar] = useState({ aberto: false, mensagem: '' });
  const [salvandoSelecao, setSalvandoSelecao] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setSelecionados(selecaoInicial);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selecaoInicial]);

  useEffect(() => {
    if (candidateSearchOpen) {
      candidateSearchInputRef.current?.focus();
    }
  }, [candidateSearchOpen]);

  const isHomeState = variant === 'home-state';
  const isCandidateOffice = variant === 'office-deputado' || variant === 'office-senado';
  const isSenateOffice = variant === 'office-senado';
  const effectiveLimit = Number.isFinite(limiteSelecao) ? limiteSelecao : null;
  const requiredSelectionCount = isCandidateOffice ? minimoSelecao : (effectiveLimit || 1);
  const hasSelectionLimit = Number.isFinite(effectiveLimit) && effectiveLimit > 0;
  const visibleRows = Number.isFinite(linhasVisiveis) ? linhasVisiveis : 5;
  const screenCopy = getScreenCopy({ variant, titulo, subtitulo });

  const featuredCandidate = useMemo(() => {
    if (!isCandidateOffice || dados.length === 0) return null;

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
  }, [dados, isCandidateOffice]);

  const featuredMetricsByCandidateId = useMemo(() => {
    if (!isCandidateOffice || dados.length === 0) return new Map();

    const metricsById = new Map();
    dados.forEach((candidate) => {
      metricsById.set(candidate.id, {
        chance: Boolean(featuredCandidate && candidate.id === featuredCandidate.id)
      });
    });

    return metricsById;
  }, [dados, featuredCandidate, isCandidateOffice]);

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

  const handleStateSelect = (item) => {
    if (salvandoSelecao) return;

    setSelecionados([item]);
  };

  const hasRequiredSelection = (() => {
    return selecionados.length >= requiredSelectionCount;
  })();

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

  const candidateSearchIsOpen = candidateSearchOpen || Boolean(valorBusca);

  const renderSearchField = (className = '') => {
    if (!mostrarBusca) return null;

    return (
      <label className={`select-search-field ${className}`} id="tour-busca">
        <span>Buscar</span>
        <input
          type="search"
          value={valorBusca}
          onChange={handleSearchChange}
          placeholder="Pesquisa"
        />
      </label>
    );
  };

  const renderCandidateSearchControl = () => {
    if (!mostrarBusca || !candidateSearchIsOpen) return null;

    return (
      <label className="candidate-search-field" id="tour-busca">
        <SearchIcon />
        <span>Pesquisar candidatos</span>
        <input
          ref={candidateSearchInputRef}
          type="search"
          value={valorBusca}
          onBlur={() => {
            if (!valorBusca) setCandidateSearchOpen(false);
          }}
          onChange={handleSearchChange}
          placeholder="Pesquisa"
        />
      </label>
    );
  };

  const renderStateList = () => {
    const estadoSelecionado = selecionados[0] || null;

    return (
      <div className="state-selection-flow">
        {estadoSelecionado && (
          <section className="state-current-section" aria-label="Meu estado">
            <div className="prototype-section-heading">
              <h2>Meu estado</h2>
              <p>Estado em que você vota</p>
            </div>

            <article className="state-card state-card--current">
              {renderItem ? renderItem(estadoSelecionado) : <span>{estadoSelecionado.sigla || estadoSelecionado.nome}</span>}
            </article>
          </section>
        )}

        <section className="state-selection-panel" aria-label="Outros estados">
          <div className="prototype-section-heading">
            <h2>Estados</h2>
            <p>Selecione o estado em que você vota</p>
          </div>

          {renderSearchField('select-search-field--state')}

          <div className="state-card-list" id="tour-lista" style={{ '--visible-rows': visibleRows }}>
            {dados.length > 0 ? (
              dados.map((item) => {
                const isSelected = selecionados.some((selectedItem) => selectedItem.id === item.id);
                return (
                  <button
                    key={item.id}
                    className={`state-card ${isSelected ? 'is-selected' : ''}`}
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
    const currentTitle = isSenateOffice ? 'Meus candidatos' : 'Meu candidato';
    const senateSelectionComplete = isSenateOffice && selecionados.length >= requiredSelectionCount;

    return (
      <div className="candidate-flow" id="tour-lista">
        {selectedPreviewCandidates.length > 0 && (
          <section className="candidate-current-section">
            <div className="prototype-section-heading prototype-section-heading--current">
              <h2>{currentTitle}</h2>
              <p>
                {isSenateOffice ? 'Considere selecionar os candidatos ' : 'Considere selecionar o candidato '}
                <span className="candidate-current-highlight">{isSenateOffice ? 'mais viáveis 🔥' : 'mais viável 🔥'}</span>
              </p>
            </div>

            <div className={`candidate-current-list ${isSenateOffice ? 'candidate-current-list--double' : ''}`}>
              {selectedPreviewCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  summary
                  actionLabel="Remover"
                  selected
                  featuredMetrics={featuredMetricsByCandidateId.get(candidate.id)}
                  showAssessmentSubtitle
                  onSelect={() => handleSelect(candidate)}
                />
              ))}
            </div>

            {isSenateOffice && senateSelectionComplete && shareData && (
              <ShareChoicePanel shareData={shareData} />
            )}
          </section>
        )}

        <section className="candidate-list-section">
          <div className="prototype-section-heading">
            <h2>Candidatos</h2>
            <p>Selecione todos os candidatos que aceita votar</p>
          </div>

          <div className={`candidate-list-tools ${candidateSearchIsOpen ? 'is-search-open' : ''}`}>
            <div className="candidate-list-tools__row">
              {subNavigationItems.length > 0 && (
                <nav className="candidate-filter-tabs" aria-label="Filtro de candidatos">
                  {subNavigationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`candidate-filter-tabs__item ${item.id === activeSubNavigationId ? 'is-active' : ''}`}
                      onClick={() => handleSubNavigation(item)}
                      title={item.mode === 'selecionados' ? 'Candidatos selecionados' : item.mode === 'renovar' ? 'Renovação: candidatos sem nota' : 'Reeleição: candidatos com nota'}
                    >
                      {getSubNavLabel(item)}
                    </button>
                  ))}
                </nav>
              )}
              {mostrarBusca && (
                <button
                  className={`candidate-search-button ${candidateSearchIsOpen ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => {
                    setCandidateSearchOpen(true);
                    window.requestAnimationFrame(() => candidateSearchInputRef.current?.focus());
                  }}
                  aria-expanded={candidateSearchIsOpen}
                  aria-label="Pesquisar candidatos"
                  title="Pesquisar"
                >
                  <SearchIcon />
                </button>
              )}
            </div>
            {renderCandidateSearchControl()}
          </div>

          <div className="candidate-card-list">
            {dados.length > 0 ? (
              visibleSecondaryCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selecionados.some((item) => item.id === candidate.id)}
                  featuredMetrics={featuredMetricsByCandidateId.get(candidate.id)}
                  showAssessmentSubtitle
                  onSelect={() => handleSelect(candidate)}
                />
              ))
            ) : (
              <div className="no-data">{emptyMessage}</div>
            )}
          </div>

          {hasMoreCandidates && (
            <button
              className="candidate-load-more"
              type="button"
              onClick={() => setCandidateRenderLimit(dados.length)}
            >
              Mostrar todos
            </button>
          )}
        </section>
      </div>
    );
  };

  if (carregando) return <div className="loading" role="status" aria-live="polite">CARREGANDO...</div>;

  return (
    <div className={`select-base-container prototype-page variant-${variant}`}>
      <header className="prototype-header app-page-header">
        <button
          className="app-header-back-button"
          type="button"
          onClick={handleHeaderBack}
          aria-label="Voltar"
        >
          <BackIcon />
          <span>Voltar</span>
        </button>

        <div className="app-page-header__copy">
          <h1>{screenCopy.title}</h1>
          {screenCopy.subtitle && <p>{screenCopy.subtitle}</p>}
        </div>

        <div className="app-page-header__actions">
          {onHelpClick && (
            <button
              className="app-header-icon-action app-help-action"
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

      <main className="prototype-scroll select-base__scroll">
        {isHomeState ? renderStateList() : renderCandidateList()}
        <AppFooter className="app-footer--scroll-content" />
      </main>

      <div className="select-base__continue-shell">
        <button
          className="select-base__continue"
          type="button"
          onClick={handleContinue}
          disabled={salvandoSelecao || !hasRequiredSelection}
        >
          CONTINUAR
        </button>
      </div>

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
    </div>
  );
}
