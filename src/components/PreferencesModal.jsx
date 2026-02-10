import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import './PreferencesModal.css';

export default function PreferencesModal({ isOpen, onClose }) {
  const { userData } = useUser();
  // Inicia o estado com o valor que já está no banco de dados
  const [isRenovaActive, setIsRenovaActive] = useState(false);

  // Sincroniza o estado local quando os dados do usuário carregam
  useEffect(() => {
    if (userData) {
      setIsRenovaActive(userData.preferenciaRenova || false);
    }
  }, [userData]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      // Salva permanentemente no Firestore
      await updateDoc(userRef, {
        preferenciaRenova: isRenovaActive
      });
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar preferências.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Preferências</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <h3 className="section-title">Siga um plano B (recomendado):</h3>
          
          <div className="toggle-card">
            <span className="toggle-description">Ative o plano de voto secundário (@renovabr)</span>
            <div className="toggle-controls">
              <span className={`toggle-status ${isRenovaActive ? 'active' : ''}`}>
                {isRenovaActive ? "ATIVO" : "DESATIVADO"}
              </span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isRenovaActive} 
                  onChange={() => setIsRenovaActive(!isRenovaActive)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="info-container">
            <h4 className="info-title">O que é o RenovaBR?</h4>
            <p className="info-text">É a maior escola de formação política do Brasil...</p>
          </div>

          {/* Troquei o onClose pelo handleSave para gravar no banco */}
          <button className="btn-save" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}