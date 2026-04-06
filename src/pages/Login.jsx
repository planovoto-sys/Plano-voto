import React from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Criaremos este arquivo logo abaixo

  function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verifica se o usuário já existe no banco
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        // Cria um novo usuário na coleção "users"
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profile_image: user.photoURL,
          estado: null, // Ainda não escolheu o estado
          candidatos_escolhidos: null,
          created_at: new Date()
        });
      }
      
      // Vai para a tela inicial (seleção de estado)
      navigate('/home'); 

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