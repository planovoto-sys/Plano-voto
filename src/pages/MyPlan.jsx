import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import './MyPlan.css'; // Vamos criar este CSS abaixo

export default function MyPlan() {
  const [userHash, setUserHash] = useState('...');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  }, []);

  const handleShare = () => {
    const text = `Crie sua estratégia de voto no Votelist! 🇧🇷\n\nAcesse: plano-voto.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="page-white">Carregando...</div>;

  return (
    <div className="page-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Header Igual ao Siga */}
      <header className="header-clean">
        <div style={{display:'flex', flexDirection:'column'}}>
           <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
           {/* Breadcrumb visual fixo para esta etapa */}
           <div className="breadcrumb-mini">
              <span className="step-done">siga</span> &gt; <span className="step-todo">vete</span> &gt; <span className="step-todo">vote</span>
           </div>
        </div>
        
        <div className="header-info">
          <span>{userHash} | <span style={{textDecoration:'underline'}}>informar</span></span>
          <span className="followers-count">0 seguidores</span>
        </div>
        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{width: '33%'}}></div>
      </div>

      <main className="main-content-centered">
        <h2 className="title-huge">seguindo...</h2>
        <p className="subtitle-success">
          Etapa concluída com sucesso!<br/>
          (a próxima etapa começará em breve)
        </p>

        <div className="info-box-gray">
          <p>
            Até lá, quanto mais pessoas seguirem seu @ ou #, mais fortes serão seus votos.
          </p>
          <p style={{fontWeight: '800', margin: '20px 0'}}>
            Você tem até 20/08/26 para convidar o máximo de amigos que puder!
          </p>
          <p>Nos vemos em breve!</p>
        </div>

        <div className="yellow-badge">
          definir mensagem e app de compartilhamento
        </div>

        <button className="btn-invite" onClick={handleShare}>
          Convidar amigos
        </button>

        <p className="link-review" onClick={() => navigate('/estrategia')}>
          Revisar estratégia
        </p>
      </main>
    </div>
  );
}