import { ArrowLeft, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
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

        <Link className="desktop-header__brand" to="/" aria-label="nossovoto.org">
          <ChanceFlame size={24} />
          <strong>nossovoto<em>.org</em></strong>
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
