import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { browserSessionPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Configuração segura via variáveis de ambiente.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

export const firebaseReady = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const localPreviewConfig = {
  apiKey: "local-preview-api-key",
  authDomain: "local-preview.firebaseapp.com",
  projectId: "local-preview",
  storageBucket: "local-preview.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:localpreview"
};

if (!firebaseReady) {
  console.warn("Firebase nao configurado. Defina as variaveis VITE_API_KEY, VITE_AUTH_DOMAIN, VITE_PROJECT_ID e VITE_APP_ID para habilitar login e dados reais.");
}

const app = initializeApp(firebaseReady ? firebaseConfig : localPreviewConfig);
export const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'southamerica-east1';

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
if (firebaseReady && recaptchaSiteKey) {
  if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN === 'true') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true
  });
} else if (import.meta.env.PROD && firebaseReady) {
  console.error('App Check nao configurado. Defina VITE_RECAPTCHA_V3_SITE_KEY antes do deploy.');
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const authPersistenceReady = setPersistence(auth, browserSessionPersistence);
export const functions = getFunctions(app, functionsRegion);
export const googleProvider = new GoogleAuthProvider();
