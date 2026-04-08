import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/home';
import EscolherCandidato from './pages/EscolherCandidato'; // Importe a nova página
import { UserProvider, useUser } from './contexts/UserContext';

function PrivateRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return <div>Carregando...</div>;
  return user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/escolher-deputado-federal" element={
            <PrivateRoute>
              <EscolherCandidato />
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;