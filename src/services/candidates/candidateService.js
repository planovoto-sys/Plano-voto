import {
  collection,
  documentId,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ACTIVE_ELECTION_ID } from '@/constants/ballot';
import { db } from '@/services/firebase/firebase';

const PUBLIC_CACHE_VERSION = 'v1';
const CACHE_PREFIX = `meuvoto:public-cache:${PUBLIC_CACHE_VERSION}`;
const CANDIDATE_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const CANDIDATE_CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const TALLY_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const TALLY_CACHE_MAX_STALE_MS = 30 * 60 * 1000;
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

const candidateCacheKey = (officeName) => `candidates:${officeName}`;
const tallyCacheKey = (candidateId) => `tallies:${ACTIVE_ELECTION_ID}:${candidateId}`;

export const readCachedCandidatesByOffice = (officeName) => (
  readCacheEntry(candidateCacheKey(officeName), {
    maxAgeMs: CANDIDATE_CACHE_MAX_AGE_MS,
    maxStaleMs: CANDIDATE_CACHE_MAX_STALE_MS
  })
);

export const fetchCandidatesByOffice = async (officeName) => {
  const candidatesQuery = query(collection(db, 'candidatos'), where('Cargo', '==', officeName));
  const snapshot = await getDocs(candidatesQuery);
  const candidates = snapshot.docs.map((candidateDoc) => ({
    id: candidateDoc.id,
    ...candidateDoc.data()
  }));

  writeCacheEntry(candidateCacheKey(officeName), candidates);
  return candidates;
};

export const readCachedTallies = (candidateIds) => {
  const tallies = new Map();

  candidateIds.forEach((candidateId) => {
    const cached = readCacheEntry(tallyCacheKey(candidateId), {
      maxAgeMs: TALLY_CACHE_MAX_AGE_MS,
      maxStaleMs: TALLY_CACHE_MAX_STALE_MS
    });

    if (cached?.value) {
      tallies.set(candidateId, cached.value);
    }
  });

  return tallies;
};

export const fetchCandidateTallies = async (candidateIds) => {
  const uniqueIds = [...new Set(candidateIds)].filter(Boolean);
  const tallies = new Map();
  const idsToFetch = [];

  uniqueIds.forEach((candidateId) => {
    const cached = readCacheEntry(tallyCacheKey(candidateId), {
      maxAgeMs: TALLY_CACHE_MAX_AGE_MS,
      maxStaleMs: TALLY_CACHE_MAX_STALE_MS
    });

    if (cached?.value) {
      tallies.set(candidateId, cached.value);
    }

    if (!cached?.isFresh) {
      idsToFetch.push(candidateId);
    }
  });

  for (let index = 0; index < idsToFetch.length; index += 10) {
    const chunk = idsToFetch.slice(index, index + 10);
    const talliesQuery = query(
      collection(db, 'elections', ACTIVE_ELECTION_ID, 'candidate_tallies'),
      where(documentId(), 'in', chunk)
    );

    const talliesSnap = await getDocs(talliesQuery);
    talliesSnap.forEach((tallyDoc) => {
      const data = tallyDoc.data();
      tallies.set(tallyDoc.id, data);
      writeCacheEntry(tallyCacheKey(tallyDoc.id), data);
    });
  }

  return tallies;
};
