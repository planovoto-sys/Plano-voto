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
  
  // Controle de Menu e Modais
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  
  // --- NOVOS ESTADOS PARA O MODAL ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalDate, setModalDate] = useState(''); // Estado para guardar a data dinâmica

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

  // --- FUNÇÃO DE SALVAR (BOTÃO CONTINUAR) ---
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
      
      // Define a data específica deste fluxo e abre o modal
      setModalDate('20/09/26');
      setShowSuccessModal(true); 

    } catch (error) { 
      alert("Erro ao salvar estratégia."); 
      setSaving(false);
    } 
  };

  // --- NOVA FUNÇÃO: CRIAR PRÓPRIO PLANO ---
  const handleCreatePlan = () => {
    // Aqui você pode adicionar lógica extra se precisar salvar algo antes
    // Por enquanto, apenas define a outra data e abre o modal
    setModalDate('16/08/2026');
    setShowSuccessModal(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigate('/estrategia');
  };

  const handleInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Plano de Voto',
        text: `Siga meu plano de voto: ${userData?.my_hash}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      alert("Link copiado! (Simulação)");
    }
  };

  const handleSelectPlan = (plan, type) => {
    const value = type === 'hash' ? plan.hash : plan.handle;
    setStrategyInput(value);
    setShowSuggestions(false);
  };

  const getFilteredPlans = (text) => {
    if (!text || text.length < 2) return [];
    const lower = text.toLowerCase();
    return allPlans.filter(p => 
        (p.handle && p.handle.toLowerCase().includes(lower)) || 
        (p.hash && p.hash.toLowerCase().includes(lower)) ||
        (p.name && p.name.toLowerCase().includes(lower))
    ).slice(0, 5);
  };

  return (
    <div className="page-container-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {/* MODAL AGORA RECEBE A DATA DINÂMICA */}
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={handleCloseSuccess} 
        date={modalDate} 
        onInvite={handleInvite}
      />

      <header className="header-clean">
        <h1 className="brand-logo-small">plano<span className="brand-bold">de</span>voto</h1>
        <div className="header-actions">
          <span className="user-hash-display">{userData?.my_hash || '...'}</span>
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20M4 12H20M4 18H20" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && strategyInput.length > 1 && (
                <div className="suggestions-box-gray" onMouseDown={(e) => e.preventDefault()}>
                  {getFilteredPlans(strategyInput).map(plan => (
                    <div key={plan.id} className="suggestion-item" onClick={() => handleSelectPlan(plan, strategyInput.includes('#') ? 'hash' : 'handle')}>
                      <div className="suggestion-info">
                        <span className="suggestion-name">{plan.name}</span>
                        <span className="suggestion-handle">{plan.hash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <p className="or-divider">ou</p>
        
        {/* LINK AGORA TEM ONCLICK QUE ABRE O MODAL COM A NOVA DATA */}
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