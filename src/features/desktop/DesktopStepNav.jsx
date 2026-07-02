import { useLocation, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';

const LINKS = [
  { id: 'estado', label: 'Estado', path: BALLOT_ROUTES.estado },
  { id: 'deputado', label: 'Deputados', path: BALLOT_ROUTES.deputadoFederal },
  { id: 'senador', label: 'Senadores', path: BALLOT_ROUTES.senadores },
  { id: 'resumo', label: 'Resumo', path: BALLOT_ROUTES.meuPlano }
];

export default function DesktopStepNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  return (
    <nav className="desktop-step-nav" aria-label="Navegação do desktop">
      {LINKS.map((link) => (
        <button
          key={link.id}
          type="button"
          className={`desktop-step-nav__link ${activePath === link.path ? 'is-active' : ''}`}
          onClick={() => navigate(link.path, { state: { bypassVoteRedirect: true } })}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}
