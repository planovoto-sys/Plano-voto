import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { db } from '@/shared/firebase/firebase';
import { normalizeSearch } from '@/shared/utils/search';
import { normalizeStateCode } from '@/shared/utils/state';

const PUBLIC_CACHE_VERSION = 'v7';
const CACHE_PREFIX = `meuvoto:public-cache:${PUBLIC_CACHE_VERSION}`;
const CANDIDATE_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const CANDIDATE_CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const PARTY_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const PARTY_CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const TALLY_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const TALLY_CACHE_MAX_STALE_MS = 30 * 60 * 1000;
const STATE_CHOICE_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const STATE_CHOICE_CACHE_MAX_STALE_MS = 30 * 60 * 1000;
const CANDIDATES_COLLECTION = 'candidatos';
const PARTY_COLLECTION = 'partidos_politicos';
const PUBLIC_CANDIDATE_CHOICES_COLLECTION = 'publicCandidateChoices';
const memoryCache = new Map();
let storageAvailability = null;

const canUseStorage = () => {
  if (storageAvailability !== null) return storageAvailability;
  if (typeof window === 'undefined') {
    storageAvailability = false;
    return storageAvailability;
  }

  try {
    const testKey = `${CACHE_PREFIX}:storage-test`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageAvailability = true;
  } catch {
    storageAvailability = false;
  }

  return storageAvailability;
};

const makeCacheKey = (key) => `${CACHE_PREFIX}:${key}`;

const readCacheEntry = (key, { maxAgeMs, maxStaleMs }) => {
  const storageKey = makeCacheKey(key);
  const now = Date.now();
  const memoryEntry = memoryCache.get(storageKey);

  if (memoryEntry && now - memoryEntry.savedAt <= maxStaleMs) {
    return {
      value: memoryEntry.value,
      isFresh: now - memoryEntry.savedAt <= maxAgeMs
    };
  }

  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry?.savedAt || now - entry.savedAt > maxStaleMs) {
      window.localStorage.removeItem(storageKey);
      memoryCache.delete(storageKey);
      return null;
    }

    memoryCache.set(storageKey, entry);
    return {
      value: entry.value,
      isFresh: now - entry.savedAt <= maxAgeMs
    };
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Sem acao: cache local e apenas uma otimizacao.
    }
    memoryCache.delete(storageKey);
    return null;
  }
};

const writeCacheEntry = (key, value) => {
  const storageKey = makeCacheKey(key);
  const entry = {
    savedAt: Date.now(),
    value
  };

  memoryCache.set(storageKey, entry);

  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Se o armazenamento estiver cheio ou bloqueado, a memoria da sessao ainda ajuda.
  }
};

const removeCacheEntry = (key) => {
  const storageKey = makeCacheKey(key);
  memoryCache.delete(storageKey);

  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // O cache sera reconstruido na proxima leitura valida.
  }
};

const candidateCacheKey = (officeName) => `candidates:${officeName}`;
const partyCacheKey = () => 'party-scores';
const tallyCacheKey = (candidateId, estado = null) => `choice-counts:${ACTIVE_ELECTION_ID}:${normalizeStateCode(estado) || 'all'}:${candidateId}`;
const stateChoiceCacheKey = (estado) => `state-choice-counts:${ACTIVE_ELECTION_ID}:${normalizeStateCode(estado) || 'all'}`;

const normalizeLookupKey = (value) => (
  normalizeSearch(value).replace(/[^a-z0-9]+/g, '')
);

const readNumericValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
};

const getPartyScore = (party = {}) => readNumericValue(
  party.nota,
  party.nota_partido,
  party.notaPartido,
  party['Nota partido'],
  party.nota_final,
  party.notaFinal,
  party.score
);

const addPartyLookupEntry = (lookup, key, party) => {
  const normalizedKey = normalizeLookupKey(key);
  if (!normalizedKey || lookup.has(normalizedKey)) return;
  lookup.set(normalizedKey, party);
};

const buildPartyLookup = (parties) => {
  const lookup = new Map();

  parties.forEach((party) => {
    const normalizedParty = {
      ...party,
      nota: getPartyScore(party)
    };

    [
      party.id,
      party.sigla,
      party.Sigla,
      party.sigla_partido,
      party.siglaPartido,
      party.SiglaPartido,
      party.nome,
      party.Nome,
      party.partido,
      party.Partido
    ].forEach((key) => addPartyLookupEntry(lookup, key, normalizedParty));
  });

  return lookup;
};

