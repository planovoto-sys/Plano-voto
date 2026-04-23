import React from 'react';
import { auth, googleProvider } from '../services/firebaseConfig';
import { sendEmailVerification, signInWithPopup, signOut } from 'firebase/auth';
import { useLocation } from 'react-router-dom';
import { useUser } from '../contexts/useUser';
import { canAccessVotingArea } from '../services/authPolicy';
import { flowError, flowLog } from '../services/debugFlow';
import styles from './Login.module.css';

function Login() {
  const location = useLocation();
  const { user } = useUser();
  const providerIds = user?.providerData?.map((provider) => provider.providerId) ?? [];
  const hasPasswordProvider = providerIds.includes('password');
  const isBlockedByVerification = Boolean(user) && !canAccessVotingArea(user);
  const authReason = location.state?.reason;

  const handleGoogleLogin = async () => {
    try {
      flowLog('login.google.start');
      const result = await signInWithPopup(auth, googleProvider);
      flowLog('login.google.success', { userId: result.user?.uid });
    } catch (error) {
      flowError('login.google.error', error);
      console.error('Erro ao fazer login:', error);
      alert('Falha ao fazer login com o Google.');
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;

    try {
      await sendEmailVerification(user);
      alert('Enviamos um novo email de verificacao. Confira sua caixa de entrada.');
    } catch (error) {
      flowError('login.email-verification.resend.error', error, { userId: user.uid });
      alert('Nao foi possivel reenviar o email de verificacao agora.');
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await signOut(auth);
      flowLog('login.switch-account.success');
    } catch (error) {
      flowError('login.switch-account.error', error);
      alert('Nao foi possivel trocar de conta no momento.');
    }
  };

  const shouldShowAuthAlert = isBlockedByVerification || (authReason === 'EMAIL_NOT_VERIFIED' && Boolean(user));

  return (
    <div className={styles.loginWrapper}>
      <header className={styles.loginHeader}>
        <h1>meuvoto.org</h1>
        <div className={styles.loginTriangleDown}></div>
      </header>

      <main className={styles.loginMain}>
        {shouldShowAuthAlert && (
          <section className={styles.loginSecurityAlert} aria-live="polite" role="status">
            <p>
              Sua conta esta autenticada, mas precisa cumprir a verificacao de email para acessar a votacao.
            </p>
            <div className={styles.loginSecurityActions}>
              {hasPasswordProvider && (
                <button className={`${styles.btnSecurityAction} ${styles.btnPrimaryAction}`.trim()} type="button" onClick={handleResendVerification}>
                  Reenviar verificacao
                </button>
              )}
              <button className={styles.btnSecurityAction} type="button" onClick={handleSwitchAccount}>
                Trocar conta
              </button>
            </div>
          </section>
        )}

        <div className={styles.videoCard}>
          <button className={styles.playButton} type="button" aria-label="Reproduzir video">
            <div className={styles.playIcon}></div>
          </button>
        </div>

        <button className={styles.btnComecar} type="button" onClick={handleGoogleLogin}>
          COMEÇAR
        </button>
      </main>
    </div>
  );
}

export default Login;
