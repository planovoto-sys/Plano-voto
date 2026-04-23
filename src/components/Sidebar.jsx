import React, { useState } from 'react';
import { useUser } from '../contexts/useUser';
import { auth } from '../services/firebaseConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon } from './AppIcons';
import styles from './Sidebar.module.css';

const PRIMARY_NAV_ITEMS = [
  { label: 'Estado', path: '/home' },
  { label: 'Dep. Federais', path: '/escolher-deputado-federal' },
  { label: 'Senadores', path: '/escolher-senadores' }
];

const QUICK_NAV_ITEMS = [
  { label: 'Resultado', path: '/finalizacao' }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData, user, filtroAtivo } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isRenovar = filtroAtivo === 'renovar';
  const themeClass = isRenovar ? styles.themeRenovar : '';

  const isCurrentRoute = (path) => location.pathname === path;

  const handleLogout = async () => {
    setIsOpen(false);
    await auth.signOut();
    navigate('/');
  };

  const goTo = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <button
        className={`${styles.hamburgerMenu} top-icon-button ${themeClass}`.trim()}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar-panel"
      >
        <MenuIcon />
      </button>

      <nav className={`${styles.desktopMainNav} ${themeClass}`.trim()} aria-label="Navegacao principal">
        <div className={styles.desktopMainPrimary}>
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isCurrentRoute(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`${styles.desktopMainButton} ${isActive ? styles.isActive : ''}`.trim()}
                onClick={() => goTo(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className={styles.desktopMainTools}>
          {QUICK_NAV_ITEMS.map((item) => {
            const isActive = isCurrentRoute(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`${styles.desktopMainButton} ${isActive ? styles.isActive : ''}`.trim()}
                onClick={() => goTo(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            );
          })}
          <button className={`${styles.desktopMainButton} ${styles.desktopLogout}`.trim()} type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </nav>

      <aside className={`${styles.desktopSidebar} ${themeClass}`.trim()} aria-label="Painel de navegacao">
        <div className={styles.desktopBrandBlock}>
          <span className={styles.desktopBrandTitle}>meuvoto.org</span>
          <span className={styles.desktopBrandCaption}>Painel de votacao</span>
        </div>

        <div className={styles.desktopUserBlock}>
          {userData?.profile_image && (
            <img src={userData.profile_image} alt="Perfil do usuario" className={styles.desktopAvatar} />
          )}
          <div>
            <span className={styles.desktopUserName}>{userData?.name || 'Usuario'}</span>
            <span className={styles.desktopUserEmail}>{user?.email || 'Conta sem email'}</span>
          </div>
        </div>

        <section className={styles.desktopSidebarSection}>
          <h2 className={styles.desktopSectionTitle}>Fluxo principal</h2>
          <nav className={styles.desktopSidebarNav} aria-label="Fluxo principal da votacao">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = isCurrentRoute(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`${styles.desktopSidebarButton} ${isActive ? styles.isActive : ''}`.trim()}
                  onClick={() => goTo(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </section>

        <section className={styles.desktopSidebarSection}>
          <h2 className={styles.desktopSectionTitle}>Atalhos</h2>
          <nav className={`${styles.desktopSidebarNav} ${styles.desktopSidebarSubmenu}`.trim()} aria-label="Atalhos do painel">
            {QUICK_NAV_ITEMS.map((item) => {
              const isActive = isCurrentRoute(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`${styles.desktopSidebarButton} ${isActive ? styles.isActive : ''}`.trim()}
                  onClick={() => goTo(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
            <button className={`${styles.desktopSidebarButton} ${styles.desktopLogout}`.trim()} type="button" onClick={handleLogout}>
              Sair da conta
            </button>
          </nav>
        </section>
      </aside>

      {isOpen && <div className={styles.sidebarOverlay} onClick={() => setIsOpen(false)} aria-hidden="true"></div>}

      <div id="mobile-sidebar-panel" className={`${styles.sidebarContainer} ${isOpen ? styles.open : ''} ${themeClass}`.trim()}>
        <div className={styles.sidebarHeader}>
          {userData?.profile_image && (
            <img src={userData.profile_image} alt="Perfil" className={styles.sidebarAvatar} />
          )}
          <div className={styles.sidebarUserDetails}>
            <span className={styles.sidebarUsername}>{userData?.name || 'Usuario'}</span>
            <span className={styles.sidebarUserEmail}>{user?.email || 'Conta sem email'}</span>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Menu lateral">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isCurrentRoute(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`${styles.mobileNavButton} ${isActive ? styles.isActive : ''}`.trim()}
                onClick={() => goTo(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label.toUpperCase()}
              </button>
            );
          })}
          <div className={styles.sidebarDivider}></div>
          {QUICK_NAV_ITEMS.map((item) => {
            const isActive = isCurrentRoute(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`${styles.mobileNavButton} ${isActive ? styles.isActive : ''}`.trim()}
                onClick={() => goTo(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label.toUpperCase()}
              </button>
            );
          })}
          <button className={`${styles.mobileNavButton} ${styles.btnLogout}`.trim()} type="button" onClick={handleLogout}>
            SAIR DA CONTA
          </button>
        </nav>
      </div>
    </>
  );
}
