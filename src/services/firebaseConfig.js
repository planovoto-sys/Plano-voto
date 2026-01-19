import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configuração direta (Hardcoded) para o MVP
const firebaseConfig = {
  apiKey: "AIzaSyD9EXjbI-x0CNnkntSGCz11jpT-yvgQw8M",
  authDomain: "plano-mvp-9a0b4.firebaseapp.com",
  projectId: "plano-mvp-9a0b4",
  storageBucket: "plano-mvp-9a0b4.firebasestorage.app",
  messagingSenderId: "491176539123",
  appId: "1:491176539123:web:a65f85aa8b922139bd5886",
  measurementId: "G-84EZY64TN7"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços que usamos no App
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };