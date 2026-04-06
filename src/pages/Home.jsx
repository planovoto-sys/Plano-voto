import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
// IMPORTAR O NOVO COMPONENTE
import StateSelector from '../components/StateSelector'; 
import './Home.css'; 

export default function Home() {
  const { user } = useUser();
  const navigate = useNavigate();
  // Estado inicial padrão (pode ser SP)
  const [estadoSelecionado, setEstadoSelecionado] = useState('SP');
  const [loading, setLoading] = useState(false);

  // Carrega o estado do usuário se já existir no banco
  useEffect(() => {
    const fetchEstado = async () => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists() && docSnap.data().estado) {
            setEstadoSelecionado(docSnap.data().estado);
          }
        } catch (error) {
          console.error("Erro ao buscar estado:", error);
        }
      }
    };
    fetchEstado();
  }, [user]);

  const handleConfirmar = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Salva o estado na coleção do usuário
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        estado: estadoSelecionado
      });
      
      // Próxima etapa (vazio por enquanto)
      console.log("Estado salvo:", estadoSelecionado);
      // navigate('/escolher-candidatos'); 
      
    } catch (error) {
      console.error("Erro ao salvar estado:", error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      {/* Pílulas do topo (Inalteradas) */}
      <div className="top-pills">
        <span className="pill">mulheres</span>
        <span className="pill active">todos</span>
        <span className="pill">novatos</span>
      </div>

      {/* Faixa Verde com Triângulo (Inalterada) */}
      <div className="green-banner">
        <h2>SELECIONE<br/>SEU ESTADO</h2>
        <div className="triangle-down"></div>
      </div>

      {/* ÁREA DO CARD - SUBSTRITUÍMOS O SELECT NATIVO PELO COMPONENTE CUSTOMIZADO */}
      <div className="state-card-container">
        <StateSelector 
          value={estadoSelecionado} 
          onChange={setEstadoSelecionado} 
        />
      </div>

      {/* Botão Confirmar (Inalterado) */}
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