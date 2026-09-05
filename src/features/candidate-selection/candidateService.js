import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { STATE_NAMES } from '@/shared/constants/states';
import { db } from '@/shared/firebase/firebase';
import { getSupabaseClient } from '@/shared/supabase/client';
import { normalizeSearch } from '@/shared/utils/search';
import { normalizeStateCode } from '@/shared/utils/state';

const defaultCandidateProvider = (
  String(import.meta.env.VITE_AUTH_PROVIDER || '').trim().toLowerCase() === 'supabase'
  || Boolean(import.meta.env.VITE_SUPABASE_URL)
)
  ? 'supabase'
  : 'firebase';
const configuredCandidateProvider = String(import.meta.env.VITE_CANDIDATE_PROVIDER || defaultCandidateProvider)
  .trim()
  .toLowerCase();
const usesSupabaseCandidates = configuredCandidateProvider === 'supabase';
const SUPABASE_PAGE_SIZE = 1000;
// O provedor e a eleicao fazem parte do namespace para impedir que IDs legados
// do Firebase sejam reaproveitados depois da migracao para o Supabase.
const PUBLIC_CACHE_VERSION = 'v13';
const CACHE_PREFIX = `meuvoto:public-cache:${configuredCandidateProvider}:${ACTIVE_ELECTION_ID}:${PUBLIC_CACHE_VERSION}`;
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

const candidateCacheKey = (officeName, estado = null) => (
  `candidates:${officeName}:${normalizeStateCode(estado) || 'all'}`
);
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
      ...(party.legacy_data || {}),
      sigla: party.acronym || party.sigla,
      nome: party.name || party.nome,
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
    let parties;
    if (usesSupabaseCandidates) {
      const { data, error } = await getSupabaseClient()
        .from('parties')
        .select('id, acronym, name, score, legacy_data')
        .eq('public_visible', true)
        .order('acronym');
      if (error) throw error;
      parties = data || [];
    } else {
      const partySnapshot = await getDocs(collection(db, PARTY_COLLECTION));
      parties = partySnapshot.docs.map((partyDoc) => ({
        id: partyDoc.id,
        ...partyDoc.data()
      }));
    }

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

  if (!incomingCandidate && candidateWithPartyScore.temNotaCandidato !== false) {
    return candidateWithPartyScore;
  }

  return {
    ...candidateWithPartyScore,
    nota_final: partyScore,
    notaFinal: partyScore
  };
};

