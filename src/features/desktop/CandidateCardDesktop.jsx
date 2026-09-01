import { Lock, Smartphone } from 'lucide-react';
import {
  formatScore,
  getCandidateDisplayScore,
  getCandidateName,
  getCandidateParty,
  getCandidatePartyScore,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

const getCandidateNumber = (candidate = {}) => String(candidate.Numero ?? candidate.numero ?? candidate.number ?? '').trim();

const getTone = ({ score, locked }) => {
  if (locked) return 'locked';
  if (score > 0 && score < 7) return 'danger';
  if (score >= 7) return 'success';
  return 'neutral';
};

const getBadge = ({ score, locked }) => {
  if (locked) return 'Disponível no celular';
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
  const score = getCandidateSystemScore(candidate);
  const tone = getTone({ score, locked });
  const badge = getBadge({ score, locked });

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
            {locked ? <Lock aria-hidden="true" /> : <Smartphone aria-hidden="true" />}
          </span>
        </span>

        <span className="desktop-candidate-card__footer">
          <span>Prévia no computador</span>
          <strong>{badge}</strong>
          <em>{selected ? 'Selecionado' : actionLabel}</em>
        </span>
      </button>
    </article>
  );
}
