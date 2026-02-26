import React from 'react';
import './SuccessModal.css';

export default function SuccessModal({ isOpen, onClose, date, onInvite }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">Etapa concluída com sucesso!</h2>
        
        {/* A data vem via props aqui */}
        <p className="modal-subtitle">
          A próxima etapa começará em {date}
        </p>

        <div className="modal-info-box">
          <p>
            Até lá, quanto mais pessoas seguirem seu @ ou #, mais fortes serão seus votos.
          </p>
          
          <strong>
            Aproveite para convidar o máximo de seguidores que puder!
          </strong>
          
          <p>Nos vemos em breve!</p>
        </div>

        <button className="btn-invite" onClick={onInvite}>
          Convidar seguidores
        </button>

        <button className="btn-text-back" onClick={onClose}>
          Voltar
        </button>
      </div>
    </div>
  );
}