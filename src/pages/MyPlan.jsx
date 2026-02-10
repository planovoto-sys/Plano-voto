import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import './MyPlan.css';

export default function MyPlan() {
  const { userData } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // PWA State
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState('desktop');

  const navigate = useNavigate();

  useEffect(() => {
    // Detecta plataforma
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');

    // Listener para instalação Android/Desktop
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
        // Fallback apenas para testar se manifest não estiver carregado
        if(platform === 'android') setShowInstallModal(false); 
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallModal(false);
    setDeferredPrompt(null);
  };

  const handleShare = () => {
    const text = `Crie sua estratégia de voto no Votelist! 🇧🇷\n\nAcesse: plano-voto.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="page-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header-clean">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
          <div className="breadcrumb-mini">
            <span className="step-done">siga</span> &gt; <span className="step-todo">vete</span> &gt; <span className="step-todo">vote</span>
          </div>
        </div>


        <div className="header-info">
          <span onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            {userData?.my_hash || '...'} | <span style={{ textDecoration: 'underline' }}>informar</span>
          </span>
        </div>

        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{width: '33%'}}></div>
      </div>

      <main className="main-content-centered">
        <h2 className="title-huge">seguindo...</h2>
        <p className="subtitle-success">Etapa concluída com sucesso!</p>

        <div className="info-box-gray">
          <p>Você tem até 20/08/26 para convidar o máximo de amigos que puder!</p>
        </div>

        <p className="install-cta" onClick={() => setShowInstallModal(true)}>
          Enquanto aguarda que tal instalar o nosso app direto do navegador?
        </p>

        <button className="btn-invite" onClick={handleShare}>Convidar amigos</button>
        <p className="link-review" onClick={() => navigate('/estrategia')}>Revisar estratégia</p>
      </main>

      {/* PWA Modal */}
      {showInstallModal && (
        <div className="pwa-overlay">
          <div className="pwa-card">
            <button className="pwa-close" onClick={() => setShowInstallModal(false)}>×</button>
            <div className="pwa-icon">📲</div>
            <h3 className="pwa-title">Instalar App</h3>
            <p className="pwa-text">
              Sistema detectado: <strong>{platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Computador'}</strong>
            </p>

            {(deferredPrompt || platform === 'android') && (
              <button className="pwa-btn-install" onClick={handleInstallClick}>
                {platform === 'desktop' ? 'Instalar no PC' : 'Instalar App'}
              </button>
            )}

            {platform === 'ios' && (
              <div className="ios-tutorial">
                <p>Toque em compartilhar e "Adicionar à Tela de Início"</p>
                <div className="ios-arrow-animation">⬇</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}