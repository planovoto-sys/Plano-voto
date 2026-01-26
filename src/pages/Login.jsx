import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';

export default function Login() {
  const [showModal, setShowModal] = useState(false);

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
      console.error(error);
    }
  };

  return (
    <div className="login-container">
      {/* Tela Principal */}
      <h1 className="brand-large">vote<span className="brand-highlight">list</span></h1>
      <p className="login-subtitle">listas de voto compartilhadas</p>

      <div className="breadcrumb">siga &gt; vete &gt; vote</div>

      <button onClick={handleLogin} className="btn-start">
        Começar
      </button>

      <p className="link-how" onClick={() => setShowModal(true)}>
        Como funciona
      </p>

      {/* O Modal (Pop-up) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Como funciona</h2>

            <div className="modal-scroll-text">
              <p>
                Dos 156 milhões de eleitores brasileiros:<br/>
                - Só 1 em cada 3 elege candidatos ao Congresso;<br/>
                - Só 1 em cada 10 confia no Congresso eleito.<br/>
                Resumindo, a maioria de nós:<br/>
                - Desperdiça votos e não confia no Congresso eleito.
              </p>

              <h3>O que é o votelist e para que serve?</h3>
              <p>
                O votelist é uma ferramenta gratuita feita para ajudar eleitores insatisfeitos com o resultado dos seus votos a:<br/>
                - reduzir o desperdício de votos em candidatos sem chances reais de se eleger; e<br/>
                - aumentar a concentração de votos em candidatos admissíveis, aumentando suas chances de se eleger.
              </p>

              <h3>Como funciona?</h3>
              <p>
                No votelist, você pode criar ou seguir listas de voto.<br/>
                - Criadores montam listas com candidatos em ordem de prioridade e definem metas de votos.<br/>
                - Seguidores seguem listas de quem os representa, vetam candidatos em quem não votariam e recebem uma lista de voto processada pelo votelist com base nessas escolhas.
              </p>
              <p>
                O votelist opera como filtros inteligentes de candidatos:<br/>
                - O primeiro filtro é composto pelas listas que você segue;<br/>
                - O segundo filtro é composto pelos vetos que você aplica; e<br/>
                - O terceiro filtro é composto pelo algoritmo que gera as listas de voto consolidadas...
              </p>

              <h3>Sou obrigado a votar na minha lista de voto?</h3>
              <p>
                Não. O votelist não decide por você, apenas organiza. A decisão final é sempre sua.
              </p>
            </div>

            <button className="btn-modal-back" onClick={() => setShowModal(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}