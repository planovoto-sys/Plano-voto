import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  acceptAllOptionalPrivacyPreferences,
  acceptOnlyNecessaryPrivacyPreferences,
  hasSavedPrivacyPreferences
} from '@/features/privacy/privacyPreferences';
import './PrivacyConsent.css';

export default function PrivacyConsent() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(hasSavedPrivacyPreferences);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const showConsentAgain = () => {
      setAccepted(false);
      setExpanded(false);
    };

    window.addEventListener('bomdevoto:privacy-preferences-reset', showConsentAgain);
    return () => window.removeEventListener('bomdevoto:privacy-preferences-reset', showConsentAgain);
  }, []);

  const acceptNecessary = () => {
    acceptOnlyNecessaryPrivacyPreferences();
    setAccepted(true);
  };

  const acceptOptional = () => {
    acceptAllOptionalPrivacyPreferences();
    setAccepted(true);
  };

  const openCustomization = () => {
    setAccepted(true);
    navigate('/cookies');
  };

  if (accepted) return null;

  return (
    <section className="privacy-consent" aria-labelledby="privacy-consent-title" role="region">
      <div className="privacy-consent__copy">
        <h2 id="privacy-consent-title">Privacidade e permissões</h2>
        <p>
          Usamos recursos necessários para login, segurança, rascunho e funcionamento da PWA. Recursos opcionais
          de análise, personalização, marketing e estudos agregados dependem da sua permissão.
        </p>

        {expanded && (
          <div className="privacy-consent__details">
            <p>
              Dados públicos de candidatos podem ficar em cache para melhorar o carregamento em redes lentas.
              O app organiza um plano pessoal e não realiza votação oficial.
            </p>
            <p>
              Você pode limpar esses dados na Central de Privacidade, na página de cookies ou nas configurações
              do navegador. Isso pode apagar rascunhos e preferências salvas neste dispositivo.
            </p>
          </div>
        )}
      </div>

      <div className="privacy-consent__actions">
        <button className="privacy-consent__secondary" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ocultar' : 'Ver detalhes'}
        </button>
        <button className="privacy-consent__secondary" type="button" onClick={openCustomization}>
          Personalizar
        </button>
        <button className="privacy-consent__secondary" type="button" onClick={acceptNecessary}>
          Aceitar necessários
        </button>
        <button className="privacy-consent__primary" type="button" onClick={acceptOptional}>
          Aceitar opcionais
        </button>
      </div>
    </section>
  );
}
