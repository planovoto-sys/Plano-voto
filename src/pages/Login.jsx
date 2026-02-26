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

      {/* MODAL DE CONTEÚDO */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
            
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-scroll-area">

              <div className="doc-header">
                <h1 className="doc-title">Plano de Voto</h1>
                <p className="doc-subtitle">Um protocolo de organização de preferências eleitorais individuais em coletivas</p>
              </div>

              <div className="doc-section">
                <h3>1. Propósito</h3>
                <p>O Plano de Voto é um protocolo técnico para organizar preferências eleitorais individuais considerando seus efeitos coletivos. Ele não recomenda candidatos, não avalia conteúdo político e não prevê resultados eleitorais. Seu objetivo é tornar explícitas e operacionalizar regras de organização de preferências que hoje operam de forma informal.</p>
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
                <p>Responsável por criar seu plano de voto (público).</p>
                <div className="highlight-box">
                  <p><strong>Um plano contém:</strong></p>
                  <ul>
                    <li>Lista ordenada de candidatos por cargo e unidade da federação;</li>
                    <li>Metas de voto por candidato.</li>
                  </ul>
                  <p><strong>O criador:</strong></p>
                  <ul>
                    <li>Não segue outros planos;</li>
                    <li>Pode editar seu plano apenas dentro do período autorizado.</li>
                  </ul>
                </div>

                <h4>3.2 Usuário Seguidor</h4>
                <p>Responsável por gerar seu plano de voto (privado).</p>
                <p><strong>Fluxo do seguidor:</strong></p>
                <ul>
                  <li><strong>1. Siga:</strong> seleciona o plano que deseja seguir (usando o @ do perfil do Instagram ou # do plano de voto);</li>
                  <li>1.1. <em>Siga um plano B (opcional*):</em> segue um plano secundário padronizado (@renovabr).</li>
                  <li><strong>2. Vete:</strong> exclui candidatos indesejados;</li>
                  <li>2.1. <em>Vete candidatos mal avaliados (opcional*):</em> define a nota mínima (no Ranking dos Políticos).</li>
                  <li><strong>3. Vote:</strong> recebe seu plano de voto (privado) com um candidato seguido e não vetado para cada cargo.</li>
                </ul>
                <span className="note">* ativado por padrão.</span>
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
                <div className="highlight-box">
                  <p><strong>Configuração do veto automático:</strong></p>
                  <ul>
                    <li>Define-se a nota mínima aceitável;</li>
                    <li>Padrão do sistema: <strong>nota 7</strong>;</li>
                    <li>A nota pode ser alterada livremente (inclusive para 0).</li>
                  </ul>
                </div>
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
                <p>Os planos (privados) dos usuários seguidores são gerados por iterações sucessivas.</p>
                <ul>
                  <li>Em cada iteração, percorrem-se os planos dos usuários por ordem de registro;</li>
                  <li>Cada plano recebe uma alocação por iteração;</li>
                  <li>O processo continua até que todos os planos estejam completos.</li>
                </ul>
              </div>

              <div className="doc-section">
                <h3>8. Linha do tempo oficial — Eleições 2026</h3>

                <h4>Usuários Criadores</h4>
                <ul>
                  <li><strong>15/08/26:</strong> Data limite para criação de planos;</li>
                  <li><strong>16/08/26 a 20/09/26:</strong> Período de edição de planos (cadastro de candidatos e metas).</li>
                </ul>

                <h4>Usuários Seguidores</h4>
                <ul>
                  <li><strong>25/09/26:</strong> Data limite para seguir planos;</li>
                  <li><strong>20/09/26 a 25/09/26:</strong> Período de vetos;</li>
                  <li><strong>26/09/26 a 04/10/26:</strong> Período de acesso ao plano de voto gerado.</li>
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