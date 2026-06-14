import { useEffect, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import FlowToast from '@/shared/ui/feedback/FlowToast';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import { useUser } from '@/shared/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/shared/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';
import './Login.css';

function Login() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';
  const loginFlowActiveRef = useRef(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginNotice, setLoginNotice] = useState(null);

  const showLoginNotice = (message) => {
    setLoginNotice({ id: Date.now(), message });
  };

  useEffect(() => {
    if (!loading && user?.uid && !loginFlowActiveRef.current) {
      navigate(returnTo, { replace: true, state: { bypassVoteRedirect: true } });
    }
  }, [loading, navigate, returnTo, user?.uid]);

  const handleGoogleLogin = async () => {
    if (loginSubmitting) return;

    if (!firebaseReady) {
      showLoginNotice('Login indisponível neste ambiente.');
      return;
    }

    try {
      loginFlowActiveRef.current = true;
      setLoginSubmitting(true);
      flowLog('login.google.start');
      const result = await signInWithPopup(auth, googleProvider);
      try {
        await mergeVisitorBallotDraftIntoAccount(result.user?.uid);
      } catch (mergeError) {
        flowError('login.visitor-draft.merge-error', mergeError);
        showLoginNotice('Login feito, mas o rascunho local não foi salvo agora.');
      }
      flowLog('login.google.success', { userId: result.user?.uid });
      navigate(returnTo, { replace: true, state: { bypassVoteRedirect: true } });
    } catch (error) {
      flowError('login.google.error', error);
      if (import.meta.env.DEV) {
        console.error("Erro ao fazer login:", error);
      }
      showLoginNotice('Não foi possível entrar com Google.');
    } finally {
      loginFlowActiveRef.current = false;
      setLoginSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper nv-screen">
      <FlowToast key={loginNotice?.id || 'login-toast'} message={loginNotice?.message || ''} />
      <main className="login-main nv-container-narrow">
        <LogoCompleta as="h1" />

        <div className="video-card">
          <button className="play-button nv-touch" type="button" aria-label="Reproduzir vídeo" onClick={() => showLoginNotice('Vídeo em breve.')}>
            <div className="play-icon"></div>
          </button>
        </div>

        <button className="btn-comecar nv-touch" type="button" onClick={handleGoogleLogin} disabled={loginSubmitting}>
          <strong>{loginSubmitting ? 'ENTRANDO' : 'COMEÇAR'}</strong>
          <span>Assista ao vídeo antes de começar</span>
        </button>
      </main>
    </div>
  );
}

export default Login;
