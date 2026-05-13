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

function ViabilityMeter({ value, tone, featured = false }) {
  const numericValue = Number(value) || 0;
  const progress = Math.max(0, Math.min(100, numericValue));

  return (
    <span
      className={`candidate-viability candidate-viability--${tone} ${featured ? 'candidate-viability--featured' : ''}`}
      style={{ '--metric-progress': progress }}
    >
      <span className="candidate-viability__circle">
        <strong>{numericValue}<small>%</small></strong>
        <span>viável</span>
      </span>
      {featured && (
        <span className="candidate-viability__flame" aria-hidden="true">🔥</span>
      )}
    </span>
  );
}

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
    return { label: 'Mais viável', icon: 'fire' };
  }

  if (systemScore >= 7) {
    if (isViabilityComplete) {
      return { label: 'Não precisa de mais votos', icon: 'info' };
    }

    return { label: 'Precisa de mais votos', icon: 'info' };
  }

  if (systemScore > 0 && systemScore < 7) {
    return { label: 'Mal avaliado', icon: 'error' };
  }

  return { label: 'Sem nota', icon: 'info' };
};

export default function CandidateCard({
  candidate,
  highlight = false,
  selected = false,
  onSelect,
  featuredMetrics = {},
  showAssessmentSubtitle = true,
  summary = false,
  actionLabel = ''
}) {
  const tone = getCandidateTone(candidate);
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = getCandidateChance(candidate);
  const hasCandidateScore = candidateScore > 0;
  const hasPartyScore = !hasCandidateScore && partyScore > 0;
  const visibleScore = hasCandidateScore ? candidateScore : partyScore;
  const isBlocked = candidate.isAlreadyChosen;
  const isFireFeatured = Boolean(featuredMetrics.chance || candidate.isChanceFeatured);
  const isViabilityComplete = chance >= 100;
  const systemScore = getCandidateSystemScore(candidate);
  const assessment = getAssessment({ isFireFeatured, isViabilityComplete, systemScore });
  const metricTone = isFireFeatured ? 'featured' : tone;
  const textFitStyle = {
    '--candidate-name-size': `${getSingleLineSize(name, { base: 20, lg: 17, md: 14.4, sm: 12.2, xs: 10.4, xxs: 9.2 })}px`,
    '--candidate-name-mobile-size': `${getSingleLineSize(name, { base: 18, lg: 15.2, md: 12.8, sm: 10.8, xs: 9.2, xxs: 8.2 })}px`,
    '--candidate-name-narrow-size': `${getSingleLineSize(name, { base: 16, lg: 13.6, md: 11.2, sm: 9.6, xs: 8.2, xxs: 7.4 })}px`,
    '--candidate-name-tiny-size': `${getSingleLineSize(name, { base: 15, lg: 12.6, md: 10.4, sm: 8.8, xs: 7.7, xxs: 7 })}px`,
    '--candidate-assessment-size': `${getSingleLineSize(assessment.label, { base: 10, lg: 9.4, md: 8.7, sm: 8, xs: 7.2, xxs: 6.6 })}px`,
    '--candidate-assessment-mobile-size': `${getSingleLineSize(assessment.label, { base: 8.4, lg: 8, md: 7.4, sm: 6.9, xs: 6.3, xxs: 5.9 })}px`
  };

  return (
    <button
      className={`prototype-candidate-card candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${isFireFeatured ? 'is-fire-featured' : ''} ${isViabilityComplete ? 'is-viability-complete' : ''} ${isBlocked ? 'is-blocked' : ''}`}
      style={textFitStyle}
      type="button"
      onClick={onSelect}
      title={summary ? `${actionLabel || 'Candidato selecionado'}: ${name}` : name}
      aria-pressed={selected}
      aria-disabled={candidate.isAlreadyChosen ? 'true' : undefined}
    >
      <span className="candidate-card__identity">
        <span className="candidate-card__name-row">
          <strong>{name}</strong>
          {!summary && (
            <span className={`candidate-card__action ${selected ? 'is-selected' : ''}`} aria-hidden="true">
              {selected ? '✓' : '+'}
            </span>
          )}
        </span>
        <small>{party}</small>
        {showAssessmentSubtitle && (
          <span className={`candidate-card__assessment candidate-card__assessment--${assessment.icon}`}>
            {assessment.icon === 'fire' && <ChanceFlame size={14} color="currentColor" />}
            {assessment.icon !== 'fire' && <i aria-hidden="true">{assessment.icon === 'error' ? '×' : '!'}</i>}
            <span>Nota {(hasCandidateScore || hasPartyScore) ? formatScore(visibleScore) : '--'} | {assessment.label}</span>
          </span>
        )}
      </span>

      <ViabilityMeter value={chance} tone={metricTone} featured={isFireFeatured} />
    </button>
  );
}
