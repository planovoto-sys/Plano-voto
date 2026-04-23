import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/SelectBase.css'; 

export default function Intro() {
  const navigate = useNavigate();

  return (
    <div className="select-base-container">
      <header className="green-banner-selection" style={{ padding: '40px 20px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', textTransform: 'lowercase' }}>meuvoto.app</h1>
        <div className="triangle-down"></div>
      </header>

      <main className="intro-main-content">
        <div className="intro-text-card">
          <p>Imagina um time em que<br />Só 1 chuta e faz gol<br />O resto...<br />- Chuta e faz gol contra<br />- Chuta na trave<br />- Chuta pra fora<br />- Não chuta</p>
          <p>É assim que elegemos nosso Congresso<br />A cada 10 eleitores<br />Só 1 elege candidatos bem avaliados<br />O resto joga o voto no lixo...<br />- Vota em candidato mal avaliado<br />- Vota em candidato que não se elege<br />- Vota em branco/nulo<br />- Não vota</p>
          <p>Isso explica...<br />A cada 10 brasileiros<br />Só 1 confia no Congresso Nacional</p>
          <p>Como melhorar?<br />Manter o que está bom e<br />Mudar o que está ruim</p>
          <p>Em outras palavras, vamos<br />Manter candidatos bem avaliados e<br />Mudar candidatos mal avaliados por<br />candidatos de partidos bem avaliados</p>
        </div>
        <button className="btn-green" style={{ width: '100%', maxWidth: '320px', padding: '18px', fontSize: '1.2rem', marginTop: 'auto' }} onClick={() => navigate('/home')}>COMEÇAR</button>
      </main>
    </div>
  );
}