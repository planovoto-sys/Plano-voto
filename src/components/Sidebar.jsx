import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import PreferencesModal from './PreferencesModal';
import './Sidebar.css';

const IconTarget = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const IconVote = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>;
const IconVeto = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>;
const IconShare = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>;
const IconTour = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>;
const IconUsers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconLogout = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;


const IconSmartphone = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>;
const IosShareIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', margin: '0 2px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>;
const IconArrowDown = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5 5 5-5" /><path d="M12 5v13" /></svg>;
const IconPlusSquare = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;

export default function Sidebar({ isOpen, onClose }) {
  const { userData } = useUser();
  const navigate = useNavigate();
  const [showPreferences, setShowPreferences] = useState(false);

  // --- LÓGICA PWA ---
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('desktop');

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');

    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  // Garante hash do usuário
  useEffect(() => {
    const ensureHashExists = async () => {
      if (userData && !userData.my_hash && auth.currentUser) {
        const newHash = '#' + Math.random().toString(36).substring(2, 8);
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, { my_hash: newHash });
        } catch (error) { console.error(error); }
      }
    };
    if (isOpen) ensureHashExists();
  }, [userData, isOpen]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (platform === 'android') alert("Toque no menu do navegador e selecione 'Instalar aplicativo'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallModal(false);
    setDeferredPrompt(null);
  };

  if (!isOpen && !showPreferences && !showInstallModal) return null;

  return (
    <>
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {/* --- MODAL DE INSTALAÇÃO MINIMALISTA --- */}
      {showInstallModal && (
        <div className="pwa-overlay" onClick={() => setShowInstallModal(false)}>
          <div className="pwa-card" onClick={e => e.stopPropagation()}>
            <button className="pwa-close" onClick={() => setShowInstallModal(false)}>×</button>

            <div className="pwa-icon-container">
              <IconSmartphone />
            </div>

            <h3 className="pwa-title">Instalar App</h3>

            {/* iOS */}
            {platform === 'ios' && (
              <>
                <p className="pwa-text">Para instalar no seu iPhone, siga os passos:</p>
                <div className="manual-steps">
                  <div className="step-row">
                    <span className="step-number">1</span>
                    <span>Toque em <IosShareIcon /> abaixo.</span>
                  </div>
                  <div className="step-row">
                    <span className="step-number">2</span>
                    <span>Selecione <strong>Adicionar à Tela de Início</strong> <IconPlusSquare />.</span>
                  </div>
                  <div className="step-row">
                    <span className="step-number">3</span>
                    <span>Toque em <strong>Adicionar</strong>.</span>
                  </div>
                </div>
                <div className="ios-arrow-animation"><IconArrowDown /></div>
              </>
            )}

            {/* Android / Desktop (Botão Automático) */}
            {platform !== 'ios' && deferredPrompt && (
              <>
                <p className="pwa-text">Instale o <strong>Plano de Voto</strong> para acesso rápido.</p>
                <button className="pwa-btn-install" onClick={handleInstallClick}>
                  Instalar agora
                </button>
              </>
            )}

            {/* Android / Desktop (Fallback Manual) */}
            {platform !== 'ios' && !deferredPrompt && (
              <>
                <p className="pwa-text">App já instalado ou navegador incompatível.</p>
                <div className="manual-steps">
                  <div className="step-row">
                    <span className="step-number">1</span>
                    <span>Abra o menu do navegador.</span>
                  </div>
                  <div className="step-row">
                    <span className="step-number">2</span>
                    <span>Selecione <strong>Instalar aplicativo</strong>.</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MENU LATERAL (SIDEBAR) --- */}
      {isOpen && (
        <div className="sidebar-overlay">
          <div className="close-area" onClick={onClose}></div>
          <div className="sidebar-drawer">

            <div className="sidebar-profile-block">
              <div className="profile-main">
                <div className="avatar-container">
                  <img src={userData?.profile_image || "https://via.placeholder.com/100"} alt="Avatar" className="avatar-img" />
                </div>
                <div className="user-details">
                  <h3>{userData?.name || "Usuário"}</h3>
                  <div className="user-id-hash">{userData?.my_hash || "..."}</div>
                  <div className="informar-row">
                    <span>@ informar</span>
                    <IconLock />
                  </div>
                </div>
              </div>
              <div className="followers-count">
                <IconUsers />
                <span>0 Seguidores</span>
              </div>
            </div>

            <div className="sidebar-menu">
              <div className="menu-block-label">Ações</div>
              <div className="menu-item" onClick={() => handleNavigate('/estrategia')}>
                <span className="menu-icon-svg"><IconTarget /></span> Siga
              </div>
              <div className="menu-item item-locked">
                <div className="menu-item-content">
                  <span className="menu-icon-svg"><IconVeto /></span> Vete
                </div>
                <span className="lock-indicator"><IconLock /></span>
              </div>
              <div className="menu-item item-locked">
                <div className="menu-item-content">
                  <span className="menu-icon-svg"><IconVote /></span> Vote
                </div>
                <span className="lock-indicator"><IconLock /></span>
              </div>

              <div className="menu-divider"></div>

              <div className="menu-block-label">Aplicativo</div>

              <div className="menu-item" onClick={() => { setShowInstallModal(true); onClose(); }}>
                <span className="menu-icon-svg"><IconShare /></span> Salvar atalho
              </div>

              <div className="menu-item item-blue" onClick={() => {/* Tour */ }}>
                <span className="menu-icon-svg"><IconTour /></span> Tour virtual
              </div>
            </div>

            <div className="sidebar-footer">
              <button className="logout-btn-menu" onClick={handleLogout}>
                <IconLogout /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}