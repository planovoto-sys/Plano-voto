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
    <div className="login-container">
      <div className="login-content">
        <h1 className="login-title">PLANO<br/>DE VOTO</h1>
        <p className="login-subtitle">Faça login para continuar</p>
        
        <button className="btn-green btn-login" onClick={handleGoogleLogin}>
          ENTRAR COM GOOGLE
        </button>
      </div>
    </div>
  );
}

export default Login;