import { useId } from 'react';
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
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-container modal-container--${tipo}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h3 className="modal-title" id={titleId}>{titulo}</h3>
        <div className="modal-message">{mensagem}</div>
        
        {children ? (
          <div className="modal-custom-content">
            {children}
            <button className="btn-modal btn-cancelar btn-modal--full modal-custom-cancel" type="button" onClick={onCancel}>
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
            <button className={`btn-modal btn-confirmar ${tipo} ${mostrarCancelar ? '' : 'btn-modal--full'}`} type="button" onClick={onConfirm}>
              {textoConfirmar}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
