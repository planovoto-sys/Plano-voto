import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // <--- IMPORTADO
import './SelectState.css'; 
import './MyPlan.css';

export default function MyPlan() {
  const [strategy, setStrategy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <--- ESTADO DO MENU
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

  const handleShare = () => {
    const text = "Acabei de definir minha estratégia de voto no app Plano! Venha ver.";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="page-container" style={{justifyContent:'center'}}>Carregando...</div>;

  return (
    <div className="page-container">
      {/* MENU LATERAL */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header">
        <h1 className="brand-small">plano</h1>
        {/* BOTÃO QUE ABRE O MENU */}
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