import { useState } from 'react';
import { useUser } from '@/shared/hooks/useUser';
import { deleteUserElectionData } from '@/features/ballot';
import LocalDataActions from './LocalDataActions';

export default function AccountDeletionPanel() {
  const { user, loading } = useUser();
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmation.trim().toUpperCase() === 'EXCLUIR';

  const handleDelete = async () => {
    if (!user?.uid || !canDelete) return;

    setIsDeleting(true);
    setStatus('');
    try {
      await deleteUserElectionData(user.uid);
      setStatus('Dados eleitorais da conta solicitados para exclusão. Rascunhos locais deste navegador também foram limpos.');
      setConfirmation('');
    } catch (error) {
      setStatus(error?.message || 'Não foi possível excluir os dados da conta agora.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="privacy-control-panel">
        <p className="privacy-control-panel__status">Carregando dados da conta...</p>
      </section>
    );
  }

  return (
    <section className="privacy-control-panel privacy-control-panel--danger" aria-labelledby="account-deletion-title">
      <div className="privacy-control-panel__heading">
        <span>Conta e dados</span>
        <h2 id="account-deletion-title">Excluir dados da conta</h2>
        <p>
          Esta ação usa a função segura disponível no projeto para apagar dados eleitorais vinculados ao login.
          Logs técnicos, backups ou registros necessários por segurança, auditoria ou obrigação legal podem permanecer
          pelo tempo aplicável.
        </p>
      </div>

      {!user?.uid ? (
        <div className="privacy-account-box">
          <strong>Você não está logado</strong>
          <p>
            Para excluir dados da conta, entre com o mesmo login usado no app ou envie solicitação para
            plano.voto@gmail.com. Mesmo sem login, você pode apagar dados deste dispositivo abaixo.
          </p>
          <LocalDataActions compact />
        </div>
      ) : (
        <div className="privacy-account-box">
          <label className="privacy-confirm-field">
            <span>Digite EXCLUIR para confirmar</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
            />
          </label>
          <button
            className="privacy-control-action privacy-control-action--danger nv-touch"
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir meus dados'}
          </button>
          <LocalDataActions compact />
        </div>
      )}

      {status && <p className="privacy-control-panel__status" role="status">{status}</p>}
    </section>
  );
}
