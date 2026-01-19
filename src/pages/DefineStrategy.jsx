import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './SelectState.css'; 
import './DefineStrategy.css'; 

export default function DefineStrategy() {
  const [inputs, setInputs] = useState(['', '', '', '', '']); 
  const [availableUsers, setAvailableUsers] = useState([]); 
  const [loading, setLoading] = useState(false);
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
              name: data.name || "Usuário"
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

  return (
    <div className="page-container">
      <header className="header">
        <h1 className="brand-small">plano</h1>
        {/* Menu Funcional */}
        <div className="menu-icon" onClick={() => navigate('/perfil')}>≡</div>
      </header>

      <main className="main-content">
        <h2 className="page-title">estratégia</h2>
        <p className="page-subtitle">Defina sua estratégia (informe até 5 planos)</p>

        <div className="strategy-list">
          {inputs.map((val, index) => (
            <div key={index} className="strategy-input-wrapper">
              <input 
                className="strategy-input"
                placeholder={`${index + 1}º plano (@...)`}
                value={val}
                onChange={(e) => {
                  const newInputs = [...inputs];
                  newInputs[index] = e.target.value;
                  setInputs(newInputs);
                }}
                list="users-list"
              />
            </div>
          ))}
          
          <datalist id="users-list">
            {availableUsers.map(user => (
              <option key={user.id} value={user.handle}>{user.name}</option>
            ))}
          </datalist>
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