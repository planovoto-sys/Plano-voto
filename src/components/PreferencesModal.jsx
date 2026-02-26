import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import './PreferencesModal.css';

export default function PreferencesModal({ isOpen, onClose }) {
  const { userData } = useUser();
  const [isRenovaActive, setIsRenovaActive] = useState(false);

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
      await updateDoc(userRef, {
        preferenciaRenova: isRenovaActive
      });
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Preferências</h2>

        <div className="toggle-section">
          <span className="section-label">Siga um plano B (recomendado):</span>
          <span className="section-sublabel">Ative o plano de voto secundário (@renovabr)</span>
          
          <div 
            className={`custom-switch ${isRenovaActive ? 'active' : 'inactive'}`}
            onClick={() => setIsRenovaActive(!isRenovaActive)}
          >
            <div className="switch-handle">
              {isRenovaActive ? "ATIVO" : "INATIVO"}
            </div>
          </div>
        </div>

        <div className="info-area">
          <h4 className="info-title">O que é o RenovaBR?</h4>
          <p className="info-text">
            É a maior escola de formação política do Brasil. É uma escola pluripartidária, 
            sem fins lucrativos, que forma lideranças políticas e públicas para um Brasil 
            mais justo e menos desigual...
          </p>
          <div className="info-link">
            Saiba mais em <strong>renovabr.org</strong>
          </div>
        </div>

        <button className="btn-save" onClick={handleSave}>
          Salvar
        </button>
      </div>
    </div>
  );
}