const fetchPartyLookup = async () => {
  const cachedParties = readCacheEntry(partyCacheKey(), {
    maxAgeMs: PARTY_CACHE_MAX_AGE_MS,
    maxStaleMs: PARTY_CACHE_MAX_STALE_MS
  });

  if (cachedParties?.value?.length) {
    return buildPartyLookup(cachedParties.value);
  }

  try {
    const partySnapshot = await getDocs(collection(db, PARTY_COLLECTION));
    const parties = partySnapshot.docs.map((partyDoc) => ({
      id: partyDoc.id,
      ...partyDoc.data()
    }));

    writeCacheEntry(partyCacheKey(), parties);
    return buildPartyLookup(parties);
  } catch (error) {
    console.warn('Nao foi possivel carregar as notas dos partidos.', error);
    return new Map();
  }
};

const isIncomingCandidate = (candidate = {}) => (
  normalizeSearch(candidate.tipo ?? candidate.Tipo ?? '').includes('ingressante')
);

const getCandidatePartyScoreFromLookup = (candidate, partyLookup) => {
  const currentScore = readNumericValue(
    candidate.nota_partido,
    candidate.notaPartido,
    candidate['Nota partido'],
    candidate.partyScore,
    candidate.party_score,
    candidate.scorePartido,
    candidate.score_partido
  );

  if (currentScore !== null) return currentScore;

  const candidateKeys = [
    candidate.sigla_partido,
    candidate.siglaPartido,
    candidate.SiglaPartido,
    candidate['Sigla partido'],
    candidate['Sigla Partido'],
    candidate.partido,
    candidate.Partido,
    candidate.party,
    candidate.Party
  ];

  for (const key of candidateKeys) {
    const party = partyLookup.get(normalizeLookupKey(key));
    if (party?.nota !== null && party?.nota !== undefined) return party.nota;
  }

  return null;
};

const enrichCandidateWithPartyScore = (candidate, partyLookup) => {
  const incomingCandidate = isIncomingCandidate(candidate);
  const partyScore = getCandidatePartyScoreFromLookup(candidate, partyLookup);
  const baseCandidate = incomingCandidate
    ? {
        ...candidate,
        tipo: candidate.tipo ?? candidate.Tipo ?? 'ingressante',
        temNotaCandidato: false,
        tem_nota_candidato: false
      }
    : candidate;

  if (partyScore === null) return baseCandidate;

  const candidateWithPartyScore = {
    ...baseCandidate,
    nota_partido: partyScore,
    notaPartido: partyScore,
    party_score_source: candidate.party_score_source ?? 'partidos_politicos'
  };

  if (!incomingCandidate) return candidateWithPartyScore;

  return {
    ...candidateWithPartyScore,
    nota_final: partyScore,
    notaFinal: partyScore
  };
};

export const enrichCandidatesWithPartyScores = async (candidates = []) => {
  if (candidates.length === 0) return [];

  const partyLookup = await fetchPartyLookup();
  return candidates.map((candidate) => enrichCandidateWithPartyScore(candidate, partyLookup));
};

const getCandidateState = (candidate, fallbackEstado = null) => (
  normalizeStateCode(
    candidate?.state ??
    candidate?.estado ??
    candidate?.Estado ??
    candidate?.UF ??
    candidate?.uf ??
    candidate?.ufLimpa ??
    fallbackEstado
  )
);

const normalizeTallyTarget = (target, fallbackEstado = null) => {
  if (!target) return null;
  if (typeof target === 'string') {
    return {
      id: target,
      estado: normalizeStateCode(fallbackEstado)
    };
  }

  return {
    id: target.id,
    estado: getCandidateState(target, fallbackEstado)
  };
};

export const readCachedCandidatesByOffice = (officeName) => (
  readCacheEntry(candidateCacheKey(officeName), {
    maxAgeMs: CANDIDATE_CACHE_MAX_AGE_MS,
    maxStaleMs: CANDIDATE_CACHE_MAX_STALE_MS
  })
);

export const fetchCandidatesByOffice = async (officeName) => {
  const partyLookupPromise = fetchPartyLookup();
  const candidatesQuery = query(collection(db, CANDIDATES_COLLECTION), where('cargo', '==', officeName));
  let snapshot = await getDocs(candidatesQuery);

  if (snapshot.empty) {
    const legacyCandidatesQuery = query(collection(db, CANDIDATES_COLLECTION), where('Cargo', '==', officeName));
    snapshot = await getDocs(legacyCandidatesQuery);
  }

  const partyLookup = await partyLookupPromise;
  const candidates = snapshot.docs
    .map((candidateDoc) => ({
      id: candidateDoc.id,
      ...candidateDoc.data()
    }))
    .map((candidate) => enrichCandidateWithPartyScore(candidate, partyLookup));

  writeCacheEntry(candidateCacheKey(officeName), candidates);
  return candidates;
};

