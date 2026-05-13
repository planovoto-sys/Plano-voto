import { Link, useNavigate } from 'react-router-dom';
import { LEGAL_PAGE_CONTENT } from '@/constants/legalPages';
import AppFooter from '@/components/layout/AppFooter';
import CookiePreferences from '@/components/privacy/CookiePreferences';
import './LegalPage.css';

export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const content = LEGAL_PAGE_CONTENT[type] || LEGAL_PAGE_CONTENT.cookies;

  return (
    <div className="legal-page nv-screen">
      <header className="legal-header nv-container">
        <Link to="/" className="legal-header__brand">nossovoto.org</Link>
        <button className="legal-header__back nv-touch" type="button" onClick={() => navigate(-1)}>
          ← Voltar
        </button>
      </header>

      <main className="legal-main nv-scroll">
        <section className="legal-panel nv-container">
          <div className="legal-panel__heading">
            <h1>{content.title}</h1>
            <p>{content.subtitle}</p>
          </div>

          <div className="legal-section-list">
            {content.sections.map((section) => (
              <section className="legal-section" key={section.heading}>
                <h2>{section.heading}</h2>
                {Array.isArray(section.body) ? (
                  section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                ) : (
                  <p>{section.body}</p>
                )}
              </section>
            ))}
          </div>

          {type === 'cookies' && <CookiePreferences />}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
