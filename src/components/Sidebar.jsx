import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useUser } from '../contexts/UserContext';
import HowItWorksModal from './HowItWorksModal';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { userData } = useUser();
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!isOpen && !showHelp) return null;

  return (
    <>
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
              <div className="menu-item" onClick={() => handleNavigate('/meu-plano')}> Início</div>
              <div className="menu-item" onClick={() => handleNavigate('/estrategia')}> Seguir Planos</div>
              <div className="menu-item" onClick={() => setShowHelp(true)}> Como Funciona</div>
              <div className="divider"></div>
           
            </div>

            <div className="sidebar-footer">
              <button className="logout-btn-menu" onClick={handleLogout}>Mudar Conta</button>
            </div>
          </div>
        </div>
      )}
      <HowItWorksModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}