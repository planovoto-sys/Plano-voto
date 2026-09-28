import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
} from 'lucide-react';

import FlowToast from '@/shared/ui/feedback/FlowToast';
import useReducedMotion from '@/features/motion/useReducedMotion';
import { useUser } from '@/shared/hooks/useUser';
import {
  authReady,
  authProvider,
  googleIdentityClientId,
  signInWithGoogle,
  signInWithGoogleIdToken,
  usesGoogleIdentity,
} from '@/shared/auth/authService';
import { createGoogleIdentityNonce, loadGoogleIdentity } from '@/shared/auth/googleIdentity';
import { mergeVisitorBallotDraftIntoAccount } from '@/features/ballot';
import { flowError, flowLog } from '@/shared/utils/debugFlow';
import {
  clearSharedSelectionReturn, clearSharedSelectionSource, rememberSharedSelectionEntry,
  sharedSelectionAuthRedirectUrl,
} from '@/features/sharing/sharedSelectionModel';

import './Login.css';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="login-google-btn__icon" aria-hidden="true">
      <path fill="currentColor" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="currentColor" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="currentColor" d="M10.32 28.09C9.53 26.4 9.05 24.54 9.05 22.61s.48-3.79 1.27-5.48L2.56 11.2C.92 14.7 0 18.75 0 22.61s.92 7.91 2.56 11.41l7.76-5.93z" />
      <path fill="currentColor" d="M24 48c6.48 0 11.93-2.15 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
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

const HOW_IT_WORKS_SLIDES = [
  {
    title: 'Você é bom de voto?',
    accent: 'Tem certeza?',
    artwork: 'ballot',
  },
  {
    eyebrow: 'Nas últimas eleições',
    title: '50 milhões',
    description: 'elegeram nosso Congresso Nacional.',
    secondaryTitle: '100 milhões',
    secondaryDescription: 'não elegeram nenhum parlamentar*',
    footnote: '* Desperdiçaram seus votos com candidatos que não se elegeram, votos brancos ou nulos e abstenções.',
    artwork: 'numbers',
  },
  {
    eyebrow: 'A cada...',
    title: '1 voto que elege',
    accent: '2 que não elegem',
    description: 'O resultado? Um Congresso em que só',
    secondaryTitle: '12%',
    secondaryDescription: 'dos brasileiros confiam.',
    artwork: 'chamber',
  },
  {
    eyebrow: 'A explicação',
    title: 'Imagine que...',
    description: 'Você aceita votar no José e na Maria. Eu aceito votar no João e na Maria.',
    artwork: 'choices',
  },
  {
    title: 'Se você vota no José e eu no João',
    accent: 'Nossos votos se dividem',
    description: 'A chance de eles se elegerem diminui → isso é o que acontece nas eleições.',
    artwork: 'divided',
  },
  {
    title: 'Se nós dois votamos na Maria',
    accent: 'Nossos votos se somam',
    description: 'A chance de eleger a Maria aumenta → isso é o que o Bom de Voto faz.',
    artwork: 'shared',
  },
  {
    eyebrow: 'No Bom de Voto, o eleitor',
    title: 'Declara suas preferências individuais',
    accent: 'Descobre suas preferências coletivas',
    artwork: 'preferences',
  },
  {
    title: 'Funciona assim...',
    steps: [
      'Você seleciona seu estado (onde vota)',
      'Confere as atas dos candidatos e partidos (no Ranking dos Políticos)',
      'Declara suas preferências individuais: todos os candidatos em quem aceita votar',
      'Descobre suas preferências coletivas antes do voto',
    ],
    description: 'Você ainda pode compartilhar suas preferências individuais com aquele eleitor que te perguntou em quem votar.',
    artwork: 'steps',
  },
  {
    title: 'O Bom de Voto',
    descriptionLines: [
      'É uma ferramenta de utilidade pública',
      'Que oferece zero garantias de sucesso',
      'Mas um risco real de fortalecer o voto e sua representação na política',
    ],
    artwork: 'target',
  },
  {
    title: 'O Bom de Voto',
    accent: 'Te mostra o caminho',
    secondaryTitle: 'A decisão final é sua',
    artwork: 'path',
  },
];

