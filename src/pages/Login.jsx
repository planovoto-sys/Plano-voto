import React from 'react';
import { auth, googleProvider } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import './Login.css';

function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert("Falha ao fazer login com o Google.");
    }
  };

  return (
    <div className="login-wrapper">
      <header className="login-header">
        <h1>meuvoto.org</h1>
        <div className="login-triangle-down"></div>
      </header>

      <main className="login-main">
        <div className="video-card">
          <button className="play-button" type="button" aria-label="Reproduzir vídeo">
            <div className="play-icon"></div>
          </button>
        </div>

        <button className="btn-comecar" type="button" onClick={handleGoogleLogin}>
          COMEÇAR
        </button>
      </main>
    </div>
  );
}

export default Login;
