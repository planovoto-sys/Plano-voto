const SCORE_FIELDS = ['Nota candidato', 'nota_candidato', 'notaCandidato'];
const PARTY_SCORE_FIELDS = ['Nota partido', 'nota_partido', 'notaPartido'];
const VOTE_FIELDS = [
  'votos_recebidos',
  'votosRecebidos',
  'votos_meuvoto',
  'votosMeuVoto',
  'intencao_votos',
  'intencaoVotos',
  'total_votes',
  'totalVotes'
];
const ELECTED_AVERAGE_FIELDS = [
  'media_votos_eleitos',
  'mediaVotosEleitos',
  'media_votos_eleitos_passados',
  'mediaVotosEleitosPassados',
  'media_eleitos',
  'mediaEleitos',
  'Media votos eleitos',
  'Média votos eleitos',
  'Media eleitos',
  'Média eleitos'
];

const DEFAULT_PROJECTION_AVERAGE_BY_OFFICE = {
  'Deputado Federal': 4,
  Senador: 4
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const parseMetricNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const cleaned = value
    .trim()
    .replace(/\s/g, '')
    .replace('%', '');

  if (!cleaned || cleaned === '-') return null;

  const numericText = cleaned.replace(/[^\d,.-]/g, '');
  if (!numericText || numericText === '-') return null;

  const hasComma = numericText.includes(',');
  const hasDot = numericText.includes('.');
  const normalized = hasComma && hasDot
    ? numericText.replace(/\./g, '').replace(',', '.')
    : hasDot && /^\d{1,3}(\.\d{3})+$/.test(numericText)
      ? numericText.replace(/\./g, '')
      : numericText.replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstValidNumber = (source, fields) => {
  for (const field of fields) {
    const parsed = parseMetricNumber(source?.[field]);
    if (parsed !== null) return parsed;
  }

  return null;
};

const readConfiguredAverage = (cargo) => {
  const env = import.meta.env || {};
  const envKey = cargo === 'Senador'
    ? 'VITE_PROJECTION_AVG_SENADOR'
    : cargo === 'Deputado Federal'
      ? 'VITE_PROJECTION_AVG_DEPUTADO_FEDERAL'
      : 'VITE_PROJECTION_AVG_DEFAULT';

  return parseMetricNumber(env[envKey]);
};

export const getCandidateScore = (candidate) => {
  const candidateScore = firstValidNumber(candidate, SCORE_FIELDS);
  const hasCandidateScore = candidateScore !== null && candidateScore !== 0;
  const partyScore = firstValidNumber(candidate, PARTY_SCORE_FIELDS);
  const score = hasCandidateScore ? candidateScore : partyScore;

  return {
    score: score ?? 0,
    hasCandidateScore
  };
};

export const getCandidateProjection = (candidate, cargo) => {
  const votes = firstValidNumber(candidate, VOTE_FIELDS) ?? 0;
  const candidateBaseline = firstValidNumber(candidate, ELECTED_AVERAGE_FIELDS);
  const configuredBaseline = readConfiguredAverage(cargo);
  const fallbackBaseline = DEFAULT_PROJECTION_AVERAGE_BY_OFFICE[cargo]
    ?? DEFAULT_PROJECTION_AVERAGE_BY_OFFICE['Deputado Federal'];
  const baseline = candidateBaseline ?? configuredBaseline ?? fallbackBaseline;
  const baselineSource = candidateBaseline !== null
    ? 'candidate'
    : configuredBaseline !== null
      ? 'env'
      : 'fallback';

  const hasReliableBaseline = baseline !== null && baseline > 0;
  const rawPercent = hasReliableBaseline ? (votes / baseline) * 100 : 0;
  const percent = clamp(rawPercent, 0, 100);

  return {
    votes,
    baseline: hasReliableBaseline ? baseline : 0,
    percent,
    displayPercent: Math.round(percent),
    isCapped: rawPercent > 100,
    isReliable: hasReliableBaseline && baselineSource !== 'fallback',
    baselineSource
  };
};
