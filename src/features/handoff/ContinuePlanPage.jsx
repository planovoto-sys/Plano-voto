import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import {
  getBallotProgress,
  LOCAL_PLAN_HANDOFF_TOKEN,
  LOCAL_PLAN_HANDOFF_SHORT_TOKEN,
  persistVisitorBallotDraft,
  readLocalPlanHandoffDraft,
  redeemPlanHandoffToken,
  saveBallotDraftToAccount
} from '@/features/ballot';
import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
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
  const isLocalToken = token === LOCAL_PLAN_HANDOFF_TOKEN || token === LOCAL_PLAN_HANDOFF_SHORT_TOKEN;

  useEffect(() => {
    if (userLoading || !isLocalToken || redeemStartedRef.current) return;

    let draft = null;
    try {
      draft = readLocalPlanHandoffDraft(location.hash);
    } catch {
      queueMicrotask(() => setStatus({
        type: 'error',
        message: 'Este QR Code local está inválido. Gere um novo QR Code no desktop.'
      }));
      return;
    }

    if (!draft?.estado) {
      queueMicrotask(() => setStatus({
        type: 'error',
        message: 'Este QR Code local não trouxe um estado válido. Gere um novo QR Code no desktop.'
      }));
      return;
    }

    redeemStartedRef.current = true;
    queueMicrotask(() => setStatus({ type: 'loading', message: 'Carregando seu rascunho no celular...' }));

    const persistDraft = user?.uid
      ? saveBallotDraftToAccount(user.uid, draft)
      : Promise.resolve(persistVisitorBallotDraft(draft));

    persistDraft
      .then((savedDraft) => {
        notify.success('Rascunho carregado pelo QR Code.', { dedupeKey: 'local-handoff-loaded' });
        const progress = getBallotProgress(savedDraft);
        navigate(progress.isComplete ? BALLOT_ROUTES.meuPlano : progress.nextRoute || BALLOT_ROUTES.estado, {
          replace: true,
          state: {
            bypassVoteRedirect: true,
            flowNotice: 'Rascunho carregado neste celular.'
          }
        });
      })
      .catch(() => {
        notify.error('Não foi possível carregar este rascunho. Gere um novo QR Code no desktop.', { dedupeKey: 'local-handoff-error' });
        setStatus({
          type: 'error',
          message: 'Não foi possível carregar este rascunho. Gere um novo QR Code no desktop.'
        });
      });
  }, [isLocalToken, location.hash, navigate, notify, user?.uid, userLoading]);

  useEffect(() => {
    if (isLocalToken || userLoading || !user?.uid || !token || redeemStartedRef.current) return;

    redeemStartedRef.current = true;
    queueMicrotask(() => setStatus({ type: 'loading', message: 'Carregando seu plano no celular...' }));

    redeemPlanHandoffToken(token)
      .then((draft) => saveBallotDraftToAccount(user.uid, draft))
      .then((savedDraft) => {
        notify.success('Plano carregado pelo QR Code.', { dedupeKey: 'handoff-loaded' });
        const progress = getBallotProgress(savedDraft);
        navigate(progress.isComplete ? BALLOT_ROUTES.meuPlano : progress.nextRoute || BALLOT_ROUTES.estado, {
          replace: true,
          state: {
            bypassVoteRedirect: true,
            flowNotice: 'Plano carregado neste celular.'
          }
        });
      })
      .catch(() => {
        notify.error('Este QR Code expirou ou já foi usado. Gere um novo QR Code no desktop.', { dedupeKey: 'handoff-expired' });
        setStatus({
          type: 'error',
          message: 'Este QR Code expirou ou já foi usado. Gere um novo QR Code no desktop.'
        });
      });
  }, [isLocalToken, navigate, notify, token, user?.uid, userLoading]);

  const handleLogin = () => {
    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`
      }
    });
  };

  if (userLoading || status.type === 'loading') {
    return <LoadingScreen className="nv-screen" />;
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
