import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import './DesktopMobileOnlyPage.css';

const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'https://bomdevoto.com.br';

export default function DesktopMobileOnlyPage() {
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(PUBLIC_APP_URL, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#111811',
        light: '#ffffff'
      }
    })
      .then((dataUrl) => {
        if (!cancelled) setQrCode(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrCode('');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="desktop-mobile-only nv-screen">
      <section className="desktop-mobile-only__panel">
        <LogoCompleta className="desktop-mobile-only__logo" />
        <div className="desktop-mobile-only__copy">
          <h1>Continue pelo celular</h1>
          <p>Para uma melhor experiência, acesse pelo seu smartphone.</p>
        </div>

        <a
          className="desktop-mobile-only__qr-link"
          href={PUBLIC_APP_URL}
          aria-label="Abrir Bom de Voto no smartphone"
        >
          <span className="desktop-mobile-only__qr">
            {qrCode ? <img src={qrCode} alt="QR Code para acessar o Bom de Voto" /> : <span aria-hidden="true" />}
          </span>
          <strong>Escaneie o QR Code</strong>
          <small>ou acesse bomdevoto.com.br</small>
        </a>
      </section>
    </main>
  );
}
