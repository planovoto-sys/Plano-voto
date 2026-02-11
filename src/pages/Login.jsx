import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';
import HowItWorksModal from '../components/HowItWorksModal'; // Importar o modal

export default function Login() {
  const [showModal, setShowModal] = useState(false);

  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      // Só cria registro se for o primeiro acesso
      if (!docSnap.exists()) {
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
      console.error("Erro no login:", error);
    }
  };

  return (
    <div className="login-container">
      <h1 className="brand-large">vote<span className="brand-highlight">list</span></h1>
      <p className="login-subtitle">listas de voto compartilhadas</p>

      <div className="breadcrumb">siga &gt; vete &gt; vote</div>

      <button onClick={handleLogin} className="btn-start">Começar</button>

      <p className="link-how" onClick={() => setShowModal(true)}>Como funciona</p>

      {/* Modal de "Como Funciona" */}
      <HowItWorksModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
