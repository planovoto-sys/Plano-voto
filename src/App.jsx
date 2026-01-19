import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './services/firebaseConfig';

import Login from './pages/Login';
import SelectState from './pages/SelectState';
import DefineStrategy from './pages/DefineStrategy';
import MyPlan from './pages/MyPlan';
import Profile from './pages/Profile'; // <--- Import Novo

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop: 50}}>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/estado" />} />
        
        {/* Rotas Protegidas */}
        <Route path="/estado" element={user ? <SelectState /> : <Navigate to="/" />} />
        <Route path="/estrategia" element={user ? <DefineStrategy /> : <Navigate to="/" />} />
        <Route path="/meu-plano" element={user ? <MyPlan /> : <Navigate to="/" />} />
        
        {/* Rota do Perfil */}
        <Route path="/perfil" element={user ? <Profile /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;