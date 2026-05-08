import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, firebaseReady, googleProvider } from '@/services/firebase/firebase';
import { flowError, flowLog } from '@/utils/debugFlow';
import AppFooter from '@/components/layout/AppFooter';
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
      <header className="login-header prototype-header">
        <h1>meuvoto.org</h1>
      </header>

      <main className="login-main">
        <section className="login-copy-block">
          <h2>Assista ao vídeo</h2>
          <p>E entenda como meuvoto.org pode te ajudar a votar melhor</p>
        </section>

        <div className="video-card">
          <button className="play-button" type="button" aria-label="Reproduzir vídeo">
            <div className="play-icon"></div>
          </button>
        </div>

        <section className="login-copy-block login-copy-block--start">
          <h2>Clique em começar</h2>
          <p>Após assistir ao vídeo</p>
        </section>

        <button className="btn-comecar" type="button" onClick={handleGoogleLogin}>COMEÇAR</button>

        <AppFooter className="app-footer--login-scroll" />
      </main>

      <AppFooter className="app-footer--login-fixed" />
    </div>
  );
}

export default Login;
