import { Link } from 'react-router-dom';
import './AppFooter.css';

export default function AppFooter({ className = '' }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`app-footer nv-no-overflow ${className}`.trim()}>
      <div className="app-footer__bar" />
      <div className="app-footer__inner">
        <div className="app-footer__brand">
          <strong>Bom de Voto</strong>
          <span>Voto consciente, simples e organizado.</span>
        </div>

        <div className="app-footer__links">
          <Link to="/sobre-nos">Sobre nós</Link>
          <Link to="/termos-de-uso">Termos & Aviso Eleitoral</Link>
          <Link to="/politica-de-privacidade">Privacidade e Dados</Link>
        </div>

        <div className="app-footer__contact">
          <a href="mailto:plano.voto@gmail.com">plano.voto@gmail.com</a>
        </div>

        <div className="app-footer__copyright">
          <span>© {currentYear} Bom de Voto. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
