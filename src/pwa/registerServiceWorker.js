export const registerPwaServiceWorker = () => {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          window.dispatchEvent(new CustomEvent('bomdevoto:pwa-update-available'));
        });

        window.setInterval(() => {
          registration.update().catch(() => {
            // A proxima abertura da PWA tentara atualizar novamente.
          });
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('Nao foi possivel registrar o service worker.', error);
        }
      });
  });
};
