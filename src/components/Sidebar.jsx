import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import HowItWorksModal from './HowItWorksModal';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const [userData, setUserData] = useState({ name: 'Carregando...', handle: '', state: '', photo: '' });
  const [showHelpModal, setShowHelpModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser && isOpen) {
        try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setUserData({
              name: data.name || "Usuário",
              handle: data.username || "",
              state: data.state || "BR",
              photo: data.profile_image
            });
          }
        } catch (error) {
          console.error("Erro ao carregar perfil sidebar", error);
        }
      }
    };
    fetchUser();
  }, [isOpen]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!isOpen && !showHelpModal) return null;

  return (
    <>
      {/* Sidebar Overlay - Só mostra se o menu estiver aberto */}
      {isOpen && (
        <div className="sidebar-overlay">
          <div className="close-area" onClick={onClose}></div>

          <div className="sidebar-drawer">
            <div className="sidebar-header">
              <div className="avatar-container">
                <img 
                  src={userData.photo || "https://via.placeholder.com/100"} 
                  alt="Avatar" 
                  className="avatar-img"
                />
              </div>
              <div className="user-info">
                <h3>{userData.handle || userData.name}</h3>
                <p> {userData.state}</p>
              </div>
              <div onClick={onClose} style={{marginLeft: 'auto', fontSize: '1.5rem', color: '#ccc', cursor: 'pointer'}}>×</div>
            </div>

            <div className="sidebar-menu">
              <div className="menu-item" onClick={() => handleNavigate('/meu-plano')}>
                <span className="menu-icon"></span> Início
              </div>
              
              <div className="menu-item" onClick={() => handleNavigate('/estado')}>
                <span className="menu-icon"></span> Escolher Estado
              </div>
              
              <div className="menu-item" onClick={() => handleNavigate('/estrategia')}>
                <span className="menu-icon"></span> Seguir Planos
              </div>

              {/* Botão Como Funciona - Abre o Modal */}
              <div className="menu-item" onClick={() => setShowHelpModal(true)}>
                <span className="menu-icon"></span> Como Funciona
              </div>

              <div style={{height: '1px', background: '#f0f0f0', margin: '10px 24px'}}></div>

              <div className="menu-item" onClick={() => handleNavigate('/perfil')}>
                <span className="menu-icon"></span> Configurações
              </div>

              <div className="menu-item" style={{color: '#999', cursor: 'default'}}>
                <span className="menu-icon"></span> Ajuda
              </div>
            </div>

            <div className="sidebar-footer">
              <button className="logout-btn-menu" onClick={handleLogout}>
                <span></span> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Fica fora do Sidebar Overlay para z-index funcionar corretamente */}
      <HowItWorksModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </>
  );
}