import { UserProvider } from './contexts/UserContext';
import { createRoot } from 'react-dom/client';
// ...
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>,
)