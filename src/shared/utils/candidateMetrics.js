import { getViabilityTarget } from '@/shared/constants/candidates';

export const parseNumeric = (...values) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return 0;
};

export const calculateCandidateChance = (selectedByUsers, viabilityTarget) => {
  if (!Number.isFinite(viabilityTarget) || viabilityTarget <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((selectedByUsers / viabilityTarget) * 100)));
};

export const formatScore = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : '0,00';
};

export const getCandidateName = (candidate = {}) => candidate.Nome || candidate.nome || '';
export const getCandidateParty = (candidate = {}) => (
  candidate.Partido ||
  candidate.partido ||
  candidate.sigla_partido ||
  candidate.siglaPartido ||
  candidate.SiglaPartido ||
  candidate['Sigla partido'] ||
  candidate['Sigla Partido'] ||
  ''
);

export const getCandidateSystemScore = (candidate = {}) => {
  const value = candidate.notaFinal ?? candidate.nota_final ?? candidate.notaCandidato ?? candidate.nota_candidato ?? candidate['Nota candidato'] ?? candidate.notaPartido ?? candidate.nota_partido ?? candidate['Nota partido'] ?? 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const getCandidateDisplayScore = (candidate = {}) => {
  if (candidate.temNotaCandidato === false) return 0;

  const value = candidate['Nota candidato'] ?? candidate.notaCandidato ?? candidate.nota_candidato ?? candidate.notaFinal ?? candidate.nota_final ?? 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const getCandidatePartyScore = (candidate = {}) => {
  const value = candidate.notaPartido ?? candidate.nota_partido ?? candidate['Nota partido'] ?? candidate.partyScore ?? candidate.party_score ?? candidate.scorePartido ?? candidate.score_partido ?? (
    candidate.temNotaCandidato === false ? candidate.notaFinal ?? candidate.nota_final : 0
  );
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const getCandidateScore = (candidate = {}) => {
  if (!candidate) return 0;

  if (candidate.temNotaCandidato !== false) {
    const candidateScore = candidate.nota_final ?? candidate.notaFinal ?? candidate.notaCandidato ?? candidate.nota_candidato ?? candidate['Nota candidato'];
    const numericCandidateScore = Number(candidateScore);

    if (Number.isFinite(numericCandidateScore) && numericCandidateScore !== 0) {
      return numericCandidateScore;
    }
  }

  return getCandidatePartyScore(candidate);
};

export const getCandidateChance = (candidate = {}) => {
  const rawSelectedByUsers = (
    candidate.active_selections ??
    candidate.total_active_selections ??
    candidate.selected_by_users ??
    candidate.selectedByUsers
  );
  const selectedByUsers = Number(rawSelectedByUsers);
  const configuredTarget = getViabilityTarget(
    candidate.cargo ?? candidate.Cargo ?? candidate.office,
    candidate.estado ?? candidate.Estado ?? candidate.UF ?? candidate.uf ?? candidate.state
  );

  if (rawSelectedByUsers !== undefined && rawSelectedByUsers !== null && Number.isFinite(selectedByUsers) && configuredTarget) {
    return calculateCandidateChance(selectedByUsers, configuredTarget);
  }

  const directValue = candidate.chance ?? candidate.Chance ?? candidate['Chance eleição'] ?? candidate['Chance de eleição'];
  const directNumeric = Number(directValue);
  if (Number.isFinite(directNumeric)) {
    return Math.max(0, Math.min(100, Math.round(directNumeric)));
  }

  const storedTarget = Number(
    candidate.viability_target ?? candidate.viabilityTarget ??
    candidate.average_elected_votes ?? candidate.averageElectedVotes
  );
  if (!Number.isFinite(selectedByUsers) || !Number.isFinite(storedTarget) || storedTarget <= 0) return 0;
  return calculateCandidateChance(selectedByUsers, storedTarget);
};

export const getCandidateTone = (candidate, fallback = 'neutral') => {
  if (!candidate) return fallback;

  const score = getCandidateSystemScore(candidate);
  const chance = getCandidateChance(candidate);

  if (candidate.isAlreadyChosen) return 'neutral';
  if (score > 0 && score < 7) return 'danger';
  if (chance >= 100) return 'neutral';
  if (score <= 0) return 'new';
  return 'success';
};

export const getCandidateScoreTone = (candidate, fallback = 'neutral') => {
  if (!candidate) return fallback;
  if (getCandidateScore(candidate) <= 0) return 'new';
  if (getCandidateScore(candidate) < 7) return 'danger';
  if (getCandidateChance(candidate) >= 100) return 'neutral';
  return 'success';
};

export const getDisplayCandidate = (candidate, fallbackName, defaultNumber) => ({
  numero: candidate?.numero || candidate?.Numero || defaultNumber,
  nome: candidate?.nome || candidate?.Nome || fallbackName,
  partido: candidate?.partido || candidate?.Partido || candidate?.sigla_partido || 'PARTIDO',
  nota: getCandidateScore(candidate),
  chance: getCandidateChance(candidate)
});
