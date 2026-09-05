export const SHARED_SELECTION_PREFIX = '/selecao/';
export const SHARE_RETURN_KEY = 'bomdevoto:shared-selection-return';
export const SHARED_DRAFT_KEY = 'bomdevoto:shared-selection-draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const isSharedSelectionId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
export const isSharedSelectionPath = (path) => typeof path === 'string'
  && path.startsWith(SHARED_SELECTION_PREFIX)
  && isSharedSelectionId(path.slice(SHARED_SELECTION_PREFIX.length).replace(/\/resumo$/, ''));

export const sharedSelectionUrl = (id, origin) => {
  if (!isSharedSelectionId(id)) throw new Error('Link de seleção inválido.');
  return new URL(`${SHARED_SELECTION_PREFIX}${id}`, origin).href;
};

export const getSharedCandidateOffice = (candidate) => {
  const office = String(candidate.cargo || '').toLowerCase();
  if (office === 'presidente') return 'presidente';
  if (office === 'senador' || office === 'senadores') return 'senadores';
  if (office === 'deputado federal') return 'deputado_federal';
  return null;
};

export const eligibleSharedCandidates = (candidates, state) => candidates.filter((candidate) => (
  getSharedCandidateOffice(candidate) && (getSharedCandidateOffice(candidate) === 'presidente' || candidate.estado === state)
));

export const sharedSelectionMessage = (url) => `Veja minha seleção no Bom de Voto. Você pode revisar os candidatos antes de usar:\n\n${url}`;

export const rememberSharedSelectionReturn = (path) => {
  if (!isSharedSelectionPath(path)) return false;
  try { window.sessionStorage.setItem(SHARE_RETURN_KEY, JSON.stringify({ path, at: Date.now() })); return true; } catch { return false; }
};
export const readSharedSelectionReturn = () => {
  try {
    const item = JSON.parse(window.sessionStorage.getItem(SHARE_RETURN_KEY) || 'null');
    return item && isSharedSelectionPath(item.path) && Number.isFinite(item.at)
      && Date.now() - item.at >= 0 && Date.now() - item.at < 60 * 60 * 1000 ? item.path : null;
  } catch { return null; }
};
export const clearSharedSelectionReturn = () => {
  try { window.sessionStorage.removeItem(SHARE_RETURN_KEY); } catch { /* Armazenamento indisponível. */ }
};

const validLocalDraft = (draft) => draft && isSharedSelectionId(draft.id)
  && Number.isInteger(draft.revision) && draft.revision > 0
  && /^[A-Z]{2}$/.test(draft.state) && Array.isArray(draft.candidateIds)
  && draft.candidateIds.length > 0 && draft.candidateIds.length <= 500
  && draft.candidateIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 200)
  && Number.isFinite(draft.at) && Date.now() - draft.at >= 0 && Date.now() - draft.at < DRAFT_TTL_MS;

export const writeSharedSelectionDraft = ({ id, revision, state, candidateIds }) => {
  const draft = { id, revision, state, candidateIds: [...new Set(candidateIds)], at: Date.now() };
  if (!validLocalDraft(draft)) return false;
  try { window.sessionStorage.setItem(SHARED_DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
};

export const readSharedSelectionDraft = (id) => {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(SHARED_DRAFT_KEY) || 'null');
    return validLocalDraft(draft) && draft.id === id ? draft : null;
  } catch { return null; }
};

export const clearSharedSelectionDraft = () => {
  try { window.sessionStorage.removeItem(SHARED_DRAFT_KEY); } catch { /* Sem armazenamento. */ }
};
