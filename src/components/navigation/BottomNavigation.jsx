import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { STATE_NAMES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  getBallotEstado,
  getBallotProgress,
  readBallotDraft
} from '@/services/voting/votingService';
import {
  DeputadoNavIcon,
  EstadoNavIcon,
  NossoVotoNavIcon,
  SenadoNavIcon
} from '@/components/icons/AppIcons';
import { getCandidateName } from '@/utils/candidateMetrics';
import './BottomNavigation.css';

const PROGRESS_ITEMS = [
  { id: 'estado', label: 'estado', path: BALLOT_ROUTES.estado, Icon: EstadoNavIcon },
  { id: 'deputado', label: 'deputado', path: BALLOT_ROUTES.deputadoFederal, Icon: DeputadoNavIcon },
  { id: 'senador', label: 'senador', path: BALLOT_ROUTES.senadores, Icon: SenadoNavIcon }
];

const NAV_ITEMS = [
  ...PROGRESS_ITEMS,
  { id: 'nossovoto', label: 'nossovoto', path: null, Icon: NossoVotoNavIcon, brand: true }
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
  '/escolher-senadores/renovar': 'senador'
};

const formatCandidateSummary = (candidates = []) => {
  const names = candidates
    .map((candidate) => getCandidateName(candidate))
    .filter(Boolean);

  if (names.length === 0) return 'Nenhum selecionado';
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, +${names.length - 1}`;
};

export default function BottomNavigation({ currentStep, placement = 'footer' }) {
  const { user, userData } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const draft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : null;
  const estadoSelecionado = user?.uid ? getBallotEstado(user.uid, userData?.estado) : userData?.estado;
  const progress = draft ? getBallotProgress(draft) : null;
  const activeStep = currentStep || STEP_BY_PATH[location.pathname] || 'estado';
  const estadoNome = estadoSelecionado ? STATE_NAMES[estadoSelecionado] || estadoSelecionado : '';
  const profileName = userData?.name || user?.displayName || 'Usuário';
  const profileEmail = userData?.email || user?.email || '';
  const profileImage = userData?.profile_image || user?.photoURL || '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'N';
  const deputadoFederalResumo = draft?.candidate_groups?.deputado_federal || draft?.selections?.deputado_federal || [];
  const senadoresResumo = draft?.candidate_groups?.senadores_1 || draft?.selections?.senadores || [];

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const enabledByStep = {
    estado: true,
    deputado: Boolean(estadoSelecionado),
    senador: Boolean(estadoSelecionado) && Boolean(progress?.hasDeputadoFederal),
    nossovoto: true
  };

  const handleNavigate = (item, isDisabled) => {
    if (isDisabled) return;
    if (item.brand) {
      setDrawerOpen((open) => !open);
      return;
    }
    if (!item.path) return;
    navigate(item.path, { state: { bypassVoteRedirect: true } });
  };

  const handleSummaryNavigate = (path) => {
    setDrawerOpen(false);
    navigate(path, { state: { bypassVoteRedirect: true } });
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await signOut(auth);
    navigate('/', { replace: true });
  };

  const NavigationShell = placement === 'header' ? 'div' : 'footer';
  const visibleItems = NAV_ITEMS;
  const activeIndex = PROGRESS_ITEMS.findIndex((item) => item.id === activeStep);

  return (
    <NavigationShell className={`app-page-footer app-page-footer--${placement} nv-no-overflow`}>
      <nav className="bottom-step-nav" aria-label="Etapas do voto">
        {visibleItems.map((item) => {
          const StepIcon = item.Icon;
          const isActive = item.brand ? drawerOpen : activeStep === item.id;
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
                item.brand ? 'bottom-step-nav__item--brand' : '',
                isActive ? 'is-active' : '',
                isComplete ? 'is-complete' : '',
                isFuture ? 'is-future' : ''
              ].filter(Boolean).join(' ')}
              type="button"
              onClick={() => handleNavigate(item, isDisabled)}
              aria-current={!item.brand && isActive ? 'page' : undefined}
              aria-disabled={isDisabled}
              aria-haspopup={item.brand ? 'dialog' : undefined}
              aria-expanded={item.brand ? drawerOpen : undefined}
              aria-controls={item.brand ? `nossovoto-menu-${placement}` : undefined}
              disabled={isDisabled}
            >
              <StepIcon className="bottom-step-nav__icon" />
              <span className="bottom-step-nav__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {drawerOpen && (
        <div className="options-drawer-shell nv-no-overflow">
          <button
            className="options-drawer-backdrop"
            type="button"
            aria-label="Fechar menu nossovoto"
            onClick={() => setDrawerOpen(false)}
          />
          <section
            className="options-drawer nv-no-overflow"
            id={`nossovoto-menu-${placement}`}
            role="dialog"
            aria-modal="true"
            aria-label="Menu nossovoto"
          >
            <div className="options-drawer__profile">
              {profileImage ? (
                <img src={profileImage} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden="true">{profileInitial}</span>
              )}
              <strong>{profileName}</strong>
              {profileEmail && <small>{profileEmail}</small>}
            </div>

            <div className="options-drawer__summary" aria-label="Resumo do voto">
              <button
                className="options-drawer__summary-item nv-touch"
                type="button"
                onClick={() => handleSummaryNavigate(BALLOT_ROUTES.estado)}
              >
                <span>Meu estado</span>
                <strong>{estadoSelecionado ? `${estadoNome} (${estadoSelecionado})` : 'Não selecionado'}</strong>
              </button>

              <button
                className="options-drawer__summary-item nv-touch"
                type="button"
                onClick={() => handleSummaryNavigate(BALLOT_ROUTES.deputadoFederal)}
              >
                <span>Deputado federal</span>
                <strong>{formatCandidateSummary(deputadoFederalResumo)}</strong>
              </button>

              <button
                className="options-drawer__summary-item nv-touch"
                type="button"
                onClick={() => handleSummaryNavigate(BALLOT_ROUTES.senadores)}
              >
                <span>Senadores</span>
                <strong>{formatCandidateSummary(senadoresResumo)}</strong>
              </button>
            </div>

            <button className="options-drawer__logout nv-touch" type="button" onClick={handleLogout}>
              Sair
            </button>
          </section>
        </div>
      )}
    </NavigationShell>
  );
}
