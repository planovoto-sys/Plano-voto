const PARTY_NAME_CONNECTORS = new Set(['DA', 'DAS', 'DE', 'DO', 'DOS', 'E']);

const getIdentityTokens = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .match(/[A-Z0-9]+/g) || [];

export const normalizePartyIdentity = (value) => getIdentityTokens(value)
  .join('')
  .toLowerCase();

export const getPartyIdentityKeys = (value) => {
  const tokens = getIdentityTokens(value);
  if (tokens.length === 0) return [];

  const keys = new Set([tokens.join('').toLowerCase()]);
  const withoutPartyPrefix = tokens[0] === 'PARTIDO' ? tokens.slice(1) : tokens;

  if (withoutPartyPrefix.length > 0) {
    keys.add(withoutPartyPrefix.join('').toLowerCase());
  }

  const significantTokens = tokens.filter((token) => !PARTY_NAME_CONNECTORS.has(token));
  if (significantTokens.length > 1) {
    keys.add(significantTokens.map((token) => token[0]).join('').toLowerCase());
  }

  const acronymWithConnectors = tokens
    .map((token) => (PARTY_NAME_CONNECTORS.has(token) ? token : token[0]))
    .join('')
    .toLowerCase();
  if (acronymWithConnectors.length > 1) keys.add(acronymWithConnectors);

  return [...keys].filter(Boolean);
};

export const getPartyNumberKey = (value) => {
  const normalized = normalizePartyIdentity(value);
  return /^\d+$/.test(normalized) ? `party-number:${normalized}` : '';
};
