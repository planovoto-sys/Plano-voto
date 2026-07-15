import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import './AppHeader.css';

const BRAND_MAP = {
  'horizontal': () => <LogoCompleta />,
  'icon-name': () => (
    <img src="/icone-com-nome.svg" alt="Bom de Voto" className="app-header__brand-img" />
  ),
  'icon': () => (
    <img src="/icone-branco.svg" alt="Bom de Voto" className="app-header__brand-img" />
  )
};

export default function AppHeader({
  variant = 'default',
  brand = 'horizontal',
  onBack,
  backLabel = 'Voltar',
  backTo,
  actions,
  scrollHide = false,
  children,
  className = ''
}) {
  const BrandComponent = BRAND_MAP[brand] || BRAND_MAP.horizontal;
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (!scrollHide) return;
    if (!ticking.current) {
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY > 50 && currentY > lastScrollY.current + 10) {
          setHidden(true);
        } else if (currentY < lastScrollY.current - 10) {
          setHidden(false);
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [scrollHide]);

  useEffect(() => {
    if (!scrollHide) return;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, scrollHide]);

  const classNames = [
    'app-header',
    `app-header--${variant}`,
    scrollHide ? 'app-header--scroll-hide' : '',
    hidden ? 'app-header--hidden' : '',
    className
  ].filter(Boolean).join(' ');

  const brandContent = (
    <Link to="/" className="app-header__brand-link" aria-label="Bom de Voto">
      <BrandComponent />
    </Link>
  );

  return (
    <header className={classNames}>
      <div className="app-header__inner">
        <div className="app-header__left">
          {onBack && (
            <button className="app-header__back nv-touch" type="button" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              <span>{backLabel}</span>
            </button>
          )}
          {backTo && !onBack && (
            <Link to={backTo} className="app-header__back app-header__back--link nv-touch">
              <ArrowLeft aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          )}
          {variant !== 'minimal' && brandContent}
        </div>

        {variant === 'minimal' && (
          <div className="app-header__center">
            <BrandComponent />
          </div>
        )}

        <div className="app-header__right">
          {actions}
        </div>
      </div>

      {children && (
        <div className="app-header__bottom">
          {children}
        </div>
      )}
    </header>
  );
}
