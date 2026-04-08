import React, { useState, useEffect } from 'react';
import './StateSelector.css';

const ESTADOS_BR = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" }
];

export default function StateSelector({ value, onChange }) {
  // Controla se o componente está montado no DOM
  const [isOpen, setIsOpen] = useState(false);
  // Controla se a animação de saída está rodando
  const [isClosing, setIsClosing] = useState(false); 
  // Armazena temporariamente a seleção feita durante a animação de saída
  const [pendingSelection, setPendingSelection] = useState(null); 

  const ANIMATION_DURATION = 300; // Tempo em ms, deve bater com o CSS

  const openModal = () => {
    setIsOpen(true);
    setIsClosing(false); // Garante que começa sem a classe de fechamento
  };

  // Função genérica para fechar o modal com animação
  const handleCloseAnimation = (selectedUf = null) => {
    if (isClosing) return; // Evita cliques duplos durante a animação

    setIsClosing(true);
    setPendingSelection(selectedUf); // Guarda a UF se houver seleção

    // Espera a animação CSS (slideDown) acabar
    setTimeout(() => {
      if (selectedUf) {
        onChange(selectedUf); // Aplica a seleção no componente pai
      }
      setIsOpen(false); // Remove do DOM
      setIsClosing(false); // Reseta o estado
      setPendingSelection(null);
    }, ANIMATION_DURATION);
  };

  return (
    <div className="custom-selector-container">
      <div className="state-card-display" onClick={openModal}>
        <span className="state-text-big">{value}</span>
      </div>

      {isOpen && (
        // Adicionamos a classe 'closing' no overlay para o fadeOut
        <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleCloseAnimation()}>
          {/* Adicionamos a classe 'closing' no sheet para o slideDown */}
          <div className={`bottom-sheet ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h3>Selecione seu Estado</h3>
              <button className="close-icon-btn" onClick={() => handleCloseAnimation()}>
                ✕
              </button>
            </div>

            <div className="sheet-list">
              {ESTADOS_BR.map(estado => (
                <button 
                  key={estado.uf} 
                  // Durante o fechamento, destacamos visualmente o que foi clicado (pendingSelection)
                  className={`sheet-item ${(pendingSelection === estado.uf || (!pendingSelection && estado.uf === value)) ? 'active' : ''}`}
                  onClick={() => handleCloseAnimation(estado.uf)} // Passa a UF selecionada
                >
                  <div className="state-avatar">{estado.uf}</div>
                  <span className="state-full-name">{estado.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}