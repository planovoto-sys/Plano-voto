import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import { SearchIcon } from '@/shared/icons/AppIcons';
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
  hideBrand = false,
  searchActive = false,
  searchValue = '',
  onSearchChange,
  onSearchClose,
  searchRef,
  searchPlaceholder = 'Pesquisar...',
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

  useEffect(() => {
    if (searchActive && searchRef?.current) {
      searchRef.current.focus();
    }
  }, [searchActive, searchRef]);

  const classNames = [
    'app-header',
    `app-header--${variant}`,
    scrollHide ? 'app-header--scroll-hide' : '',
    hidden ? 'app-header--hidden' : '',
    searchActive ? 'app-header--search-active' : '',
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
        {searchActive ? (
          <>
            <div className="app-header__search-field">
              <SearchIcon className="app-header__search-field-icon" />
              <input
                ref={searchRef}
                type="search"
                className="app-header__search-field-input"
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
            <div className="app-header__right">
              <button
                className="app-header__search-close-btn nv-touch"
                type="button"
                onClick={onSearchClose}
                aria-label="Fechar busca"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
          </>
        ) : (
          <>
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
              {!hideBrand && variant !== 'minimal' && brandContent}
            </div>

            {variant === 'minimal' && (
              <div className="app-header__center">
                <BrandComponent />
              </div>
            )}

            <div className="app-header__right">
              {actions}
            </div>
          </>
        )}
      </div>

      {!searchActive && children && (
        <div className="app-header__bottom">
          {children}
        </div>
      )}
    </header>
  );
}
