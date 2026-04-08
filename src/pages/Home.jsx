import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import StateSelector from '../components/StateSelector'; 
import './Home.css'; 

export default function Home() {
  const { user, userData } = useUser();
  const navigate = useNavigate();
  const [estadoSelecionado, setEstadoSelecionado] = useState('SP');
  const [loading, setLoading] = useState(false);

  // Lê o estado atual do utilizador para manter o seletor sincronizado
  useEffect(() => {
    if (userData && userData.estado) {
      setEstadoSelecionado(userData.estado);
    }
  }, [userData]);

  const handleConfirmar = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        estado: estadoSelecionado
      });
      
      // Só avança para a próxima página após a gravação ter sucesso
      navigate('/escolher-deputado-federal'); 
      
    } catch (error) {
      console.error("Erro ao salvar estado:", error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="top-pills">
        <span className="pill">mulheres</span>
        <span className="pill active">todos</span>
        <span className="pill">novatos</span>
      </div>

      <div className="green-banner">
        <h2>SELECIONE<br/>SEU ESTADO</h2>
        <div className="triangle-down"></div>
      </div>

      <div className="state-card-container">
        <StateSelector 
          value={estadoSelecionado} 
          onChange={setEstadoSelecionado} 
        />
      </div>

      <div className="footer-action">
        <button 
          className="btn-green btn-confirmar" 
          onClick={handleConfirmar}
          disabled={loading}
        >
          {loading ? 'SALVANDO...' : 'CONFIRMAR'}
        </button>
      </div>
    </div>
  );
}