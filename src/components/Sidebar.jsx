import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { auth } from '../services/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData, user, filtroAtivo } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const themeClass = `theme-${filtroAtivo || 'geral'}`;

  return (
    <>
      <div className={`hamburger-menu ${themeClass}`} onClick={() => setIsOpen(true)}>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>

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
          <button onClick={() => { navigate('/home'); setIsOpen(false); }}>MEU ESTADO</button>
          <button onClick={() => { navigate('/escolher-deputado-federal'); setIsOpen(false); }}>DEPUTADO FEDERAL</button>
          <button onClick={() => { navigate('/escolher-senadores'); setIsOpen(false); }}>SENADORES</button>
          <div className="sidebar-divider"></div>
          <button className="btn-logout" onClick={handleLogout}>SAIR DA CONTA</button>
        </nav>
      </div>
    </>
  );
}