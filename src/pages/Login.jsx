import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import HowItWorksModal from '../components/HowItWorksModal';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const hasProfile = data.username && data.state;
        const hasPlan = data.strategy && data.strategy.length > 0;

        if (hasProfile && hasPlan) {
          navigate('/meu-plano');
        } else if (hasProfile) {
          navigate('/estrategia');
        } else {
          navigate('/estado');
        }
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          profile_image: user.photoURL,
          username: "", 
          state: "",    
          status: 'onboarding',
          created_at: new Date()
        });
        navigate('/estado');
      }
    } catch (error) {
      console.error("Erro:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Erro no login: " + error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-logo">plano</h1>
      
      <button onClick={handleGoogleLogin} className="login-btn">
        Entrar com Google
      </button>

      <p 
        className="login-link" 
        onClick={() => setShowModal(true)}
        style={{cursor: 'pointer'}}
      >
        Como funciona
      </p>

      <HowItWorksModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  );
}