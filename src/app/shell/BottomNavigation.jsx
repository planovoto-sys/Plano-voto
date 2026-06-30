import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import { useNotify } from '@/features/notifications/useNotify';
import {
  getBallotEstado,
  getBallotProgress,
  getVisitorBallotEstado,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/features/ballot';
import './BottomNavigation.css';

const NAV_ICON_STROKE = 2;

function StateIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={NAV_ICON_STROKE}><path d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>;
}
function DeputyIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={NAV_ICON_STROKE + 0.2}><path d="M4.1 4.4h21.8a10.9 10.9 0 0 1-21.8 0Z"/></svg>;
}
function SenatorIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={NAV_ICON_STROKE + 0.2}><path d="M4.1 13.6h21.8a10.9 10.9 0 0 0-21.8 0Z"/></svg>;
}
function SummaryIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={NAV_ICON_STROKE}><circle cx="8.5" cy="12" r="6.5"/><circle cx="15.5" cy="12" r="6.5"/></svg>;
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  );
}

const LEFT_STEPS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: StateIcon },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputyIcon },
];

const RIGHT_STEPS = [
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores, Icon: SenatorIcon },
  { id: 'resultado', label: 'Resumo', path: BALLOT_ROUTES.meuPlano, Icon: SummaryIcon }
];

const ALL_STEPS = [...LEFT_STEPS, ...RIGHT_STEPS];

const STEP_BY_PATH = {
  '/home': 'estado',
  [BALLOT_ROUTES.estado]: 'estado',
  [BALLOT_ROUTES.deputadoFederal]: 'deputado',
  [BALLOT_ROUTES.senadores]: 'senador',
  [BALLOT_ROUTES.meuPlano]: 'resultado',
  '/resultado': 'resultado'
};

function getActiveStep(currentStep, pathname) {
  return currentStep || STEP_BY_PATH[pathname] || 'estado';
}

function getStepLogicState(stepId, activeStep, completedSteps) {
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let lastScrollY = 0;
    const handleScroll = (e) => {
      const target = e.target;
      const currentScrollY = (target === document || target === window) ? window.scrollY : target.scrollTop;
      
      if (typeof currentScrollY !== 'number' || currentScrollY < 0) return;

      if (currentScrollY > lastScrollY && currentScrollY > 20) {
        setIsCollapsed(true);
      } else if (currentScrollY < lastScrollY) {
        setIsCollapsed(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado();
  const progress = draft ? getBallotProgress(draft) : null;
  
  const activeStep = getActiveStep(currentStep, location.pathname);
  
  const completedSteps = {
    estado: Boolean(estadoSelecionado || progress?.hasEstado),
    deputado: Boolean(progress?.hasDeputadoFederal),
    senador: Boolean(progress?.hasSenadores),
    resultado: Boolean(progress?.isComplete)
  };

  const activeIndex = Math.max(0, ALL_STEPS.findIndex(s => s.id === activeStep));
  const firstPendingIndex = Math.min(activeIndex + 1, ALL_STEPS.length - 1);
  const nextStep = ALL_STEPS[firstPendingIndex];

  const handleNavigate = (step, isClickable) => {
    if (!isClickable) {
      notify.warning('Complete a etapa atual para continuar.', { duration: 4200 });
      return;
    }
    navigate(step.path, { state: { bypassVoteRedirect: true } });
  };

  const handleCentralContinue = () => {
    if (isFinalStep && onShareClick) {
      onShareClick();
    } else if (onContinueClick) {
      onContinueClick();
    } else {
      handleNavigate(nextStep, true);
    }
  };

  const renderNavItems = (stepsArray) => {
    return stepsArray.map((step) => {
      const globalIndex = ALL_STEPS.findIndex(s => s.id === step.id);
      const state = getStepLogicState(step.id, activeStep, completedSteps);
      const isActive = state === 'active';
      const isClickable = state === 'complete' || globalIndex === firstPendingIndex;

      return (
        <button
          key={step.id}
          className={`convex-nav__step is-${state} ${isClickable ? 'is-clickable' : ''} ${isActive ? 'is-active' : ''}`}
          onClick={() => handleNavigate(step, isClickable)}
          disabled={!isClickable}
        >
          <span className="convex-nav__icon-wrap">
            <step.Icon className="convex-nav__icon" />
          </span>
          <span className="convex-nav__copy">
            <span className="convex-nav__label">{step.label}</span>
          </span>
        </button>
      );
    });
  };

  return (
    <div className="app-page-footer convex-nav-shell">
      <nav className={`convex-nav ${isCollapsed ? 'is-collapsed' : ''}`}>
        
        <div className="convex-nav__side">
          {renderNavItems(LEFT_STEPS)}
        </div>

        <div className="convex-nav__center">
          <button 
            className="convex-nav__continue-btn"
            onClick={handleCentralContinue}
            aria-label={isFinalStep ? "Compartilhar Plano" : "Continuar para a próxima etapa"}
          >
            {isFinalStep ? <ShareIcon className="continue-icon" /> : <ContinueIcon className="continue-icon" />}
          </button>
        </div>

        <div className="convex-nav__side">
          {renderNavItems(RIGHT_STEPS)}
        </div>

      </nav>
    </div>
  );
}