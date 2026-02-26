import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import './Login.css';


export default function Login() {
  const [showModal, setShowModal] = useState(false);
  const updateXarrow = useXarrow();

  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

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
    <div className="login-page" onScroll={updateXarrow}>
      <div className="login-content">

        {/* LOGO */}
        <h1 className="brand-logo">plano<span className="brand-bold">de</span>voto</h1>

        {/* DIAGRAMA COM SETAS (Xarrows) */}
        <Xwrapper>
          <div className="diagram-container-anchors">

            {/* TEXTO CENTRAL (Origens das Setas) */}
            <div className="center-text-block">
              <span id="anchor-siga">siga</span>
              <span className="light">&gt;</span>
              <span id="anchor-vete">vete</span>
              <span className="light">&gt;</span>
              <span id="anchor-vote">vote</span>
            </div>

            {/* BALÕES (Destinos das Setas) */}

            {/* 1. Planos (Esquerda) */}
            <div id="target-planos" className="bubble bubble-planos">
              planos alinhados<br />(que te representam)
            </div>

            {/* 2. Candidatos (Direita Topo - Deslocado no CSS) */}
            <div id="target-candidatos" className="bubble bubble-candidatos">
              candidatos desalinhados<br />(que você não aprova)
            </div>

            {/* 3. Estratégia (Direita Baixo) */}
            <div id="target-estrategia" className="bubble bubble-estrategia">
              com<br />estratégia
            </div>

            {/* --- DESENHO DAS SETAS --- */}

            {/* Seta 1: Siga -> Planos (Curva para baixo e esquerda) */}
            <Xarrow
              start="anchor-siga"
              end="target-planos"
              startAnchor="bottom"
              endAnchor="top"
              color="black"
              strokeWidth={1.5}
              headSize={4}
              curveness={0.6}
              zIndex={0}
              animateDrawing={1.2}
            />

            {/* Seta 2: Vete -> Candidatos (Curva para cima e direita) */}
            {/* Sai do TOPO e entra na LATERAL ESQUERDA para fazer o arco perfeito */}
            <Xarrow
              start="anchor-vete"
              end="target-candidatos"
              startAnchor="top"
              endAnchor="left"
              color="black"
              strokeWidth={1.5}
              headSize={4}
              curveness={0.8}
              zIndex={0}
              animateDrawing={1.2}
            />

            {/* Seta 3: Vote -> Estratégia (Curva para baixo e direita) */}
            <Xarrow
              start="anchor-vote"
              end="target-estrategia"
              startAnchor="bottom"
              endAnchor="top"
              color="black"
              strokeWidth={1.5}
              headSize={4}
              curveness={0.6}
              zIndex={0}
              animateDrawing={1.2}
            />

          </div>
        </Xwrapper>

        {/* BOTÃO DE AÇÃO */}
        <button onClick={handleLogin} className="btn-comecar">
          Começar
        </button>

        {/* LINK SAIBA MAIS (NEON) */}
        <p className="btn-saiba-mais" onClick={() => setShowModal(true)}>
          Saiba mais
        </p>

      </div>

      
    </div>
  );
}
