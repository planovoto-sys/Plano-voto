import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './Intro.css';

export default function Intro() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  
  // Pula intro se logado
  useEffect(() => {
    if (user) navigate('/meu-plano');
  }, [user, navigate]);

  const slides = [
    {
      topText: "Apenas",
      number: "3",
      bottomText: "a cada 10 votos elegem parlamentares no Congresso Nacional"
    },
    {
      topText: "Apenas",
      number: "2",
      bottomText: "a cada 10 parlamentares têm nota maior que 7 no Ranking dos Políticos"
    },
    {
      topText: "Apenas",
      number: "1",
      bottomText: "a cada 10 brasileiros confia no Congresso"
    },
    {
      topText: "Temos",
      number: "0",
      bottomText: "chances de mudar esta realidade votando no escuro, sem um plano"
    }
  ];

  const goNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      finishIntro();
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const finishIntro = () => {
    navigate('/login');
  };

  // Auto-play: Avança a cada 5 segundos, EXCETO na última tela
  useEffect(() => {
    if (step < slides.length - 1) {
      const timer = setTimeout(() => {
        goNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Gestos (Swipe)
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null); 
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goNext();
    if (distance < -minSwipeDistance) goBack();
  };

  return (
    <div 
      className="intro-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="intro-content" key={step}>
        <p className="intro-top fade-in-fast">{slides[step].topText}</p>
        <h1 className="intro-number pop-in">{slides[step].number}</h1>
        <p className="intro-bottom fade-in-slow">{slides[step].bottomText}</p>
      </div>

      <div className="intro-footer">
        {/* Se tiver botão voltar, mostra ele. Se não, mostra div vazia para manter o alinhamento */}
        {step > 0 ? (
          <button className="btn-text" onClick={goBack}>Voltar</button>
        ) : (
          <div className="btn-placeholder"></div>
        )}
        
        <div className="dots-container">
          {slides.map((_, index) => (
            <span key={index} className={`dot ${index === step ? 'active' : ''}`}></span>
          ))}
        </div>

        <button 
          className={`btn-text ${step === 3 ? 'btn-white' : ''}`} 
          onClick={goNext}
        >
          {step === 3 ? "Vamos começar" : "Avançar"}
        </button>
      </div>
    </div>
  );
}