export const readCachedStateChoiceCounts = (states = []) => {
  const counts = new Map();

  states
    .map((state) => normalizeStateCode(state?.sigla ?? state?.id ?? state))
    .filter(Boolean)
    .forEach((stateCode) => {
      const cached = readCacheEntry(stateChoiceCacheKey(stateCode), {
        maxAgeMs: STATE_CHOICE_CACHE_MAX_AGE_MS,
        maxStaleMs: STATE_CHOICE_CACHE_MAX_STALE_MS
      });

      if (cached?.value) {
        counts.set(stateCode, {
          ...cached.value,
          isFresh: cached.isFresh
        });
      }
    });

  return counts;
};

export const fetchStateChoiceCounts = async (states = [], { forceRefresh = false } = {}) => {
  const stateCodes = [...new Set(
    states
      .map((state) => normalizeStateCode(state?.sigla ?? state?.id ?? state))
      .filter(Boolean)
  )];
  const counts = new Map();
  const statesToFetch = [];

  stateCodes.forEach((stateCode) => {
    const cached = readCacheEntry(stateChoiceCacheKey(stateCode), {
      maxAgeMs: STATE_CHOICE_CACHE_MAX_AGE_MS,
      maxStaleMs: STATE_CHOICE_CACHE_MAX_STALE_MS
    });

    if (cached?.value) {
      counts.set(stateCode, cached.value);
    }

    if (forceRefresh || !cached?.isFresh) {
      statesToFetch.push(stateCode);
    }
  });

  await Promise.all(statesToFetch.map(async (stateCode) => {
    const choicesQuery = query(
      collection(db, PUBLIC_CANDIDATE_CHOICES_COLLECTION),
      where('electionId', '==', ACTIVE_ELECTION_ID),
      where('state', '==', stateCode)
    );
    const countSnap = await getCountFromServer(choicesQuery);
    const activeVoters = Math.max(0, Number(countSnap.data().count) || 0);
    const data = {
      schema_version: 1,
      election_id: ACTIVE_ELECTION_ID,
      state: stateCode,
      active_voters: activeVoters
    };

    counts.set(stateCode, data);
    writeCacheEntry(stateChoiceCacheKey(stateCode), data);
  }));

  return counts;
};

export const readCachedTallies = (candidateTargets, { estado = null } = {}) => {
  const tallies = new Map();

  candidateTargets
    .map((target) => normalizeTallyTarget(target, estado))
    .filter((target) => target?.id)
    .forEach((target) => {
      const cached = readCacheEntry(tallyCacheKey(target.id, target.estado), {
        maxAgeMs: TALLY_CACHE_MAX_AGE_MS,
        maxStaleMs: TALLY_CACHE_MAX_STALE_MS
      });

      if (cached?.value) {
        tallies.set(target.id, cached.value);
      }
    });

  return tallies;
};

export const invalidateCandidateTalliesCache = (candidateTargets, { estado = null } = {}) => {
  candidateTargets
    .map((target) => normalizeTallyTarget(target, estado))
    .filter((target) => target?.id)
    .forEach((target) => {
      removeCacheEntry(tallyCacheKey(target.id, target.estado));
    });
};

export const fetchCandidateTallies = async (candidateTargets, { forceRefresh = false, estado = null } = {}) => {
  const targetsByKey = new Map();

  candidateTargets
    .map((target) => normalizeTallyTarget(target, estado))
    .filter((target) => target?.id)
    .forEach((target) => {
      const key = `${target.estado || 'all'}:${target.id}`;
      if (!targetsByKey.has(key)) targetsByKey.set(key, target);
    });

  const targets = [...targetsByKey.values()];
  const tallies = new Map();
  const targetsToFetch = [];

  targets.forEach((target) => {
    const cached = readCacheEntry(tallyCacheKey(target.id, target.estado), {
      maxAgeMs: TALLY_CACHE_MAX_AGE_MS,
      maxStaleMs: TALLY_CACHE_MAX_STALE_MS
    });

    if (cached?.value) {
      tallies.set(target.id, cached.value);
    }

    if (forceRefresh || !cached?.isFresh) {
      targetsToFetch.push(target);
    }
  });

  for (const target of targetsToFetch) {
    const constraints = [
      where('electionId', '==', ACTIVE_ELECTION_ID),
      where('candidateIds', 'array-contains', target.id)
    ];

    if (target.estado) {
      constraints.push(where('state', '==', target.estado));
    }

    const choicesQuery = query(
      collection(db, PUBLIC_CANDIDATE_CHOICES_COLLECTION),
      ...constraints
    );
    const countSnap = await getCountFromServer(choicesQuery);
    const activeSelections = Math.max(0, Number(countSnap.data().count) || 0);
    const data = {
      schema_version: 1,
      election_id: ACTIVE_ELECTION_ID,
      candidate_id: target.id,
      state: target.estado || null,
      active_selections: activeSelections
    };

    tallies.set(target.id, data);
    writeCacheEntry(tallyCacheKey(target.id, target.estado), data);
  }

  return tallies;
};
