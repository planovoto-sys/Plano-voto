const DEBUG_STORAGE_KEY = 'meuvoto:debug-flow';
const DEBUG_HISTORY_KEY = 'meuvoto:debug-flow-history';
const MAX_HISTORY_ITEMS = 80;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readDebugFlag = () => {
  if (import.meta.env.DEV || import.meta.env.VITE_FLOW_DEBUG === 'true') return true;
  if (!canUseStorage()) return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('debugFlow') === '1') {
    window.localStorage.setItem(DEBUG_STORAGE_KEY, 'true');
    return true;
  }

  if (params.get('debugFlow') === '0') {
    window.localStorage.removeItem(DEBUG_STORAGE_KEY);
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
};

export const isFlowDebugEnabled = () => readDebugFlag();

const simplifyError = (error) => {
  if (!error) return null;

  return {
    name: error.name,
    code: error.code,
    message: error.message,
    stack: error.stack
  };
};

const persistHistory = (entry) => {
  if (!canUseStorage()) return;

  try {
    const raw = window.localStorage.getItem(DEBUG_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const nextHistory = [...history, entry].slice(-MAX_HISTORY_ITEMS);
    window.localStorage.setItem(DEBUG_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    window.localStorage.removeItem(DEBUG_HISTORY_KEY);
  }
};

const makeEntry = (stage, payload = {}, level = 'log') => ({
  at: new Date().toISOString(),
  level,
  stage,
  path: typeof window !== 'undefined' ? window.location.pathname : '',
  payload
});

export const flowLog = (stage, payload = {}) => {
  const entry = makeEntry(stage, payload, 'log');
  persistHistory(entry);

  if (isFlowDebugEnabled()) {
    console.log(`[meuvoto-flow] ${stage}`, payload);
  }
};

export const flowWarn = (stage, payload = {}) => {
  const entry = makeEntry(stage, payload, 'warn');
  persistHistory(entry);

  if (isFlowDebugEnabled()) {
    console.warn(`[meuvoto-flow] ${stage}`, payload);
  }
};

export const flowError = (stage, error, payload = {}) => {
  const entry = makeEntry(stage, {
    ...payload,
    error: simplifyError(error)
  }, 'error');
  persistHistory(entry);

  console.error(`[meuvoto-flow] ${stage}`, error, payload);
};

export const installFlowDebugTools = () => {
  if (typeof window === 'undefined' || window.meuVotoDebug) return;

  window.meuVotoDebug = {
    enable: () => {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, 'true');
      console.info('[meuvoto-flow] debug ativado');
    },
    disable: () => {
      window.localStorage.removeItem(DEBUG_STORAGE_KEY);
      console.info('[meuvoto-flow] debug desativado');
    },
    history: () => {
      const raw = window.localStorage.getItem(DEBUG_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    },
    clear: () => {
      window.localStorage.removeItem(DEBUG_HISTORY_KEY);
      console.info('[meuvoto-flow] historico limpo');
    }
  };

  if (isFlowDebugEnabled()) {
    console.info('[meuvoto-flow] ferramentas disponiveis em window.meuVotoDebug');
  }
};
