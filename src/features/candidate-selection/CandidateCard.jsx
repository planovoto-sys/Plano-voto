import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import { ChevronDownIcon } from '@/shared/icons/AppIcons';
import {
  formatScore,
  getCandidateChance,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore,
  getCandidateTone
} from '@/shared/utils/candidateMetrics';

function ViabilityMeter({ value, tone, featured = false, locked = false, label = '', showCaption = true, onLockedClick }) {
  const numericValue = Number(value) || 0;
  const progress = Math.max(0, Math.min(100, numericValue));
  const progressScale = progress / 100;
  const displayValue = Math.round(progress);
  const isComplete = progress >= 100;
  const shouldAnimateFill = featured && progress > 0 && !locked;
  const fillGlowStyle = shouldAnimateFill
    ? {
        boxShadow: '0 0 14px rgba(255, 145, 77, 0.5), 0 0 28px rgba(255, 152, 0, 0.24)'
      }
    : undefined;
  const handleLockedClick = (event) => {
    if (!locked) return;

    event.preventDefault();
    event.stopPropagation();
    onLockedClick?.();
  };
  const handleLockedKeyDown = (event) => {
    if (!locked || !['Enter', ' '].includes(event.key)) return;

    handleLockedClick(event);
  };

  return (
    <span
      className={`candidate-thermometer candidate-thermometer--${tone} ${featured ? 'candidate-thermometer--featured' : ''} ${progress > 0 ? 'is-filled' : ''} ${isComplete ? 'is-complete' : ''} ${locked ? 'is-locked' : ''}`}
      style={{ '--metric-progress': progress, '--thermometer-progress': `${progress}%`, '--thermometer-scale': progressScale }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      aria-label={locked ? 'Campo de viabilidade bloqueado' : undefined}
      onClick={handleLockedClick}
      onKeyDown={handleLockedKeyDown}
    >
      <span className="candidate-thermometer__meter-row">
        <span className="candidate-thermometer__track" aria-hidden="true">
          <span
            className={`candidate-thermometer__fill ${shouldAnimateFill ? 'animate-pulse' : ''}`.trim()}
            style={fillGlowStyle}
          ></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--first"></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--second"></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--third"></span>
        </span>
      </span>
      {showCaption && (
        <span className="candidate-thermometer__caption">
          <span className="candidate-thermometer__caption-main">
            <span>Viabilidade:</span>
            <strong>{displayValue}%</strong>
          </span>
          {label && (
            <span className="candidate-thermometer__badge">
              <em>{label}</em>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

const getCandidateNumber = (candidate = {}) => {
  const value = candidate.Numero ?? candidate.numero ?? candidate.number ?? '';
  return String(value ?? '').trim();
};

const getSingleLineSize = (value, sizes) => {
  const length = String(value || '').trim().length;

  if (length > 54) return sizes.xxs ?? sizes.xs;
  if (length > 46) return sizes.xs;
  if (length > 38) return sizes.sm;
  if (length > 30) return sizes.md;
  if (length > 22) return sizes.lg;
  return sizes.base;
};

const getAssessment = ({ isFireFeatured, isViabilityComplete, systemScore }) => {
  if (isFireFeatured && systemScore > 7) {
    return { label: 'Mais viável', tone: 'fire', icon: 'fire' };
  }

  if (isViabilityComplete) {
    return { label: 'Não precisa de mais votos', tone: 'info', icon: 'error' };
  }

  if (systemScore >= 7) {
    return { label: 'Precisa de mais votos', tone: 'info', icon: 'info' };
  }

  if (systemScore > 0 && systemScore < 7) {
    return { label: 'Mal avaliado', tone: 'info', icon: 'error' };
  }

  return { label: 'Sem nota', tone: 'info', icon: 'info' };
};

const getViabilityLabel = ({ progress, isFireFeatured, isViabilityComplete, systemScore }) => {
  if (isViabilityComplete || progress >= 100) return 'META ATINGIDA';
  if (isFireFeatured && systemScore > 7) return 'MUITO INTERESSANTE';
  if (systemScore > 0 && systemScore < 7) return 'NOTA BAIXA';
  if (systemScore >= 7) return 'INTERESSANTE';
  return 'EM ANÁLISE';
};

const getStatusIconKind = ({ isFireFeatured, isViabilityComplete, systemScore, tone, locked }) => {
  if (locked) return 'lock';
  if (isFireFeatured) return 'fire';
  if (isViabilityComplete) return 'lock';
  if (systemScore > 0 && systemScore < 7) return 'thumb-down';
  if (tone === 'success' || systemScore >= 7) return 'thumb-up';
  return 'lock';
};

function StatusIcon({ kind }) {
  if (kind === 'fire') {
    return <ChanceFlame className="candidate-status-icon candidate-status-icon--fire" size={30} />;
  }

  if (kind === 'lock') {
    return (
      <svg className="candidate-status-icon candidate-status-icon--lock" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.25 10.2V8a4.75 4.75 0 0 1 9.5 0v2.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="5.4" y="10" width="13.2" height="10.2" rx="2.1" fill="currentColor" />
      </svg>
    );
  }

  if (kind === 'thumb-down') {
    return (
      <svg className="candidate-status-icon candidate-status-icon--thumb-down" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.8 4.1h7.5c1.1 0 2 .8 2.2 1.9l.9 5.4c.2 1.2-.7 2.3-1.9 2.3h-4.4l.5 3.3c.2 1.1-.3 2.1-1.2 2.7l-.4.3-4.2-6.2V5.2c0-.6.4-1.1 1-1.1Z" fill="currentColor" />
        <path d="M4.2 4.3h3.1v9.3H4.2z" fill="currentColor" opacity="0.72" />
      </svg>
    );
  }

  return (
    <svg className="candidate-status-icon candidate-status-icon--thumb-up" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 19.9H6.7c-1.1 0-2-.8-2.2-1.9l-.9-5.4c-.2-1.2.7-2.3 1.9-2.3h4.4l-.5-3.3c-.2-1.1.3-2.1 1.2-2.7l.4-.3 4.2 6.2v8.6c0 .6-.4 1.1-1 1.1Z" fill="currentColor" />
      <path d="M16.7 10.4h3.1v9.3h-3.1z" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

export default function CandidateCard({
  candidate,
  highlight = false,
  selected = false,
  onSelect,
  featuredMetrics = {},
  showAssessmentSubtitle = true,
  summary = false,
  actionLabel = '',
  disabled = false,
  lockPersonalizedFields = false,
  onLockedMetricClick,
  showNumberAbove = false,
  numberFallback = '',
  displayMode = 'detailed',
  interactionMode = 'select',
  expanded = false,
  onToggleDetails,
  detailsId = '',
  selectionActionLabel = '',
  promoted = false,
  selectionFeedback = ''
}) {
  const tone = lockPersonalizedFields ? 'visitor' : getCandidateTone(candidate);
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const displayNumber = number || String(numberFallback || '').trim();
  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = getCandidateChance(candidate);
  const hasCandidateScore = candidateScore > 0;
  const hasPartyScore = partyScore > 0;
  const isBlocked = candidate.isAlreadyChosen;
  const isFireFeatured = !lockPersonalizedFields && Boolean(featuredMetrics.chance || candidate.isChanceFeatured);
  const isViabilityComplete = chance >= 100;
  const systemScore = getCandidateSystemScore(candidate);
  const assessment = getAssessment({ isFireFeatured, isViabilityComplete, systemScore });
  const viabilityLabel = getViabilityLabel({
    progress: chance,
    isFireFeatured,
    isViabilityComplete,
    systemScore
  });
  const statusIconKind = getStatusIconKind({
    isFireFeatured,
    isViabilityComplete,
    systemScore,
    tone,
    locked: lockPersonalizedFields
  });
  const metricTone = isFireFeatured ? 'featured' : tone;
  const textFitStyle = {
    '--candidate-name-size': '16.5px',
    '--candidate-name-mobile-size': '15.5px',
    '--candidate-name-narrow-size': '14.8px',
    '--candidate-name-tiny-size': '14px',
    '--candidate-assessment-size': `${getSingleLineSize(assessment.label, { base: 10, lg: 9.4, md: 8.7, sm: 8, xs: 7.2, xxs: 6.6 })}px`,
    '--candidate-assessment-mobile-size': `${getSingleLineSize(assessment.label, { base: 8.4, lg: 8, md: 7.4, sm: 6.9, xs: 6.3, xxs: 5.9 })}px`
  };
  const handleLockedFieldClick = (event) => {
    if (!lockPersonalizedFields) return;

    event.preventDefault();
    event.stopPropagation();
    onLockedMetricClick?.();
  };
  const candidateScoreLabel = hasCandidateScore ? formatScore(candidateScore) : '--';
  const partyScoreLabel = hasPartyScore ? formatScore(partyScore) : '--';
  const partyLabel = party || '';
  const isExpandable = interactionMode === 'expand';
  const isExpanded = Boolean(expanded);
  const isCompactMode = displayMode === 'compact';
  const surfaceIsDetailed = !isExpandable && !isCompactMode;
  const cardIsDetailed = surfaceIsDetailed || isExpanded;
  const selectionFeedbackClass = selectionFeedback ? `is-selection-${selectionFeedback}` : '';
  const panelId = detailsId || `candidate-card-details-${String(candidate.id || name).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const selectionLabel = selectionActionLabel || (selected ? 'Remover escolha' : 'Escolher candidato');

  const handleSurfaceClick = (event) => {
    if (isExpandable) {
      onToggleDetails?.(candidate, event);
      return;
    }

    onSelect?.(event);
  };

  const renderStatusBadge = (className = '') => (
    <span className={`candidate-card__status-badge ${className}`} aria-hidden="true">
      <StatusIcon kind={statusIconKind} />
    </span>
  );

  const renderExpandIndicator = () => (
    <span className="candidate-card__expand-indicator" aria-hidden="true">
      <ChevronDownIcon />
    </span>
  );

  const renderLockedInsight = () => {
    if (!showAssessmentSubtitle || !lockPersonalizedFields) return null;

    return (
      <span
        className="candidate-card__locked-insight"
        onClick={handleLockedFieldClick}
      >
        <strong>Indicadores disponíveis após login</strong>
        <span>Entre para ver nota, viabilidade e análise personalizada.</span>
      </span>
    );
  };

  const renderScoreChip = (label, type, ariaLabel, isEmpty = false) => (
    <span
      className={`candidate-card__score-chip candidate-card__score-chip--${type} ${isEmpty ? 'is-empty' : ''}`}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  );

  const renderCardBody = ({ detailed = false } = {}) => (
    <span className="candidate-card__identity">
      <span className="candidate-card__summary-row">
        <span className="candidate-card__identity-copy">
          {showNumberAbove && displayNumber && (
            <span className="candidate-card__number">{displayNumber}</span>
          )}
          <span className="candidate-card__name-row">
            <span className="candidate-card__text-line candidate-card__text-line--name">
              {detailed && renderScoreChip(
                candidateScoreLabel,
                'candidate',
                hasCandidateScore ? `Nota do candidato ${candidateScoreLabel}` : 'Nota do candidato indisponível',
                !hasCandidateScore
              )}
              <strong>{name}</strong>
            </span>
          </span>
          {partyLabel && (
            <span className="candidate-card__party-row">
              {detailed && renderScoreChip(
                partyScoreLabel,
                'party',
                hasPartyScore ? `Nota do partido ${partyScoreLabel}` : 'Nota do partido indisponível',
                !hasPartyScore
              )}
              <small>{partyLabel}</small>
            </span>
          )}
        </span>

        {renderStatusBadge()}
        {isExpandable && renderExpandIndicator()}
      </span>

      {detailed && lockPersonalizedFields ? renderLockedInsight() : (
        <ViabilityMeter
          value={lockPersonalizedFields ? 0 : chance}
          tone={metricTone}
          featured={!lockPersonalizedFields && isFireFeatured}
          locked={false}
          label={viabilityLabel}
          showCaption={detailed && showAssessmentSubtitle && !lockPersonalizedFields}
          onLockedClick={!lockPersonalizedFields ? onLockedMetricClick : undefined}
        />
      )}
    </span>
  );

  return (
    <article
      className={`prototype-candidate-card nv-touch nv-no-overflow candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${showNumberAbove ? 'has-number-above' : ''} ${isFireFeatured ? 'is-fire-featured' : ''} ${isViabilityComplete ? 'is-viability-complete' : ''} ${isBlocked ? 'is-blocked' : ''} ${isExpandable ? 'is-expandable' : 'is-selectable'} ${isExpanded ? 'is-expanded' : ''} ${cardIsDetailed ? 'is-detailed' : 'is-compact'} ${promoted ? 'is-promoted' : ''} ${selectionFeedbackClass}`}
      style={textFitStyle}
      title={summary ? `${actionLabel || 'Candidato selecionado'}: ${name}` : name}
    >
      <button
        className="candidate-card__surface nv-touch"
        type="button"
        onClick={handleSurfaceClick}
        disabled={disabled}
        aria-pressed={!isExpandable ? selected : undefined}
        aria-expanded={isExpandable ? isExpanded : undefined}
        aria-controls={isExpandable ? panelId : undefined}
        aria-disabled={!isExpandable && candidate.isAlreadyChosen ? 'true' : undefined}
      >
        {renderCardBody({ detailed: surfaceIsDetailed })}
      </button>

      {isExpandable && isExpanded && (
        <div className="candidate-card__detail-panel" id={panelId}>
          <ViabilityMeter
            value={lockPersonalizedFields ? 0 : chance}
            tone={metricTone}
            featured={!lockPersonalizedFields && isFireFeatured}
            locked={false}
            label={viabilityLabel}
            showCaption={showAssessmentSubtitle && !lockPersonalizedFields}
            onLockedClick={!lockPersonalizedFields ? onLockedMetricClick : undefined}
          />

          {lockPersonalizedFields && (
            renderLockedInsight()
          )}

          <button
            className={`candidate-card__selection-action nv-touch ${selected ? 'is-selected' : ''}`}
            type="button"
            onClick={onSelect}
            disabled={disabled}
            aria-pressed={selected}
            aria-disabled={candidate.isAlreadyChosen ? 'true' : undefined}
          >
            {selectionLabel}
          </button>
        </div>
      )}
    </article>
  );
}
