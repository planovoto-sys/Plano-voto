import React from 'react'; 
import { createRoot } from 'react-dom/client';
import App from './App'; 
import { UserProvider } from './contexts/UserContext';

// ... (seus outros imports, como o index.css)
// Certifique-se de que o caminho para o index.css esteja correto
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>,
)