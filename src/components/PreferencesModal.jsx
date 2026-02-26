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
            <p className="info-text">É a maior escola de formação política do Brasil.
              É uma escola pluripartidária, sem fins lucrativos,
              que forma lideranças políticas e públicas para um
              Brasil mais justo e menos desigual, e para uma
              democracia mais participativa e informada ...</p>
          </div>

          {/* Troquei o onClose pelo handleSave para gravar no banco */}
          <button className="btn-save" onClick={handleSave}>
            Salvar
          </button>
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