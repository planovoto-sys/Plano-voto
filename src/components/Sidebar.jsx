import React, { useState } from 'react';
import { useUser } from '../contexts/useUser';
import { auth } from '../services/firebaseConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon } from './AppIcons';
import './Sidebar.css';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData, user, filtroAtivo } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const themeClass = `theme-${filtroAtivo || 'geral'}`;
  const navItems = [
    { label: 'Estado', path: '/home' },
    { label: 'Dep. Federais', path: '/escolher-deputado-federal' },
    { label: 'Senadores', path: '/escolher-senadores' },
  ];

  const goTo = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <button className={`hamburger-menu top-icon-button ${themeClass}`} type="button" onClick={() => setIsOpen(true)} aria-label="Abrir menu">
        <MenuIcon />
      </button>

      <nav className={`desktop-main-nav ${themeClass}`} aria-label="Navegação principal">
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={location.pathname === item.path ? 'active' : ''}
            onClick={() => goTo(item.path)}
          >
            {item.label}
          </button>
        ))}
        <button className="desktop-logout" type="button" onClick={handleLogout}>Sair</button>
      </nav>

      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}

      <div className={`sidebar-container ${isOpen ? 'open' : ''} ${themeClass}`}>
        <div className="sidebar-header">
          {userData?.profile_image && (
            <img src={userData.profile_image} alt="Perfil" className="sidebar-avatar" />
          )}
          <div className="sidebar-user-details">
            <span className="sidebar-username">{userData?.name || 'Usuário'}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button type="button" onClick={() => goTo('/home')}>MEU ESTADO</button>
          <button type="button" onClick={() => goTo('/escolher-deputado-federal')}>DEPUTADO FEDERAL</button>
          <button type="button" onClick={() => goTo('/escolher-senadores')}>SENADORES</button>
          <div className="sidebar-divider"></div>
          <button className="btn-logout" type="button" onClick={handleLogout}>SAIR DA CONTA</button>
        </nav>
      </div>
    </>
  );
}
