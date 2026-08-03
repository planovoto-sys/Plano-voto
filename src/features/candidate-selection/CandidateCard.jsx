import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  formatScore,
  getCandidateChance,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

const getCandidateNumber = (candidate = {}) => {
  const value = candidate.Numero ?? candidate.numero ?? candidate.number ?? '';
  return String(value ?? '').trim();
};

export default function CandidateCard({
  candidate,
  selected = false,
  onSelect,
  disabled = false,
  lockPersonalizedFields = false,
  onLockedMetricClick,
  showNumberAbove = false,
  numberFallback = '',
  variant = 'card'
}) {
  const isSummary = variant === 'summary';
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const displayNumber = number || String(numberFallback || '').trim();

  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = lockPersonalizedFields ? 0 : getCandidateChance(candidate);
  const systemScore = getCandidateSystemScore(candidate);
  const isBlocked = candidate.isAlreadyChosen;

  // Lógica de Fallback de Nota
  const hasValidCandidateScore = candidateScore > 0;
  const displayScoreValue = hasValidCandidateScore ? candidateScore : partyScore;
  const displayScoreLabel = hasValidCandidateScore ? 'Nota do candidato' : 'Nota do partido';
  const formattedScore = displayScoreValue > 0 ? formatScore(displayScoreValue) : '--';

  // Lógica Universal de Avaliação
  const isWellEvaluated = systemScore >= 7;
  const toneClass = isWellEvaluated ? 'tone-good' : 'tone-bad';

  // Controle do Balão de Tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    let timer;
    if (showTooltip && !isFading) {
      timer = setTimeout(() => setIsFading(true), 4000);
    } else if (isFading) {
      timer = setTimeout(() => { setShowTooltip(false); setIsFading(false); }, 500);
    }
    return () => clearTimeout(timer);
  }, [showTooltip, isFading]);

  const handleScoreClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showTooltip) setIsFading(true);
    else { setShowTooltip(true); setIsFading(false); }
  };

  const handleLockedFieldClick = (event) => {
    if (!lockPersonalizedFields) return;
    event.preventDefault();
    event.stopPropagation();
    onLockedMetricClick?.();
  };

  const handleCardClick = (e) => {
    if (disabled || isBlocked) return;
    onSelect?.(e);
  };

  const renderLockedInsight = () => (
    <div className="candidate-card__locked-insight nv-touch" onClick={handleLockedFieldClick}>
      <strong>Indicadores disponíveis após login</strong>
      <span>Entre para ver nota, viabilidade e análise.</span>
    </div>
  );

  return (
    <article
      className={`prototype-candidate-card ${variant === 'summary' ? 'variant-summary' : ''} ${selected ? 'is-selected' : ''} ${isBlocked ? 'is-blocked' : ''} ${toneClass} nv-touch`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >

      {/* 1. CABEÇALHO */}
      <header className="candidate-card__header">
        <div className="candidate-card__identity">
          {showNumberAbove && !isSummary && displayNumber && (
            <span className="candidate-card__number">{displayNumber}</span>
          )}
          <h3 className="candidate-card__name">{name}</h3>
          <span className="candidate-card__party">{party}</span>
        </div>

        {isSummary ? (
          displayNumber && (
            <span className="candidate-card__number candidate-card__number--badge">{displayNumber}</span>
          )
        ) : (
          /* BOTÃO DE SELEÇÃO: Microinteração */
          <button
            className={`candidate-card__action-btn-icon ${selected ? 'selected' : 'unselected'} ${toneClass}`}
            disabled={disabled || isBlocked}
            aria-hidden="true"
          >
            <svg className="icon-morph-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line className="morph-h" x1="5" y1="12" x2="19" y2="12" />
              <line className="morph-v" x1="12" y1="5" x2="12" y2="19" />
              <path className="morph-check" d="M 18 8 L 11 16.5" />
            </svg>
          </button>
        )}
      </header>

      {/* 2. MEIO (Barra de Viabilidade) */}
      <div className="candidate-card__viability-row" onClick={lockPersonalizedFields ? handleLockedFieldClick : undefined}>
        <div className="candidate-card__bar-container">
          <div className="candidate-card__bar-fill" style={{ width: `${chance}%` }}></div>
          {/* Ticks removidos para uma barra contínua e mais limpa */}
        </div>
        <span className={`candidate-card__viability-percent ${selected ? (isWellEvaluated ? 'is-green' : 'is-red') : ''}`}>
          {lockPersonalizedFields ? '--' : Math.round(chance)}%
        </span>
      </div>

      {/* 3. RODAPÉ (Tags) */}
      {lockPersonalizedFields ? (
        renderLockedInsight()
      ) : (
        <footer className="candidate-card__tags-row">

          <div className={`candidate-card__tag candidate-card__tag--score ${toneClass} nv-touch`} onClick={handleScoreClick}>
            <Star className="tag-icon" size={14} strokeWidth={2.2} />
            <div className="tag-score-text-group">

              <span className="tag-score-title">
                {hasValidCandidateScore ? 'Candidato nota' : 'Partido nota'}
              </span>

              <span className="tag-score-value">
                {formattedScore}
              </span>

            </div>

            {showTooltip && (
              <div className={`candidate-tooltip ${isFading ? 'is-fading' : ''}`}>
                {hasValidCandidateScore ? (
                  <>Nota do candidato: <strong>{formatScore(candidateScore)}</strong><br />Nota do partido: <strong>{formatScore(partyScore)}</strong></>
                ) : (
                  <>Este candidato ainda não tem nota própria.<br />Nota do partido: <strong>{formatScore(partyScore)}</strong></>
                )}
              </div>
            )}
          </div>

          <div className={`candidate-card__tag candidate-card__tag--eval ${toneClass}`}>
            {isWellEvaluated ? (
              <ThumbsUp className="tag-icon" size={14} strokeWidth={2.2} />
            ) : (
              <ThumbsDown className="tag-icon" size={14} strokeWidth={2.2} />
            )}
            <span className="tag-eval-text">{isWellEvaluated ? 'Bem avaliado' : 'Mal avaliado'}</span>
          </div>

        </footer>
      )}
    </article>
  );
}