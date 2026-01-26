// src/pages/VerifyInstagram.jsx
import React, { useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './VerifyInstagram.css'; // Vamos criar o CSS no próximo passo

export default function VerifyInstagram() {
  const [codigoInput, setCodigoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleVerificar = async () => {
    if (!codigoInput || codigoInput.length < 6) {
      alert("Por favor, digite o código de 6 dígitos.");
      return;
    }

    setLoading(true);

    try {
      // Chama a API Serverless que criamos anteriormente
      const response = await fetch('/api/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigoInput,
          userId: auth.currentUser.uid
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Conta verificada com sucesso! ✅");
        // Atualiza localmente o status se necessário ou redireciona
        navigate('/perfil');
      } else {
        alert("Erro: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="page-container-white">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="header-clean">
        <button onClick={() => navigate(-1)} className="back-btn-simple">← Voltar</button>
        <div className="menu-icon-clean" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <main className="main-content-centered">
        <h2 className="title-huge">verificar</h2>
        <h3 className="brand-medium" style={{marginBottom: 30}}>instagram</h3>

        <div className="info-box-gray" style={{textAlign: 'left'}}>
          <p style={{lineHeight: '1.6', fontSize: '0.95rem'}}>
            Se você é uma pessoa influente no Instagram e deseja compartilhar seu plano de voto:
          </p>
          <ol style={{paddingLeft: 20, marginTop: 15, marginBottom: 15, lineHeight: '1.8'}}>
            <li>Vá na DM do nosso Instagram <a href="https://www.instagram.com/vote_list/" target="_blank" rel="noreferrer" style={{fontWeight:'bold', color: '#212121'}}>@vote_list</a>;</li>
            <li>Dê o comando <strong>/codigo</strong>;</li>
            <li>Copie e cole o número no campo abaixo.</li>
          </ol>
        </div>

        <div className="input-verify-wrapper">
          <input 
            className="input-verify-code"
            placeholder="000000"
            maxLength={6}
            type="tel"
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value)}
          />
        </div>

        <button 
          className="btn-action-black" 
          onClick={handleVerificar}
          disabled={loading}
        >
          {loading ? "Validando..." : "Validar Código"}
        </button>
      </main>
    </div>
  );
}