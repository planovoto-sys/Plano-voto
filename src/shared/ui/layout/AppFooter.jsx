import { Link } from 'react-router-dom';
import { LEGAL_NAV_LINKS } from '@/shared/constants/legalPages';
import './AppFooter.css';

const footerLinks = [
  ...LEGAL_NAV_LINKS,
  { label: 'Sobre nós', path: '/sobre-nos' }
];

export default function AppFooter({ className = '' }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`app-footer nv-no-overflow ${className}`.trim()}>
      <div className="app-footer__inner nv-container">
        <div className="app-footer__brand">
          <strong>nossovoto.org</strong>
          <span>Voto consciente, simples e organizado.</span>
        </div>

        <nav className="app-footer__links" aria-label="Informações legais">
          <strong>Legal e privacidade</strong>
          {footerLinks.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="app-footer__contact">
          <strong>Contato</strong>
          <a href="mailto:plano.voto@gmail.com">Email: plano.voto@gmail.com</a>
        </div>

        <div className="app-footer__copyright">
          <span>© {currentYear} nossovoto.org. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
