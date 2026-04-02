// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext'; 

// ... os seus outros imports (Intro, Login, DefineStrategy, NotFound, etc.)

function App() {
  const { user, loading } = useUser();

  // A linha alterada está aqui:
  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A carregar...</div>;

  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={!user ? <Intro /> : <Navigate to="/estrategia" replace />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/estrategia" replace />} />
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;