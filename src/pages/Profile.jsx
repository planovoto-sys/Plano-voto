import React, { useEffect, useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // <--- IMPORTADO
import './SelectState.css';
import './Profile.css';

export default function Profile() {
  const [userData, setUserData] = useState({
    name: '',
    username: '',
    state: 'ES',
    profile_image: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <--- ESTADO DO MENU
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        name: userData.name,
        username: userData.username,
        state: userData.state
      });
      alert("Perfil atualizado!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao atualizar.");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (loading) return <div className="page-container" style={{justifyContent:'center'}}>Carregando...</div>;

  return (
    <div className="profile-container">
      {/* MENU LATERAL */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="profile-header">
        {/* Mantive o botão voltar, mas adicionei o menu à direita */}
        <button onClick={() => navigate(-1)} className="back-btn">←</button>
        <h2 className="brand-small" style={{margin:0}}>meu perfil</h2>
        <div className="menu-icon" onClick={() => setIsMenuOpen(true)}>≡</div>
      </header>

      <div className="profile-avatar-section">
        <img 
          src={userData.profile_image || "https://via.placeholder.com/100"} 
          alt="Avatar" 
          className="profile-img"
        />
        <span className="profile-email">{auth.currentUser?.email}</span>
      </div>

      <div className="form-section">
        <div className="input-group">
          <label className="input-label">Nome</label>
          <input 
            className="input-field"
            value={userData.name || ''}
            onChange={(e) => setUserData({...userData, name: e.target.value})}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Instagram (@)</label>
          <input 
            className="input-field"
            value={userData.username || ''}
            onChange={(e) => setUserData({...userData, username: e.target.value})}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Estado</label>
          <select 
            className="select-field"
            value={userData.state || 'ES'}
            onChange={(e) => setUserData({...userData, state: e.target.value})}
          >
            <option value="ES">Espírito Santo (ES)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
            <option value="MG">Minas Gerais (MG)</option>
          </select>
        </div>

        <button 
          className="action-btn" 
          onClick={handleSave} 
          disabled={saving}
          style={{marginTop: 10}}
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>

        <button onClick={handleLogout} className="logout-btn">
          Sair da Conta
        </button>
      </div>
    </div>
  );
}