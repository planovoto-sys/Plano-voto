import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import './DefineStrategy.css'; 

export default function DefineStrategy() {
  const [inputs, setInputs] = useState(['', '', '']); // 3 slots
  const [allPlans, setAllPlans] = useState([]); 
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userHash, setUserHash] = useState('...');
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // 1. Pega dados do usuário (hash)
      if (auth.currentUser) {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) setUserHash(userSnap.data().my_hash || '#...');
      }
      // 2. Pega planos
      const snap = await getDocs(collection(db, "plans"));
      setAllPlans(snap.docs.map(d => ({...d.data(), id: d.id})));
    };
    init();
  }, []);

  const handleInputChange = (index, value) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  const handleSelectPlan = (index, plan, type) => {
    const newInputs = [...inputs];
    // Salva o hash se buscou por #, senão salva o @
    newInputs[index] = type === 'hash' ? plan.hash : plan.handle; 
    setInputs(newInputs);
    setFocusedIndex(null); 
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const finalStrategy = inputs.filter(item => item.trim() !== "");
      await updateDoc(userRef, { strategy: finalStrategy });
      navigate('/meu-plano');
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const getFilteredPlans = (text) => {
    if (!text || text.length < 2) return [];
    const lower = text.toLowerCase();
    return allPlans.filter(p => 
      p.handle.toLowerCase().includes(lower) || 
      p.hash.toLowerCase().includes(lower) ||
      p.name.toLowerCase().includes(lower)
    ).slice(0, 5);
  };

  return (
    <div className="page-container-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header-clean">
        <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
        <div className="header-info">
          <span>{userHash} | <span style={{textDecoration:'underline'}}>informar</span></span>
          <span className="followers-count">0 seguidores</span>
        </div>
        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <div className="breadcrumb-active">
        <span className="active-step">siga</span> &gt; <span className="inactive-step">vete</span> &gt; <span className="inactive-step">vote</span>
      </div>

      <main className="main-content-clean">
        <p className="page-instruction">
          Siga listas de voto de quem te representa<br/>
          (use @ p/ perfis do Instagram ou # p/ listas)
        </p>

        <div className="strategy-list">
          {inputs.map((val, index) => (
            <div key={index} className="strategy-input-wrapper-clean" style={{ zIndex: focusedIndex === index ? 50 : 1 }}>
              <input 
                className="strategy-input-clean"
                placeholder={`Digite aqui o @ ou # da lista ${index + 1}`}
                value={val}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setTimeout(() => setFocusedIndex(current => current === index ? null : current), 200)}
                autoComplete="off" 
              />
              {focusedIndex === index && val.length > 1 && (
                <div className="suggestions-box" onMouseDown={(e) => e.preventDefault()}>
                  {getFilteredPlans(val).map(plan => (
                    <div key={plan.id} className="suggestion-item" onClick={() => handleSelectPlan(index, plan, val.includes('#') ? 'hash' : 'handle')}>
                      <img src={plan.profile_image} className="suggestion-avatar" alt=""/>
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

        <p className="or-divider">ou</p>
        <p className="create-link">Crie sua própria lista de voto</p>

        <button className="btn-continue" onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Continuar"}
        </button>
        <p className="help-link">Precisa de ajuda?</p>
      </main>
    </div>
  );
}