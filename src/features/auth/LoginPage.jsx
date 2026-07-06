import { useEffect, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import FlowToast from '@/shared/ui/feedback/FlowToast';
import { useUser } from '@/shared/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/shared/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';

import './Login.css';

// Ícone do botão play
const PlayIcon = () => (
  <svg width="12" height="14" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M13.238 7.15174C13.918 7.53322 13.918 8.46678 13.238 8.84826L1.87913 15.2201C1.21319 15.5937 0.389648 15.1129 0.389648 14.3718L0.389649 1.62817C0.389649 0.88714 1.21319 0.406263 1.87913 0.779895L13.238 7.15174Z" fill="white" />
  </svg>
);

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
      <FlowToast key={loginNotice?.id || 'login-toast'} message={loginNotice?.message || ''} />

      <header className="login-header">
        {/* Adicionei a classe logo-img e limpei a div desnecessária que estava em volta */}
        <img src="/icone-com-nome.svg" alt="Bom de Voto" className="logo-img" />
      </header>

      <main className="login-main">
        <div className="title-section">
          <h1 className="title-primary">Você é bom de voto?</h1>
          <h2 className="title-secondary">Tem certeza?</h2>
        </div>

        <div className="stats-box">
          <p className="stats-intro">A cada 10 votos para o Congresso:</p>
          <ul className="stats-list">
            <li>1 elege candidatos bem avaliados</li>
            <li>2 elegem candidatos mal avaliados</li>
            <li>7 não elegem ninguém (veja o vídeo)</li>
          </ul>
        </div>

        {/* CONTAINER DO VÍDEO VERTICAL 9:16 */}
        <div className="video-section">
          <div className="video-card-container">
            <div className="video-placeholder">
              {/* Quando houver o vídeo real, coloque-o aqui dentro */}
            </div>
            
            <button
              className="btn-play-video"
              type="button"
              onClick={() => showLoginNotice('Vídeo em breve.')}
            >
              <PlayIcon />
              <span>Assistir vídeo (1:30)</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        <button
          className="btn-comecar"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loginSubmitting}
        >
          {loginSubmitting ? 'Entrando...' : 'Começar'}
        </button>

        <div className="login-legal-links">
          <Link to="/termos-de-uso">Termos de uso</Link>
          <span className="separator">&bull;</span>
          <Link to="/politica-de-privacidade">Privacidade</Link>
          <span className="separator">&bull;</span>
          <Link to="/cookies">Cookies</Link>
        </div>
      </footer>
    </div>
  );
}

export default Login;