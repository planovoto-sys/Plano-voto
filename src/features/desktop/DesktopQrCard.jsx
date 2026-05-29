import { Link2, QrCode } from 'lucide-react';

export default function DesktopQrCard({ handoff, primaryLabel }) {
  const isLoading = handoff.status === 'loading';
  const label = primaryLabel || 'Gerar QR do rascunho';
  const defaultMessage = handoff.hasEstado
    ? 'Escaneie para continuar no celular.'
    : 'Escolha seu estado para liberar o QR Code do rascunho.';

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
    </div>
  );
}
