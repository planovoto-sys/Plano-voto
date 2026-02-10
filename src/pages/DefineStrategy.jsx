import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import PreferencesModal from '../components/PreferencesModal'; // <--- IMPORTAR
import './DefineStrategy.css';

export default function DefineStrategy() {
  const { userData } = useUser();
  const [strategyInput, setStrategyInput] = useState(''); 
  const [allPlans, setAllPlans] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Estado para o Modal de Preferências
  const [showPreferences, setShowPreferences] = useState(false); 

  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.strategy?.length > 0) {
      setStrategyInput(userData.strategy[0]);
    }
    const fetchPlans = async () => {
      // ... (código de busca de planos igual)
      try {
        const [plansSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "plans")),
          getDocs(collection(db, "users"))
        ]);
        const plans = plansSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'influencer' }));
        const users = usersSnap.docs.map(d => ({ 
            ...d.data(), 
            id: d.id, 
            handle: d.data().username || d.data().name, 
            hash: d.data().my_hash,
            type: 'user'
        }));
        setAllPlans([...plans, ...users]);
      } catch (err) { console.error(err); }
    };
    fetchPlans();
  }, [userData]);

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
      navigate('/meu-plano');
    } catch (error) { alert("Erro ao salvar estratégia."); } 
    finally { setSaving(false); }
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
      
      {/* Modal de Preferências sendo chamado aqui */}
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      <header className="header-clean">
        <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
        // Dentro do componente DefineStrategy
        // ...
        <div className="header-info">
          <span onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            {userData?.my_hash || '...'} | <span style={{ textDecoration: 'underline' }}>informar</span>
          </span>
          <span className="followers-count">0 seguidores</span>
        </div>
        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <div className="breadcrumb-active">
        <span className="active-step">siga</span> &gt; <span className="inactive-step">vete</span> &gt; <span className="inactive-step">vote</span>
      </div>

      <main className="main-content-clean">
        <p className="page-instruction">
          Siga uma lista de voto de quem te representa<br />
          (use @ p/ perfis do Instagram ou # p/ listas)
        </p>

        <div className="strategy-list">
            <div className="strategy-input-wrapper-clean" style={{ zIndex: showSuggestions ? 50 : 1 }}>
              <input
                className="strategy-input-clean"
                placeholder="Digite aqui o @ ou #"
                value={strategyInput}
                onChange={(e) => setStrategyInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && strategyInput.length > 1 && (
                <div className="suggestions-box" onMouseDown={(e) => e.preventDefault()}>
                  {getFilteredPlans(strategyInput).map(plan => (
                    <div key={plan.id} className="suggestion-item" onClick={() => handleSelectPlan(plan, strategyInput.includes('#') ? 'hash' : 'handle')}>
                      <img src={plan.profile_image || "https://via.placeholder.com/40"} className="suggestion-avatar" alt="" />
                      <div className="suggestion-info">
                        <span className="suggestion-name">{plan.name}</span>
                        <span className="suggestion-handle">{plan.handle} | {plan.hash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <p className="or-divider">ou</p>
        <p className="create-link">Crie sua própria lista de voto</p>

        <button className="btn-continue" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Continuar"}
        </button>

        {/* --- LINK AGORA ABRE O MODAL --- */}
        <p className="link-preferences" onClick={() => setShowPreferences(true)}>
          Preferências
        </p>
      </main>
    </div>
  );
}