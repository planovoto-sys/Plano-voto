import React, { useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // <--- IMPORTADO
import './SelectState.css';

export default function SelectState() {
  const [uf, setUf] = useState('ES');
  const [instaHandle, setInstaHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <--- ESTADO DO MENU
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!instaHandle) {
      alert("Por favor, informe seu Instagram.");
      return;
    }
    const finalHandle = instaHandle.includes('@') ? instaHandle : `@${instaHandle}`;
    const currentUser = auth.currentUser;

    if (currentUser) {
      setLoading(true);
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          state: uf,
          username: finalHandle, 
          status: 'selecting_strategy'
        });
        navigate('/estrategia');
      } catch (error) {
        console.error("Erro ao salvar:", error);
      }
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* MENU LATERAL */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header">
        <span className="brand-small">plano</span>
        {/* BOTÃO QUE ABRE O MENU */}
        <div className="menu-icon" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <main className="main-content">
        <h2 className="page-title">estado</h2>
        <p className="page-subtitle">Informe seus dados</p>

        <div className="input-group">
          <label className="input-label">Estado</label>
          <select 
            className="select-field"
            value={uf} 
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="ES">Espírito Santo (ES)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
            <option value="MG">Minas Gerais (MG)</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Seu Instagram</label>
          <input 
            className="input-field"
            type="text" 
            placeholder="@seu.perfil"
            value={instaHandle}
            onChange={(e) => setInstaHandle(e.target.value)}
          />
        </div>

        <button 
          className="action-btn"
          onClick={handleContinue} 
          disabled={loading}
        >
          {loading ? "Salvando..." : "Continuar"}
        </button>
      </main>
    </div>
  );
}