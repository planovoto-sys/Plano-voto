import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import { useNotify } from '@/features/notifications/useNotify';
import { getIncompleteStepMessage } from '@/features/notifications/notificationMessages';
import {
  getBallotEstado,
  getBallotProgress,
  getVisitorBallotEstado,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/features/ballot';
import './BottomNavigation.css';

function StateIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.2}><path d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>;
}

function PresidentIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.2}><path d="M4 10h16M6 10v7m4-7v7m4-7v7m4-7v7M3 20h18M12 3l9 5H3l9-5Z"/></svg>;
}

function SenatorIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.4 : 1.2}><path d="M4.1 13.6h21.8a10.9 10.9 0 0 0-21.8 0Z"/></svg>;
}

function DeputyIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.4 : 1.2}><path d="M4.1 4.4h21.8a10.9 10.9 0 0 1-21.8 0Z"/></svg>;
}

function ContinueIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ShareIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

const LEFT_STEPS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: StateIcon },
  { id: 'presidente', label: 'Presidente', path: BALLOT_ROUTES.presidente, Icon: PresidentIcon }
];

const RIGHT_STEPS = [
  { id: 'senador', label: 'Senador', path: BALLOT_ROUTES.senadores, Icon: SenatorIcon },
  { id: 'deputado', label: 'Deputado', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputyIcon }
];

const ALL_STEPS = [...LEFT_STEPS, ...RIGHT_STEPS];

function getActiveStep(currentStep, pathname) {
  if (currentStep) return currentStep;
  const path = String(pathname || '').toLowerCase();
  if (path.includes('resumo') || path.includes('plano')) return 'resultado';
  if (path.includes('presidente')) return 'presidente';
  if (path.includes('senador')) return 'senador';
  if (path.includes('deputado')) return 'deputado';
  return 'estado';
}

function getStepState(stepId, activeStep, completedSteps) {
  if (stepId === activeStep) return 'active';
  if (completedSteps[stepId]) return 'complete';
  return 'pending';
}

