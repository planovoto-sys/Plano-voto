import { Link } from 'react-router-dom';
import { LEGAL_NAV_LINKS } from '@/shared/constants/legalPages';
import './AppFooter.css';

const linkByPath = new Map(LEGAL_NAV_LINKS.map((link) => [link.path, link]));

const footerLinkGroups = [
  {
    title: 'Privacidade',
    links: [
      linkByPath.get('/central-de-privacidade'),
      linkByPath.get('/politica-de-privacidade'),
      linkByPath.get('/cookies'),
      linkByPath.get('/cookies#permissoes'),
      linkByPath.get('/lgpd')
    ]
  },
  {
    title: 'Dados e conta',
    links: [
      linkByPath.get('/dados-no-dispositivo'),
      linkByPath.get('/excluir-dados'),
      linkByPath.get('/fornecedores')
    ]
  },
  {
    title: 'Institucional',
    links: [
      linkByPath.get('/termos-de-uso'),
      linkByPath.get('/aviso-eleitoral'),
      { label: 'Sobre nós', path: '/sobre-nos' }
    ]
  }
];

export default function AppFooter({ className = '' }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`app-footer nv-no-overflow ${className}`.trim()}>
      <div className="app-footer__inner nv-container">
        <div className="app-footer__brand">
          <strong>Bom de Voto</strong>
          <span>Voto consciente, simples e organizado.</span>
        </div>

        <nav className="app-footer__links" aria-label="Informações legais">
          <strong>Legal e privacidade</strong>
          <div className="app-footer__link-groups">
            {footerLinkGroups.map((group) => (
              <section className="app-footer__link-group" key={group.title} aria-label={group.title}>
                <span className="app-footer__group-title">{group.title}</span>
                {group.links.filter(Boolean).map((link) => (
                  <Link key={link.path} to={link.path}>
                    {link.label}
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </nav>

        <div className="app-footer__contact">
          <strong>Contato</strong>
          <a href="mailto:plano.voto@gmail.com">Email: plano.voto@gmail.com</a>
        </div>

        <div className="app-footer__copyright">
          <span>© {currentYear} Bom de Voto. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
