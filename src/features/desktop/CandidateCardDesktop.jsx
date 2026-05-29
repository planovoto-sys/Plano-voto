import { Lock, Smartphone } from 'lucide-react';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import {
  formatScore,
  getCandidateChance,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

const getCandidateNumber = (candidate = {}) => String(candidate.Numero ?? candidate.numero ?? candidate.number ?? '').trim();

const getTone = ({ featured, score, chance, locked }) => {
  if (locked) return 'locked';
  if (featured) return 'featured';
  if (chance >= 100) return 'complete';
  if (score > 0 && score < 7) return 'danger';
  if (score >= 7) return 'success';
  return 'neutral';
};

const getBadge = ({ featured, score, chance, locked }) => {
  if (locked) return 'Disponível no celular';
  if (featured && score > 7) return 'Mais viável';
  if (chance >= 100) return 'Meta atingida';
  if (score > 0 && score < 7) return 'Nota baixa';
  if (score >= 7) return 'Interessante';
  return 'Prévia';
};

function ScoreChip({ label, value }) {
  const display = Number(value) > 0 ? formatScore(value) : '--';
  return (
    <span className="desktop-candidate-card__score" aria-label={`${label}: ${display}`}>
      {display}
    </span>
  );
}

export default function CandidateCardDesktop({
  candidate,
  selected = false,
  featured = false,
  locked = false,
  disabled = false,
  actionLabel = 'Escolher',
  onSelect
}) {
  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const number = getCandidateNumber(candidate);
  const candidateScore = getCandidateDisplayScore(candidate);
  const partyScore = getCandidatePartyScore(candidate);
  const chance = locked ? 0 : getCandidateChance(candidate);
  const score = getCandidateSystemScore(candidate);
  const tone = getTone({ featured, score, chance, locked });
  const badge = getBadge({ featured, score, chance, locked });
  const progress = Math.max(0, Math.min(100, Math.round(chance)));

  return (
    <article className={`desktop-candidate-card desktop-candidate-card--${tone} ${selected ? 'is-selected' : ''}`}>
      <button
        className="desktop-candidate-card__button nv-touch"
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
      >
        <span className="desktop-candidate-card__main">
          <span className="desktop-candidate-card__scores" aria-hidden="true">
            <ScoreChip label="Nota do candidato" value={candidateScore} />
            <ScoreChip label="Nota do partido" value={partyScore} />
          </span>

          <span className="desktop-candidate-card__identity">
            {number && <small>{number}</small>}
            <strong>{name}</strong>
            {party && <span>{party}</span>}
          </span>

          <span className="desktop-candidate-card__status">
            {featured ? <ChanceFlame size={24} /> : (locked ? <Lock aria-hidden="true" /> : <Smartphone aria-hidden="true" />)}
          </span>
        </span>

        <span className="desktop-candidate-card__meter" aria-hidden="true">
          <i style={{ '--desktop-candidate-progress': `${progress}%` }} />
        </span>

        <span className="desktop-candidate-card__footer">
          <span>Prévia no computador</span>
          <strong>{locked ? badge : `Viabilidade: ${progress}%`}</strong>
          <em>{selected ? 'Selecionado' : actionLabel}</em>
        </span>
      </button>
    </article>
  );
}
