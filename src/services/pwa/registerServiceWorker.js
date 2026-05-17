export const registerPwaServiceWorker = () => {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {
          // A proxima abertura da PWA tentara atualizar novamente.
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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('meuvoto:sw-reloaded') === 'true') return;
    sessionStorage.setItem('meuvoto:sw-reloaded', 'true');
    window.location.reload();
  });
};
