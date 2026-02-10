import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

// Páginas
import Login from './pages/Login';
import DefineStrategy from './pages/DefineStrategy';
import MyPlan from './pages/MyPlan';
import NotFound from './pages/NotFound';

const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}>
    Carregando...
  </div>
);

function AuthRedirect() {
  const { userData } = useUser();
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
        <Route path="/" element={!user ? <Login /> : <AuthRedirect />} />
        
        {/* Rotas Protegidas */}
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/" />} />
        <Route path="/meu-plano" element={user ? <MyPlan /> : <Navigate to="/" />} />
      
        
        {/* 2. IMPORTANTE: A Rota Coringa (404) deve ser SEMPRE a última */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;