const mapSupabaseCandidateRow = (row) => {
  const legacyData = row.legacy_data || {};
  const candidateScore = readNumericValue(row.scores?.candidate);
  const partyAcronym = row.party_id || legacyData.partido_sigla || '';

  return {
    ...legacyData,
    id: row.id,
    nome: row.name,
    cargo: row.office,
    uf: row.state,
    estado: STATE_NAMES[row.state]?.toUpperCase() || row.state,
    partido: legacyData.partido_nome || partyAcronym,
    partido_sigla: partyAcronym,
    sigla_partido: partyAcronym,
    numero: row.number,
    numero_candidato: row.number,
    imagem: row.image_url || legacyData.imagem || '',
    scores: row.scores || {},
    nota_candidato: candidateScore,
    notaCandidato: candidateScore,
    temNotaCandidato: candidateScore !== null,
    tem_nota_candidato: candidateScore !== null,
    nota_final: candidateScore,
    notaFinal: candidateScore,
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

export const readCachedCandidatesByOffice = (officeName, estado = null) => (
  readCacheEntry(candidateCacheKey(officeName, estado), {
    maxAgeMs: CANDIDATE_CACHE_MAX_AGE_MS,
    maxStaleMs: CANDIDATE_CACHE_MAX_STALE_MS
  })
);

export const fetchCandidatesByOffice = async (officeName, estado = null) => {
  const partyLookupPromise = fetchPartyLookup();
  const activeState = normalizeStateCode(estado);
  const storedState = STATE_NAMES[activeState]?.toUpperCase() || activeState;
  let candidateDocs = [];

  if (usesSupabaseCandidates) {
    const supabase = getSupabaseClient();
    const rows = [];

    for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
      let request = supabase
        .from('candidates')
        .select('id, name, office, state, party_id, number, slug, image_url, scores, legacy_data')
        .eq('election_id', ACTIVE_ELECTION_ID)
        .eq('office', officeName)
        .eq('public_visible', true)
        .order('name')
        .range(offset, offset + SUPABASE_PAGE_SIZE - 1);

      if (activeState) request = request.eq('state', activeState);

      const { data, error } = await request;
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < SUPABASE_PAGE_SIZE) break;
    }

    const partyLookup = await partyLookupPromise;
    const candidates = rows
      .map(mapSupabaseCandidateRow)
      .map((candidate) => enrichCandidateWithPartyScore(candidate, partyLookup));

    writeCacheEntry(candidateCacheKey(officeName, activeState), candidates);
    return candidates;
  }

  if (activeState) {
    const stateQueries = [
      query(
        collection(db, CANDIDATES_COLLECTION),
        where('cargo', '==', officeName),
        where('estado', '==', storedState)
      ),
      query(
        collection(db, CANDIDATES_COLLECTION),
        where('Cargo', '==', officeName),
        where('Estado', '==', storedState)
      )
    ];

    const stateSnapshots = await Promise.all(stateQueries.map((candidateQuery) => getDocs(candidateQuery)));
    const uniqueDocs = new Map();
    stateSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((candidateDoc) => uniqueDocs.set(candidateDoc.id, candidateDoc));
    });
    candidateDocs = [...uniqueDocs.values()];
  }

  if (candidateDocs.length === 0) {
    const candidatesQuery = query(collection(db, CANDIDATES_COLLECTION), where('cargo', '==', officeName));
    let snapshot = await getDocs(candidatesQuery);

    if (snapshot.empty) {
      const legacyCandidatesQuery = query(collection(db, CANDIDATES_COLLECTION), where('Cargo', '==', officeName));
      snapshot = await getDocs(legacyCandidatesQuery);
    }
    candidateDocs = snapshot.docs;
  }

  const partyLookup = await partyLookupPromise;
  const candidates = candidateDocs
    .map((candidateDoc) => ({
      id: candidateDoc.id,
      ...candidateDoc.data()
    }))
    .map((candidate) => enrichCandidateWithPartyScore(candidate, partyLookup));

  writeCacheEntry(candidateCacheKey(officeName, activeState), candidates);
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

  if (usesSupabaseCandidates && statesToFetch.length > 0) {
    const { data, error } = await getSupabaseClient()
      .from('state_choice_metrics')
      .select('state, user_count')
      .eq('election_id', ACTIVE_ELECTION_ID)
      .in('state', statesToFetch);
    if (error) throw error;

    const rowsByState = new Map((data || []).map((row) => [row.state, row]));
    statesToFetch.forEach((stateCode) => {
      const activeVoters = Math.max(0, Number(rowsByState.get(stateCode)?.user_count) || 0);
      const metric = {
        schema_version: 1,
        election_id: ACTIVE_ELECTION_ID,
        state: stateCode,
        active_voters: activeVoters,
      };
      counts.set(stateCode, metric);
      writeCacheEntry(stateChoiceCacheKey(stateCode), metric);
    });
    return counts;
  }

  await Promise.all(statesToFetch.map(async (stateCode) => {
    const metricSnap = await getDoc(doc(
      db,
      'elections',
      ACTIVE_ELECTION_ID,
      'state_choice_metrics',
      stateCode
    ));
    const activeVoters = Math.max(0, Number(metricSnap.data()?.active_voters) || 0);
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

export const invalidateStateChoiceCountsCache = (states = []) => {
  const stateList = Array.isArray(states) ? states : [states];

  stateList
    .map((state) => normalizeStateCode(state?.sigla ?? state?.id ?? state))
    .filter(Boolean)
    .forEach((stateCode) => {
      removeCacheEntry(stateChoiceCacheKey(stateCode));
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

  if (usesSupabaseCandidates && targetsToFetch.length > 0) {
    const supabase = getSupabaseClient();
    const targetStates = [...new Set(targetsToFetch.map((target) => target.estado).filter(Boolean))];
    const recommendationRows = [];
    // Presidente é sempre BR, independentemente da UF de quem o selecionou.
    for (const scope of [...new Set([...targetStates, 'BR'])]) {
      for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabase
          .from('candidate_recommendation_metrics')
          .select('candidate_id, indication_count, indication_limit, active_selections')
          .eq('election_id', ACTIVE_ELECTION_ID)
          .eq('scope', scope)
          .order('candidate_id')
          .range(offset, offset + SUPABASE_PAGE_SIZE - 1);
        if (error) throw error;
        recommendationRows.push(...(data || []));
        if (!data || data.length < SUPABASE_PAGE_SIZE) break;
      }
    }
    const unscopedIds = [...new Set(targetsToFetch.filter((target) => !target.estado).map((target) => target.id))];
    for (let offset = 0; offset < unscopedIds.length; offset += 25) {
      const { data, error } = await supabase
        .from('candidate_recommendation_metrics')
        .select('candidate_id, indication_count, indication_limit, active_selections')
        .eq('election_id', ACTIVE_ELECTION_ID)
        .in('candidate_id', unscopedIds.slice(offset, offset + 25));
      if (error) throw error;
      recommendationRows.push(...(data || []));
    }
    const recommendationsById = new Map(recommendationRows.map((row) => [row.candidate_id, row]));

    targetsToFetch.forEach((target) => {
      const activeSelections = Math.max(0, Number(recommendationsById.get(target.id)?.active_selections) || 0);
      const tally = {
        schema_version: 1,
        election_id: ACTIVE_ELECTION_ID,
        candidate_id: target.id,
        state: target.estado || null,
        active_selections: activeSelections,
        indication_count: Number(recommendationsById.get(target.id)?.indication_count || 0),
        indication_limit: Number(recommendationsById.get(target.id)?.indication_limit) || null,
      };
      tallies.set(target.id, tally);
      writeCacheEntry(tallyCacheKey(target.id, target.estado), tally);
    });
    return tallies;
  }

  for (const target of targetsToFetch) {
    let activeSelections = 0;
    if (target.estado) {
      const tallySnap = await getDoc(doc(
        db,
        'elections',
        ACTIVE_ELECTION_ID,
        'selection_tallies',
        `${target.estado}__${target.id}`
      ));
      activeSelections = Math.max(0, Number(tallySnap.data()?.active_selections) || 0);
    } else {
      const tallyQuery = query(
        collection(db, 'elections', ACTIVE_ELECTION_ID, 'selection_tallies'),
        where('candidate_id', '==', target.id)
      );
      const tallySnapshot = await getDocs(tallyQuery);
      activeSelections = tallySnapshot.docs.reduce(
        (total, tallyDoc) => total + Math.max(0, Number(tallyDoc.data()?.active_selections) || 0),
        0
      );
    }
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
