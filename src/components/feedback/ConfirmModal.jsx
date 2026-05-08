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
      <div className={`modal-container modal-container--${tipo}`}>
        <h3 className="modal-title">{titulo}</h3>
        <div className="modal-message">{mensagem}</div>
        
        {children ? (
          <div className="modal-custom-content">
            {children}
            <button className="btn-modal btn-cancelar" type="button" onClick={onCancel} style={{ marginTop: '10px', width: '100%' }}>
              DESISTIR
            </button>
          </div>
        ) : (
          <div className="modal-actions">
            {mostrarCancelar && (
              <button className="btn-modal btn-cancelar" type="button" onClick={onCancel}>
                {textoCancelar}
              </button>
            )}
            <button className={`btn-modal btn-confirmar ${tipo}`} type="button" onClick={onConfirm} style={{ flex: mostrarCancelar ? 1 : 'none', width: mostrarCancelar ? 'auto' : '100%' }}>
              {textoConfirmar}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
