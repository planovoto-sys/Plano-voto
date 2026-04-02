// src/App.jsx
import React from 'react';
// ... outros imports

function App() {
  const { user, loading } = useUser();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter basename="/Plano-voto">
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