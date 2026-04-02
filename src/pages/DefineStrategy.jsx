import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import PreferencesModal from '../components/PreferencesModal';
import SuccessModal from '../components/SuccessModal';
import './DefineStrategy.css';

export default function DefineStrategy() {
  const { userData, setUserData } = useUser();
  const [strategyInput, setStrategyInput] = useState('');
  const [allPlans, setAllPlans] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // --- ESTADOS CORRIGIDOS ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Corrigido: declaração do estado
  const [modalDate, setModalDate] = useState(''); // Corrigido: declaração do estado
  
 
  const navigate = useNavigate();

  // 1. GERAÇÃO DE HASH
  useEffect(() => {
    const checkAndGenerateHash = async () => {
      if (auth.currentUser && userData && !userData.my_hash) {
        const newHash = '#' + Math.random().toString(36).substring(2, 8);
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), { my_hash: newHash });
          if (setUserData) setUserData(prev => ({ ...prev, my_hash: newHash }));
        } catch (error) { console.error("Erro hash:", error); }
      }
    };
    checkAndGenerateHash();
  }, [userData, setUserData]);

  // 2. CARREGAR DADOS
  useEffect(() => {
    if (userData?.strategy?.length > 0) setStrategyInput(userData.strategy[0]);
    const fetchPlans = async () => {
      try {
        const [plansSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "plans")),
          getDocs(collection(db, "users"))
        ]);
        const plans = plansSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'influencer' }));
        const users = usersSnap.docs.map(d => ({ 
            ...d.data(), id: d.id, handle: d.data().username || d.data().name, 
            hash: d.data().my_hash, type: 'user'
        }));
        setAllPlans([...plans, ...users]);
      } catch (err) { console.error(err); }
    };
    fetchPlans();
  }, [userData]);

  // --- FUNÇÃO DE SALVAR ---
  const handleSave = async () => {
    if (!auth.currentUser) return;
    if (!strategyInput.trim()) {
      alert("Por favor, preencha o campo antes de continuar.");
      return;
    }
    setSaving(true);
    try {
      const finalStrategy = [strategyInput.trim()];
      await updateDoc(doc(db, "users", auth.currentUser.uid), { strategy: finalStrategy });
      
      setSaving(false);
      setModalDate('20/09/26');
      setShowSuccessModal(true); 

    } catch (error) { 
      alert("Erro ao salvar estratégia."); 
      setSaving(false);
    } 
  };

  const handleCreatePlan = () => {
    setModalDate('16/08/2026');
    setShowSuccessModal(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigate('/estrategia');
  };

  const handleInvite = () => {
    const nome = userData?.name || 'Usuário';
    const arroba = userData?.username ? `${userData.username}` : '';
    const hash = userData?.my_hash || '#000000';

    const shareText = `Em 2️⃣0️⃣2️⃣6️⃣ faça diferente:\n❌ Não vote no escuro 🙈\n❌ Não desperdice votos 🗑\n\nCom o PLANO DE VOTO:\nO voto é individual 👤\nA estratégia é coletiva 👤👤👤\n✅ Siga planos alinhados\n✅ Vete candidatos desalinhados\n✅ Vote com estratégia \n\nSe não tiver um plano melhor, acesse:\n👉 planodevoto.app\n\n${nome}\n${arroba}\n${hash}`;

    if (navigator.share) {
      navigator.share({ text: shareText }).catch((error) => console.error("Erro ao compartilhar:", error));
    } else {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        navigator.clipboard.writeText(shareText);
        alert("Mensagem copiada para a área de transferência!");
      }
    }
  };

  const handleSelectPlan = (plan, type) => {
    const value = type === 'hash' ? plan.hash : (plan.handle || plan.username);
    setStrategyInput(value);
    setShowSuggestions(false);
  };

  const getFilteredPlans = (text) => {
    if (!text || text.length < 2) return [];
    const lower = text.toLowerCase();
    return allPlans.filter(p => 
        (p.handle && p.handle.toLowerCase().includes(lower)) || 
        (p.hash && p.hash.toLowerCase().includes(lower)) ||
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.username && p.username.toLowerCase().includes(lower))
    ).slice(0, 5);
  };

  return (
    <div className="page-container-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={handleCloseSuccess} 
        date={modalDate} 
        onInvite={handleInvite}
      />

      <header className="header-clean">
        <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
       
        <div className="header-info">
          <span onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            {userData?.my_hash || '...'} | <span style={{ textDecoration: 'underline' }}>informar</span>
          </span>
          <span className="followers-count">0 seguidores</span>
        </div>
      </header>

      <main className="main-content-clean">
        <div className="nav-pill-container">
          <span className="nav-item active">siga</span>
          <span className="nav-item">vete</span>
          <span className="nav-item">vote</span>
        </div>

        <p className="page-instruction">
          Siga o plano de voto de quem te representa<br />
          (digite abaixo o @ do Instagram ou # do plano)
        </p>

        <div className="input-group-clean">
            <div className="input-wrapper-gray">
              <input
                className="input-gray"
                placeholder="Digite aqui..."
                value={strategyInput}
                onChange={(e) => setStrategyInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && strategyInput.length > 1 && (
                <div className="suggestions-box-gray">
                  {getFilteredPlans(strategyInput).map(plan => (
                    <div key={plan.id} className="suggestion-item" onClick={() => handleSelectPlan(plan, strategyInput.includes('#') ? 'hash' : 'handle')}>
                        <span className="suggestion-name">{plan.name}</span>
                        <span className="suggestion-handle">{plan.hash || plan.handle || plan.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <p className="or-divider">ou</p>
        
        <p className="create-link" onClick={handleCreatePlan}>
          Crie seu próprio plano de voto
        </p>

        <button className="btn-continue-gray" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Continuar"}
        </button>

        <p className="link-preferences" onClick={() => setShowPreferences(true)}>
          Preferências
        </p>
      </main>
    </div>
  );
}