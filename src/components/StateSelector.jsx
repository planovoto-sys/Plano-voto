import React, { useState } from 'react';
import './StateSelector.css'; // Criaremos este arquivo abaixo

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function StateSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (uf) => {
    onChange(uf); // Passa a UF selecionada para o componente pai (Home)
    setIsOpen(false); // Fecha a lista
  };

  return (
    <div className="custom-selector-container">
      {/* O Card que o usuário vê (Fiel à imagem) */}
      <div className="state-card-display" onClick={() => setIsOpen(!isOpen)}>
        <span className="state-text-big">{value}</span>
        {/* Ícone sutil de seta (Opcional, mas ajuda a UX) */}
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</div>
      </div>

      {/* Lista Modal que abre ao clicar */}
      {isOpen && (
        <div className="state-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="state-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Selecione seu Estado</h3>
            <div className="state-grid">
              {ESTADOS_BR.map(uf => (
                <button 
                  key={uf} 
                  className={`state-option ${uf === value ? 'active' : ''}`}
                  onClick={() => handleSelect(uf)}
                >
                  {uf}
                </button>
              ))}
            </div>
            <button className="btn-close-modal" onClick={() => setIsOpen(false)}>FECHAR</button>
          </div>
        </div>
      )}
    </div>
  );
}