export default function ConvexBottomNavigation({
  currentStep,
  onContinueClick,
  isFinalStep = false,
  onShareClick
}) {
  const { user, userData } = useUser();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const [navState, setNavState] = useState('expanded');
  const navStateRef = useRef('expanded');

  useEffect(() => {
    let lastScrollY = 0;
    let downScrollDistance = 0;
    let upScrollDistance = 0;
    let lastTime = Date.now();

    const changeState = (newState) => {
      if (navStateRef.current === newState) return;
      navStateRef.current = newState;
      setNavState(newState);
    };

    const handleScroll = (event) => {
      const target = event.target;
      let currentY = 0;
      let isMainContainer = false;

      if (target === window || target === document) {
        currentY = window.scrollY || document.documentElement.scrollTop;
        isMainContainer = true;
      } else if (target?.scrollTop !== undefined) {
        currentY = target.scrollTop;
        isMainContainer = target.clientHeight > window.innerHeight * 0.4;
      }
      if (!isMainContainer) return;

      const deltaY = currentY - lastScrollY;
      const currentTime = Date.now();
      const velocity = Math.abs(deltaY / (currentTime - lastTime || 1));
      lastScrollY = currentY;
      lastTime = currentTime;

      if (currentY <= 10) {
        downScrollDistance = 0;
        upScrollDistance = 0;
        changeState('expanded');
        return;
      }

      const totalScrollHeight = target === window || target === document
        ? document.documentElement.scrollHeight
        : target.scrollHeight;
      const viewportHeight = target === window || target === document
        ? window.innerHeight
        : target.clientHeight;
      if (totalScrollHeight - viewportHeight - currentY <= 50) return;

      if (deltaY > 0) {
        upScrollDistance = 0;
        downScrollDistance += deltaY;
        if (velocity > 1.2 || deltaY > 40) {
          changeState('hidden');
          downScrollDistance = 0;
        } else if (navStateRef.current === 'expanded' && downScrollDistance > 25) {
          changeState('shrunk');
          downScrollDistance = 0;
        } else if (navStateRef.current === 'shrunk' && downScrollDistance > 60) {
          changeState('hidden');
          downScrollDistance = 0;
        }
      } else if (deltaY < -2) {
        downScrollDistance = 0;
        upScrollDistance += Math.abs(deltaY);
        if (upScrollDistance > 20) {
          changeState('expanded');
          upScrollDistance = 0;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const estado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado();
  const progress = getBallotProgress(draft);
  const activeStep = getActiveStep(currentStep, location.pathname);
  const completedSteps = {
    estado: Boolean(estado || progress.hasEstado),
    presidente: Boolean(progress.hasPresidente),
    senador: Boolean(progress.hasSenadores),
    deputado: Boolean(progress.hasDeputadoFederal)
  };
  const firstPendingIndex = ALL_STEPS.findIndex((step) => !completedSteps[step.id]);
  const activeIndex = ALL_STEPS.findIndex((step) => step.id === activeStep);

  const handleNavigate = (step, index) => {
    const isClickable = completedSteps[step.id] || index === firstPendingIndex;
    if (!isClickable) {
      notify.warning(getIncompleteStepMessage(completedSteps), {
        dedupeKey: `incomplete-step-${activeStep}`,
        duration: 4200
      });
      return;
    }
    navigate(step.path, { state: { bypassVoteRedirect: true } });
  };

  const handleCentralContinue = () => {
    if (isFinalStep) {
      if (onShareClick) onShareClick();
      return;
    }
    if (onContinueClick) {
      onContinueClick();
      return;
    }

    const nextStep = ALL_STEPS[activeIndex + 1];
    if (nextStep && activeIndex >= 0 && completedSteps[activeStep]) {
      navigate(nextStep.path, { state: { bypassVoteRedirect: true } });
      return;
    }
    notify.warning(getIncompleteStepMessage(completedSteps), {
      dedupeKey: `incomplete-step-${activeStep}`,
      duration: 4200
    });
  };

  const renderNavItems = (steps) => steps.map((step) => {
    const index = ALL_STEPS.findIndex((item) => item.id === step.id);
    const state = getStepState(step.id, activeStep, completedSteps);
    const isActive = state === 'active';
    const isClickable = completedSteps[step.id] || index === firstPendingIndex;

    return (
      <button
        key={step.id}
        type="button"
        className={`convex-nav__step is-${state}${isClickable ? ' is-clickable' : ''}${isActive ? ' is-active' : ''}`}
        onClick={() => handleNavigate(step, index)}
        aria-disabled={!isClickable}
        aria-current={isActive ? 'step' : undefined}
      >
        <span className="convex-nav__icon-wrap">
          <step.Icon className="convex-nav__icon" isActive={isActive} />
        </span>
        <span className="convex-nav__copy">
          <span className="convex-nav__label">{step.label}</span>
        </span>
      </button>
    );
  });

  return (
    <div className={`app-page-footer convex-nav-shell is-${navState}`}>
      <div className="convex-nav__bg-wrapper" aria-hidden="true" />
      <nav className="convex-nav" aria-label="Etapas do plano de voto">
        <div className="convex-nav__side">{renderNavItems(LEFT_STEPS)}</div>
        <div className="convex-nav__center">
          <button
            type="button"
            className="convex-nav__continue-btn"
            onClick={handleCentralContinue}
            aria-label={isFinalStep ? 'Compartilhar plano' : 'Avançar para a próxima etapa'}
          >
            {isFinalStep ? <ShareIcon className="continue-icon" /> : <ContinueIcon className="continue-icon" />}
          </button>
        </div>
        <div className="convex-nav__side">{renderNavItems(RIGHT_STEPS)}</div>
      </nav>
    </div>
  );
}
