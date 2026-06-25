import { useEffect, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';

import FlowToast from '@/shared/ui/feedback/FlowToast';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import { useUser } from '@/shared/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/shared/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';

import './login.css';

// Ícone do botão play travado para não distorcer
const PlayIcon = () => (
  <svg width="12" height="14" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M13.238 7.15174C13.918 7.53322 13.918 8.46678 13.238 8.84826L1.87913 15.2201C1.21319 15.5937 0.389648 15.1129 0.389648 14.3718L0.389649 1.62817C0.389649 0.88714 1.21319 0.406263 1.87913 0.779895L13.238 7.15174Z" fill="white"/>
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
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <FlowToast key={loginNotice?.id || 'login-toast'} message={loginNotice?.message || ''} />

      <header className="login-header">
        <LogoCompleta as="div" />
      </header>

      <main className="login-main">
        
        <div className="title-section">
          <div className="title-bg-lines">
            <div className="title-bg-line line-1"></div>
            <div className="title-bg-line line-2"></div>
            <div className="title-bg-line line-3"></div>
          </div>
          <h1 className="title-primary">Você é bom de voto?</h1>
          <h2 className="title-secondary">Tem certeza?</h2>
        </div>

        <div className="stats-section">
          <div className="stats-box">
            <p className="stats-intro">A cada 10 votos para o Congresso:</p>
            <ul className="stats-list">
              <li>1 elege candidatos bem avaliados</li>
              <li>2 elegem candidatos mal avaliados</li>
              <li>7 não elegem ninguém (veja o vídeo)</li>
            </ul>
          </div>
        </div>

        <div className="video-card-container">
          <div className="video-wrapper">
            <img 
              src="/caminho-para-sua-imagem.png" 
              alt="Diagrama de intersecção" 
              className="venn-diagram-image" 
            />
            {/* O botão foi inserido DENTRO do wrapper branco para garantir o alinhamento de 50% matematicamente perfeito */}
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

        <div className="pagination-dots">
          <span className="dot active"></span>
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </footer>
    </div>
  );
}

export default Login;