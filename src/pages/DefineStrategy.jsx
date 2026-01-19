import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import './SelectState.css'; 
import './DefineStrategy.css'; 

export default function DefineStrategy() {
  const [inputs, setInputs] = useState(['', '', '', '', '']); 
  const [availableUsers, setAvailableUsers] = useState([]); 
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 1. Referência para controlar o timer do onBlur e evitar conflitos
  const blurTimeoutRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const usersData = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              handle: data.username, 
              name: data.name || "Usuário",
              photo: data.profile_image 
            };
          })
          .filter(u => u.handle && u.id !== auth.currentUser?.uid);

        setAvailableUsers(usersData);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleInputChange = (index, value) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  const handleSelectUser = (index, handle) => {
    const newInputs = [...inputs];
    newInputs[index] = handle; 
    setInputs(newInputs);
    
    // Limpa o foco imediatamente ao selecionar
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setFocusedIndex(null); 
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const finalStrategy = inputs.filter(item => item.trim() !== "");
      
      await updateDoc(userRef, {
        strategy: finalStrategy,
        status: 'locked'
      });
      navigate('/meu-plano');
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const getFilteredUsers = (searchText) => {
    if (!searchText || searchText.length < 2) return []; 
    const lowerText = searchText.toLowerCase();
    return availableUsers.filter(user => 
      user.name.toLowerCase().includes(lowerText) || 
      user.handle.toLowerCase().includes(lowerText)
    ).slice(0, 5); 
  };

  // Fallback de imagem (DiceBear)
  const handleImageError = (e, name) => {
    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  };

  return (
    <div className="page-container">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header">
        <h1 className="brand-small">plano</h1>
        <div className="menu-icon" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <main className="main-content">
        <h2 className="page-title">estratégia</h2>
        <p className="page-subtitle">Defina sua estratégia (informe até 5 planos)</p>

        <div className="strategy-list">
          {inputs.map((val, index) => (
            <div 
              key={index} 
              className={`strategy-input-wrapper ${focusedIndex === index ? 'active' : ''}`}
              // Z-Index garante que a lista apareça sobre os campos de baixo
              style={{ zIndex: focusedIndex === index ? 50 : 1 }}
            >
              <input 
                className="strategy-input"
                placeholder={`${index + 1}º plano (@...)`}
                value={val}
                onChange={(e) => handleInputChange(index, e.target.value)}
                
                // 2. Ao focar, cancelamos qualquer fechamento pendente de outro campo
                onFocus={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                  }
                  setFocusedIndex(index);
                }}

                // 3. Ao sair, agendamos o fechamento, guardando o ID no ref
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => {
                    setFocusedIndex(null);
                  }, 200);
                }}
                
                autoComplete="off"
              />

              {focusedIndex === index && val.length > 1 && (
                <div 
                  className="suggestions-box"
                  // Previne que o clique na barra de rolagem ou item feche o input
                  onMouseDown={(e) => e.preventDefault()} 
                >
                  {getFilteredUsers(val).map(user => (
                    <div 
                      key={user.id} 
                      className="suggestion-item"
                      onClick={() => handleSelectUser(index, user.handle)}
                    >
                      <img 
                        src={user.photo} 
                        alt={user.name} 
                        className="suggestion-avatar"
                        onError={(e) => handleImageError(e, user.name)}
                      />
                      <div className="suggestion-info">
                        <span className="suggestion-name">{user.name}</span>
                        <span className="suggestion-handle">{user.handle}</span>
                      </div>
                    </div>
                  ))}
                  {getFilteredUsers(val).length === 0 && (
                     <div style={{padding: 15, color: '#999', fontSize: '0.9rem', textAlign: 'center'}}>
                       Nenhum resultado
                     </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="action-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Continuar"}
        </button>
        
        <p onClick={() => navigate('/meu-plano')} className="skip-link">
          ou crie seu próprio plano
        </p>
      </main>
    </div>
  );
}