const TOUR_AUTO_ADVANCE_DELAY_MS = 5000;
const TOUR_RETURN_DELAY_INCREMENT_MS = 3000;
const TOUR_AUTO_ADVANCE_MAX_DELAY_MS = 10000;

function TourCloud({ x, y }) {
  return <path d={`M${x} ${y + 17}h49a10 10 0 0 0 0-20 15 15 0 0 0-28-3 12 12 0 0 0-21 8 8 8 0 0 0 0 15Z`} fill="#fbfff8" stroke="#478b55" strokeWidth="1.5" />;
}

function TourTree({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#478b55" strokeWidth="1.5">
      <path d="M0 0v-29" fill="none" />
      <path d="M0-15c-20 0-25-14-17-24 1-15 19-20 26-10 13-3 23 9 16 21C25-18 13-15 0-15Z" fill="#e5f4d8" />
      <path d="M0-3v-17M0-12l-9-8m9 13 10-10" fill="none" />
    </g>
  );
}

function TourVoter({ x, y, label, hair = '#0f6b3c', hairStyle = 'short', scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cy="-3" r="31" fill="#e3f2d9" />
      {hairStyle === 'long' && <path d="M-15-12q-5-19 5-27 12-8 23 1 12 9 7 29l-1 20-7 15-5-29-4-17-13-1-5 40-7-12 1-19Z" fill={hair} stroke="#0f4c2a" strokeWidth="1.2" />}
      <path d="M-23 21q2-15 13-18h20q12 4 14 18v5h-47Z" fill="#078a49" stroke="#0f4c2a" strokeWidth="1.5" />
      <path d="m-8 7 8 7 8-7" fill="none" stroke="#e5f4d8" strokeWidth="1.5" />
      <path d="M-13-14q0-15 13-15t13 15v12q-2 13-13 13T-13-2Z" fill="#fff4d9" stroke="#0f4c2a" strokeWidth="1.3" />
      {hairStyle === 'long'
        ? <path d="M-14-10q-3-18 8-22 14-4 19 12l-1 8-8-8q-9 3-18-5Z" fill={hair} stroke="#0f4c2a" strokeWidth="1.2" />
        : <path d="M-14-9q-4-18 8-21 15-5 21 8l-2 9-5-7q-10 1-16-4l-2 12Z" fill={hair} stroke="#0f4c2a" strokeWidth="1.2" />}
      <path d="M-7-4h1m11 0h1m-8 8q2 2 4 0" fill="none" stroke="#0f4c2a" strokeWidth="1.4" strokeLinecap="round" />
      {label && <text y="39" textAnchor="middle" fill="#0f4c2a" fontSize="11" fontWeight="700">{label}</text>}
    </g>
  );
}

