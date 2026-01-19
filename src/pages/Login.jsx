import React from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      // --- A MUDANÇA É AQUI ---
      // Isso força o Google a perguntar qual conta usar sempre
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      // ------------------------

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profile_image: user.photoURL,
          username: "", 
          state: "",    
          status: 'onboarding',
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      // Ignora erro se o usuário fechou o popup sem escolher conta
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Erro no login: " + error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-logo">plano</h1>
      
      <button onClick={handleGoogleLogin} className="login-btn">
        Entrar com Google
      </button>

      <p className="login-link">Como funciona</p>
    </div>
  );
}