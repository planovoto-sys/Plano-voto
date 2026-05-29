import { useMemo, useState } from 'react';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import {
  clearAllLocalDeviceData,
  clearCandidateCache,
  clearLocalBallotDraft,
  clearOfflineData,
  resetCookiePermissions
} from './services/localDataCleanupService';

const ACTIONS = {
  draft: {
    label: 'Apagar rascunho local',
    title: 'Apagar rascunho local?',
    message: 'Isso remove rascunhos e recibos salvos neste navegador. Dados salvos na conta podem continuar existindo.',
    run: () => Promise.resolve(clearLocalBallotDraft())
  },
  offline: {
    label: 'Apagar dados offline',
    title: 'Apagar dados offline?',
    message: 'Isso remove caches da PWA, snapshots offline e filas locais futuras deste navegador.',
    run: clearOfflineData
  },
  candidates: {
    label: 'Apagar cache de candidatos',
    title: 'Apagar cache de candidatos?',
    message: 'Isso remove listas públicas de candidatos, partidos e contagens cacheadas. O app buscará tudo novamente quando necessário.',
    run: clearCandidateCache
  },
  cookies: {
    label: 'Redefinir permissões de cookies',
    title: 'Redefinir permissões de cookies?',
    message: 'Isso remove permissões salvas para cookies opcionais. O aviso de privacidade poderá aparecer novamente.',
    run: () => Promise.resolve(resetCookiePermissions())
  },
  all: {
    label: 'Apagar tudo deste dispositivo',
    title: 'Apagar tudo deste dispositivo?',
    message: 'Isso removerá rascunhos locais, dados offline, cache de candidatos e permissões salvas neste navegador. Dados salvos na conta podem continuar existindo até solicitação ou exclusão específica.',
    run: clearAllLocalDeviceData,
    dangerous: true
  }
};

export default function LocalDataActions({ compact = false }) {
  const [pendingActionId, setPendingActionId] = useState('');
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const pendingAction = useMemo(() => ACTIONS[pendingActionId] || null, [pendingActionId]);

  const runPendingAction = async () => {
    if (!pendingAction) return;

    setIsRunning(true);
    setStatus('');
    try {
      const result = await pendingAction.run();
      setStatus(`Ação concluída. Itens removidos: ${result?.removed ?? 0}.`);
    } catch (error) {
      setStatus(error?.message || 'Não foi possível concluir a limpeza agora.');
    } finally {
      setIsRunning(false);
      setPendingActionId('');
    }
  };

  return (
    <section className={`privacy-control-panel ${compact ? 'privacy-control-panel--compact' : ''}`} aria-labelledby="local-data-actions-title">
      <div className="privacy-control-panel__heading">
        <span>Controles deste navegador</span>
        <h2 id="local-data-actions-title">Dados salvos neste dispositivo</h2>
        <p>
          Use estes controles para apagar rascunhos locais, cache offline, cache de candidatos e permissões salvas
          neste navegador.
        </p>
      </div>

      <div className="privacy-control-actions">
        {Object.entries(ACTIONS).map(([id, action]) => (
          <button
            key={id}
            className={`privacy-control-action nv-touch ${action.dangerous ? 'privacy-control-action--danger' : ''}`}
            type="button"
            onClick={() => setPendingActionId(id)}
            disabled={isRunning}
          >
            {action.label}
          </button>
        ))}
      </div>

      {status && <p className="privacy-control-panel__status" role="status">{status}</p>}

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        titulo={pendingAction?.title || ''}
        mensagem={pendingAction?.message || ''}
        textoCancelar="Cancelar"
        textoConfirmar={isRunning ? 'Apagando...' : (pendingAction?.dangerous ? 'Apagar dados deste dispositivo' : 'Confirmar')}
        tipo={pendingAction?.dangerous ? 'perigo' : 'aviso'}
        onCancel={() => {
          if (!isRunning) setPendingActionId('');
        }}
        onConfirm={runPendingAction}
      />
    </section>
  );
}
