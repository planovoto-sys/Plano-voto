import { MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import {
  getBallotEstado,
  getBallotProgress,
  getVisitorBallotEstado,
  readBallotDraft,
  readVisitorBallotDraft
} from '@/services/voting/votingService';
import './BottomNavigation.css';

function DeputyIcon({ className = '', strokeWidth = 2.2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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

function SenatorIcon({ className = '', strokeWidth = 2.2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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

function FlameOutlineIcon({
  className = '',
  strokeWidth = 2.15,
  ...props
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M8.1 21C5.4 20.3 3.7 18 3.7 15.1C3.7 13 4.7 11.1 4.9 8.5C6.6 9.5 7.6 11.1 7.7 13C9.7 11.5 10.3 9.3 10.2 7C10.1 5 11.2 3.3 13.5 2.2C13 5 14.2 7.1 16 9.3C17.7 11.3 18.8 13.3 18.8 15.8C20.1 14.6 20.7 12.7 20.4 10.5C21.8 12.1 22.4 14.2 22.1 16.3C21.7 18.9 19.6 20.5 16.2 21"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.8 21C8.9 20.2 7.7 18.4 7.7 16.3C7.7 14.9 8.2 13.5 9.2 12.3C9.3 13.4 9.9 14.3 10.8 14.8C10.7 12.1 11.8 10 13.7 8.9C13.4 10.8 13.9 12.1 15.3 13.6C16.5 14.9 17 16.1 17 17.5C17 19 16 20.2 14.3 21"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PROGRESS_ITEMS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: MapPin },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputyIcon },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores, Icon: SenatorIcon }
];

const NAV_ITEMS = [
  ...PROGRESS_ITEMS,
  {
    id: 'nossovoto',
    label: 'Nosso Voto',
    path: BALLOT_ROUTES.meuPlano,
    Icon: FlameOutlineIcon,
    brand: true,
    strokeWidth: 2.15
  }
];

const STEP_BY_PATH = {
  '/home': 'estado',
  '/escolher-deputado-federal': 'deputado',
  '/escolher-deputado-federal/reeleger': 'deputado',
  '/escolher-deputado-federal/renovar': 'deputado',
  '/escolher-senador-1': 'senador',
  '/escolher-senador-2': 'senador',
  '/escolher-senadores': 'senador',
  '/escolher-senadores/reeleger': 'senador',
  '/escolher-senadores/renovar': 'senador',
  [BALLOT_ROUTES.meuPlano]: 'nossovoto',
  '/meu-nossovoto': 'nossovoto',
  '/meu-voto': 'nossovoto',
  '/meuvoto': 'nossovoto',
  '/resultado': 'nossovoto',
  '/finalizacao': 'nossovoto'
};

export default function BottomNavigation({ currentStep, placement = 'footer' }) {
  const { user, userData } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : readVisitorBallotDraft();
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : getVisitorBallotEstado();
  const progress = draft ? getBallotProgress(draft) : null;
  const activeStep = currentStep || STEP_BY_PATH[location.pathname] || 'estado';

  const enabledByStep = {
    estado: true,
    deputado: Boolean(estadoSelecionado),
    senador: Boolean(estadoSelecionado) && Boolean(progress?.hasDeputadoFederal),
    nossovoto: true
  };

  const handleNavigate = (item, isDisabled) => {
    if (isDisabled) return;
    if (!item.path) return;
    navigate(item.path, { state: { bypassVoteRedirect: true } });
  };

  const NavigationShell = placement === 'header' ? 'div' : 'footer';
  const visibleItems = NAV_ITEMS;
  const activeIndex = activeStep === 'nossovoto'
    ? PROGRESS_ITEMS.length
    : PROGRESS_ITEMS.findIndex((item) => item.id === activeStep);

  return (
    <NavigationShell className={`app-page-footer app-page-footer--${placement} nv-no-overflow`}>
      <nav className="bottom-step-nav" aria-label="Etapas do voto">
        {visibleItems.map((item) => {
          const StepIcon = item.Icon;
          const isActive = activeStep === item.id;
          const isDisabled = !isActive && !enabledByStep[item.id];
          const itemIndex = PROGRESS_ITEMS.findIndex((progressItem) => progressItem.id === item.id);
          const isProgressItem = itemIndex > -1;
          const isComplete = isProgressItem && activeIndex > itemIndex;
          const isFuture = isProgressItem && itemIndex > activeIndex;

          return (
            <button
              key={item.id}
              className={[
                'bottom-step-nav__item',
                'nv-touch',
                `bottom-step-nav__item--${item.id}`,
                item.brand ? 'bottom-step-nav__item--brand' : '',
                isActive ? 'is-active' : '',
                isComplete ? 'is-complete' : '',
                isFuture ? 'is-future' : ''
              ].filter(Boolean).join(' ')}
              type="button"
              onClick={() => handleNavigate(item, isDisabled)}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={isDisabled}
              disabled={isDisabled}
            >
              <StepIcon
                className="bottom-step-nav__icon"
                strokeWidth={item.strokeWidth ?? 2.2}
                aria-hidden="true"
              />
              <span className="bottom-step-nav__label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </NavigationShell>
  );
}
