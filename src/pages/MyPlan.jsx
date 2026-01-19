import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import './SelectState.css'; 
import './MyPlan.css';

export default function MyPlan() {
  const [strategy, setStrategy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado do menu
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStrategy(docSnap.data().strategy || []);
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  // --- FUNÇÃO DE COMPARTILHAMENTO ATUALIZADA ---
  const handleShare = () => {
    const url = "plano-voto.vercel.app"; // Seu link oficial
    
    // Texto com quebra de linha (\n\n) e emoji
    const finalText = `Confira meu plano de voto! 🇧🇷\n\nCrie o seu agora em: ${url}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(finalText)}`, '_blank');
  };
  // ---------------------------------------------

  if (loading) return <div className="page-container" style={{justifyContent:'center'}}>Carregando...</div>;

  return (
    <div className="page-container">
      {/* Menu Lateral */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header">
        <h1 className="brand-small">plano</h1>
        {/* Ícone que abre o menu */}
        <div className="menu-icon" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <main className="main-content">
        <h2 className="page-title">estratégia</h2>
        <p className="page-subtitle">Estratégia definida com sucesso!</p>

        <div className="card-list">
          {strategy.length > 0 ? (
            strategy.map((item, index) => (
              <div key={index} className="plan-card">{item}</div>
            ))
          ) : (
            <div className="plan-card">Nenhum plano seguido</div>
          )}
        </div>

        <div className="waiting-box">
          <p className="waiting-text">
            Aguarde para acessar seu plano de voto.
            Até lá, aproveite para convidar seguidores!
          </p>
        </div>

        <button onClick={handleShare} className="invite-btn-link">
          Convidar seguidores
        </button>
      </main>
    </div>
  );
}