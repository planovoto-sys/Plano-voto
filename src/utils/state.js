import { BRAZILIAN_STATES } from '@/constants/states';

const stateByNormalizedName = new Map(
  BRAZILIAN_STATES.map((state) => [
    state.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\u00A0]+/g, '')
      .toUpperCase(),
    state.sigla
  ])
);

const validStateCodes = new Set(BRAZILIAN_STATES.map((state) => state.sigla));

const candidateStateFieldNames = [
  'Estado',
  'estado',
  'UF',
  'uf',
  'Uf',
  'Sigla',
  'sigla',
  'Estado Sigla',
  'estado_sigla',
  'Estado_sigla',
  'estadoUf',
  'estado_uf',
  'state',
  'State'
];

export const normalizeStateCode = (value) => {
  const normalizedValue = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\u00A0]+/g, '')
    .toUpperCase();

  if (!normalizedValue) return '';
  if (normalizedValue === 'TODOS') return 'TODOS';
  if (validStateCodes.has(normalizedValue)) return normalizedValue;

  return stateByNormalizedName.get(normalizedValue) || normalizedValue;
};

export const isValidStateCode = (value) => validStateCodes.has(normalizeStateCode(value));

export const getCandidateStateCode = (candidate = {}, { allowPartyFallback = false } = {}) => {
  for (const fieldName of candidateStateFieldNames) {
    const stateCode = normalizeStateCode(candidate[fieldName]);

    if (stateCode === 'TODOS' || validStateCodes.has(stateCode)) {
      return stateCode;
    }
  }

  if (allowPartyFallback) {
    const partyStateCode = normalizeStateCode(candidate.Partido || candidate.partido);
    if (validStateCodes.has(partyStateCode)) return partyStateCode;
  }

  return '';
};
