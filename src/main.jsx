import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/tailwind.css';
import '@/styles/reset.css';
import '@/styles/global.css';
import App from '@/app/App';
import { UserProvider } from '@/providers/UserProvider';
import { installFlowDebugTools } from '@/utils/debugFlow';
import { registerPwaServiceWorker } from '@/services/pwa/registerServiceWorker';

installFlowDebugTools();
registerPwaServiceWorker();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>,
);
