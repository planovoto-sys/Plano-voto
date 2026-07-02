import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import {
  COOKIE_CATEGORY_ROWS,
  LEGAL_PAGE_CONTENT,
  PRIVACY_DATA_ROWS,
  PROVIDER_ROWS
} from '@/shared/constants/legalPages';
import { useDesktopExperience } from '@/shared/hooks/useDesktopExperience';
import { useUser } from '@/shared/hooks/useUser';
import AppFooter from '@/shared/ui/layout/AppFooter';
import AccountDeletionPanel from '@/features/privacy-controls/AccountDeletionPanel';
import LocalDataActions from '@/features/privacy-controls/LocalDataActions';
import PrivacyControlCenter from '@/features/privacy-controls/PrivacyControlCenter';
import CookiePreferences from '@/features/privacy/CookiePreferences';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import LegalNavigation from './LegalNavigation';
import LegalTable from './LegalTable';
import './LegalPage.css';
import '@/features/privacy-controls/privacyControls.css';

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

const COOKIE_COLUMNS = [
  { key: 'categoria', label: 'Categoria' },
  { key: 'finalidade', label: 'Finalidade' },
  { key: 'obrigatorio', label: 'Obrigatório?' },
  { key: 'controle', label: 'Pode desativar?' },
  { key: 'exemplos', label: 'Exemplos' }
];

const PRIVACY_DATA_COLUMNS = [
  { key: 'dado', label: 'Dado' },
  { key: 'finalidade', label: 'Finalidade' },
  { key: 'base', label: 'Base/hipótese' },
  { key: 'local', label: 'Onde pode ser salvo' },
  { key: 'retencao', label: 'Retenção' },
  { key: 'controle', label: 'Controle do usuário' }
];

const PROVIDER_COLUMNS = [
  { key: 'categoria', label: 'Categoria' },
  { key: 'finalidade', label: 'Finalidade' },
  { key: 'dados', label: 'Dados possíveis' },
  { key: 'exemplo', label: 'Exemplo de fornecedor' }
];

function LegalPageExtras({ type }) {
  if (type === 'cookies') {
    return (
      <>
        <LegalTable caption="Categorias de cookies e controles" columns={COOKIE_COLUMNS} rows={COOKIE_CATEGORY_ROWS} />
        <CookiePreferences />
      </>
    );
  }

  if (type === 'privacidade') {
    return (
      <LegalTable caption="Tabela objetiva de dados tratados" columns={PRIVACY_DATA_COLUMNS} rows={PRIVACY_DATA_ROWS} />
    );
  }

  if (type === 'dadosNoDispositivo') return <LocalDataActions />;

  if (type === 'excluirDados') return <AccountDeletionPanel />;

  if (type === 'centralPrivacidade') return <PrivacyControlCenter />;

  if (type === 'fornecedores') {
    return (
      <LegalTable caption="Categorias de fornecedores e operadores" columns={PROVIDER_COLUMNS} rows={PROVIDER_ROWS} />
    );
  }

  return null;
}

