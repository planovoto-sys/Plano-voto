// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Adicione a linha abaixo para importar o useUser!
import { useUser } from './contexts/UserContext'; 

// ... (seus outros imports: Intro, Login, DefineStrategy, NotFound, LoadingScreen, etc.)

function App() {
  const { user, loading } = useUser();

  if (loading) return <LoadingScreen />;

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