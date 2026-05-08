import { useState } from 'react';
import './PrivacyConsent.css';

const CONSENT_STORAGE_KEY = 'meuvoto:privacy-consent:v1';

const readStoredConsent = () => {
  if (typeof window === 'undefined') return true;

  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
};

export default function PrivacyConsent() {
  const [accepted, setAccepted] = useState(readStoredConsent);
  const [expanded, setExpanded] = useState(false);

  const acceptPolicy = () => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
      window.localStorage.setItem(`${CONSENT_STORAGE_KEY}:accepted-at`, new Date().toISOString());
    } catch {
      // O aviso some na sessao atual mesmo quando o navegador bloqueia armazenamento.
    }

    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <section className="privacy-consent" aria-labelledby="privacy-consent-title" role="region">
      <div className="privacy-consent__copy">
        <h2 id="privacy-consent-title">Privacidade e permissões</h2>
        <p>
          Usamos cookies técnicos do Firebase/Google para autenticação e armazenamento local para manter seu
          rascunho de voto, preferências e recibo no aparelho. A PWA não solicita câmera, microfone ou geolocalização.
        </p>

        {expanded && (
          <div className="privacy-consent__details">
            <p>
              Dados públicos de candidatos podem ficar em cache para melhorar o carregamento em redes lentas.
              O voto confirmado é enviado somente pela função segura do Firebase e não fica gravado como voto
              editável no navegador.
            </p>
            <p>
              Você pode limpar esses dados nas configurações do navegador a qualquer momento; isso pode apagar
              rascunhos e preferências salvas neste dispositivo.
            </p>
          </div>
        )}
      </div>

      <div className="privacy-consent__actions">
        <button className="privacy-consent__secondary" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ocultar' : 'Ver detalhes'}
        </button>
        <button className="privacy-consent__primary" type="button" onClick={acceptPolicy}>
          Entendi
        </button>
      </div>
    </section>
  );
}
