import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import PreferencesModal from '../components/PreferencesModal';
import './DefineStrategy.css';

export default function DefineStrategy() {
  const { userData, setUserData } = useUser(); // Garantir que temos o setUserData para atualizar o contexto localmente se precisar
  const [strategyInput, setStrategyInput] = useState('');
  const [allPlans, setAllPlans] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Controle do Menu e Modal
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const navigate = useNavigate();

  // 1. GERAÇÃO AUTOMÁTICA DE HASH SE NÃO EXISTIR
  useEffect(() => {
    const checkAndGenerateHash = async () => {
      if (auth.currentUser && userData && !userData.my_hash) {
        // Gera hash aleatório de 6 digitos (ex: #ab3f91)
        const newHash = '#' + Math.random().toString(36).substring(2, 8);
        
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, { my_hash: newHash });
          
          // Atualiza o estado local para refletir na hora
          if (setUserData) {
            setUserData(prev => ({ ...prev, my_hash: newHash }));
          }
          console.log("Hash gerado automaticamente:", newHash);
        } catch (error) {
          console.error("Erro ao gerar hash:", error);
        }
      }
    };

    checkAndGenerateHash();
  }, [userData, setUserData]);

  // 2. CARREGAR ESTRATÉGIA E PLANOS
  useEffect(() => {
    if (userData?.strategy?.length > 0) {
      setStrategyInput(userData.strategy[0]);
    }

    const fetchPlans = async () => {
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
      {/* Menu Lateral e Modal */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {/* HEADER: Logo + Hash + Menu */}
      <header className="header-clean">
        <h1 className="brand-logo-small">plano<span className="brand-bold">de</span>voto</h1>
        
        <div className="header-actions">
          {/* Exibe o Hash ou '...' carregando */}
          <span className="user-hash-display">
            {userData?.my_hash || '...'}
          </span>
          
          {/* Menu Sanduíche */}
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="main-content-clean">
        
        {/* NAV PILL: Siga / Vete / Vote */}
        <div className="nav-pill-container">
          <span className="nav-item active">siga</span>
          <span className="nav-item">vete</span>
          <span className="nav-item">vote</span>
        </div>

        {/* INSTRUÇÃO */}
        <p className="page-instruction">
          Siga o plano de voto de quem te representa<br />
          (digite abaixo o @ do Instagram ou # do plano)
        </p>

        {/* INPUT ESTILO CAIXA CINZA */}
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
              
              {/* Autocomplete Dropdown */}
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
        
        <p className="create-link">Crie seu próprio plano de voto</p>

        {/* BOTÃO CONTINUAR */}
        <button className="btn-continue-gray" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Continuar"}
        </button>

        {/* LINK PREFERÊNCIAS */}
        <p className="link-preferences" onClick={() => setShowPreferences(true)}>
          Preferências
        </p>

      </main>
    </div>
  );
}