function AboutLanding({ user, isDesktopExperience, onPrimaryCta, onLoginCta }) {
  const aboutMainRef = useRef(null);

  useEffect(() => {
    const scrollRoot = aboutMainRef.current;
    if (!scrollRoot || typeof window === 'undefined') return undefined;

    const pageShell = scrollRoot.closest('.about-page');
    const revealItems = scrollRoot.querySelectorAll('[data-scroll-reveal]');
    let frameId = 0;

    const updateScrollState = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(1, scrollRoot.scrollHeight - scrollRoot.clientHeight);
        const progress = Math.min(1, Math.max(0, scrollRoot.scrollTop / maxScroll));

        scrollRoot.style.setProperty('--about-preview-shift', `${Math.round(progress * -8)}px`);
        pageShell?.classList.toggle('is-scrolled', scrollRoot.scrollTop > 12);
      });
    };

    revealItems.forEach((item) => item.classList.add('about-scroll-reveal'));

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        }, {
          root: scrollRoot,
          rootMargin: '0px 0px -10% 0px',
          threshold: 0.14
        })
      : null;

    if (observer) {
      revealItems.forEach((item) => observer.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }

    scrollRoot.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();

    return () => {
      window.cancelAnimationFrame(frameId);
      scrollRoot.removeEventListener('scroll', updateScrollState);
      observer?.disconnect();
      pageShell?.classList.remove('is-scrolled');
    };
  }, []);

  return (
    <div className="about-page nv-screen">
      <header className="about-header">
        <Link to="/" className="about-header__brand" aria-label="Bom de Voto">
          <img src="/logo-horizontal.svg" alt="Bom de Voto" className="about-header__brand-logo" />
        </Link>

        <nav className="about-header__nav" aria-label="Navegação institucional">
          <a href="#como-funciona">Como funciona</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#celular">Celular</a>
          <Link to="/aviso-eleitoral">Aviso Eleitoral</Link>
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

      <main className="about-main nv-scroll" ref={aboutMainRef}>
        <section className="about-hero">
          <div className="about-hero__copy" data-scroll-reveal>
            <span className="about-eyebrow">Plano de voto simples, revisável e seguro</span>
            <h1>Monte seu plano de voto com mais clareza</h1>
            <p>
              O Bom de Voto ajuda você a organizar seus candidatos por cargo, revisar suas escolhas
              e salvar um rascunho antes da decisão final.
            </p>
            <p className="about-hero__support">
              Use o computador para conhecer e revisar. A experiência completa acontece no celular.
            </p>
            <div className="about-hero__actions">
              <button className="about-primary-action nv-touch" type="button" onClick={onPrimaryCta}>
                Ver prévia dos candidatos
              </button>
              {!user?.uid && (
                <button className="about-secondary-action nv-touch" type="button" onClick={onLoginCta}>
                  Fazer login
                </button>
              )}
            </div>
          </div>

          <aside className="about-product-preview" aria-label="Prévia do produto" data-scroll-reveal>
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

        <section className="about-section about-section--steps" id="como-funciona" data-scroll-reveal>
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

        <section className="about-section about-section--compare" data-scroll-reveal>
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

        <section className="about-section about-section--text" data-scroll-reveal>
          <div>
            <span className="about-eyebrow">Transparência dos indicadores</span>
            <h2>Indicadores ajudam, mas não decidem por você</h2>
          </div>
          <p>
            Nota, viabilidade e destaques são recursos de apoio para organizar seu plano. Eles não
            substituem sua pesquisa, sua opinião ou sua decisão final. Sempre revise dados, compare
            informações e escolha de forma consciente.
          </p>
          <Link className="about-inline-link" to="/aviso-eleitoral">Entenda o Aviso Eleitoral</Link>
        </section>

        <section className="about-section about-section--split" id="privacidade" data-scroll-reveal>
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

        <section className="about-final-cta" data-scroll-reveal>
          <span className="about-eyebrow">Pronto para experimentar?</span>
          <h2>Conheça no computador e continue pelo celular</h2>
          <button className="about-primary-action nv-touch" type="button" onClick={onPrimaryCta}>
            Ver prévia dos candidatos
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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousTitle = document.title;
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const previousRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    let descriptionMeta = document.querySelector('meta[name="description"]');
    let robotsMeta = document.querySelector('meta[name="robots"]');
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonicalLink?.getAttribute('href') || '';
    const createdDescription = !descriptionMeta;
    const createdRobots = !robotsMeta;
    const createdCanonical = !canonicalLink;

    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }

    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }

    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }

    document.title = content.meta?.title || `${content.title} | Bom de Voto`;
    descriptionMeta.setAttribute('content', content.meta?.description || content.subtitle || '');
    robotsMeta.setAttribute('content', content.meta?.noindex ? 'noindex,follow' : 'index,follow');
    canonicalLink.setAttribute('href', `https://bomdevoto.org${content.meta?.path || window.location.pathname}`);

    return () => {
      document.title = previousTitle;
      if (createdDescription) descriptionMeta.remove();
      else descriptionMeta.setAttribute('content', previousDescription);
      if (createdRobots) robotsMeta.remove();
      else robotsMeta.setAttribute('content', previousRobots);
      if (createdCanonical) canonicalLink.remove();
      else canonicalLink.setAttribute('href', previousCanonical);
    };
  }, [content]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return undefined;

    const timeoutId = window.setTimeout(() => {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [type]);

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
        <Link to="/" className="legal-header__brand">Bom de Voto</Link>
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

          <LegalNavigation />

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

          <LegalPageExtras type={type} />
        </section>

        <AppFooter className="app-footer--scroll-content legal-footer" />
      </main>
    </div>
  );
}
