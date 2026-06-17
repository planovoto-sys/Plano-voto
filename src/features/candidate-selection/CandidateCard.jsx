import { ChevronDownIcon } from '@/shared/icons/AppIcons';
import {
  formatScore,
  getCandidateChance,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

import { ThumbsUp } from 'lucide-react';

function ViabilityMeter({
  value,
  tone,
  locked = false,
  showCaption = true,
  onLockedClick,
  candidateScoreLabel = '--',
  partyScoreLabel = '--'
}) {
  const numericValue = Number(value) || 0;
  const progress = Math.max(0, Math.min(100, numericValue));
  const progressScale = progress / 100;
  const isComplete = progress >= 100;

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
      className={`candidate-thermometer candidate-thermometer--${tone} ${progress > 0 ? 'is-filled' : ''} ${isComplete ? 'is-complete' : ''} ${locked ? 'is-locked' : ''}`}
      style={{ '--metric-progress': progress, '--thermometer-progress': `${progress}%`, '--thermometer-scale': progressScale }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      aria-label={locked ? 'Campo de viabilidade bloqueado' : undefined}
      onClick={handleLockedClick}
      onKeyDown={handleLockedKeyDown}
    >
      <span className="candidate-thermometer__meter-row">
        <span className="candidate-thermometer__track" aria-hidden="true">
          <span className="candidate-thermometer__fill"></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--first"></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--second"></span>
          <span className="candidate-thermometer__tick candidate-thermometer__tick--third"></span>
        </span>
      </span>
      {showCaption && (
        <span className="candidate-thermometer__caption">
          <span className="candidate-thermometer__caption-viability">
            <span>viabilidade</span>
            <strong>{value}%</strong>
          </span>
          <span className="candidate-thermometer__caption-main">
            <span>candidato</span>
            <strong>{candidateScoreLabel}</strong>
          </span>

          <span className="candidate-thermometer__badge">
            <span> partido</span>
            <strong>{partyScoreLabel}</strong>

          </span>
        </span>
      )}
    </span>
  );
}

const getCandidateNumber = (candidate = {}) => {
  const value = candidate.Numero ?? candidate.numero ?? candidate.number ?? '';
  return String(value ?? '').trim();
};

export default function CandidateCard({
  candidate,
  highlight = false,
  selected = false,
  onSelect,
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
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const displayNumber = number || String(numberFallback || '').trim();
  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = getCandidateChance(candidate);
  const isBlocked = candidate.isAlreadyChosen;
  const systemScore = getCandidateSystemScore(candidate);

  const tone = lockPersonalizedFields ? 'visitor' : (systemScore >= 7 ? 'success' : 'danger');

  const handleLockedFieldClick = (event) => {
    if (!lockPersonalizedFields) return;
    event.preventDefault();
    event.stopPropagation();
    onLockedMetricClick?.();
  };

  const candidateScoreLabel = candidateScore > 0 ? formatScore(candidateScore) : '--';
  const partyScoreLabel = partyScore > 0 ? formatScore(partyScore) : '--';
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

  const renderCardBody = ({ detailed = false } = {}) => (
    <span className="candidate-card__identity">
      <span className="candidate-card__summary-row">
        <span className="candidate-card__identity-copy">
          {showNumberAbove && displayNumber && (
            <span className="candidate-card__number">{displayNumber}</span>
          )}
          <span className="candidate-card__name-row">
            <span className="candidate-card__text-line candidate-card__text-line--name">
              <strong>{name}</strong>
            </span>
          </span>
          {partyLabel && (
            <span className="candidate-card__party-row">
              <small>{partyLabel}</small>
            </span>
          )}
        </span>


        <span className="candidate-card__badges-wrapper">
         <span className="candidate-card__status-badge">
  <ThumbsUp
    className={`candidate-card__like-icon ${
      selected
        ? 'candidate-card__like-icon--selected'
        : ''
    }`}
  />
</span>
          {isExpandable && renderExpandIndicator()}
        </span>
      </span>

      {detailed && lockPersonalizedFields ? renderLockedInsight() : (
        <ViabilityMeter
          value={lockPersonalizedFields ? 0 : chance}
          tone={tone}
          locked={false}
          showCaption={detailed && showAssessmentSubtitle && !lockPersonalizedFields}
          onLockedClick={!lockPersonalizedFields ? onLockedMetricClick : undefined}
          candidateScoreLabel={candidateScoreLabel}
          partyScoreLabel={partyScoreLabel}
        />
      )}
    </span>
  );

  return (
    <article
      className={`prototype-candidate-card nv-touch nv-no-overflow candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${showNumberAbove ? 'has-number-above' : ''} ${isBlocked ? 'is-blocked' : ''} ${isExpandable ? 'is-expandable' : 'is-selectable'} ${isExpanded ? 'is-expanded' : ''} ${cardIsDetailed ? 'is-detailed' : 'is-compact'} ${promoted ? 'is-promoted' : ''} ${selectionFeedbackClass}`}
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
            tone={tone}
            locked={false}
            showCaption={showAssessmentSubtitle && !lockPersonalizedFields}
            onLockedClick={!lockPersonalizedFields ? onLockedMetricClick : undefined}
            candidateScoreLabel={candidateScoreLabel}
            partyScoreLabel={partyScoreLabel}
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