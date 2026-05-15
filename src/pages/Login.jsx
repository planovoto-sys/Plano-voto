import React, { useEffect, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import { useUser } from '@/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/services/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/services/voting/votingService';
import { flowError, flowLog } from '@/utils/debugFlow';
import './Login.css';

function Login() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';
  const loginFlowActiveRef = useRef(false);

  useEffect(() => {
    if (!loading && user?.uid && !loginFlowActiveRef.current) {
      navigate(returnTo, { replace: true, state: { bypassVoteRedirect: true } });
    }
  }, [loading, navigate, returnTo, user?.uid]);

  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      alert("Firebase não configurado no ambiente local. Configure as variáveis VITE_* para habilitar o login.");
      return;
    }

    try {
      loginFlowActiveRef.current = true;
      flowLog('login.google.start');
      const result = await signInWithPopup(auth, googleProvider);
      try {
        await mergeVisitorBallotDraftIntoAccount(result.user?.uid);
      } catch (mergeError) {
        flowError('login.visitor-draft.merge-error', mergeError);
        alert('Login realizado, mas não foi possível salvar o rascunho visitante agora.');
      }
      flowLog('login.google.success', { userId: result.user?.uid });
      navigate(returnTo, { replace: true, state: { bypassVoteRedirect: true } });
    } catch (error) {
      flowError('login.google.error', error);
      if (import.meta.env.DEV) {
        console.error("Erro ao fazer login:", error);
      }
      alert("Falha ao fazer login com o Google.");
    } finally {
      loginFlowActiveRef.current = false;
    }
  };

  return (
    <div className="login-wrapper nv-screen">
      <main className="login-main nv-container-narrow">
        <h1 className="login-brand" aria-label="nossovoto.org">
          <ChanceFlame className="login-brand__flame" size={62} />
          <span>nossovoto<em>.org</em></span>
        </h1>

        <div className="video-card">
          <button className="play-button nv-touch" type="button" aria-label="Reproduzir vídeo">
            <div className="play-icon"></div>
          </button>
        </div>

        <button className="btn-comecar nv-touch" type="button" onClick={handleGoogleLogin}>
          <strong>COMEÇAR</strong>
          <span>Veja o vídeo antes de começar</span>
        </button>
      </main>
    </div>
  );
}

export default Login;
