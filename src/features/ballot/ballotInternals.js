import {
  ACTIVE_ELECTION_ID,
  VISITOR_DRAFT_ID
} from '@/shared/constants/ballot';

export const STORAGE_PREFIX = `meuvoto:${ACTIVE_ELECTION_ID}`;
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const VISITOR_DRAFT_STORAGE_ID = `${VISITOR_DRAFT_ID}:local`;
export const MAX_ACTIVE_CANDIDATES = 3;

let storageAvailability = null;

export const canUseStorage = () => {
  if (storageAvailability !== null) return storageAvailability;
  if (typeof window === 'undefined') {
    storageAvailability = false;
    return storageAvailability;
  }

  try {
    const testKey = `${STORAGE_PREFIX}:storage-test`;
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    storageAvailability = true;
  } catch {
    storageAvailability = false;
  }

  return storageAvailability;
};

export const draftKey = (userId) => `${STORAGE_PREFIX}:ballotDraft:${userId}`;
export const receiptKey = (userId) => `${STORAGE_PREFIX}:lastReceipt:${userId}`;

export const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const normalizeRemoteTimestamp = (value) => (
  typeof value?.toDate === 'function'
    ? value.toDate().toISOString()
    : value || null
);

export const normalizeOfficeName = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

export const getDraftUpdatedAtMs = (draft) => {
  const updatedAtMs = Date.parse(draft?.updated_at || '');
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
};

export const shouldKeepLocalDraftOverRemote = (localDraft, remoteDraft, requestStartedAtMs) => {
  const localUpdatedAtMs = getDraftUpdatedAtMs(localDraft);
  const remoteUpdatedAtMs = getDraftUpdatedAtMs(remoteDraft);

  if (!localUpdatedAtMs) return false;
  if (localUpdatedAtMs >= requestStartedAtMs) return true;
  if (remoteUpdatedAtMs && localUpdatedAtMs > remoteUpdatedAtMs) return true;

  return false;
};
