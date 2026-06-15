import { Check, ChevronRight, MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import fireIconUrl from '@/assets/icone-fogo.png';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import {
  getBallotEstado,
  getBallotProgress,
  getVisitorBallotEstado,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/features/ballot';

const NAV_ICON_STROKE_WIDTH = 2.1;

function DeputyIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 4 24 16" aria-hidden="true">
      <path
        d="M3.7 7.2h16.6M3.7 7.2c0 6.3 3.7 10.4 8.3 10.4s8.3-4.1 8.3-10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SenatorIcon({ className = '', strokeWidth = NAV_ICON_STROKE_WIDTH }) {
  return (
    <svg className={className} viewBox="0 4 24 16" aria-hidden="true">
      <path
        d="M3.7 17.2h16.6M3.7 17.2c0-6.3 3.7-10.4 8.3-10.4s8.3 4.1 8.3 10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FireMaskIcon({ className = '', style, ...props }) {
  const iconStyle = {
    objectFit: 'contain',
    objectPosition: 'center',
    padding: '0',
    boxSizing: 'border-box',
    ...style
  };

  return <img className={className} src={fireIconUrl} alt="" aria-hidden="true" style={iconStyle} {...props} />;
}

const STEPS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: MapPin },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputyIcon },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores, Icon: SenatorIcon },
  { id: 'nossovoto', label: 'nossovoto', path: BALLOT_ROUTES.meuPlano, Icon: FireMaskIcon }
];

const STEP_BY_PATH = {
  [BALLOT_ROUTES.estado]: 'estado',
  [BALLOT_ROUTES.deputadoFederal]: 'deputado',
  [BALLOT_ROUTES.senadores]: 'senador',
  [BALLOT_ROUTES.meuPlano]: 'nossovoto'
};

const STEP_STATUS_LABELS = {
  complete: 'Concluído',
  active: 'Em Progresso',
  pending: 'Próximo Passo',
  final: 'Etapa Final'
};

const STEP_PROGRESS_BY_ID = {
  estado: (progress, estadoSelecionado) => Boolean(estadoSelecionado || progress?.hasEstado),
  deputado: (progress) => Boolean(progress?.hasDeputadoFederal),
  senador: (progress) => Boolean(progress?.hasSenadores),
  nossovoto: (progress) => Boolean(progress?.isComplete)
};

function getCompletedStepById(progress, estadoSelecionado) {
  return {
    estado: Boolean(estadoSelecionado || progress?.hasEstado),
    deputado: Boolean(progress?.hasDeputadoFederal),
    senador: Boolean(progress?.hasSenadores),
    nossovoto: Boolean(progress?.isComplete)
  };
}

function getStepState(stepId, activeStep, completedSteps) {
  if (stepId === activeStep) return 'active';
  if (completedSteps[stepId]) return 'complete';
  return 'pending';
}

function getStepStatus(state, index, totalSteps) {
  if (state === 'complete') return STEP_STATUS_LABELS.complete;
  if (state === 'active') return STEP_STATUS_LABELS.active;
  return index === totalSteps - 1 ? STEP_STATUS_LABELS.final : STEP_STATUS_LABELS.pending;
}

export default function DesktopStepNav({ currentStep }) {
  const { user, userData } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const progress = draft ? getBallotProgress(draft) : null;
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado();
  const activeStep = currentStep || STEP_BY_PATH[location.pathname] || 'estado';
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.id === activeStep));
  const currentStepIsValid = STEP_PROGRESS_BY_ID[activeStep]?.(progress, estadoSelecionado) ?? false;
  const firstPendingIndex = Math.min(activeIndex + 1, STEPS.length - 1);
  const completedSteps = getCompletedStepById(progress, estadoSelecionado);

  const handleNavigate = (step, isClickable) => {
    if (!isClickable) return;
    navigate(step.path, { state: { bypassVoteRedirect: true } });
  };

  return (
    <nav className="desktop-step-nav" aria-label="Etapas do voto">
      {STEPS.map((step, index) => {
        const StepIcon = step.Icon;
        const state = getStepState(step.id, activeStep, completedSteps);
        const isClickable = state === 'complete' || (index === firstPendingIndex && currentStepIsValid);
        const isFirstPending = index === firstPendingIndex && state === 'pending';
        const statusLabel = getStepStatus(state, index, STEPS.length);
        const iconProps = step.id === 'nossovoto' ? {} : { strokeWidth: NAV_ICON_STROKE_WIDTH };
        const stepClasses = [
          'desktop-step-nav__step',
          `is-${state}`,
          isClickable ? 'is-clickable' : 'is-locked'
        ].join(' ');

        return (
          <div className="desktop-step-nav__slot" key={step.id}>
            {index > 0 && (
              <span
                className={[
                  'desktop-step-nav__connector',
                  index <= activeIndex ? 'is-complete' : 'is-pending'
                ].join(' ')}
                aria-hidden="true"
              />
            )}

            {isFirstPending && isClickable && (
              <span className="desktop-step-nav__back-indicator" aria-hidden="true">
                <ChevronRight />
              </span>
            )}

            <button
              className={stepClasses}
              type="button"
              onClick={() => handleNavigate(step, isClickable)}
              aria-current={state === 'active' ? 'step' : undefined}
              disabled={!isClickable}
              title={`${step.label} - ${statusLabel}`}
            >
              <span className={`desktop-step-nav__node is-${state} ${step.id === 'nossovoto' ? 'is-brand' : ''}`} aria-hidden="true">
                <StepIcon className="desktop-step-nav__icon" {...iconProps} />
                {state === 'complete' && (
                  <span className="desktop-step-nav__check" aria-hidden="true">
                    <Check />
                  </span>
                )}
              </span>

              <span className="desktop-step-nav__copy">
                <span className="desktop-step-nav__label">{step.label}</span>
                <span className="desktop-step-nav__status">{statusLabel}</span>
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
