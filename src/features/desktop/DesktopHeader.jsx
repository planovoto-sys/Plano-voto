import { ArrowLeft, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import DesktopStepNav from './DesktopStepNav';

export default function DesktopHeader({
  currentStep,
  onBack,
  onMobileCta,
  mobileCtaLabel = 'Continuar no celular'
}) {
  return (
    <header className="desktop-header">
      <div className="desktop-header__inner desktop-container">
        <div>
          {onBack && (
            <button className="desktop-header__back nv-touch" type="button" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              <span>Voltar</span>
            </button>
          )}
        </div>

        <Link className="desktop-header__brand" to="/" aria-label="Bom de Voto">
          <img src="/logo-horizontal.svg" alt="Bom de Voto" className="desktop-header__brand-logo" />
        </Link>

        <DesktopStepNav currentStep={currentStep} />

        <button className="desktop-header__mobile nv-touch" type="button" onClick={onMobileCta}>
          <Smartphone aria-hidden="true" />
          <span>{mobileCtaLabel}</span>
        </button>
      </div>
    </header>
  );
}
