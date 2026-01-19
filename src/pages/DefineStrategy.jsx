import React, { useState, useEffect } from 'react';
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

  // --- NOVA FUNÇÃO MÁGICA ---
  // Se a foto falhar, troca por uma imagem gerada com as iniciais do nome
  const handleImageError = (e, name) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
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
            >
              <input 
                className="strategy-input"
                placeholder={`${index + 1}º plano (@...)`}
                value={val}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
              />

              {focusedIndex === index && val.length > 1 && (
                <div className="suggestions-box">
                  {getFilteredUsers(val).map(user => (
                    <div 
                      key={user.id} 
                      className="suggestion-item"
                      onClick={() => handleSelectUser(index, user.handle)}
                      onMouseDown={(e) => e.preventDefault()} 
                    >
                      {/* IMAGEM COM PROTEÇÃO CONTRA ERRO */}
                      <img 
                        src={user.photo} 
                        alt={user.name} 
                        className="suggestion-avatar"
                        onError={(e) => handleImageError(e, user.name)} // <--- AQUI ESTÁ A CORREÇÃO
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