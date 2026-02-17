import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

// Páginas
import Login from './pages/Login';
import Intro from './pages/Intro'; // <--- IMPORT NOVO
import DefineStrategy from './pages/DefineStrategy';
import MyPlan from './pages/MyPlan';
import NotFound from './pages/NotFound';

const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}>
    Carregando...
  </div>
);

// Redirecionador inteligente
function AuthRedirect() {
  const { userData } = useUser();
  // Se não tem dados, mas tem user, espera carregar ou manda pra estratégia
  if (!userData) return <Navigate to="/estrategia" />;
  
  const hasPlan = userData.strategy && userData.strategy.length > 0;
  return <Navigate to={hasPlan ? "/meu-plano" : "/estrategia"} replace />;
}

function App() {
  const { user, loading } = useUser();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz agora é a Intro. 
            Se já estiver logado, o componente Intro redireciona, 
            ou podemos redirecionar direto aqui com ternário se preferir. */}
        <Route path="/" element={user ? <AuthRedirect /> : <Intro />} />

        {/* Rota explícita para login (chamada pelo botão "Vamos começar") */}
        <Route path="/login" element={!user ? <Login /> : <AuthRedirect />} />
        
        {/* Rotas Protegidas */}
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/login" />} />
        <Route path="/meu-plano" element={user ? <MyPlan /> : <Navigate to="/login" />} />
      
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;