import React from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { uploadPlans } from '../utils/uploader_plans'; // <--- AQUI ESTÁ A CORREÇÃO (Import no topo)
import './Login.css';

export default function Login() {
  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        // Gera hash único para o usuário (futuro criador)
        const userHash = '#' + Math.random().toString(36).substring(2, 8);
        
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profile_image: user.photoURL,
          my_hash: userHash, 
          strategy: [],
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="login-container">
      <h1 className="brand-large">vote<span className="brand-highlight">list</span></h1>
      <p className="login-subtitle">listas de voto compartilhadas</p>

      <div className="breadcrumb">siga &gt; vete &gt; vote</div>

      <button onClick={handleLogin} className="btn-start">
        Começar
      </button>

      <p className="link-how">Como funciona</p>

      {/* Botão Temporário para corrigir o banco (Clique 1 vez e depois remova este botão do código) */}
   
    </div>
  );
}