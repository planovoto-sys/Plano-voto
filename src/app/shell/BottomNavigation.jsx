import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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

// Ícones Dinâmicos: Linha fina inativo -> Linha média ativo
function StateIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.2}><path d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>;
}
function DeputyIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.4 : 1.2}><path d="M4.1 4.4h21.8a10.9 10.9 0 0 1-21.8 0Z"/></svg>;
}
function SenatorIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.4 : 1.2}><path d="M4.1 13.6h21.8a10.9 10.9 0 0 0-21.8 0Z"/></svg>;
}
function SummaryIcon({ className = '', isActive }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.2}><circle cx="8.5" cy="12" r="6.5"/><circle cx="15.5" cy="12" r="6.5"/></svg>;
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
  
  return 'estado'; 
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

  // Estados possíveis: 'expanded', 'shrunk', 'hidden'
  const [navState, setNavState] = useState('expanded');
  const navStateRef = useRef('expanded');

  useEffect(() => {
    let lastScrollY = 0;
    let downScrollDistance = 0;
    let upScrollDistance = 0;
    let lastTime = Date.now();

    const changeState = (newState) => {
      if (navStateRef.current !== newState) {
        navStateRef.current = newState;
        setNavState(newState);
      }
    };

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

      const deltaY = currentY - lastScrollY;
      const currentTime = Date.now();
      const timeDelta = currentTime - lastTime || 1;
      const velocity = Math.abs(deltaY / timeDelta);

      lastScrollY = currentY;
      lastTime = currentTime;

      // Se voltar ao topo absoluto, mostra a barra completa
      if (currentY <= 10) {
        downScrollDistance = 0;
        upScrollDistance = 0;
        changeState('expanded');
        return;
      }

      // Se está nos últimos 50px do fim da página, ignora o scroll
      // para evitar flicker causado por overscroll/rubber-banding
      const totalScrollHeight = (target === window || target === document)
        ? document.documentElement.scrollHeight
        : target.scrollHeight;
      const viewportHeight = (target === window || target === document)
        ? window.innerHeight
        : target.clientHeight;
      if (totalScrollHeight - viewportHeight - currentY <= 50) {
        lastScrollY = currentY;
        lastTime = currentTime;
        return;
      }

      // Rolando para BAIXO
      if (deltaY > 0) {
        upScrollDistance = 0;
        downScrollDistance += deltaY;

        // Scroll muito rápido ou puxão muito longo: Esconde direto
        if (velocity > 1.2 || deltaY > 40) {
          changeState('hidden');
          downScrollDistance = 0;
        } 
        // Scroll normal: Vai por etapas
        else {
          if (navStateRef.current === 'expanded' && downScrollDistance > 25) {
            changeState('shrunk');
            downScrollDistance = 0; // Exige novo movimento para esconder
          } else if (navStateRef.current === 'shrunk' && downScrollDistance > 60) {
            changeState('hidden');
            downScrollDistance = 0;
          }
        }
      } 
      // Rolando para CIMA
      else if (deltaY < -2) {
        downScrollDistance = 0;
        upScrollDistance += Math.abs(deltaY);

        // Exige rolar 20px para cima para evitar que ela fique piscando com vibrações do dedo
        if (upScrollDistance > 20) {
          changeState('expanded');
          upScrollDistance = 0;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
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
    <div className={`app-page-footer convex-nav-shell is-${navState}`}>
      
      {/* Camada Visual de Fundo Liquid Glass */}
      <div className="convex-nav__bg-wrapper">
        <div className="glass-highlight"></div>
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