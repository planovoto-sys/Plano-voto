import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './MyPlan.css';

export default function MyPlan() {
  const [userHash, setUserHash] = useState('...');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estados PWA
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState(null); // 'android', 'ios', 'desktop'

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (docSnap.exists()) {
          setUserHash(docSnap.data().my_hash || '#...');
        }
      }
      setLoading(false);
    };
    fetchUserData();

    // Detecção de Plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform('desktop');

    // Captura evento de instalação (Android/Chrome Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // NÃO abrimos mais o modal automaticamente aqui
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallModal(false);
    }
    setDeferredPrompt(null);
  };

  const handleShare = () => {
    const text = `Crie sua estratégia de voto no Votelist! 🇧🇷\n\nAcesse: plano-voto.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="page-white">Carregando...</div>;

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

<<<<<<< HEAD
=======
       // Dentro do componente MyPlan
        // ...
>>>>>>> feature/instagram-verificacao
        <div className="header-info">
          {/* Adiciona o onClick e muda o cursor para pointer */}
          <span
            onClick={() => navigate('/verificar-instagram')}
            style={{ cursor: 'pointer' }}
          >
            {userHash} | <span style={{ textDecoration: 'underline' }}>informar Instagram</span>
          </span>
          <span className="followers-count">0 seguidores</span>
        </div>
<<<<<<< HEAD
=======
// ...
        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
>>>>>>> feature/instagram-verificacao
      </header>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: '33%' }}></div>
      </div>

      <main className="main-content-centered">
        <h2 className="title-huge">seguindo...</h2>
        <p className="subtitle-success">
          Etapa concluída com sucesso!<br />
          (a próxima etapa começará em breve)
        </p>

        <div className="info-box-gray">
          <p>
            Até lá, quanto mais pessoas seguirem seu @ ou #, mais fortes serão seus votos.
          </p>
          <p style={{ fontWeight: '800', margin: '20px 0' }}>
            Você tem até 20/08/26 para convidar o máximo de amigos que puder!
          </p>
          <p>Nos vemos em breve!</p>
        </div>

        {/* --- NOVO LINK DE INSTALAÇÃO (só aparece se não estiver instalado) --- */}
        <p className="install-cta" onClick={() => setShowInstallModal(true)}>
          Enquanto aguarda que tal instalar o nosso app direto do navegador?
        </p>

        <button className="btn-invite" onClick={handleShare}>
          Convidar amigos
        </button>

        <p className="link-review" onClick={() => navigate('/estrategia')}>
          Revisar estratégia
        </p>
      </main>

      {/* --- MODAL PWA --- */}
      {showInstallModal && (
        <div className="pwa-overlay">
          <div className="pwa-card">
            <button className="pwa-close" onClick={() => setShowInstallModal(false)}>×</button>

            <div className="pwa-icon">📲</div>
            <h3 className="pwa-title">Instalar App</h3>

            <p className="pwa-text">
              Identificamos que seu sistema é:<br />
              <strong>
                {platform === 'ios' ? 'iOS (iPhone)' : platform === 'android' ? 'Android' : 'Computador'}
              </strong>
            </p>

            {/* LÓGICA DE EXIBIÇÃO POR PLATAFORMA */}

            {/* ANDROID ou PC COM CHROME (Botão Nativo) */}
            {deferredPrompt && (
              <button className="pwa-btn-install" onClick={handleInstallClick}>
                {platform === 'desktop' ? 'Instalar no Computador' : 'Adicionar à Tela Inicial'}
              </button>
            )}

            {/* iOS (Tutorial) */}
            {platform === 'ios' && (
              <div className="ios-tutorial">
                <p>Para instalar no iPhone:</p>
                <div className="ios-steps">
                  <div className="step-row">
                    1. Toque em compartilhar <img src="https://img.icons8.com/ios/50/upload--v1.png" width="20" alt="share" />
                  </div>
                  <div className="step-row">
                    2. Escolha <strong>"Adicionar à Tela de Início"</strong>
                  </div>
                </div>
                <div className="ios-arrow-animation">⬇</div>
              </div>
            )}

            {/* PC SEM SUPORTE DIRETO (Firefox/Safari Desktop) */}
            {platform === 'desktop' && !deferredPrompt && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 10 }}>
                Para instalar, procure o ícone de instalação <br />na barra de endereço do seu navegador.
              </p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}