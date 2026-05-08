import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  clearVoteReceipt,
  getBallotEstado,
  getBallotProgress,
  readBallotDraft,
  resetBallotForState
} from '@/services/voting/votingService';
import {
  DeputadoNavIcon,
  EstadoNavIcon,
  OptionsNavIcon,
  SenadoNavIcon
} from '@/components/icons/AppIcons';
import './BottomNavigation.css';

const PROGRESS_ITEMS = [
  { id: 'estado', label: 'estado', path: BALLOT_ROUTES.estado, Icon: EstadoNavIcon },
  { id: 'deputado', label: 'deputado', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputadoNavIcon },
  { id: 'senador', label: 'senador', path: BALLOT_ROUTES.senadores, Icon: SenadoNavIcon }
];

const NAV_ITEMS = [
  ...PROGRESS_ITEMS,
  { id: 'opcoes', label: 'opções', path: null, Icon: OptionsNavIcon }
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
  '/finalizacao': 'senador'
};

export default function BottomNavigation({ currentStep, placement = 'footer' }) {
  const { user, userData } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : null;
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : userData?.estado;
  const progress = draft ? getBallotProgress(draft) : null;
  const activeStep = currentStep || STEP_BY_PATH[location.pathname] || 'estado';

  const enabledByStep = {
    estado: true,
    deputado: Boolean(estadoSelecionado),
    senador: Boolean(estadoSelecionado) && Boolean(progress?.hasDeputadoFederal),
    opcoes: true
  };

  const handleNavigate = (item, isDisabled) => {
    if (item.id === 'opcoes') {
      setIsOptionsOpen(true);
      return;
    }

    if (isDisabled || !item.path) return;
    navigate(item.path, { state: { bypassVoteRedirect: true } });
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsOptionsOpen(false);
    navigate('/');
  };

  const closeOptions = () => setIsOptionsOpen(false);

  const navigateFromOptions = (path) => {
    closeOptions();
    navigate(path, { state: { bypassVoteRedirect: true } });
  };

  const handleClearChoices = async () => {
    if (user?.uid && estadoSelecionado) {
      try {
        await resetBallotForState(user.uid, estadoSelecionado);
        clearVoteReceipt(user.uid);
      } catch (error) {
        console.warn('Nao foi possivel limpar as escolhas agora.', error);
      }
    }

    navigateFromOptions(BALLOT_ROUTES.estado);
  };

  const NavigationShell = placement === 'header' ? 'div' : 'footer';
  const visibleItems = NAV_ITEMS;
  const activeIndex = PROGRESS_ITEMS.findIndex((item) => item.id === activeStep);

  return (
    <>
      <NavigationShell className={`app-page-footer app-page-footer--${placement}`}>
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
                <StepIcon className="bottom-step-nav__icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </NavigationShell>

      {isOptionsOpen && (
        <div className="options-drawer-shell" role="dialog" aria-modal="true" aria-label="Opções">
          <button className="options-drawer-backdrop" type="button" aria-label="Fechar menu" onClick={closeOptions}></button>
          <aside className="options-drawer">
            <div className="options-drawer__profile">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" />
              ) : (
                <span>{(userData?.name || user?.displayName || 'U').slice(0, 1).toUpperCase()}</span>
              )}
              <strong>{userData?.name || user?.displayName || 'Usuário'}</strong>
              <small>{userData?.email || user?.email || 'meuvoto.org'}</small>
            </div>

            <div className="options-drawer__info">
              <div className="options-drawer__state-copy">
                <span>Estado eleitoral</span>
                <strong>{estadoSelecionado || 'Não selecionado'}</strong>
              </div>
              <button className="options-drawer__state-action" type="button" onClick={() => navigateFromOptions(BALLOT_ROUTES.estado)}>
                Alterar
              </button>
            </div>

            <div className="options-drawer__actions">
              <button type="button" onClick={handleClearChoices}>
                Limpar escolhas
              </button>
            </div>

            <button className="options-drawer__logout" type="button" onClick={handleLogout}>
              Sair
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
