import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { resetCookiePermissions as resetStoredCookiePermissions } from '@/features/privacy/privacyPreferences';

const LOCAL_BALLOT_PREFIX = `meuvoto:${ACTIVE_ELECTION_ID}:`;
const PUBLIC_CACHE_PREFIX = 'meuvoto:public-cache:';
const FILTER_STORAGE_KEY = 'plano-voto:filtro-ativo';

const getLocalStorageKeys = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const removeLocalStorageKeys = (predicate) => {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  let removed = 0;
  getLocalStorageKeys().forEach((key) => {
    if (!predicate(key)) return;

    try {
      window.localStorage.removeItem(key);
      removed += 1;
    } catch {
      // Se o navegador bloquear a escrita, apenas seguimos com o restante da limpeza.
    }
  });

  return removed;
};

const deleteIndexedDb = (name) => new Promise((resolve) => {
  if (typeof indexedDB === 'undefined' || !name) {
    resolve(false);
    return;
  }

  const request = indexedDB.deleteDatabase(name);
  request.onsuccess = () => resolve(true);
  request.onerror = () => resolve(false);
  request.onblocked = () => resolve(false);
});

export function clearLocalBallotDraft() {
  const removed = removeLocalStorageKeys((key) => (
    key.startsWith(`${LOCAL_BALLOT_PREFIX}ballotDraft:`) ||
    key.startsWith(`${LOCAL_BALLOT_PREFIX}lastReceipt:`) ||
    key === FILTER_STORAGE_KEY ||
    key.includes('offline_plan_snapshot')
  ));

  return { ok: true, removed };
}

export async function clearOfflineData() {
  const removedLocal = removeLocalStorageKeys((key) => (
    key.includes('offline') ||
    key.includes('sync_queue') ||
    key.includes('plan_snapshot')
  ));

  let removedCaches = 0;
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(async (cacheName) => {
        if (!cacheName.startsWith('meuvoto-')) return;
        const removed = await caches.delete(cacheName);
        if (removed) removedCaches += 1;
      }));
    } catch {
      removedCaches = 0;
    }
  }

  let removedIndexedDb = 0;
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    try {
      const databases = await indexedDB.databases();
      const removableDatabases = databases
        .map((database) => database.name)
        .filter((name) => /meuvoto|nossovoto|plano|offline|candidate/i.test(name || ''));

      const results = await Promise.all(removableDatabases.map(deleteIndexedDb));
      removedIndexedDb = results.filter(Boolean).length;
    } catch {
      removedIndexedDb = 0;
    }
  }

  return {
    ok: true,
    removed: removedLocal + removedCaches + removedIndexedDb,
    removedLocal,
    removedCaches,
    removedIndexedDb
  };
}

export async function clearCandidateCache() {
  const removed = removeLocalStorageKeys((key) => key.startsWith(PUBLIC_CACHE_PREFIX));

  return { ok: true, removed };
}

export function resetCookiePermissions() {
  resetStoredCookiePermissions();
  return { ok: true, removed: 1 };
}

export async function clearAllLocalDeviceData() {
  const draft = clearLocalBallotDraft();
  const offline = await clearOfflineData();
  const candidates = await clearCandidateCache();
  const cookies = resetCookiePermissions();

  return {
    ok: true,
    removed: draft.removed + offline.removed + candidates.removed + cookies.removed,
    draft,
    offline,
    candidates,
    cookies
  };
}
