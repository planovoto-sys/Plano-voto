import React, { useEffect, useMemo, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import BottomNavigation from './BottomNavigation';
import AppFooter from './AppFooter';
import { flowLog, flowWarn } from '../services/debugFlow';
import './SelectBase.css';

const INITIAL_CANDIDATE_RENDER_LIMIT = 80;
const CANDIDATE_RENDER_INCREMENT = 80;

const formatScore = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

const getCandidateName = (candidate = {}) => candidate.Nome || candidate.nome || '';
const getCandidateParty = (candidate = {}) => candidate.Partido || candidate.partido || '';

const getCandidateScore = (candidate = {}) => {
  if (candidate.temNotaCandidato === false) return 0;

  const value = candidate.notaFinal ?? candidate.nota_final ?? candidate['Nota candidato'] ?? candidate['Nota partido'] ?? 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getCandidateChance = (candidate = {}) => {
  const directValue = candidate.Chance ?? candidate.chance ?? candidate['Chance eleição'] ?? candidate['Chance de eleição'];
  const directNumeric = Number(directValue);

  if (Number.isFinite(directNumeric)) {
    return Math.max(0, Math.min(100, Math.round(directNumeric)));
  }

  const selectedByUsers = Number(candidate.selectedByUsers ?? candidate.total_selecoes ?? candidate.votos_recebidos ?? 0);
  const averageElectedVotes = Number(candidate.averageElectedVotes ?? 3);
  if (!Number.isFinite(selectedByUsers) || !Number.isFinite(averageElectedVotes) || averageElectedVotes <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((selectedByUsers / averageElectedVotes) * 100)));
};

const getCandidateTone = (candidate = {}) => {
  const score = getCandidateScore(candidate);
  const chance = getCandidateChance(candidate);

  if (candidate.isAlreadyChosen || chance >= 100) return 'neutral';
  if (score <= 0) return 'new';
  if (score < 7) return 'danger';
  return 'success';
};

const getScreenCopy = ({ variant, titulo, subtitulo, currentStep }) => {
  if (variant === 'home-state') {
    return {
      title: 'ESTADO',
      subtitle: 'Escolha o estado em que você vota'
    };
  }

  if (variant === 'office-senado') {
    return {
      title: currentStep === 'senador2' ? 'SENADOR 2' : 'SENADOR 1',
      subtitle: currentStep === 'senador2' ? 'Escolha o segundo senador' : 'Escolha o primeiro senador'
    };
  }

  if (variant === 'office-deputado') {
    return {
      title: 'DEPUTADO FEDERAL',
      subtitle: 'Escolha 1 candidato'
    };
  }

  return {
    title: titulo || '',
    subtitle: subtitulo || ''
  };
};

const getSubNavLabel = (item) => {
  if (item.mode === 'renovar' || item.id?.includes('renovar')) return 'Renovação';
  return 'Reeleição';
};

function MetricCircle({ label, value, tone }) {
  const numericValue = Number(String(value).replace(',', '.')) || 0;
  const maxValue = label === 'Nota' ? 10 : 100;
  const progress = Math.max(0, Math.min(100, (numericValue / maxValue) * 100));

  return (
    <span className={`metric-circle metric-circle--${tone}`} style={{ '--metric-progress': progress }}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function CandidateCard({ candidate, highlight = false, selected = false, onSelect }) {
  const tone = getCandidateTone(candidate);
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const score = getCandidateScore(candidate);
  const chance = getCandidateChance(candidate);
  const hasScore = score > 0;
  const isBlocked = candidate.isAlreadyChosen;

  return (
    <button
      className={`prototype-candidate-card candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${isBlocked ? 'is-blocked' : ''}`}
      type="button"
      onClick={onSelect}
      aria-disabled={candidate.isAlreadyChosen ? 'true' : undefined}
    >
      <span className="candidate-card__identity">
        {highlight && <span className="candidate-card__badge">Destaque</span>}
        {!highlight && !hasScore && !candidate.isAlreadyChosen && <span className="candidate-card__badge candidate-card__badge--new">Sem nota</span>}
        {candidate.isAlreadyChosen && <span className="candidate-card__badge candidate-card__badge--neutral">Já escolhido</span>}
        <strong>{name}</strong>
        <small>{party}</small>
      </span>

      <span className="candidate-card__metrics">
        <MetricCircle label="Nota" value={hasScore ? formatScore(score) : '--'} tone={tone} />
        <MetricCircle label="Chance" value={chance} tone={tone} />
      </span>
    </button>
  );
}

export default function SelectBase({
  titulo,
  subtitulo = '',
  dados,
  limiteSelecao,
  selecaoInicial = [],
  carregando,
  onConfirmar,
  onLimiteAtingido,
  onVoltar,
  mostrarBusca = false,
  valorBusca = '',
  onChangeBusca,
  linhasVisiveis = 5,
  etapa,
  currentStep,
  autoAvancarAoSelecionar = false,
  onSelecaoCompleta,
  onSelectionChange,
  subNavigationItems = [],
  activeSubNavigationId = '',
  onSubNavigationSelect,
  highlightDados,
  variant = '',
  emptyMessage = 'Nenhum resultado encontrado.',
  renderItem
}) {
  const [selecionados, setSelecionados] = useState(selecaoInicial);
  const [candidateRenderLimit, setCandidateRenderLimit] = useState(INITIAL_CANDIDATE_RENDER_LIMIT);
  const [modalMalAvaliado, setModalMalAvaliado] = useState({ aberto: false, item: null });
  const [modalAltaChance, setModalAltaChance] = useState({ aberto: false, item: null });
  const [modalCandidatoRepetido, setModalCandidatoRepetido] = useState({ aberto: false, item: null });

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

  const isHomeState = variant === 'home-state';
  const isCandidateOffice = variant === 'office-deputado' || variant === 'office-senado';
  const highlightSource = highlightDados || dados;
  const effectiveLimit = isCandidateOffice ? 1 : limiteSelecao;
  const hasSelectionLimit = Number.isFinite(effectiveLimit) && effectiveLimit > 0;
  const visibleRows = Number.isFinite(linhasVisiveis) ? linhasVisiveis : 5;
  const screenCopy = getScreenCopy({ variant, titulo, subtitulo, currentStep, etapa });

  const highlightCandidate = useMemo(() => {
    if (!isCandidateOffice || highlightSource.length === 0) return null;

    const candidates = highlightSource.filter((candidate) => (
      getCandidateName(candidate) &&
      !candidate.isAlreadyChosen &&
      getCandidateScore(candidate) >= 7 &&
      getCandidateChance(candidate) < 100
    ));

    candidates.sort((a, b) => {
      const scoreDiff = getCandidateScore(b) - getCandidateScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return getCandidateChance(b) - getCandidateChance(a);
    });

    return candidates[0] || null;
  }, [highlightSource, isCandidateOffice]);

  const secondaryCandidates = useMemo(() => (
    isCandidateOffice
      ? dados.filter((candidate) => candidate.id !== highlightCandidate?.id)
      : []
  ), [dados, highlightCandidate?.id, isCandidateOffice]);

  const visibleSecondaryCandidates = useMemo(() => (
    secondaryCandidates.slice(0, candidateRenderLimit)
  ), [candidateRenderLimit, secondaryCandidates]);

  const hasMoreCandidates = visibleSecondaryCandidates.length < secondaryCandidates.length;

  const commitSelection = (nextSelecionados, { autoConfirm = false, completed = false } = {}) => {
    setSelecionados(nextSelecionados);
    if (onSelectionChange) onSelectionChange(nextSelecionados);

    if (completed && onSelecaoCompleta) {
      queueMicrotask(() => onSelecaoCompleta(nextSelecionados));
      return;
    }

    if (autoConfirm && onConfirmar) {
      queueMicrotask(() => {
        flowLog('select.confirm.auto', {
          titulo,
          totalSelecionados: nextSelecionados.length,
          limiteSelecao: effectiveLimit,
          selecionados: nextSelecionados.map((selectedItem) => selectedItem.id)
        });
        onConfirmar(nextSelecionados);
      });
    }
  };

  const efetivarSelecao = (item) => {
    if (effectiveLimit === 1) {
      commitSelection([item], { autoConfirm: autoAvancarAoSelecionar, completed: true });
      return;
    }

    if (hasSelectionLimit && selecionados.length >= effectiveLimit) {
      flowWarn('select.limit-reached', { titulo, limiteSelecao: effectiveLimit, itemId: item.id });
      if (onLimiteAtingido) onLimiteAtingido(item, selecionados);
      return;
    }

    const nextSelecionados = [...selecionados, item];
    const completed = hasSelectionLimit && nextSelecionados.length === effectiveLimit;
    commitSelection(nextSelecionados, { autoConfirm: autoAvancarAoSelecionar && completed, completed });
  };

  const handleSelect = (item) => {
    const jaSelecionado = selecionados.find((v) => v.id === item.id);
    if (jaSelecionado) {
      flowLog('select.item.remove', { titulo, itemId: item.id, itemLabel: getCandidateName(item) || item.nome || item.sigla || item.id });
      commitSelection(selecionados.filter((v) => v.id !== item.id));
      return;
    }

    if (isCandidateOffice && item.isAlreadyChosen) {
      setModalCandidatoRepetido({ aberto: true, item });
      return;
    }

    if (isCandidateOffice && getCandidateScore(item) > 0 && getCandidateScore(item) < 7) {
      setModalMalAvaliado({ aberto: true, item });
      return;
    }

    if (isCandidateOffice && getCandidateChance(item) >= 100) {
      setModalAltaChance({ aberto: true, item });
      return;
    }

    flowLog('select.item.add', { titulo, itemId: item.id, itemLabel: getCandidateName(item) || item.nome || item.sigla || item.id });
    efetivarSelecao(item);
  };

  const handleStateSelect = (item) => {
    const nextSelection = [item];
    commitSelection(nextSelection, { completed: true });
    if (onConfirmar) {
      queueMicrotask(() => onConfirmar(nextSelection));
    }
  };

  const handleSubNavigation = (item) => {
    if (onSubNavigationSelect) onSubNavigationSelect(item, selecionados);
  };

  const handleHeaderBack = () => {
    if (onVoltar) onVoltar(selecionados);
  };

  const handleSearchChange = (event) => {
    if (onChangeBusca) onChangeBusca(event.target.value);
  };

  const renderSearchField = (className = '') => {
    if (!mostrarBusca) return null;

    return (
      <label className={`select-search-field ${className}`}>
        <span>Buscar</span>
        <input
          type="search"
          value={valorBusca}
          onChange={handleSearchChange}
          placeholder={isHomeState ? 'Buscar estado' : 'Buscar candidato, partido ou número'}
        />
      </label>
    );
  };

  const renderStateList = () => (
    <section className="state-selection-panel" aria-label="Escolha seu estado">
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
  );

  const renderCandidateList = () => (
    <div className="candidate-flow" id="tour-lista">
      <section className="candidate-spotlight">
        <div className="prototype-section-heading">
          <h2>Candidato em destaque <span aria-hidden="true">↗</span></h2>
          <p>Candidato bem avaliado com maior chance de se eleger</p>
        </div>

        {highlightCandidate ? (
          <CandidateCard
            candidate={highlightCandidate}
            highlight
            selected={selecionados.some((item) => item.id === highlightCandidate.id)}
            onSelect={() => handleSelect(highlightCandidate)}
          />
        ) : (
          <div className="no-data">{emptyMessage}</div>
        )}
      </section>

      <section className="candidate-list-section">
        <div className="prototype-section-heading">
          <h2>Outros candidatos</h2>
          <p>Candidatos ordenados da maior para menor nota</p>
        </div>

        <div className="candidate-list-tools">
          {subNavigationItems.length > 0 && (
            <nav className="candidate-filter-tabs" aria-label="Filtro de candidatos">
              {subNavigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`candidate-filter-tabs__item ${item.id === activeSubNavigationId ? 'is-active' : ''}`}
                  onClick={() => handleSubNavigation(item)}
                  title={item.mode === 'renovar' ? 'Renovação: candidatos sem nota' : 'Reeleição: candidatos com nota'}
                >
                  {getSubNavLabel(item)}
                </button>
              ))}
            </nav>
          )}
          {renderSearchField('select-search-field--candidates')}
        </div>

        <div className="candidate-card-list">
          {secondaryCandidates.length > 0 ? (
            visibleSecondaryCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                selected={selecionados.some((item) => item.id === candidate.id)}
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
            onClick={() => setCandidateRenderLimit((limit) => limit + CANDIDATE_RENDER_INCREMENT)}
          >
            Mostrar mais candidatos
          </button>
        )}
      </section>
    </div>
  );

  if (carregando) return <div className="loading" role="status" aria-live="polite">CARREGANDO...</div>;

  return (
    <div className={`select-base-container prototype-page variant-${variant}`}>
      <header className="prototype-header app-page-header">
        <div className="app-page-header__copy">
          <h1>{screenCopy.title}</h1>
          {screenCopy.subtitle && <p>{screenCopy.subtitle}</p>}
        </div>

        <div className="app-page-header__side">
          <BottomNavigation currentStep={currentStep} placement="header" />

          <div className="app-page-header__actions">
            {currentStep !== 'estado' && onVoltar && (
              <button className="app-header-action app-header-action--secondary" type="button" onClick={handleHeaderBack}>
                ← Voltar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="prototype-scroll select-base__scroll">
        {isHomeState ? renderStateList() : renderCandidateList()}
        <AppFooter className="app-footer--mobile-only" />
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
            <span>Este candidato já chegou a 100 de chance.</span>
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
    </div>
  );
}
