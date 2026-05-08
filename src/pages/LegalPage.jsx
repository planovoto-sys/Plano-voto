import { Link, useNavigate } from 'react-router-dom';
import { LEGAL_PAGE_CONTENT } from '@/constants/legalPages';
import AppFooter from '@/components/layout/AppFooter';
import './LegalPage.css';

export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const content = LEGAL_PAGE_CONTENT[type] || LEGAL_PAGE_CONTENT.cookies;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-header__brand">meuvoto.org</Link>
        <button className="legal-header__back" type="button" onClick={() => navigate(-1)}>
          ← Voltar
        </button>
      </header>

      <main className="legal-main">
        <section className="legal-panel">
          <div className="legal-panel__heading">
            <h1>{content.title}</h1>
            <p>{content.subtitle}</p>
          </div>

          <div className="legal-section-list">
            {content.sections.map((section) => (
              <section className="legal-section" key={section.heading}>
                <h2>{section.heading}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
