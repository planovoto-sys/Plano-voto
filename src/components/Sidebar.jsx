import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useUser } from '../contexts/UserContext';
import PreferencesModal from './PreferencesModal';
import './Sidebar.css';

// ÍCONES SVG (Componentes Internos para manter o código limpo)
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const IconTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function Sidebar({ isOpen, onClose }) {
  const { userData } = useUser();
  const navigate = useNavigate();
  const [showPreferences, setShowPreferences] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const openPreferences = () => {
    setShowPreferences(true);
    // onClose(); // Opcional: manter o menu aberto ou fechar
  };

  // Se o menu estiver fechado E o modal também, não renderiza nada
  if (!isOpen && !showPreferences) return null;

  return (
    <>
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {isOpen && (
        <div className="sidebar-overlay">
          <div className="close-area" onClick={onClose}></div>
          <div className="sidebar-drawer">
            <div className="sidebar-header">
              <div className="avatar-container">
                <img src={userData?.profile_image || "https://via.placeholder.com/100"} alt="Avatar" className="avatar-img"/>
              </div>
              <div className="user-info">
                <h3>{userData?.name || "Usuário"}</h3>
                {userData?.username && <p>{userData.username}</p>}
              </div>
              <div onClick={onClose} className="close-icon">×</div>
            </div>

            <div className="sidebar-menu">
              <div className="menu-item" onClick={() => handleNavigate('/meu-plano')}>
                <span className="menu-icon-svg"><IconHome /></span> Início
              </div>
              
              <div className="menu-item" onClick={() => handleNavigate('/estrategia')}>
                <span className="menu-icon-svg"><IconTarget /></span> Seguir Planos
              </div>
              
              <div className="menu-item" onClick={openPreferences}>
                <span className="menu-icon-svg"><IconSettings /></span> Preferências
              </div>
              
              <div className="divider"></div>
              
              <div className="menu-item" onClick={() => handleNavigate('/perfil')}>
                <span className="menu-icon-svg"><IconUser /></span> Meu Perfil
              </div>
            </div>

            <div className="sidebar-footer">
              <button className="logout-btn-menu" onClick={handleLogout}>Trocar de Conta</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}