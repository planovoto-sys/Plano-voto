import DesktopHeader from './DesktopHeader';
import AppFooter from '@/shared/ui/layout/AppFooter';
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
        <AppFooter className="app-footer--scroll-content desktop-footer" />
      </main>
    </div>
  );
}
