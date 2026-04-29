import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
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
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION;
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;

if (firebaseReady && appCheckSiteKey && typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = functionsRegion ? getFunctions(app, functionsRegion) : getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
