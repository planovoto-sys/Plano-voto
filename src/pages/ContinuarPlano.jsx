import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  getBallotProgress,
  redeemPlanHandoffToken,
  saveBallotDraftToAccount
} from '@/services/voting/votingService';
import { ChanceFlame } from '@/components/icons/ChanceFlame';
import './ContinuarPlano.css';

export default function ContinuarPlano() {
  const { token } = useParams();
  const { loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const redeemStartedRef = useRef(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (userLoading || !token || redeemStartedRef.current) return;

    redeemStartedRef.current = true;
    setStatus({ type: 'loading', message: 'Entrando e carregando seu plano no celular...' });

    redeemPlanHandoffToken(token)
      .then(async (handoff) => {
        let activeUser = auth.currentUser;

        if (handoff.authToken && (!activeUser?.uid || (handoff.userId && activeUser.uid !== handoff.userId))) {
          const credential = await signInWithCustomToken(auth, handoff.authToken);
          activeUser = credential.user;
        }

        if (!activeUser?.uid) {
          setStatus({
            type: 'needs-login',
            message: 'Faça login para carregar este plano no celular.'
          });
          return null;
        }

        return saveBallotDraftToAccount(activeUser.uid, handoff.draft);
      })
      .then((savedDraft) => {
        if (!savedDraft) return;

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
        setStatus({
          type: 'error',
          message: 'Este QR Code expirou ou já foi usado. Gere um novo QR Code no desktop.'
        });
      });
  }, [navigate, token, userLoading]);

  const handleLogin = () => {
    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`
      }
    });
  };

  if (userLoading || status.type === 'loading') {
    return <div className="loading nv-screen" role="status" aria-live="polite">{status.message || 'CARREGANDO...'}</div>;
  }

  return (
    <main className="handoff-page nv-screen">
      <section className="handoff-panel nv-container-narrow">
        <h1>
          <ChanceFlame className="handoff-panel__flame" size={38} />
          Continuar plano
        </h1>

        {status.type === 'needs-login' ? (
          <>
            <p>{status.message}</p>
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
