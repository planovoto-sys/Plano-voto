let deferredInstallPrompt = null;
let initialized = false;
let installed = false;
const listeners = new Set();

const detectInstalled = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
};

const detectIos = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const detectSafari = () => {
  if (typeof navigator === 'undefined') return false;
  return /Safari/i.test(navigator.userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const getPwaInstallState = () => ({
  canPrompt: Boolean(deferredInstallPrompt),
  installed,
  isIos: detectIos(),
  isSafari: detectSafari()
});

export const subscribeToPwaInstallState = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const initializePwaInstallPrompt = () => {
  if (initialized || typeof window === 'undefined') return;

  initialized = true;
  installed = detectInstalled();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emitChange();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredInstallPrompt = null;
    emitChange();
  });
};

export const requestPwaInstall = async () => {
  if (installed || detectInstalled()) {
    installed = true;
    emitChange();
    return { outcome: 'installed' };
  }

  const promptEvent = deferredInstallPrompt;
  if (!promptEvent) return { outcome: 'unavailable' };

  deferredInstallPrompt = null;
  emitChange();

  try {
    const promptResult = await promptEvent.prompt();
    const choice = promptResult?.outcome
      ? promptResult
      : await promptEvent.userChoice;

    if (choice?.outcome === 'accepted') {
      installed = true;
      emitChange();
    }

    return { outcome: choice?.outcome || 'dismissed' };
  } catch {
    return { outcome: 'error' };
  }
};
