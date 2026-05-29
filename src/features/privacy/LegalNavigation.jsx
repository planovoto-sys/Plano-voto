import { Link, useLocation } from 'react-router-dom';
import { LEGAL_NAV_LINKS } from '@/shared/constants/legalPages';

export default function LegalNavigation() {
  const location = useLocation();

  return (
    <nav className="legal-nav" aria-label="Páginas legais e de transparência">
      {LEGAL_NAV_LINKS.map((link) => {
        const [pathname, hash] = link.path.split('#');
        const isActive = location.pathname === pathname && (!hash || location.hash === `#${hash}`);

        return (
          <Link
            className={isActive ? 'is-active' : ''}
            key={link.path}
            to={link.path}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
