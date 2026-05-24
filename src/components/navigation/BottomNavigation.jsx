import { CheckCircle2, Landmark, MapPin, Users } from 'lucide-react';
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

const PROGRESS_ITEMS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado, Icon: MapPin },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal, Icon: Users },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores, Icon: Landmark }
];

const NAV_ITEMS = [
  ...PROGRESS_ITEMS,
  { id: 'nossovoto', label: 'Nosso Voto', path: BALLOT_ROUTES.meuPlano, Icon: CheckCircle2, brand: true }
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
              <StepIcon className="bottom-step-nav__icon" strokeWidth={2.2} aria-hidden="true" />
              <span className="bottom-step-nav__label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </NavigationShell>
  );
}
