import { Link } from 'react-router-dom';
import './AppFooter.css';

const footerLinks = [
  { label: 'Cookies', path: '/cookies' },
  { label: 'Política de Privacidade', path: '/politica-de-privacidade' },
  { label: 'LGPD', path: '/lgpd' },
  { label: 'Sobre nós', path: '/sobre-nos' }
];

export default function AppFooter({ className = '' }) {
  return (
    <footer className={`app-footer ${className}`.trim()}>
      <div className="app-footer__inner">
        <div className="app-footer__brand">
          <strong>meuvoto.org</strong>
          <span>Voto consciente, simples e organizado.</span>
        </div>

        <nav className="app-footer__links" aria-label="Informações legais">
          <strong>Links legais</strong>
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
      </div>
    </footer>
  );
}
