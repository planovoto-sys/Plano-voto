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

function MetricCircle({ label, value, tone, featured = false }) {
  const numericValue = Number(String(value).replace(',', '.')) || 0;
  const maxValue = label === 'Chance' ? 100 : 10;
  const progress = Math.max(0, Math.min(100, (numericValue / maxValue) * 100));

  return (
    <span
      className={`metric-badge ${featured ? 'metric-badge--featured' : ''}`}
      style={{ '--metric-progress': progress }}
    >
      <span className={`metric-circle metric-circle--${tone} ${featured ? 'metric-circle--featured' : ''}`}>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      {featured && (
        <ChanceFlame
          className="metric-badge__flame"
          color="var(--metric-feature-color)"
          size={32}
        />
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

export default function CandidateCard({
  candidate,
  highlight = false,
  selected = false,
  onSelect,
  featuredMetrics = {},
  showAssessmentSubtitle = false,
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
  const visibleScoreLabel = hasCandidateScore ? 'Nota' : 'Partido';
  const isBlocked = candidate.isAlreadyChosen;
  const isFireFeatured = Boolean(featuredMetrics.chance);
  const isChanceComplete = chance >= 100;
  const systemScore = getCandidateSystemScore(candidate);
  const assessmentSubtitle = (() => {
    if (!showAssessmentSubtitle) return '';
    if (isChanceComplete) return 'Grandes chances, não precisa de mais voto';
    if (isFireFeatured && systemScore >= 7) return 'Candidato Bem avaliado com maior Chance';
    if (systemScore >= 7) return 'Candidato Bem avaliado';
    if (systemScore > 0 && systemScore < 7) return 'Candidato Mal Avaliado';
    return '';
  })();
  const textFitStyle = {
    '--candidate-name-size': `${getSingleLineSize(name, { base: 20, lg: 15.5, md: 12.8, sm: 10.8, xs: 8.8, xxs: 7.6 })}px`,
    '--candidate-name-mobile-size': `${getSingleLineSize(name, { base: 16, lg: 12.8, md: 10.2, sm: 8.7, xs: 7.6, xxs: 6.9 })}px`,
    '--candidate-name-narrow-size': `${getSingleLineSize(name, { base: 14, lg: 11.4, md: 9.2, sm: 7.8, xs: 6.9, xxs: 6.3 })}px`,
    '--candidate-name-tiny-size': `${getSingleLineSize(name, { base: 13.4, lg: 10.8, md: 8.6, sm: 7.2, xs: 6.4, xxs: 5.9 })}px`,
    '--candidate-assessment-size': `${getSingleLineSize(assessmentSubtitle, { base: 10, lg: 9, md: 8.2, sm: 7.5, xs: 6.8, xxs: 6.2 })}px`,
    '--candidate-assessment-mobile-size': `${getSingleLineSize(assessmentSubtitle, { base: 8.4, lg: 7.8, md: 7.2, sm: 6.7, xs: 6.1, xxs: 5.8 })}px`
  };

  return (
    <button
      className={`prototype-candidate-card candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${isFireFeatured ? 'is-fire-featured' : ''} ${isChanceComplete ? 'is-chance-complete' : ''} ${isBlocked ? 'is-blocked' : ''}`}
      style={textFitStyle}
      type="button"
      onClick={onSelect}
      title={summary ? `${actionLabel || 'Candidato selecionado'}: ${name}` : name}
      aria-pressed={selected}
      aria-disabled={candidate.isAlreadyChosen ? 'true' : undefined}
    >
      <span className="candidate-card__identity">
        {highlight && <span className="candidate-card__badge">Destaque</span>}
        {summary && actionLabel && <span className="candidate-card__badge candidate-card__badge--action">{actionLabel}</span>}
        {!highlight && !hasCandidateScore && !candidate.isAlreadyChosen && <span className="candidate-card__badge candidate-card__badge--new">Sem nota</span>}
        {candidate.isAlreadyChosen && <span className="candidate-card__badge candidate-card__badge--neutral">Já escolhido</span>}
        <span className="candidate-card__name-row">
          <strong>{name}</strong>
        </span>
        <small>{party}</small>
        {assessmentSubtitle && (
          <span className="candidate-card__assessment">{assessmentSubtitle}</span>
        )}
      </span>

      <span className="candidate-card__metrics">
        <MetricCircle label={hasPartyScore ? visibleScoreLabel : 'Nota'} value={(hasCandidateScore || hasPartyScore) ? formatScore(visibleScore) : '--'} tone={tone} />
        <MetricCircle label="Chance" value={chance} tone={tone} featured={featuredMetrics.chance} />
      </span>
    </button>
  );
}
