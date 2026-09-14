import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/styles/tailwind.css';
import '@/shared/styles/reset.css';
import '@/shared/styles/global.css';
import App from '@/app/App';
import NotificationProvider from '@/features/notifications/NotificationProvider';
import { UserProvider } from '@/app/providers/UserProvider';
import { installFlowDebugTools } from '@/shared/utils/debugFlow';
import { registerPwaServiceWorker } from '@/pwa/registerServiceWorker';
import { initializePwaInstallPrompt } from '@/pwa/installPrompt';

installFlowDebugTools();
initializePwaInstallPrompt();
registerPwaServiceWorker();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </NotificationProvider>
  </React.StrictMode>,
);
