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

// Ícones Dinâmicos: Linha fina (1.5) inativo -> Linha GROSSA (2.8) ativo
function StateIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.8 : 1.5}><path d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>;
}
function DeputyIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 3.0 : 1.5}><path d="M4.1 4.4h21.8a10.9 10.9 0 0 1-21.8 0Z"/></svg>;
}
function SenatorIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 3.0 : 1.5}><path d="M4.1 13.6h21.8a10.9 10.9 0 0 0-21.8 0Z"/></svg>;
}
function SummaryIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.8 : 1.5}><circle cx="8.5" cy="12" r="6.5"/><circle cx="15.5" cy="12" r="6.5"/></svg>;
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

// Lógica de Rota à prova de falhas: Lê qualquer parte da URL para ativar o botão
function getActiveStep(currentStep, pathname) {
  if (currentStep) return currentStep;
  
  const path = (pathname || '').toLowerCase();
  
  if (path.includes('resultado') || path.includes('plano') || path.includes('resumo')) return 'resultado';
  if (path.includes('senador')) return 'senador';
  if (path.includes('deputado')) return 'deputado';
  
  return 'estado'; // Default
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
    let touchStartY = 0;

    const handleScroll = (e) => {
      const target = e.target;
      let currentY = 0;
      let isMainContainer = false;

      if (target === window || target === document) {
        currentY = window.scrollY || document.documentElement.scrollTop;
        isMainContainer = true;
      } else if (target.scrollTop !== undefined) {
        currentY = target.scrollTop;
        if (target.clientHeight > window.innerHeight * 0.4) {
          isMainContainer = true;
        }
      }

      if (!isMainContainer) return;

      if (currentY <= 10) {
        setIsCollapsed(false);
        lastScrollY = currentY;
        return;
      }

      if (Math.abs(currentY - lastScrollY) > 15) {
        setIsCollapsed(currentY > lastScrollY);
        lastScrollY = currentY;
      }
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const touchY = e.touches[0].clientY;
      const delta = touchStartY - touchY;
      
      if (delta > 20) {
        setIsCollapsed(true);
        touchStartY = touchY;
      } else if (delta < -20) {
        setIsCollapsed(false);
        touchStartY = touchY;
      }
    };

    const handleWheel = (e) => {
      if (e.deltaY > 15) {
        setIsCollapsed(true);
      } else if (e.deltaY < -15) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
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
  const isCurrentStepComplete = completedSteps[activeStep];
  
  const firstPendingIndex = isCurrentStepComplete 
    ? Math.min(activeIndex + 1, ALL_STEPS.length - 1) 
    : activeIndex;
    
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
      handleNavigate(nextStep, isCurrentStepComplete);
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
  };

  return (
    <div className={`app-page-footer convex-nav-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
      
      {/* Camada Visual de Fundo Sólida */}
      <div className="convex-nav__bg-wrapper">
        <div className="convex-nav__bg-side left" />
        <div className="convex-nav__bg-center" />
        <div className="convex-nav__bg-side right" />
      </div>

      <nav className="convex-nav">
        
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