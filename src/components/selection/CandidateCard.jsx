import { ChanceFlame } from '@/components/icons/ChanceFlame';
import {
  formatScore,
  getCandidateChance,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore,
  getCandidateTone
} from '@/utils/candidateMetrics';

function ViabilityMeter({ value, tone, featured = false, locked = false, label = '', showCaption = true, onLockedClick }) {
  const numericValue = Number(value) || 0;
  const progress = Math.max(0, Math.min(100, numericValue));
  const displayValue = Math.round(progress);
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
      className={`candidate-thermometer candidate-thermometer--${tone} ${featured ? 'candidate-thermometer--featured' : ''} ${isComplete ? 'is-complete' : ''} ${locked ? 'is-locked' : ''}`}
      style={{ '--metric-progress': progress, '--thermometer-progress': `${progress}%` }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      aria-label={locked ? 'Campo de viabilidade bloqueado' : undefined}
      onClick={handleLockedClick}
      onKeyDown={handleLockedKeyDown}
    >
      <span className="candidate-thermometer__track" aria-hidden="true">
        <span className="candidate-thermometer__fill"></span>
        <span className="candidate-thermometer__tick candidate-thermometer__tick--first"></span>
        <span className="candidate-thermometer__tick candidate-thermometer__tick--second"></span>
        <span className="candidate-thermometer__tick candidate-thermometer__tick--third"></span>
      </span>
      {showCaption && (
        <span className="candidate-thermometer__caption">
          Viabilidade no momento: <strong>{displayValue}%</strong>{label && <><b> | </b><em>{label}</em></>}
        </span>
      )}
      {isComplete && <span className="candidate-thermometer__lock" aria-hidden="true"></span>}
    </span>
  );
}

const getCandidateNumber = (candidate = {}) => {
  const value = candidate.Numero ?? candidate.numero ?? candidate.number ?? '';
  return String(value || '').trim();
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
  if (isViabilityComplete || progress >= 100) return 'MÁXIMA';
  if (isFireFeatured && systemScore > 7) return 'MUITO INTERESSANTE';
  if (progress >= 50 && systemScore >= 7) return 'INTERESSANTE';
  return '';
};

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
  showNumberAbove = false
}) {
  const tone = lockPersonalizedFields ? 'visitor' : getCandidateTone(candidate);
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = getCandidateChance(candidate);
  const hasCandidateScore = candidateScore > 0;
  const hasPartyScore = !hasCandidateScore && partyScore > 0;
  const visibleScore = hasCandidateScore ? candidateScore : partyScore;
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
  const metricTone = isFireFeatured ? 'featured' : tone;
  const textFitStyle = {
    '--candidate-name-size': '20px',
    '--candidate-name-mobile-size': '18px',
    '--candidate-name-narrow-size': '18px',
    '--candidate-name-tiny-size': '17px',
    '--candidate-assessment-size': `${getSingleLineSize(assessment.label, { base: 10, lg: 9.4, md: 8.7, sm: 8, xs: 7.2, xxs: 6.6 })}px`,
    '--candidate-assessment-mobile-size': `${getSingleLineSize(assessment.label, { base: 8.4, lg: 8, md: 7.4, sm: 6.9, xs: 6.3, xxs: 5.9 })}px`
  };
  const handleLockedFieldClick = (event) => {
    if (!lockPersonalizedFields) return;

    event.preventDefault();
    event.stopPropagation();
    onLockedMetricClick?.();
  };
  const scoreLabel = (hasCandidateScore || hasPartyScore) ? formatScore(visibleScore) : '';
  const partyLabel = [party, partyScore > 0 ? formatScore(partyScore) : ''].filter(Boolean).join(' | ');

  return (
    <button
      className={`prototype-candidate-card nv-touch nv-no-overflow candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${showNumberAbove ? 'has-number-above' : ''} ${isFireFeatured ? 'is-fire-featured' : ''} ${isViabilityComplete ? 'is-viability-complete' : ''} ${isBlocked ? 'is-blocked' : ''}`}
      style={textFitStyle}
      type="button"
      onClick={onSelect}
      disabled={disabled}
      title={summary ? `${actionLabel || 'Candidato selecionado'}: ${name}` : name}
      aria-pressed={selected}
      aria-disabled={candidate.isAlreadyChosen ? 'true' : undefined}
    >
      {isFireFeatured && (
        <ChanceFlame
          className={`candidate-viability__flame ${summary ? 'candidate-viability__flame--summary' : ''}`}
          size={34}
        />
      )}

      <span className="candidate-card__identity">
        {showNumberAbove && number && (
          <span className="candidate-card__number">{number}</span>
        )}
        <span className="candidate-card__name-row">
          <strong>{name}</strong>
          {scoreLabel && <span className="candidate-card__score">| {scoreLabel}</span>}
        </span>
        {partyLabel && <small>{partyLabel}</small>}
        {showAssessmentSubtitle && lockPersonalizedFields ? (
          <span
            className="candidate-card__locked-insight"
            onClick={handleLockedFieldClick}
          >
            <strong>Indicadores disponíveis após login 🔒</strong>
            <span>Entre para ver nota, viabilidade e análise personalizada.</span>
          </span>
        ) : !lockPersonalizedFields && (
          <ViabilityMeter
            value={chance}
            tone={metricTone}
            featured={isFireFeatured}
            locked={false}
            label={viabilityLabel}
            showCaption={showAssessmentSubtitle}
            onLockedClick={onLockedMetricClick}
          />
        )}
      </span>
    </button>
  );
}
