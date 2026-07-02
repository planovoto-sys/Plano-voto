import { Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
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
          Escaneie o QR Code para abrir o Bom de Voto no navegador do celular.
        </p>
      </div>

      <DesktopLockedFeatureList />
      <DesktopQrCard handoff={handoff} />
      <Link className="desktop-mobile-handoff-panel__legal-link" to="/aviso-eleitoral">
        Aviso Eleitoral: o app não realiza votação oficial.
      </Link>
    </aside>
  );
}
