const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleIdentityScriptPromise = null;

const getGoogleIdentityApi = () => globalThis.window?.google?.accounts?.id || null;

export const loadGoogleIdentity = () => {
  const existingApi = getGoogleIdentityApi();
  if (existingApi) return Promise.resolve(existingApi);
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);
    const script = existingScript || document.createElement('script');

    const handleLoad = () => {
      const api = getGoogleIdentityApi();
      if (api) {
        resolve(api);
        return;
      }
      googleIdentityScriptPromise = null;
      reject(new Error('A biblioteca de identidade do Google nao ficou disponivel.'));
    };

    const handleError = () => {
      googleIdentityScriptPromise = null;
      reject(new Error('Nao foi possivel carregar a biblioteca de identidade do Google.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return googleIdentityScriptPromise;
};

export const createGoogleIdentityNonce = async () => {
  const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const nonce = globalThis.btoa(String.fromCharCode(...randomBytes));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { nonce, hashedNonce };
};
