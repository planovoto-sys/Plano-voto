import React, { useState } from 'react';
import { useUser } from '../contexts/useUser';
import { auth } from '../services/firebaseConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon } from './AppIcons';
import { BALLOT_ROUTES } from '../services/votingService';
import './Sidebar.css';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData, user, filtroAtivo } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const screenClass = location.pathname === '/escolher-deputado-federal' ? 'screen-deputado-federal' : '';

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const themeClass = `theme-${filtroAtivo || 'geral'}`;
  const navItems = [
    { label: 'Estado', path: BALLOT_ROUTES.estado },
    { label: 'Deputado Federal', path: BALLOT_ROUTES.deputadoFederal },
    { label: 'Senador 1', path: BALLOT_ROUTES.senador1 },
    { label: 'Senador 2', path: BALLOT_ROUTES.senador2 },
    { label: 'Resultados', path: BALLOT_ROUTES.resultado },
  ];

  const goTo = (path) => {
    navigate(path, { state: { bypassVoteRedirect: true } });
    setIsOpen(false);
  };

  return (
    <>
      <button className={`hamburger-menu top-icon-button ${themeClass} ${screenClass}`} type="button" onClick={() => setIsOpen(true)} aria-label="Abrir menu">
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
          <button type="button" onClick={() => goTo(BALLOT_ROUTES.estado)}>MEU ESTADO</button>
          <button type="button" onClick={() => goTo(BALLOT_ROUTES.deputadoFederal)}>DEPUTADO FEDERAL</button>
          <button type="button" onClick={() => goTo(BALLOT_ROUTES.senador1)}>SENADOR 1</button>
          <button type="button" onClick={() => goTo(BALLOT_ROUTES.senador2)}>SENADOR 2</button>
          <div className="sidebar-divider"></div>
          <button className="btn-logout" type="button" onClick={handleLogout}>SAIR DA CONTA</button>
        </nav>
      </div>
    </>
  );
}
