import React from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profile_image: user.photoURL,
          estado: null,
          candidatos_escolhidos: null,
          created_at: new Date()
        });
        navigate('/home'); 
      } else {
        const data = docSnap.data();
        
        // Redirecionamento Inteligente de Retorno
        if (data.candidatos_escolhidos?.senadores && data.candidatos_escolhidos.senadores.length === 2) {
          navigate('/finalizacao'); // Já escolheu os 2 senadores
        } else if (data.candidatos_escolhidos?.deputado_federal) {
          navigate('/escolher-senadores'); // Já escolheu deputado, falta senador
        } else if (data.estado) {
          navigate('/escolher-deputado-federal'); // Já escolheu estado, falta deputado
        } else {
          navigate('/home'); // Não escolheu nada ainda
        }
      }

    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert("Falha ao fazer login com o Google.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <h1 className="login-title">PLANO<br/>DE VOTO</h1>
        <p className="login-subtitle">Faça login para continuar</p>
        
        <button className="btn-green btn-login" onClick={handleGoogleLogin}>
          ENTRAR COM GOOGLE
        </button>
      </div>
    </div>
  );
}
export default Login;