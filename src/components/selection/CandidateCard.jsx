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

function ViabilityMeter({ value, tone, featured = false, locked = false, onLockedClick }) {
  const numericValue = Number(value) || 0;
  const progress = Math.max(0, Math.min(100, numericValue));
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
      className={`candidate-viability candidate-viability--${tone} ${featured ? 'candidate-viability--featured' : ''} ${locked ? 'is-locked' : ''}`}
      style={{ '--metric-progress': progress }}
      role={locked ? 'button' : undefined}
      tabIndex={locked ? 0 : undefined}
      aria-label={locked ? 'Campo de viabilidade bloqueado' : undefined}
      onClick={handleLockedClick}
      onKeyDown={handleLockedKeyDown}
    >
      <span className="candidate-viability__circle">
        <strong>{numericValue}<small>%</small></strong>
        <span>viável</span>
      </span>
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
    return { label: 'Mais viável', icon: 'fire' };
  }

  if (systemScore >= 7) {
    if (isViabilityComplete) {
      return { label: 'Não precisa de mais votos', icon: 'info' };
    }

    return { label: 'Precisa de mais votos', icon: 'info' };
  }

  if (systemScore > 0 && systemScore < 7) {
    return { label: 'Mal avaliado', icon: systemScore < 6 ? 'error' : 'info' };
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
  actionLabel = '',
  disabled = false,
  lockPersonalizedFields = false,
  onLockedMetricClick
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
  const metaParts = [party, number ? `Nº ${number}` : ''].filter(Boolean);

  return (
    <button
      className={`prototype-candidate-card nv-touch nv-no-overflow candidate-card--${tone} ${highlight ? 'is-highlight' : ''} ${selected ? 'is-selected' : ''} ${summary ? 'is-summary' : ''} ${isFireFeatured ? 'is-fire-featured' : ''} ${isViabilityComplete ? 'is-viability-complete' : ''} ${isBlocked ? 'is-blocked' : ''}`}
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
        <span className="candidate-card__name-row">
          <strong>{name}</strong>
          {!summary && !lockPersonalizedFields && (
            <span className={`candidate-card__action ${selected ? 'is-selected' : ''}`} aria-hidden="true">
              {selected ? '✓' : '+'}
            </span>
          )}
        </span>
        <small>{metaParts.join(' / ')}</small>
        {showAssessmentSubtitle && lockPersonalizedFields ? (
          <span
            className="candidate-card__locked-insight"
            onClick={handleLockedFieldClick}
          >
            <strong>Indicadores disponíveis após login 🔒</strong>
            <span>Entre para ver nota, viabilidade e análise personalizada.</span>
          </span>
        ) : showAssessmentSubtitle && (
          <span className={`candidate-card__assessment candidate-card__assessment--${assessment.icon}`}>
            <i className="candidate-card__assessment-icon" aria-hidden="true">
              {assessment.icon === 'fire'
                ? <ChanceFlame size={13} color="currentColor" />
                : (assessment.icon === 'error' ? 'X' : '!')}
            </i>
            <span>Nota {(hasCandidateScore || hasPartyScore) ? formatScore(visibleScore) : '--'} | {assessment.label}</span>
          </span>
        )}
      </span>

      {summary ? (
        <ViabilityMeter
          value={chance}
          tone={metricTone}
          featured={isFireFeatured}
          locked={false}
          onLockedClick={onLockedMetricClick}
        />
      ) : lockPersonalizedFields ? (
        <span className={`candidate-card__action ${selected ? 'is-selected' : ''}`} aria-hidden="true">
          {selected ? '✓' : '+'}
        </span>
      ) : (
        <ViabilityMeter
          value={chance}
          tone={metricTone}
          featured={isFireFeatured}
          locked={false}
          onLockedClick={onLockedMetricClick}
        />
      )}
    </button>
  );
}
