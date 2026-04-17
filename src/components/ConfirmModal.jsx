import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({
  isOpen,
  titulo,
  mensagem,
  textoConfirmar = 'CONFIRMAR',
  textoCancelar = 'CANCELAR',
  onConfirm,
  onCancel,
  mostrarCancelar = true,
  children,
  tipo = 'aviso'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h3 className="modal-title">{titulo}</h3>
        <p className="modal-message">{mensagem}</p>
        
        {/* Se houver children (ex: botões de troca de candidatos), renderiza-os */}
        {children ? (
          <div className="modal-custom-content">
            {children}
            <button className="btn-modal btn-cancelar" onClick={onCancel} style={{ marginTop: '10px', width: '100%' }}>
              DESISTIR
            </button>
          </div>
        ) : (
          /* Botões normais de ação */
          <div className="modal-actions">
            {mostrarCancelar && (
              <button className="btn-modal btn-cancelar" onClick={onCancel}>
                {textoCancelar}
              </button>
            )}
            <button className={`btn-modal btn-confirmar ${tipo}`} onClick={onConfirm} style={{ flex: mostrarCancelar ? 1 : 'none', width: mostrarCancelar ? 'auto' : '100%' }}>
              {textoConfirmar}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}