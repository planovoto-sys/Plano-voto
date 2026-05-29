import { useLocation, useNavigate } from 'react-router-dom';
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

const STEPS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores },
  { id: 'nossovoto', label: 'nossovoto', path: BALLOT_ROUTES.meuPlano }
];

const STEP_BY_PATH = {
  [BALLOT_ROUTES.estado]: 'estado',
  [BALLOT_ROUTES.deputadoFederal]: 'deputado',
  [BALLOT_ROUTES.senadores]: 'senador',
  [BALLOT_ROUTES.meuPlano]: 'nossovoto'
};

export default function DesktopStepNav({ currentStep }) {
  const { user, userData } = useUser();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const progress = getBallotProgress(draft);
  const activeStep = currentStep || STEP_BY_PATH[location.pathname] || 'estado';
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
  const hasEstado = Boolean(progress.hasEstado || (user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado()));
  const hasDeputado = Boolean(progress.hasDeputadoFederal);
  const enabledByStep = {
    estado: true,
    deputado: hasEstado,
    senador: hasEstado,
    nossovoto: true
  };

  const getBlockedMessage = (id) => {
    if (id === 'deputado' || id === 'senador') return 'Escolha seu estado para continuar.';
    return 'Complete a etapa atual para continuar.';
  };

  const getPlanWarning = () => {
    if (!progress.hasEstado) return 'Escolha seu estado para completar o plano.';
    if (!progress.hasDeputadoFederal) return 'Escolha 1 deputado federal para completar o plano.';
    if (!progress.hasSenadores) {
      return progress.hasSenador1
        ? 'Escolha mais 1 senador para completar o plano.'
        : 'Escolha 2 senadores para completar o plano.';
    }
    return '';
  };

  const handleNavigate = (step, disabled) => {
    if (disabled) {
      notify.warning(getBlockedMessage(step.id), {
        dedupeKey: `desktop-step-blocked-${step.id}`,
        duration: 4200
      });
      return;
    }

    if (step.id === 'senador' && hasEstado && !hasDeputado) {
      notify.warning('Escolha 1 deputado federal para completar o plano.', {
        dedupeKey: 'desktop-step-senator-without-deputy',
        duration: 4200
      });
    }

    if (step.id === 'nossovoto' && !progress.isComplete) {
      const message = getPlanWarning();
      if (message) {
        notify.warning(message, {
          dedupeKey: 'desktop-step-incomplete-plan',
          duration: 4200
        });
      }
    }

    navigate(step.path, { state: { bypassVoteRedirect: true } });
  };

  return (
    <nav className="desktop-step-nav" aria-label="Etapas do voto">
      {STEPS.map((step, index) => {
        const isActive = step.id === activeStep;
        const isComplete = activeIndex > index;
        const isDisabled = !isActive && !enabledByStep[step.id];

        return (
          <button
            key={step.id}
            className={[
              'desktop-step-nav__item',
              isActive ? 'is-active' : '',
              isComplete ? 'is-complete' : '',
              isDisabled ? 'is-disabled' : ''
            ].filter(Boolean).join(' ')}
            type="button"
            onClick={() => handleNavigate(step, isDisabled)}
            aria-current={isActive ? 'page' : undefined}
            aria-disabled={isDisabled}
          >
            <span className="desktop-step-nav__dot" aria-hidden="true" />
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
