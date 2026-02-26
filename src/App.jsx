import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

import Login from './pages/Login';
import Intro from './pages/Intro';
import DefineStrategy from './pages/DefineStrategy';

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
  return <Navigate to={hasPlan ? '/estrategia' : '/login'} replace />;
}

function App() {
  const { user, loading } = useUser();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <AuthRedirect /> : <Intro />} />
        <Route path="/login" element={!user ? <Login /> : <AuthRedirect />} />
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/login" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;