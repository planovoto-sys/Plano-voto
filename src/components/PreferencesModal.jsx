import React, { useState } from 'react';
import './PreferencesModal.css';

export default function PreferencesModal({ isOpen, onClose }) {
  // Estado do botão deslizante (Começa desativado por padrão)
  const [isRenovaActive, setIsRenovaActive] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Preferências</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Seção do Plano B */}
          <h3 className="section-title">Siga um plano B (recomendado):</h3>
          
          <div className="toggle-card">
            <span className="toggle-description">
              Ative o plano de voto secundário (@renovabr)
            </span>
            
            <div className="toggle-controls">
              <span className={`toggle-status ${isRenovaActive ? 'active' : ''}`}>
                {isRenovaActive ? "ATIVO" : "DESATIVADO"}
              </span>
              
              {/* Botão Deslizante (Switch) */}
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

          {/* Seção de Informações */}
          <div className="info-container">
            <h4 className="info-title">O que é o RenovaBR?</h4>
            <p className="info-text">
              É a maior escola de formação política do Brasil.<br/>
              É uma escola pluripartidária, sem fins lucrativos,
              que forma lideranças políticas e públicas para um
              Brasil mais justo e menos desigual, e para uma
              democracia mais participativa e informada ...
            </p>
            
            <a 
              href="https://renovabr.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="info-link"
            >
              Saiba mais em renovabr.org
            </a>
          </div>

          {/* Botão Salvar */}
          <button className="btn-save" onClick={onClose}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}