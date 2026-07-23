import { useEffect, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

import FlowToast from '@/shared/ui/feedback/FlowToast';
import { useUser } from '@/shared/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/shared/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';

import './Login.css';

function LoginLogo() {
  return (
    <img src="/icone-com-nome.svg" alt="Bom de Voto" className="login-logo__icon" />
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="login-google-btn__icon" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A24.5 24.5 0 0 0 0 24c0 3.95.94 7.69 2.56 11.02l7.98-6.43z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.43C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.68 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L7.18 4.28a1 1 0 0 0-1.5.86z" fill="currentColor" />
    </svg>
  );
}

function Login() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';
  const loginFlowActiveRef = useRef(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginNotice, setLoginNotice] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const showLoginNotice = (message) => {
    setLoginNotice({ id: Date.now(), message });
  };

  useEffect(() => {
    document.body.classList.add('login-page-active');
    document.documentElement.classList.add('login-page-active');
    return () => {
      document.body.classList.remove('login-page-active');
      document.documentElement.classList.remove('login-page-active');
    };
  }, []);

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
      setLoginSubmitting(false);
      loginFlowActiveRef.current = false;
    }
  };

  return (
    <div className="login-wrapper">
      <FlowToast
        className="login-toast"
        key={loginNotice?.id || 'login-toast'}
        message={loginNotice?.message || ''}
      />

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo animate-fade-up a-delay-1">
          <LoginLogo />
        </div>

        {/* Video Card */}
        <div
          className="login-video-card animate-fade-up a-delay-4"
          onClick={() => setVideoModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setVideoModalOpen(true); }}
          aria-label="Assistir ao vídeo institucional"
        >
          <img className="login-video-card__image" src="/capa-video-V.png" alt="Vídeo institucional" />
          <div className="login-video-card__overlay" />
          <div className="login-video-card__play">
            <PlayIcon />
          </div>
          <div className="login-video-card__footer">
            <span>Assista ao vídeo institucional</span>
            <span>1:30</span>
          </div>
        </div>

        {/* Google Button */}
        <button
          className="login-google-btn animate-fade-up a-delay-5"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loginSubmitting}
        >
          <GoogleIcon />
          {loginSubmitting ? 'Entrando...' : 'Continuar com Google'}
        </button>

        {/* Trust Indicator */}
        <div className="login-trust animate-fade-up a-delay-6">
          <span className="login-trust__line">—</span>
          <Shield className="login-trust__shield" />
          <span>Seguro, rápido e gratuito</span>
          <span className="login-trust__line">—</span>
        </div>
      </div>



      {/* Video Modal */}
      {videoModalOpen && (
        <div className="video-modal-backdrop" onClick={() => setVideoModalOpen(false)}>
          <button className="video-modal-close" onClick={() => setVideoModalOpen(false)} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-placeholder">
              Vídeo institucional em breve
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
