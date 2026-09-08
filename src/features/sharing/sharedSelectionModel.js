export const SHARED_SELECTION_PREFIX = '/selecao/';
export const SHARED_AUTH_CALLBACK_PARAM = 'auth_flow';
export const SHARED_AUTH_CALLBACK_VALUE = 'shared_selection';
export const SHARE_RETURN_KEY = 'bomdevoto:shared-selection-return';
export const SHARED_DRAFT_KEY = 'bomdevoto:shared-selection-draft';
export const SHARED_SOURCE_KEY = 'bomdevoto:shared-selection-source';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const isSharedSelectionId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
export const isSharedSelectionPath = (path) => typeof path === 'string'
  && path.startsWith(SHARED_SELECTION_PREFIX)
  && isSharedSelectionId(path.slice(SHARED_SELECTION_PREFIX.length).replace(/\/resumo$/, ''));

const sharedSelectionIdFromSummaryPath = (path) => {
  if (!isSharedSelectionPath(path) || !path.endsWith('/resumo')) return null;
  return path.slice(SHARED_SELECTION_PREFIX.length, -'/resumo'.length);
};

export const isSharedSelectionAuthCallback = (search) => {
  try {
    return new URLSearchParams(search).get(SHARED_AUTH_CALLBACK_PARAM) === SHARED_AUTH_CALLBACK_VALUE;
  } catch { return false; }
};

export const sharedSelectionAuthRedirectUrl = (origin) => {
  const url = new URL('/', origin);
  url.searchParams.set(SHARED_AUTH_CALLBACK_PARAM, SHARED_AUTH_CALLBACK_VALUE);
  return url.href;
};

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
  const id = sharedSelectionIdFromSummaryPath(path);
  if (!id || !readSharedSelectionDraft(id)) return false;
  try { window.sessionStorage.setItem(SHARE_RETURN_KEY, JSON.stringify({ path, at: Date.now() })); return true; } catch { return false; }
};
// O novo fluxo autentica antes de buscar candidatos: basta preservar o link,
// sem depender de um rascunho anônimo ou aceitar destinos externos.
export const rememberSharedSelectionEntry = (path) => {
  if (!isSharedSelectionPath(path) || path.endsWith('/resumo')) return false;
  try {
    window.sessionStorage.setItem(SHARE_RETURN_KEY, JSON.stringify({ kind: 'entry', path, at: Date.now() }));
    return true;
  } catch { return false; }
};
export const readSharedSelectionReturn = () => {
  try {
    const item = JSON.parse(window.sessionStorage.getItem(SHARE_RETURN_KEY) || 'null');
    const id = sharedSelectionIdFromSummaryPath(item?.path);
    const destinationValid = item?.kind === 'entry'
      ? isSharedSelectionPath(item.path) && !item.path.endsWith('/resumo')
      : id && readSharedSelectionDraft(id);
    const valid = destinationValid && Number.isFinite(item.at)
      && Date.now() - item.at >= 0 && Date.now() - item.at < 60 * 60 * 1000;
    if (valid) return item.path;
    window.sessionStorage.removeItem(SHARE_RETURN_KEY);
    return null;
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

// Referência imutável da lista recebida, separada do rascunho editável. Assim,
// desmarcar/adicionar nomes ou trocar a UF não apaga a origem da seleção.
// Como os rascunhos locais do app, esses dados ficam somente nesta sessão.
export const writeSharedSelectionSource = ({ userId, electionId, id, revision, state, candidateIds, applied = true }) => {
  const source = { userId, electionId, id, revision, state, candidateIds: [...new Set(candidateIds)], applied, at: Date.now() };
  if (!userId || !electionId || !validLocalDraft(source)) return false;
  try { window.sessionStorage.setItem(SHARED_SOURCE_KEY, JSON.stringify(source)); return true; } catch { return false; }
};

export const readSharedSelectionSource = (userId, electionId) => {
  if (!userId || !electionId) return null;
  try {
    const source = JSON.parse(window.sessionStorage.getItem(SHARED_SOURCE_KEY) || 'null');
    return validLocalDraft(source) && source.applied === true && source.userId === userId && source.electionId === electionId ? source : null;
  } catch { return null; }
};

export const clearSharedSelectionSource = () => {
  try { window.sessionStorage.removeItem(SHARED_SOURCE_KEY); } catch { /* Sem armazenamento. */ }
};

// Apenas agrupa a lista de escolha; não altera notas, contadores ou indicações.
export const prioritizeSharedCandidates = (candidates, source) => {
  if (!source) return candidates;
  const received = new Set(source.candidateIds);
  return [...candidates.filter((candidate) => received.has(candidate.id)),
    ...candidates.filter((candidate) => !received.has(candidate.id))];
};
