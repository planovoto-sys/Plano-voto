import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const [userData, setUserData] = useState({ name: 'Carregando...', handle: '', state: '', photo: '' });
  const navigate = useNavigate();

  // Busca dados reais do usuário quando o menu abre
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

  if (!isOpen) return null;

  return (
    <div className="sidebar-overlay">
      {/* Área transparente à esquerda para fechar ao clicar fora */}
      <div className="close-area" onClick={onClose}></div>

      <div className="sidebar-drawer">
        {/* Cabeçalho */}
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
          {/* Botão X discreto */}
          <div onClick={onClose} style={{marginLeft: 'auto', fontSize: '1.5rem', color: '#ccc', cursor: 'pointer'}}>×</div>
        </div>

        {/* Itens do Menu */}
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

          <div className="menu-item" style={{color: '#999', cursor: 'default'}}>
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

        {/* Rodapé */}
        <div className="sidebar-footer">
          <button className="logout-btn-menu" onClick={handleLogout}>
            <span></span> Sair
          </button>
        </div>
      </div>
    </div>
  );
}