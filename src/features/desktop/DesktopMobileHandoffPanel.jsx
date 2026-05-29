import { Smartphone } from 'lucide-react';
import DesktopLockedFeatureList from './DesktopLockedFeatureList';
import DesktopQrCard from './DesktopQrCard';

export default function DesktopMobileHandoffPanel({ handoff, title = 'Continue pelo celular' }) {
  return (
    <aside className="desktop-mobile-handoff-panel" aria-label="Continuar pelo celular">
      <div className="desktop-mobile-handoff-panel__copy">
        <span className="desktop-mobile-handoff-panel__eyebrow">
          <Smartphone aria-hidden="true" />
          Experiência completa
        </span>
        <h2>{title}</h2>
        <p>
          Escaneie o QR Code para abrir o NossoVoto no navegador do celular.
        </p>
      </div>

      <DesktopLockedFeatureList />
      <DesktopQrCard handoff={handoff} />
    </aside>
  );
}
