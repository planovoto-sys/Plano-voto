import React from 'react';
import './HowItWorksModal.css';

export default function HowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Como funciona o Plano</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="step-item">
            <span className="step-number">1</span>
            <p><strong>Crie sua conta:</strong> Entre com o Google para salvar seu progresso com segurança.</p>
          </div>
          
          <div className="step-item">
            <span className="step-number">2</span>
            <p><strong>Defina seu Estado:</strong> Informe onde você vota para recebermos as informações corretas.</p>
          </div>

          <div className="step-item">
            <span className="step-number">3</span>
            <p><strong>Siga Estratégias:</strong> Busque por influenciadores ou políticos e adicione o plano de voto deles ao seu.</p>
          </div>

          <div className="step-item">
            <span className="step-number">4</span>
            <p><strong>Gere sua Cola:</strong> O app organiza seus candidatos numa "cola" digital.</p>
          </div>
           <div className="step-item">
            <span className="step-number">5</span>
            <p><strong>Compartilhe com sus Contatos no Whatsapp:</strong> O App gera um link para compartilhar com seus contatos.</p>
          </div>
    
        </div>

        <button className="modal-action-btn" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}