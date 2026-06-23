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

const NAV_ICON_STROKE_WIDTH = 2;
const ACTIVE_COLOR = 'var(--bottom-nav-active, #22a65a)';
const INACTIVE_COLOR = 'var(--bottom-nav-inactive, #7a7f87)';

function StateIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

function DeputyIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 0 30 18" aria-hidden="true">
      <path
        d="M4.1 4.4h21.8a10.9 10.9 0 0 1-21.8 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth + 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SenatorIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 0 30 18" aria-hidden="true">
      <path
        d="M4.1 13.6h21.8a10.9 10.9 0 0 0-21.8 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth + 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResultIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="8" width="3.1" height="10.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="10.4" y="4.8" width="3.1" height="14" rx="1.2" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="15.8" y="11" width="3.1" height="7.8" rx="1.2" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="20.4" cy="18.8" r="1.05" fill="currentColor" />
    </svg>
  );
}

const STEPS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: StateIcon },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputyIcon },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores, Icon: SenatorIcon },
  { id: 'resultado', label: 'Resultado', path: BALLOT_ROUTES.meuPlano, Icon: ResultIcon }
];

const STEP_BY_PATH = {
  '/home': 'estado',
  [BALLOT_ROUTES.estado]: 'estado',
  [BALLOT_ROUTES.deputadoFederal]: 'deputado',
  '/escolher-deputado-federal/reeleger': 'deputado',
  '/escolher-deputado-federal/renovar': 'deputado',
  [BALLOT_ROUTES.senadores]: 'senador',
  '/escolher-senador-1': 'senador',
  '/escolher-senador-2': 'senador',
  '/escolher-senadores/reeleger': 'senador',
  '/escolher-senadores/renovar': 'senador',
  [BALLOT_ROUTES.meuPlano]: 'resultado',
  '/meu-nossovoto': 'resultado',
  '/meu-voto': 'resultado',
  '/meuvoto': 'resultado',
  '/resultado': 'resultado',
  '/finalizacao': 'resultado'
};

const STEP_ALIASES = {
  nossovoto: 'resultado'
};

const STEP_PROGRESS_BY_ID = {
  estado: (progress, estadoSelecionado) => Boolean(estadoSelecionado || progress?.hasEstado),
  deputado: (progress) => Boolean(progress?.hasDeputadoFederal),
  senador: (progress) => Boolean(progress?.hasSenadores),
  resultado: (progress) => Boolean(progress?.isComplete)
};

function getActiveStep(currentStep, pathname) {
  const normalizedStep = STEP_ALIASES[currentStep] || currentStep;
  return normalizedStep || STEP_BY_PATH[pathname] || 'estado';
}

function getCompletedStepById(progress, estadoSelecionado) {
  return {
    estado: Boolean(estadoSelecionado || progress?.hasEstado),
    deputado: Boolean(progress?.hasDeputadoFederal),
    senador: Boolean(progress?.hasSenadores),
    resultado: Boolean(progress?.isComplete)
  };
}

function getStepLogicState(stepId, activeStep, completedSteps) {
  if (stepId === activeStep) return 'active';
  if (completedSteps[stepId]) return 'complete';
  return 'pending';
}

function getStepLabel(state, isActive) {
  if (isActive) return 'Atual';
  if (state === 'complete') return 'Concluído';
  return 'Inativo';
}

export default function BottomNavigation({ currentStep, placement = 'footer' }) {
  const { user, userData } = useUser();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();

  // === MÁGICA DO SCROLL (INSTAGRAM EFFECT) ===
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let lastScrollY = 0;

    const handleScroll = (e) => {
      const target = e.target;
      const currentScrollY = (target === document || target === window) 
        ? window.scrollY 
        : target.scrollTop;

      if (typeof currentScrollY !== 'number' || currentScrollY < 0) return;

      if (currentScrollY > lastScrollY && currentScrollY > 20) {
        setIsCollapsed(true);
      } else if (currentScrollY < lastScrollY) {
        setIsCollapsed(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);
  // ===========================================

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado();
  const progress = draft ? getBallotProgress(draft) : null;
  const activeStep = getActiveStep(currentStep, location.pathname);
  const completedSteps = getCompletedStepById(progress, estadoSelecionado);
  const currentStepIsValid = STEP_PROGRESS_BY_ID[activeStep]?.(progress, estadoSelecionado) ?? false;
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.id === activeStep));
  const firstPendingIndex = Math.min(activeIndex + 1, STEPS.length - 1);

  const handleNavigate = (step, isClickable) => {
    if (!isClickable) {
      notify.warning('Complete a etapa atual para continuar.', {
        dedupeKey: `bottom-nav-blocked-${step.id}`,
        duration: 4200
      });
      return;
    }

    navigate(step.path, { state: { bypassVoteRedirect: true } });
  };

  return (
    <div className={`app-page-footer app-page-footer--${placement} bottom-nav-shell`}>
      {/* Aqui a classe is-collapsed é ativada quando rolamos */}
      <nav className={`bottom-nav bottom-nav--${placement} ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Navegação do voto">
        {STEPS.map((step, index) => {
          const StepIcon = step.Icon;
          const state = getStepLogicState(step.id, activeStep, completedSteps);
          const isActive = state === 'active';
          const isClickable = state === 'complete' || (index === firstPendingIndex && currentStepIsValid);
          const iconColor = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

          return (
            <div className={`bottom-nav__slot is-${state}`} key={step.id}>
              <button
                className={`bottom-nav__step is-${state} ${isClickable ? 'is-clickable' : 'is-locked'}`}
                type="button"
                onClick={() => handleNavigate(step, isClickable)}
                aria-current={isActive ? 'step' : undefined}
                disabled={!isClickable}
                data-step={step.id}
                title={`${step.label} - ${getStepLabel(state, isActive)}`}
              >
                <span
                  className={`bottom-nav__icon-wrap is-${state} ${step.id === 'deputado' || step.id === 'senador' ? 'is-emphasis' : ''}`}
                  aria-hidden="true"
                  style={{ color: iconColor }}
                >
                  <StepIcon className="bottom-nav__icon" strokeWidth={NAV_ICON_STROKE_WIDTH} />
                </span>

                <span className="bottom-nav__copy">
                  <span className="bottom-nav__label">{step.label}</span>
                </span>
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}