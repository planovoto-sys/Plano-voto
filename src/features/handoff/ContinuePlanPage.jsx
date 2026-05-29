import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import {
  getBallotProgress,
  redeemPlanHandoffToken,
  saveBallotDraftToAccount
} from '@/features/ballot';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import { useNotify } from '@/features/notifications/useNotify';
import './ContinuarPlano.css';

export default function ContinuarPlano() {
  const { token } = useParams();
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const notify = useNotify();
  const location = useLocation();
  const redeemStartedRef = useRef(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (userLoading || !user?.uid || !token || redeemStartedRef.current) return;

    redeemStartedRef.current = true;
    setStatus({ type: 'loading', message: 'Carregando seu plano no celular...' });

    redeemPlanHandoffToken(token)
      .then((draft) => saveBallotDraftToAccount(user.uid, draft))
      .then((savedDraft) => {
        notify.success('Plano carregado pelo QR Code.', { dedupeKey: 'handoff-loaded' });
        const progress = getBallotProgress(savedDraft);
        navigate(progress.nextRoute || BALLOT_ROUTES.estado, {
          replace: true,
          state: {
            bypassVoteRedirect: true,
            flowNotice: 'Plano carregado neste celular.'
          }
        });
      })
      .catch(() => {
        notify.error('QR Code expirado ou já usado.', { dedupeKey: 'handoff-expired' });
        setStatus({
          type: 'error',
          message: 'Este QR Code expirou ou já foi usado. Gere um novo QR Code no desktop.'
        });
      });
  }, [navigate, notify, token, user?.uid, userLoading]);

  const handleLogin = () => {
    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`
      }
    });
  };

  if (userLoading || status.type === 'loading') {
    return (
      <div className="loading nv-screen" role="status" aria-live="polite">
        <div className="loading-intro" aria-label="Carregando">
          <span className="loading-intro__mark" aria-hidden="true">
            <ChanceFlame className="loading-intro__flame" size={82} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="handoff-page nv-screen">
      <section className="handoff-panel nv-container-narrow">
        <h1>
          <ChanceFlame className="handoff-panel__flame" size={38} />
          Continuar plano
        </h1>

        {!user?.uid ? (
          <>
            <p>Faça login para carregar este rascunho no celular. O QR Code não faz login automático.</p>
            <button className="handoff-panel__primary nv-touch" type="button" onClick={handleLogin}>
              Fazer login
            </button>
          </>
        ) : (
          <>
            <p>{status.message || 'Preparando seu plano...'}</p>
            {status.type === 'error' && (
              <button className="handoff-panel__secondary nv-touch" type="button" onClick={() => navigate('/')}>
                Voltar
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
