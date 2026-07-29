import { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Play } from 'lucide-react';

import FlowToast from '@/shared/ui/feedback/FlowToast';
import { useUser } from '@/shared/hooks/useUser';
import { auth, firebaseReady, googleProvider } from '@/shared/firebase/firebase';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';

import './Login.css';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="login-google-btn__icon" aria-hidden="true">
      <path fill="#70C832" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#00A859" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#70C832" d="M10.32 28.09C9.53 26.4 9.05 24.54 9.05 22.61s.48-3.79 1.27-5.48L2.56 11.2C.92 14.7 0 18.75 0 22.61s.92 7.91 2.56 11.41l7.76-5.93z" />
      <path fill="#0F4C2A" d="M24 48c6.48 0 11.93-2.15 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function LoginLogo() {
  return (
    <svg viewBox="0 0 200 135" className="login-logo" aria-label="Bom de Voto">
      <defs>
        <clipPath id="logo-intersect">
          <circle cx="122" cy="42" r="38" />
        </clipPath>
      </defs>
      <circle cx="78" cy="42" r="38" fill="#00A859" />
      <circle cx="122" cy="42" r="38" fill="#70C832" />
      <circle cx="78" cy="42" r="38" fill="#0F4C2A" clipPath="url(#logo-intersect)" />
      <text x="100" y="110" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="28">
        <tspan fontWeight="700" fill="#0F4C2A">bom</tspan>
        <tspan fontWeight="700" fill="#00A859"> de </tspan>
        <tspan fontWeight="700" fill="#0F4C2A">voto</tspan>
      </text>
    </svg>
  );
}

function VideoModal({ isOpen, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      return;
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="login-video-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Vídeo explicativo">
      <div className="login-video-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-video-modal__close" onClick={onClose} aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <video
          ref={videoRef}
          className="login-video-modal__video"
          src="/video-como-funciona.mp4"
          poster="/capa-video-V.png"
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}

function FloatingDots() {
  return (
    <div className="login-dots" aria-hidden="true">
      <div className="login-dot login-dot--1" />
      <div className="login-dot login-dot--2" />
      <div className="login-dot login-dot--3" />
      <div className="login-dot login-dot--4" />
    </div>
  );
}

export default function LoginPage() {
  const { user, userData, loading } = useUser();
  const [signingIn, setSigningIn] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [videoOpen, setVideoOpen] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);

    try {
      flowLog('LoginPage', 'Iniciando login com Google');
      const result = await signInWithPopup(auth, googleProvider);
      flowLog('LoginPage', 'Login bem-sucedido', result.user.uid);

      if (userData?.estado) {
        try {
          await mergeVisitorBallotDraftIntoAccount(result.user.uid, userData.estado);
        } catch (mergeErr) {
          flowError('LoginPage', 'Erro ao mesclar rascunho de visitante', mergeErr);
        }
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        flowLog('LoginPage', 'Popup fechado pelo usuario');
      } else if (err.code === 'auth/cancelled-popup-request') {
        flowLog('LoginPage', 'Popup cancelado');
      } else {
        flowError('LoginPage', 'Erro no login', err);
        setToastMessage('Não foi possível fazer login. Tente novamente.');
      }
    } finally {
      setSigningIn(false);
    }
  }, [signingIn, userData]);

  useEffect(() => {
    if (!user && !loading && !firebaseReady && !signingIn) {
      setToastMessage('App em modo de visualização — login disponível apenas com Firebase configurado.');
    }
  }, [loading, signingIn, user]);

  return (
    <div className="login-wrapper">
      <FlowToast message={toastMessage} />

      <section className="login-top">
        <div className="login-top__pattern" aria-hidden="true" />
        <FloatingDots />

        <div className="login-top__content">
          <LoginLogo />
          <img src="/imagem-urna.png" alt="" className="login-urna" />
          <p className="login-slogan">
            <span className="login-slogan__main">Você é bom de voto</span>
            <span className="login-slogan__accent">Tem certeza?</span>
          </p>
        </div>
      </section>

      <section className="login-card">
        <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />

        <div className="login-card__content">
          <button
            type="button"
            className="login-google-btn"
            onClick={handleGoogleSignIn}
            disabled={signingIn || !firebaseReady}
          >
            <GoogleIcon />
            <span>{signingIn ? 'Entrando...' : 'Entrar com Google'}</span>
          </button>

          <button type="button" className="login-how-it-works" onClick={() => setVideoOpen(true)}>
            <span className="login-how-it-works__icon" aria-hidden="true">
              <Play size={18} />
            </span>
            <span className="login-how-it-works__text">
              <strong className="login-how-it-works__title">Conheça o app</strong>
              <span className="login-how-it-works__sub">Assistir Vídeo</span>
            </span>
          </button>

          <p className="login-tagline">
            <span>Rápido</span>
            <span className="login-tagline__sep">|</span>
            <span>Simples</span>
            <span className="login-tagline__sep">|</span>
            <span>Inteligente</span>
          </p>
        </div>

        <div className="login-home-indicator" />
      </section>
    </div>
  );
}
