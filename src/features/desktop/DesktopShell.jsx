import DesktopHeader from './DesktopHeader';
import './desktop.css';

export default function DesktopShell({
  currentStep,
  children,
  onBack,
  onMobileCta,
  mobileCtaLabel = 'Continuar no celular'
}) {
  return (
    <div className="desktop-redesign nv-screen">
      <DesktopHeader
        currentStep={currentStep}
        onBack={onBack}
        onMobileCta={onMobileCta}
        mobileCtaLabel={mobileCtaLabel}
      />
      <main className="desktop-main nv-scroll">
        {children}
      </main>
    </div>
  );
}
