import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';

// SVG das Setas desenhadas para coincidir com o layout da imagem
const ArrowsDiagram = () => (
  <svg className="arrows-layer" viewBox="0 0 320 200" fill="none">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
      </marker>
    </defs>
    
    {/* Seta 1: Siga (centro-esq) -> Planos (baixo-esq) */}
    {/* Curva saindo de baixo do 'siga' e indo para a esquerda */}
    <path d="M 60 115 Q 40 140 40 160" stroke="black" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

    {/* Seta 2: Vete (centro) -> Candidatos (topo-dir) */}
    {/* Curva saindo de cima do 'vete' e indo para direita-cima */}
    <path d="M 160 90 Q 180 60 200 45" stroke="black" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

    {/* Seta 3: Vote (centro-dir) -> Estratégia (baixo-dir) */}
    {/* Curva saindo de baixo do 'vote' e indo para direita */}
    <path d="M 260 115 Q 290 130 290 155" stroke="black" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
  </svg>
);

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
      console.error("Erro no login:", error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        
        {/* LOGO */}
        <h1 className="brand-logo">plano<span className="brand-bold">de</span>voto</h1>

        {/* DIAGRAMA VISUAL (Fixo em 320px para não quebrar) */}
        <div className="diagram-container">
          {/* Camada de Setas (SVG Absoluto) */}
          <ArrowsDiagram />

          {/* Texto Central */}
          <div className="center-text">
            <span>siga</span> <span className="light">&gt;</span> <span>vete</span> <span className="light">&gt;</span> <span>vote</span>
          </div>

          {/* Balões de Texto (Posicionados Absolutamente) */}
          <div className="bubble bubble-planos">
            planos alinhados<br/>(que te representam)
          </div>

          <div className="bubble bubble-candidatos">
            candidatos desalinhados<br/>(que você não aprova)
          </div>

          <div className="bubble bubble-estrategia">
            com<br/>estratégia
          </div>
        </div>

        {/* BOTÃO */}
        <button onClick={handleLogin} className="btn-comecar">
          Começar
        </button>

        {/* LINK SAIBA MAIS */}
        <p className="btn-saiba-mais" onClick={() => setShowModal(true)}>
          Saiba mais
        </p>

      </div>

      {/* MODAL (Fora do fluxo principal para garantir z-index) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Plano de Voto</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-scroll-area">
              <p className="doc-subtitle">Um protocolo de organização de preferências eleitorais individuais em coletivas</p>
              
              <div className="doc-section">
                <h3>1. Propósito</h3>
                <p>O <strong>Plano de Voto</strong> é um protocolo técnico para organizar preferências eleitorais individuais considerando seus efeitos coletivos. Ele não recomenda candidatos, não avalia conteúdo político e não prevê resultados eleitorais. Seu objetivo é tornar explícitas e operacionalizar regras de organização de preferências que hoje operam de forma informal.</p>
              </div>

              <div className="doc-section">
                <h3>2. Princípios do protocolo</h3>
                <ul>
                  <li><strong>Autonomia do eleitor:</strong> todas as decisões são configuradas pelos usuários;</li>
                  <li><strong>Determinismo:</strong> dados os mesmos inputs, o resultado é sempre o mesmo;</li>
                  <li><strong>Neutralidade:</strong> não há avaliação política ou ideológica;</li>
                  <li><strong>Transparência:</strong> regras claras e auditáveis.</li>
                </ul>
              </div>

              <div className="doc-section">
                <h3>3. Tipos de usuários</h3>
                <h4>3.1 Usuário Criador</h4>
                <p>Responsável por criar seu plano de voto (público). Um plano contém:</p>
                <ul>
                  <li>lista ordenada de candidatos por cargo e unidade da federação;</li>
                  <li>metas de voto por candidato.</li>
                </ul>
                <p>O criador não segue outros planos e pode editar seu plano apenas dentro do período autorizado.</p>
                
                <h4>3.2 Usuário Seguidor</h4>
                <p>Responsável por gerar seu plano de voto (privado).</p>
                <p><strong>Fluxo do seguidor:</strong></p>
                <ul>
                  <li><strong>Siga:</strong> seleciona o plano que deseja seguir (usando o @ do perfil do Instagram ou # do plano de voto);</li>
                  <li><strong>Siga um plano B (opcional*):</strong> segue um plano secundário padronizado (@renovabr).</li>
                  <li><strong>Vete:</strong> exclui candidatos indesejados;</li>
                  <li><strong>Vete candidatos mal avaliados (opcional*):</strong> define a nota mínima (no Ranking dos Políticos).</li>
                  <li><strong>Vote:</strong> recebe seu plano de voto (privado) com um candidato seguido e não vetado para cada cargo.</li>
                </ul>
                <p className="note">* ativado por padrão.</p>
              </div>

              <div className="doc-section">
                <h3>4. Plano principal e secundário (plano B)</h3>
                <ul>
                  <li>Cada usuário segue apenas 1 plano principal.</li>
                  <li>O sistema oferece, por padrão, um plano secundário (plano B) padronizado (@renovabr).</li>
                  <li>O plano secundário é utilizado somente se o plano principal não fornecer candidatos suficientes.</li>
                  <li>O uso do plano secundário é opcional e pode ser inativado.</li>
                </ul>
              </div>

              <div className="doc-section">
                <h3>5. Vetos manuais e automáticos</h3>
                <p>O usuário pode vetar manualmente qualquer candidato ou ativar um veto automático baseado no Ranking dos Políticos.</p>
                <p><strong>Configuração:</strong> define-se a nota mínima aceitável (padrão: nota 7). A nota pode ser alterada livremente (inclusive para 0).</p>
              </div>

              <div className="doc-section">
                <h3>6. Mecanismo de alocação</h3>
                <ul>
                  <li>Cada plano possui uma sequência ordenada de candidatos e metas de voto;</li>
                  <li>O protocolo mantém contadores globais de alocação por candidato;</li>
                  <li>O protocolo aloca, de forma determinística, no plano do usuário seguidor, o primeiro candidato elegível;</li>
                  <li>Ao atingir a meta de voto, o protocolo avança para o próximo candidato elegível do plano.</li>
                </ul>
              </div>

              <div className="doc-section">
                <h3>7. Ordem de processamento</h3>
                <p>Os planos (privados) dos usuários seguidores são gerados por iterações sucessivas. Em cada iteração, percorrem-se os planos dos usuários por ordem de registro e cada plano recebe uma alocação. O processo continua até que todos os planos estejam completos.</p>
              </div>

              <div className="doc-section">
                <h3>8. Linha do tempo oficial — Eleições 2026</h3>
                <p><strong>Usuários Criadores:</strong></p>
                <ul>
                  <li>15/08/26: data limite para criação de planos;</li>
                  <li>16/08/26 a 20/09/26: período de edição de planos.</li>
                </ul>
                <p><strong>Usuários Seguidores:</strong></p>
                <ul>
                  <li>25/09/26: data limite para seguir planos;</li>
                  <li>20/09/26 a 25/09/26: período de vetos;</li>
                  <li>26/09/26 a 04/10/26: período de acesso ao plano de voto gerado.</li>
                </ul>
              </div>

              <div className="doc-section">
                <h3>9. Escopo e limites</h3>
                <p>O plano de voto fornece uma infraestrutura de coordenação racional do voto, preservando a autonomia do eleitor.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}