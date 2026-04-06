import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext'; 

import Login from './pages/login';
import Home from './pages/home';

function App() {
  const { user, loading } = useUser();

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;

  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/home" replace />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        {/* Futura rota: <Route path="/escolher-candidatos" element={...} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;