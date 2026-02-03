import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import './DefineStrategy.css';

export default function DefineStrategy() {
  const { userData } = useUser(); // Dados vindos do Contexto
  const [inputs, setInputs] = useState(['', '', '']); 
  const [allPlans, setAllPlans] = useState([]); // Cache de busca
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // 1. Carrega dados iniciais
  useEffect(() => {
    // Preenche inputs se já existir estratégia salva
    if (userData?.strategy?.length) {
      setInputs([
        userData.strategy[0] || '',
        userData.strategy[1] || '',
        userData.strategy[2] || ''
      ]);
    }

    // Busca lista de planos para autocomplete (Plans + Users)
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
      } catch (err) {
        console.error("Erro ao buscar planos:", err);
      }
    };
    fetchPlans();
  }, [userData]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const finalStrategy = inputs.filter(item => item.trim() !== "");
      await updateDoc(doc(db, "users", auth.currentUser.uid), { strategy: finalStrategy });
      navigate('/meu-plano');
    } catch (error) { 
      alert("Erro ao salvar estratégia.");
    } finally {
      setSaving(false);
    }
  };



  const handleInputChange = (index, val) => {
    const newInputs = [...inputs];
    newInputs[index] = val;
    setInputs(newInputs);
  };

  const handleSelectPlan = (index, plan, type) => {
    const newInputs = [...inputs];
    newInputs[index] = type === 'hash' ? plan.hash : plan.handle;
    setInputs(newInputs);
    setFocusedIndex(null);
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

      <header className="header-clean">
        <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
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
          Siga listas de voto de quem te representa<br />
          (use @ p/ perfis do Instagram ou # p/ listas)
        </p>

        <div className="strategy-list">
          {inputs.map((val, index) => (
            <div key={index} className="strategy-input-wrapper-clean" style={{ zIndex: focusedIndex === index ? 50 : 1 }}>
              <input
                className="strategy-input-clean"
                placeholder={`Lista ${index + 1}`}
                value={val}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
              />
              {focusedIndex === index && val.length > 1 && (
                <div className="suggestions-box" onMouseDown={(e) => e.preventDefault()}>
                  {getFilteredPlans(val).map(plan => (
                    <div key={plan.id} className="suggestion-item" onClick={() => handleSelectPlan(index, plan, val.includes('#') ? 'hash' : 'handle')}>
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
          ))}
        </div>

        <button className="btn-continue" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Continuar"}
        </button>
      </main>
    </div>
  );
}