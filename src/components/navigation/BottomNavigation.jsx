import { MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import fireIconUrl from '@/assets/icone-fogo.png';
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

function FireMaskIcon({
  className = '',
  style,
  ...props
}) {
  const iconStyle = {
    backgroundColor: 'currentColor',
    WebkitMaskImage: `url(${fireIconUrl})`,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: '24px 24px',
    maskImage: `url(${fireIconUrl})`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: '24px 24px',
    ...style
  };

  return (
    <span
      className={className}
      aria-hidden="true"
      style={iconStyle}
      {...props}
    />
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
    label: 'NossoVoto',
    path: BALLOT_ROUTES.meuPlano,
    Icon: FireMaskIcon,
    brand: true,
    strokeWidth: null
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
          const iconProps = item.strokeWidth === null ? {} : { strokeWidth: item.strokeWidth ?? 2.2 };
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
                {...iconProps}
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
