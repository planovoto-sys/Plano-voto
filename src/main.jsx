import React from 'react';
import { createRoot } from 'react-dom/client';
import './reset.css';
import './index.css';
import App from './App';
import { UserProvider } from './contexts/UserContext';
import { installFlowDebugTools } from './services/debugFlow';

installFlowDebugTools();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>,
);