function TourArtwork({ kind }) {
  if (kind === 'ballot') {
    return (
      <div className="login-tour-art login-tour-art--ballot" aria-hidden="true">
        <img className="login-tour-art__image" src="/imagem-urna.png" alt="" />
      </div>
    );
  }

  return (
    <div className={`login-tour-art login-tour-art--${kind}`} aria-hidden="true">
      <svg viewBox="0 0 360 230" role="presentation">
        <defs>
          <marker id={`tour-arrow-${kind}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="m0 0 8 4-8 4Z" fill="#0f6b3c" />
          </marker>
        </defs>
        {kind === 'numbers' && <>
          <TourCloud x={26} y={44} /><TourCloud x={290} y={47} />
          <path d="M0 184h360" stroke="#0f4c2a" strokeWidth="2" />
          <TourTree x={24} y={188} scale={0.75} /><TourTree x={336} y={188} scale={0.75} />
          <path d="M86 183V80h24v103m16 0V64h31v119m11 0V98h19v85m20 0V74h27v109" fill="#f9fff4" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M147 64v-13h12v13" fill="#e5f4d8" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M93 96h9m-9 13h9m54-26h9m-9 13h9m-9 13h9m45-15h10m-10 13h10" stroke="#70c832" strokeWidth="3" />
          <path d="M58 183q15-45 30 0m184 0q15-48 32 0" fill="#e5f4d8" stroke="#478b55" strokeWidth="1.5" />
          <path d="M41 183h278" stroke="#70c832" strokeWidth="5" />
        </>}
        {kind === 'chamber' && <>
          <ellipse cx="180" cy="145" rx="139" ry="71" fill="#e5f4d8" />
          <path d="M39 153a141 93 0 0 1 282 0M54 163a126 75 0 0 0 252 0M74 173a106 58 0 0 0 212 0" fill="none" stroke="#b5dba2" strokeWidth="1.5" />
          <path d="M154 55h52v44h-52Z" fill="#078a49" stroke="#0f4c2a" strokeWidth="2" />
          <path d="m180 61 17 10-17 19-17-19Z" fill="#f5d448" /><circle cx="180" cy="72" r="7" fill="#2457a7" />
          <path d="M112 111h136v24H112z" fill="#fbfff8" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M95 141h170" stroke="#0f4c2a" strokeWidth="2" />
          <g fill="#078a49" stroke="#0f4c2a" strokeWidth="1.4">
            <path d="M58 131h23v16H58zm35 11h23v16H93zm35 9h23v16h-23zm35 4h23v16h-23zm35-4h23v16h-23zm35-9h23v16h-23zm35-11h23v16h-23z" />
            <path d="M70 154h23v16H70zm35 10h23v16h-23zm35 7h23v16h-23zm80-7h23v16h-23zm35-10h23v16h-23z" />
          </g>
          <path d="M46 191h268" stroke="#0f4c2a" strokeWidth="2" />
        </>}
        {kind === 'choices' && <>
          <TourVoter x={83} y={57} label="José" scale={1.15} />
          <text x="180" y="66" textAnchor="middle" fill="#0f4c2a" fontSize="24" fontWeight="700">+</text>
          <TourVoter x={277} y={57} label="Maria" hair="#143f2d" hairStyle="long" scale={1.15} />
          <TourVoter x={83} y={158} label="João" hair="#174f36" scale={1.15} />
          <text x="180" y="167" textAnchor="middle" fill="#0f4c2a" fontSize="24" fontWeight="700">+</text>
          <TourVoter x={277} y={158} label="Maria" hair="#143f2d" hairStyle="long" scale={1.15} />
        </>}
        {kind === 'divided' && <>
          <rect x="52" y="26" width="104" height="75" rx="12" fill="#f1f8eb" stroke="#0f4c2a" strokeWidth="2" />
          <rect x="204" y="26" width="104" height="75" rx="12" fill="#f1f8eb" stroke="#0f4c2a" strokeWidth="2" />
          <TourVoter x={104} y={53} label="José" />
          <TourVoter x={256} y={53} label="João" hair="#174f36" />
          <path d="M104 108v29m152-29v29" fill="none" stroke="#0f6b3c" strokeWidth="2.5" markerEnd={`url(#tour-arrow-${kind})`} />
          <rect x="45" y="146" width="118" height="49" rx="10" fill="#e5f4d8" stroke="#0f4c2a" strokeWidth="2" />
          <rect x="197" y="146" width="118" height="49" rx="10" fill="#e5f4d8" stroke="#0f4c2a" strokeWidth="2" />
          <circle cx="70" cy="170" r="13" fill="#0f6b3c" />
          <circle cx="222" cy="170" r="13" fill="#0f6b3c" />
          <text x="70" y="174" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">1</text>
          <text x="222" y="174" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">1</text>
          <path d="M92 164h56m-56 12h42m110-12h56m-56 12h42" stroke="#478b55" strokeWidth="2.5" strokeLinecap="round" />
        </>}
        {kind === 'shared' && <>
          <TourVoter x={112} y={40} label="Maria" hair="#143f2d" hairStyle="long" scale={1.1} />
          <text x="180" y="50" textAnchor="middle" fill="#0f4c2a" fontSize="22" fontWeight="700">+</text>
          <TourVoter x={248} y={40} label="Maria" hair="#143f2d" hairStyle="long" scale={1.1} />
          <path d="M112 91v28q0 9 10 9h47m79-46v37q0 9-10 9h-47m-11-10v34" fill="none" stroke="#0f6b3c" strokeWidth="2.5" markerEnd={`url(#tour-arrow-${kind})`} />
          <TourVoter x={180} y={166} label="Maria" hair="#143f2d" hairStyle="long" scale={1.1} />
          <circle cx="211" cy="184" r="13" fill="#00a859" stroke="#f5faf2" strokeWidth="3" />
          <path d="m205 184 4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>}
        {kind === 'preferences' && <>
          <rect x="73" y="30" width="207" height="157" rx="13" fill="#fbfff8" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M73 52h207" stroke="#0f4c2a" strokeWidth="2" />
          <circle cx="91" cy="41" r="3" fill="#70c832" /><circle cx="102" cy="41" r="3" fill="#70c832" />
          {[0, 1, 2].map((row) => <g key={row} transform={`translate(0 ${row * 41})`}>
            <TourVoter x={108} y={80} scale={0.4} />
            <path d="M132 73h89m-89 9h64" stroke="#478b55" strokeWidth="2" strokeLinecap="round" />
            <rect x="239" y="68" width="19" height="19" rx="3" fill="#70c832" stroke="#0f4c2a" />
            <path d="m243 77 4 4 8-9" fill="none" stroke="#0f4c2a" strokeWidth="2" />
          </g>)}
          <circle cx="280" cy="169" r="35" fill="#0f6b3c" stroke="#f5faf2" strokeWidth="4" />
          <g fill="#e5f4d8">
            <circle cx="264" cy="157" r="6" /><circle cx="280" cy="153" r="7" /><circle cx="296" cy="157" r="6" />
            <path d="M253 179q1-13 11-13t11 13Zm14 0q1-16 13-16t13 16Zm14 0q1-13 11-13t11 13Z" />
          </g>
        </>}
        {kind === 'steps' && <>
          <rect x="116" y="21" width="126" height="189" rx="14" fill="#fbfff8" stroke="#0f4c2a" strokeWidth="3" />
          <rect x="153" y="12" width="52" height="15" rx="5" fill="#dcefd5" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M140 61h14m9 0h52m-75 28h14m9 0h52m-75 28h14m9 0h52m-75 28h14m9 0h52" stroke="#478b55" strokeWidth="2.5" strokeLinecap="round" />
          {[0, 1, 2, 3].map((row) => <g key={row} transform={`translate(0 ${row * 28})`}>
            <rect x="136" y="54" width="14" height="14" rx="3" fill="#70c832" />
            <path d="m139 60 3 3 6-7" fill="none" stroke="#0f4c2a" strokeWidth="1.5" />
          </g>)}
          <circle cx="242" cy="170" r="36" fill="#0f6b3c" stroke="#f5faf2" strokeWidth="4" />
          <path d="m228 171 28-16m-28 16 28 16m-28-16h-10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="224" cy="171" r="4" fill="#70c832" /><circle cx="258" cy="152" r="4" fill="#70c832" /><circle cx="258" cy="190" r="4" fill="#70c832" />
        </>}
        {kind === 'target' && <>
          <circle cx="180" cy="119" r="83" fill="#dcefd5" />
          <circle cx="180" cy="119" r="67" fill="#0f6b3c" />
          <circle cx="180" cy="119" r="49" fill="#fbfff8" />
          <circle cx="180" cy="119" r="31" fill="#70c832" />
          <circle cx="180" cy="119" r="14" fill="#0f6b3c" />
        </>}
        {kind === 'path' && <>
          <TourCloud x={27} y={49} /><TourCloud x={279} y={44} />
          <path d="M0 140h360M77 139V75h15V54h12v21h13v64m20 0V87h13V65h12v22h18v52m23 0V78h22v61m28 0V96h20v43" fill="#f9fff4" stroke="#478b55" strokeWidth="1.5" />
          <path d="M0 143h360" stroke="#0f4c2a" strokeWidth="2" />
          <path d="M-16 197c39-2 51-33 91-34s55 26 91 15 38-39 78-39 62 23 132-8" fill="none" stroke="#0f6b3c" strokeWidth="48" strokeLinecap="round" />
          <path d="M-16 197c39-2 51-33 91-34s55 26 91 15 38-39 78-39 62 23 132-8" fill="none" stroke="#70c832" strokeWidth="41" strokeLinecap="round" />
          <path d="M-16 197c39-2 51-33 91-34s55 26 91 15 38-39 78-39 62 23 132-8" fill="none" stroke="#f5faf2" strokeWidth="2" strokeDasharray="8 10" strokeLinecap="round" />
          <TourTree x={35} y={180} scale={0.74} /><TourTree x={330} y={164} scale={0.68} />
          <path d="M266 142c0-15 12-27 27-27s27 12 27 27c0 20-27 49-27 49s-27-29-27-49Z" fill="#078a49" stroke="#0f4c2a" strokeWidth="2" />
          <circle cx="293" cy="142" r="9" fill="#f5faf2" />
        </>}
      </svg>
    </div>
  );
}

function HowItWorksModal({ isOpen, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [autoAdvanceDelayMs, setAutoAdvanceDelayMs] = useState(TOUR_AUTO_ADVANCE_DELAY_MS);
  const closeButtonRef = useRef(null);
  const slideIndexRef = useRef(0);
  const slide = HOW_IT_WORKS_SLIDES[slideIndex];
  const reducedMotion = useReducedMotion();

  const goToSlide = useCallback((index) => {
    const nextIndex = Math.max(0, Math.min(index, HOW_IT_WORKS_SLIDES.length - 1));
    if (nextIndex < slideIndexRef.current) {
      setAutoAdvanceDelayMs((current) => Math.min(
        current + TOUR_RETURN_DELAY_INCREMENT_MS,
        TOUR_AUTO_ADVANCE_MAX_DELAY_MS
      ));
    }
    slideIndexRef.current = nextIndex;
    setSlideIndex(nextIndex);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const modal = closeButtonRef.current?.closest('.login-tour');
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goToSlide(slideIndexRef.current + 1);
      if (event.key === 'ArrowLeft') goToSlide(slideIndexRef.current - 1);
      if (event.key === 'Tab') {
        const buttons = modal?.querySelectorAll('button:not(:disabled)');
        const firstButton = buttons?.[0];
        const lastButton = buttons?.[buttons.length - 1];
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault();
          lastButton?.focus();
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault();
          firstButton?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [goToSlide, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || autoAdvancePaused || reducedMotion || slideIndex === HOW_IT_WORKS_SLIDES.length - 1) return undefined;

    const timer = window.setTimeout(
      () => goToSlide(slideIndex + 1),
      autoAdvanceDelayMs
    );
    return () => window.clearTimeout(timer);
  }, [autoAdvanceDelayMs, autoAdvancePaused, goToSlide, isOpen, reducedMotion, slideIndex]);

  if (!isOpen) return null;

  return (
    <div className="login-tour-overlay" onClick={onClose}>
      <section className="login-tour" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-tour-title">
        <header className="login-tour__header">
          <span className="login-tour__count" aria-label={`Slide ${slideIndex + 1} de ${HOW_IT_WORKS_SLIDES.length}`}>{slideIndex + 1}</span>
          <span className="login-tour__brand"><i /><i /> bom de voto</span>
          <button ref={closeButtonRef} className="login-tour__close" type="button" onClick={onClose} aria-label="Fechar apresentação"><X size={21} /></button>
        </header>

        <div className="login-tour__slide" data-artwork={slide.artwork} aria-live="polite" aria-atomic="true">
          {slide.eyebrow && <p className="login-tour__eyebrow">{slide.eyebrow}</p>}
          <h2 id="login-tour-title" className="login-tour__title">{slide.title}</h2>
          {slide.accent && <p className="login-tour__accent">{slide.accent}</p>}
          {slide.description && !slide.steps && <p className="login-tour__description">{slide.description}</p>}
          {slide.descriptionLines?.map((line) => <p className="login-tour__description" key={line}>{line}</p>)}
          {slide.secondaryTitle && <p className="login-tour__secondary"><strong>{slide.secondaryTitle}</strong> {slide.secondaryDescription}</p>}
          {slide.steps && (
            <ol className="login-tour__steps">
              {slide.steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}
            </ol>
          )}
          {slide.description && slide.steps && <p className="login-tour__description">{slide.description}</p>}
          {slide.footnote && <p className="login-tour__footnote">{slide.footnote}</p>}
          <TourArtwork kind={slide.artwork} />
        </div>

        <footer className="login-tour__footer">
          <button className="login-tour__nav" type="button" onClick={() => goToSlide(slideIndex - 1)} disabled={slideIndex === 0} aria-label="Slide anterior"><ChevronLeft size={21} /></button>
          {!reducedMotion && (
            <button
              className="login-tour__nav login-tour__autoplay"
              type="button"
              onClick={() => setAutoAdvancePaused((paused) => !paused)}
              aria-label={autoAdvancePaused ? 'Retomar avanço automático' : 'Pausar avanço automático'}
              aria-pressed={autoAdvancePaused}
              title={autoAdvancePaused ? 'Retomar avanço automático' : 'Pausar avanço automático'}
            >
              {autoAdvancePaused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          )}
          <nav className="login-tour__dots" aria-label="Selecionar slide">
            {HOW_IT_WORKS_SLIDES.map((item, index) => (
              <button key={item.title + index} type="button" onClick={() => goToSlide(index)} className={index === slideIndex ? 'is-active' : ''} aria-label={`Ir para o slide ${index + 1}`} aria-current={index === slideIndex ? 'step' : undefined} />
            ))}
          </nav>
          <button className="login-tour__nav login-tour__nav--next" type="button" onClick={() => (slideIndex === HOW_IT_WORKS_SLIDES.length - 1 ? onClose() : goToSlide(slideIndex + 1))} aria-label={slideIndex === HOW_IT_WORKS_SLIDES.length - 1 ? 'Concluir apresentação' : 'Próximo slide'}>
            {slideIndex === HOW_IT_WORKS_SLIDES.length - 1 ? <Check size={20} /> : <ChevronRight size={21} />}
          </button>
        </footer>
      </section>
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

export default function LoginPage({ sharedSelectionPath = null }) {
  const { user, userData, loading } = useUser();
  const [signingIn, setSigningIn] = useState(false);
  const [googleIdentityReady, setGoogleIdentityReady] = useState(!usesGoogleIdentity);
  const [toastMessage, setToastMessage] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const signingInRef = useRef(false);
  const googleIdentityRef = useRef(null);
  const googleIdentityNonceRef = useRef('');
  const googlePromptAttemptedRef = useRef(false);

  const prepareLogin = useCallback(() => {
    if (sharedSelectionPath) {
      if (rememberSharedSelectionEntry(sharedSelectionPath)) return true;
      setToastMessage('Permita o armazenamento de sessão para preservar o link durante o login e tente novamente.');
      return false;
    }
    // Uma tentativa antiga de QR nunca interfere em um login comum.
    clearSharedSelectionReturn();
    clearSharedSelectionSource();
    return true;
  }, [sharedSelectionPath]);

  const handleGoogleIdentityError = useCallback((error) => {
    flowError('LoginPage', 'Erro ao carregar login direto do Google', error);
    setToastMessage('Não foi possível carregar o login do Google. Tente novamente.');
  }, []);

  const handleGoogleCredential = useCallback(async ({ token, nonce }) => {
    if (signingInRef.current) return;
    if (!prepareLogin()) return;
    signingInRef.current = true;
    googlePromptAttemptedRef.current = false;
    setSigningIn(true);
    setToastMessage('');

    try {
      flowLog('LoginPage', 'Iniciando login direto com Google');
      await signInWithGoogleIdToken({ token, nonce });
      flowLog('LoginPage', 'Login direto concluido', { provider: authProvider });
    } catch (error) {
      flowError('LoginPage', 'Erro no login direto', error);
      setToastMessage('Não foi possível fazer login. Tente novamente.');
    } finally {
      signingInRef.current = false;
      setSigningIn(false);
    }
  }, [prepareLogin]);

  useEffect(() => {
    if (!usesGoogleIdentity) return undefined;

    let cancelled = false;

    const initializeGoogleIdentity = async () => {
      try {
        const [{ nonce, hashedNonce }, googleIdentity] = await Promise.all([
          createGoogleIdentityNonce(),
          loadGoogleIdentity(),
        ]);
        if (cancelled) return;

        googleIdentity.initialize({
          client_id: googleIdentityClientId,
          callback: (response) => {
            if (cancelled) return;
            if (!response?.credential) {
              handleGoogleIdentityError(new Error('O Google nao retornou uma credencial valida.'));
              return;
            }
            void handleGoogleCredential({ token: response.credential, nonce });
          },
          nonce: hashedNonce,
          context: 'signin',
          auto_select: false,
          itp_support: true,
        });

        googleIdentityRef.current = googleIdentity;
        googleIdentityNonceRef.current = nonce;
        setGoogleIdentityReady(true);
      } catch (error) {
        if (!cancelled) {
          handleGoogleIdentityError(error);
          setGoogleIdentityReady(true);
        }
      }
    };

    void initializeGoogleIdentity();
    return () => {
      cancelled = true;
      googleIdentityRef.current?.cancel?.();
      googleIdentityRef.current = null;
      googleIdentityNonceRef.current = '';
      googlePromptAttemptedRef.current = false;
    };
  }, [handleGoogleCredential, handleGoogleIdentityError]);

  const handleGoogleSignIn = useCallback(async () => {
    if (signingIn) return;
    if (!prepareLogin()) return;
    setSigningIn(true);

    try {
      flowLog('LoginPage', 'Iniciando login com Google');
      const result = await signInWithGoogle(sharedSelectionPath
        ? { redirectTo: sharedSelectionAuthRedirectUrl(window.location.origin, sharedSelectionPath) }
        : undefined);
      flowLog('LoginPage', 'Login iniciado', { provider: authProvider });

      if (!sharedSelectionPath && result.user?.uid && userData?.estado) {
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
  }, [prepareLogin, sharedSelectionPath, signingIn, userData]);

  const handlePrimaryGoogleSignIn = useCallback(() => {
    if (!prepareLogin()) return;
    if (!usesGoogleIdentity) {
      void handleGoogleSignIn();
      return;
    }

    const googleIdentity = googleIdentityRef.current;
    if (!googleIdentity || !googleIdentityNonceRef.current) {
      void handleGoogleSignIn();
      return;
    }

    if (googlePromptAttemptedRef.current) {
      googleIdentity.cancel?.();
      googlePromptAttemptedRef.current = false;
      void handleGoogleSignIn();
      return;
    }

    setToastMessage('');
    googlePromptAttemptedRef.current = true;
    googleIdentity.prompt();
  }, [handleGoogleSignIn, prepareLogin]);

  const PREVIEW_MODE_MESSAGE = `App em modo de visualização — login disponível apenas com ${authProvider} configurado.`;
  const previewModeHint = !user && !loading && !authReady && !signingIn ? PREVIEW_MODE_MESSAGE : '';

  return (
    <div className="login-wrapper">
      <FlowToast message={toastMessage || previewModeHint} />

      <section className="login-top">
        <div className="login-top__pattern" aria-hidden="true" />
        <FloatingDots />

        <div className="login-top__content">
          <LoginLogo />
          <img src="/imagem-urna.png" alt="" className="login-urna" />
          <p className="login-slogan">
            <span className="login-slogan__main">Você é bom de voto?</span>
            <span className="login-slogan__accent">Tem certeza?</span>
          </p>
        </div>
      </section>

      <section className="login-card">
        {tourOpen && <HowItWorksModal isOpen={tourOpen} onClose={() => setTourOpen(false)} />}

        <div className="login-card__content">
          <button type="button" className="login-how-it-works" onClick={() => setTourOpen(true)}>
            <span className="login-how-it-works__icon" aria-hidden="true">
              <Play size={18} />
            </span>
            <span>Veja como funciona</span>
          </button>

          <button
            type="button"
            className="login-google-btn"
            onClick={handlePrimaryGoogleSignIn}
            disabled={signingIn || !authReady || !googleIdentityReady}
          >
            <GoogleIcon />
            <span>
              {!googleIdentityReady
                ? 'Carregando Google...'
                : signingIn
                  ? 'Entrando...'
                  : 'Entrar com Google'}
            </span>
          </button>
        </div>

        <p className="login-tagline">
          <span>Rápido</span>
          <span className="login-tagline__sep">|</span>
          <span>Simples</span>
          <span className="login-tagline__sep">|</span>
          <span>Inteligente</span>
        </p>
      </section>
    </div>
  );
}
