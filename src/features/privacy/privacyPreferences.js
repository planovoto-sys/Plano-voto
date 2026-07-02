export const PRIVACY_PREFERENCES_KEY = 'meuvoto:privacy-preferences:v1';
export const LEGACY_PRIVACY_CONSENT_KEY = 'meuvoto:privacy-consent:v1';

export const DEFAULT_PRIVACY_PREFERENCES = {
  necessary: true,
  analytics: false,
  personalization: false,
  marketing: false,
  commercialData: false,
  savedAt: null,
  version: 1
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const readPrivacyPreferences = () => {
  if (!canUseStorage()) return { ...DEFAULT_PRIVACY_PREFERENCES };

  try {
    const rawPreferences = window.localStorage.getItem(PRIVACY_PREFERENCES_KEY);
    if (rawPreferences) {
      return {
        ...DEFAULT_PRIVACY_PREFERENCES,
        ...JSON.parse(rawPreferences),
        necessary: true
      };
    }

    const legacyConsent = window.localStorage.getItem(LEGACY_PRIVACY_CONSENT_KEY);
    if (legacyConsent === 'accepted') {
      return {
        ...DEFAULT_PRIVACY_PREFERENCES,
        savedAt: window.localStorage.getItem(`${LEGACY_PRIVACY_CONSENT_KEY}:accepted-at`) || new Date().toISOString()
      };
    }
  } catch {
    return { ...DEFAULT_PRIVACY_PREFERENCES };
  }

  return { ...DEFAULT_PRIVACY_PREFERENCES };
};

export const hasSavedPrivacyPreferences = () => Boolean(readPrivacyPreferences().savedAt);

export const savePrivacyPreferences = (preferences = {}) => {
  const nextPreferences = {
    ...DEFAULT_PRIVACY_PREFERENCES,
    ...preferences,
    necessary: true,
    savedAt: new Date().toISOString(),
    version: 1
  };

  if (canUseStorage()) {
    try {
      window.localStorage.setItem(PRIVACY_PREFERENCES_KEY, JSON.stringify(nextPreferences));
      window.localStorage.setItem(LEGACY_PRIVACY_CONSENT_KEY, 'accepted');
      window.localStorage.setItem(`${LEGACY_PRIVACY_CONSENT_KEY}:accepted-at`, nextPreferences.savedAt);
    } catch {
      // A preferência ainda vale para a sessão atual mesmo se o navegador bloquear localStorage.
    }
  }

  return nextPreferences;
};

export const acceptOnlyNecessaryPrivacyPreferences = () => savePrivacyPreferences(DEFAULT_PRIVACY_PREFERENCES);

export const acceptAllOptionalPrivacyPreferences = () => savePrivacyPreferences({
  analytics: true,
  personalization: true,
  marketing: true,
  commercialData: true
});

export const resetCookiePermissions = () => {
  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(PRIVACY_PREFERENCES_KEY);
      window.localStorage.removeItem(LEGACY_PRIVACY_CONSENT_KEY);
      window.localStorage.removeItem(`${LEGACY_PRIVACY_CONSENT_KEY}:accepted-at`);
    } catch {
      // Se o navegador bloquear localStorage, a próxima leitura volta ao padrão da sessão.
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bomdevoto:privacy-preferences-reset'));
  }

  return { ...DEFAULT_PRIVACY_PREFERENCES };
};
