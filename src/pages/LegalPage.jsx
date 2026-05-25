import { Link, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { LEGAL_PAGE_CONTENT } from '@/constants/legalPages';
import { useDesktopExperience } from '@/hooks/useDesktopExperience';
import { useUser } from '@/hooks/useUser';
import AppFooter from '@/components/layout/AppFooter';
import CookiePreferences from '@/components/privacy/CookiePreferences';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import './LegalPage.css';

const HOW_IT_WORKS = [
  {
    eyebrow: '1',
    title: 'Escolha seu estado',
    body: 'Selecione o estado onde você vota para ver candidatos disponíveis no fluxo.'
  },
  {
    eyebrow: '2',
    title: 'Monte seu rascunho',
    body: 'Escolha deputado federal e senadores, revise os nomes e ajuste sua lista.'
  },
  {
    eyebrow: '3',
    title: 'Salve ou continue no celular',
    body: 'Entre na conta para guardar o plano e acessar com segurança em outro dispositivo.'
  }
];

const WITHOUT_LOGIN = [
  'Conhecer o projeto',
  'Escolher estado',
  'Ver candidatos',
  'Montar rascunho local',
  'Revisar escolhas'
];

const WITH_LOGIN = [
  'Salvar rascunho na conta',
  'Recuperar em outro dispositivo',
  'Ver indicadores personalizados',
  'Continuar pelo celular com QR Code temporário'
];

function AboutLanding({ user, isDesktopExperience, onPrimaryCta, onLoginCta }) {
  return (
    <div className="about-page nv-screen">
      <header className="about-header">
        <Link to="/" className="about-header__brand" aria-label="nossovoto.org">
          <ChanceFlame className="about-header__flame" size={26} />
          <strong>nossovoto<span>.org</span></strong>
        </Link>

        <nav className="about-header__nav" aria-label="Navegação institucional">
          <a href="#como-funciona">Como funciona</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#celular">Celular</a>
        </nav>

        <div className="about-header__actions">
          {!isDesktopExperience && (
            <button className="about-header__ghost nv-touch" type="button" onClick={() => window.history.back()}>
              Voltar
            </button>
          )}
          {!user?.uid && (
            <button className="about-header__login nv-touch" type="button" onClick={onLoginCta}>
              Fazer login
            </button>
          )}
        </div>
      </header>

      <main className="about-main nv-scroll">
        <section className="about-hero">
          <div className="about-hero__copy">
            <span className="about-eyebrow">Plano de voto simples, revisável e seguro</span>
            <h1>Monte seu plano de voto com mais clareza</h1>
            <p>
              O Nosso Voto ajuda você a organizar seus candidatos por cargo, revisar suas escolhas
              e salvar um rascunho antes da decisão final.
            </p>
            <p className="about-hero__support">
              Comece sem login, explore os candidatos do seu estado e entre apenas quando quiser salvar seu plano.
            </p>
            <div className="about-hero__actions">
              <button className="about-primary-action nv-touch" type="button" onClick={onPrimaryCta}>
                {user?.uid ? 'Ver candidatos' : 'Começar sem login'}
              </button>
              {!user?.uid && (
                <button className="about-secondary-action nv-touch" type="button" onClick={onLoginCta}>
                  Fazer login
                </button>
              )}
            </div>
          </div>

          <aside className="about-product-preview" aria-label="Prévia do produto">
            <div className="about-preview-card about-preview-card--state">
              <span>Estado escolhido</span>
              <strong>Espírito Santo (ES)</strong>
            </div>
            <div className="about-preview-card about-preview-card--candidate">
              <small>Deputado Federal</small>
              <strong>Nome do candidato</strong>
              <span>Partido / número / cargo</span>
            </div>
            <div className="about-preview-card about-preview-card--candidate is-selected">
              <small>Senadores</small>
              <strong>2 nomes no rascunho</strong>
              <span>Revisão antes de salvar</span>
            </div>
            <div className="about-preview-panel">
              <strong>Meu rascunho</strong>
              <span>Local agora, salvo na conta depois do login.</span>
              <i aria-hidden="true"></i>
            </div>
          </aside>
        </section>

        <section className="about-section about-section--steps" id="como-funciona">
          <div className="about-section__heading">
            <span className="about-eyebrow">Como funciona</span>
            <h2>Do estado ao rascunho final em poucos passos</h2>
          </div>
          <div className="about-step-grid">
            {HOW_IT_WORKS.map((item) => (
              <article className="about-step-card" key={item.title}>
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-section--compare">
          <div className="about-capability-card">
            <span className="about-eyebrow">Sem login</span>
            <h2>Explore antes de criar conta</h2>
            <ul>
              {WITHOUT_LOGIN.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="about-capability-card about-capability-card--login">
            <span className="about-eyebrow">Com login</span>
            <h2>Salve, recupere e libere recursos</h2>
            <ul>
              {WITH_LOGIN.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="about-section about-section--text">
          <div>
            <span className="about-eyebrow">Transparência dos indicadores</span>
            <h2>Indicadores ajudam, mas não decidem por você</h2>
          </div>
          <p>
            Nota, viabilidade e destaques são recursos de apoio para organizar seu plano. Eles não
            substituem sua pesquisa, sua opinião ou sua decisão final. Sempre revise dados, compare
            informações e escolha de forma consciente.
          </p>
        </section>

        <section className="about-section about-section--split" id="privacidade">
          <article>
            <span className="about-eyebrow">Privacidade</span>
            <h2>Seu rascunho é seu</h2>
            <p>
              No modo visitante, suas escolhas ficam apenas neste dispositivo. Ao fazer login, você
              pode salvar o plano na conta e recuperar depois. Nenhum candidato escolhido aparece
              publicamente sem uma ação sua.
            </p>
          </article>
          <article id="celular">
            <span className="about-eyebrow">Continue pelo celular</span>
            <h2>Começou no computador? Continue no celular</h2>
            <p>
              Depois de salvar seu rascunho, usuários logados podem escanear um QR Code temporário
              para abrir o mesmo plano no celular. O acesso expira em poucos minutos e funciona uma única vez.
            </p>
          </article>
        </section>

        <section className="about-final-cta">
          <span className="about-eyebrow">Pronto para experimentar?</span>
          <h2>Comece agora sem login</h2>
          <button className="about-primary-action nv-touch" type="button" onClick={onPrimaryCta}>
            Começar sem login
          </button>
        </section>

        <AppFooter className="app-footer--scroll-content" />
      </main>
    </div>
  );
}

export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const isDesktopExperience = useDesktopExperience();
  const content = LEGAL_PAGE_CONTENT[type] || LEGAL_PAGE_CONTENT.cookies;
  const isAboutPage = type === 'sobre';

  const handlePrimaryCta = () => {
    navigate(BALLOT_ROUTES.estado, { state: { bypassVoteRedirect: true } });
  };

  const handleLoginCta = () => {
    navigate('/login', { state: { from: BALLOT_ROUTES.estado } });
  };

  if (isAboutPage) {
    return (
      <AboutLanding
        user={user}
        isDesktopExperience={isDesktopExperience}
        onPrimaryCta={handlePrimaryCta}
        onLoginCta={handleLoginCta}
      />
    );
  }

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
            {isAboutPage && (
              <div className="legal-cta">
                <button className="legal-cta__primary nv-touch" type="button" onClick={handlePrimaryCta}>
                  {user?.uid ? 'Ver candidatos' : (isDesktopExperience ? 'Começar sem login' : 'Começar')}
                </button>
                {!user?.uid && (
                  <button className="legal-cta__secondary nv-touch" type="button" onClick={handleLoginCta}>
                    Fazer login
                  </button>
                )}
              </div>
            )}
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

        <AppFooter className="app-footer--scroll-content" />
      </main>
    </div>
  );
}
