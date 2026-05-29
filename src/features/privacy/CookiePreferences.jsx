import { useState } from 'react';
import {
  acceptAllOptionalPrivacyPreferences,
  acceptOnlyNecessaryPrivacyPreferences,
  readPrivacyPreferences,
  savePrivacyPreferences
} from '@/features/privacy/privacyPreferences';

const COOKIE_OPTIONS = [
  {
    id: 'necessary',
    title: 'Necessários',
    description: 'Mantêm login, segurança, rascunho de escolha, aceite de privacidade, cache técnico e funcionamento básico da PWA.',
    locked: true
  },
  {
    id: 'analytics',
    title: 'Análise de uso',
    description: 'Permitem medir desempenho, erros e uso agregado do sistema para melhorar estabilidade e experiência.'
  },
  {
    id: 'personalization',
    title: 'Personalização',
    description: 'Guardam preferências opcionais de interface, filtros e experiência entre acessos.'
  },
  {
    id: 'marketing',
    title: 'Marketing e parceiros',
    description: 'Autorizam cookies ou identificadores opcionais para campanhas, mensuração de anúncios e integrações futuras com parceiros.'
  },
  {
    id: 'commercialData',
    title: 'Uso comercial agregado',
    description: 'Autoriza estudos comerciais com dados agregados ou anonimizados. Escolhas individuais de voto não devem ser vendidas.'
  }
];

export default function CookiePreferences() {
  const [preferences, setPreferences] = useState(readPrivacyPreferences);
  const [saved, setSaved] = useState(false);

  const updatePreference = (id) => {
    if (id === 'necessary') return;
    setSaved(false);
    setPreferences((current) => ({
      ...current,
      [id]: !current[id]
    }));
  };

  const persistPreferences = (nextPreferences) => {
    const savedPreferences = savePrivacyPreferences(nextPreferences);
    setPreferences(savedPreferences);
    setSaved(true);
  };

  const acceptOnlyNecessary = () => {
    setPreferences(acceptOnlyNecessaryPrivacyPreferences());
    setSaved(true);
  };

  const acceptAll = () => {
    setPreferences(acceptAllOptionalPrivacyPreferences());
    setSaved(true);
  };

  return (
    <section className="cookie-settings" aria-labelledby="cookie-settings-title">
      <div className="cookie-settings__heading">
        <h2 id="cookie-settings-title">Permissões de cookies</h2>
        <p>Você pode alterar essas permissões a qualquer momento. Cookies necessários ficam sempre ativos.</p>
      </div>

      <div className="cookie-settings__options">
        {COOKIE_OPTIONS.map((option) => (
          <label className={`cookie-option ${option.locked ? 'is-locked' : ''}`} key={option.id}>
            <span className="cookie-option__copy">
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </span>
            <span className="cookie-switch">
              <input
                type="checkbox"
                checked={Boolean(preferences[option.id])}
                disabled={option.locked}
                onChange={() => updatePreference(option.id)}
              />
              <span aria-hidden="true"></span>
            </span>
          </label>
        ))}
      </div>

      <div className="cookie-settings__actions">
        <button type="button" onClick={acceptOnlyNecessary}>
          Recusar opcionais
        </button>
        <button type="button" onClick={acceptAll}>
          Aceitar opcionais
        </button>
        <button className="cookie-settings__primary" type="button" onClick={() => persistPreferences(preferences)}>
          Salvar permissões
        </button>
      </div>

      {saved && (
        <p className="cookie-settings__saved" role="status">
          Permissões salvas neste dispositivo.
        </p>
      )}
    </section>
  );
}
