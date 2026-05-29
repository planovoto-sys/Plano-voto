import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Link2, QrCode, X } from 'lucide-react';

export default function DesktopQrCard({ handoff, primaryLabel }) {
  const titleId = useId();
  const descriptionId = useId();
  const [showInfo, setShowInfo] = useState(false);
  const isLoading = handoff.status === 'loading';
  const label = primaryLabel || 'Gerar QR do rascunho';
  const defaultMessage = handoff.hasEstado
    ? 'Escaneie para continuar no celular.'
    : 'Escolha seu estado para liberar o QR Code do rascunho.';

  useEffect(() => {
    if (!showInfo) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowInfo(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInfo]);

  return (
    <div className="desktop-qr-card">
      <div className="desktop-qr-card__visual" aria-label="QR Code para continuar no celular">
        {handoff.qr ? (
          <img src={handoff.qr} alt="" />
        ) : (
          <QrCode aria-hidden="true" />
        )}
      </div>

      <div className="desktop-qr-card__actions">
        <button
          className="desktop-button-primary nv-touch"
          type="button"
          onClick={handoff.generate}
          disabled={isLoading}
        >
          <QrCode aria-hidden="true" />
          <span>{isLoading ? 'Gerando...' : label}</span>
        </button>
        <button className="desktop-button-secondary nv-touch" type="button" onClick={handoff.copy}>
          <Link2 aria-hidden="true" />
          <span>Copiar link</span>
        </button>
      </div>

      <p className="desktop-qr-card__status" role="status">
        {handoff.message || defaultMessage}
      </p>

      <button className="desktop-qr-card__info-button nv-touch" type="button" onClick={() => setShowInfo(true)}>
        <Info aria-hidden="true" />
        <span>Como funciona o QR Code?</span>
      </button>

      {showInfo && (
        <div className="desktop-qr-info" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
          <div className="desktop-qr-info__panel">
            <button className="desktop-qr-info__close nv-touch" type="button" onClick={() => setShowInfo(false)} aria-label="Fechar aviso do QR Code">
              <X aria-hidden="true" />
            </button>
            <h3 id={titleId}>Como funciona o QR Code</h3>
            <p id={descriptionId}>
              O QR Code cria um acesso temporário para continuar seu rascunho em outro dispositivo.
              Ele não realiza login automático, não registra voto oficial e pode expirar. Não compartilhe
              o QR Code com pessoas que você não deseja que acessem o resumo do seu plano.
            </p>
            <div className="desktop-qr-info__links">
              <Link to="/aviso-eleitoral">Aviso Eleitoral</Link>
              <Link to="/politica-de-privacidade">Política de Privacidade</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
