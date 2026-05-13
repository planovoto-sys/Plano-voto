import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import { auth, firebaseReady, googleProvider } from '@/services/firebase/firebase';
import { flowError, flowLog } from '@/utils/debugFlow';
import './Login.css';

function Login() {
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      alert("Firebase não configurado no ambiente local. Configure as variáveis VITE_* para habilitar o login.");
      return;
    }

    try {
      flowLog('login.google.start');
      const result = await signInWithPopup(auth, googleProvider);
      flowLog('login.google.success', { userId: result.user?.uid });
    } catch (error) {
      flowError('login.google.error', error);
      if (import.meta.env.DEV) {
        console.error("Erro ao fazer login:", error);
      }
      alert("Falha ao fazer login com o Google.");
    }
  };

  return (
    <div className="login-wrapper">
      <main className="login-main">
        <h1 className="login-brand" aria-label="nossovoto.org">
          <ChanceFlame className="login-brand__flame" size={62} />
          <span>nossovoto<em>.org</em></span>
        </h1>

        <div className="video-card">
          <button className="play-button" type="button" aria-label="Reproduzir vídeo">
            <div className="play-icon"></div>
          </button>
        </div>

        <button className="btn-comecar" type="button" onClick={handleGoogleLogin}>
          <strong>COMEÇAR</strong>
          <span>Veja o vídeo antes de começar</span>
        </button>
      </main>
    </div>
  );
}

export default Login;
