import React, { useEffect, useState, useCallback } from 'react';
import './TourModal.css';

export default function TourModal({ steps, isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    // Gerencia o ciclo de vida da animação de entrada e saída
    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setIsFadingOut(false);
            setCurrentStep(0);
        } else if (isRendered) {
            setIsFadingOut(true);
            const timer = setTimeout(() => {
                setIsRendered(false);
                setTargetRect(null);
            }, 400); // Duração exata do fade-out no CSS
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Calcula a posição do elemento focado de forma suave
    const updatePosition = useCallback(() => {
        if (!isOpen || isFadingOut) return;
        const step = steps[currentStep];
        if (!step) return;

        setTimeout(() => {
            const el = document.querySelector(step.target);
            if (el) {
                // Rola a tela até o elemento ficar centralizado de forma suave
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Aguarda o scroll terminar para capturar o tamanho exato
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    setTargetRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    });
                }, 400);
            } else {
                setTargetRect(null);
            }
        }, 50); // Delay mínimo para o React renderizar abas/filtros
    }, [currentStep, steps, isOpen, isFadingOut]);

    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [updatePosition]);

    if (!isRendered) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
        else onClose();
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const step = steps[currentStep];
    const padding = 8; // Margem de respiro ao redor do elemento focado

    return (
        <div className={`tour-overlay-container ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
            
            {/* O recorte e o fundo escuro uniformes (Feito via box-shadow para não ter artefatos visuais) */}
            <div className="tour-highlight-box" style={{
                top: targetRect ? targetRect.top - padding : '50%',
                left: targetRect ? targetRect.left - padding : '50%',
                width: targetRect ? targetRect.width + padding * 2 : 0,
                height: targetRect ? targetRect.height + padding * 2 : 0,
                opacity: targetRect ? 1 : 0
            }}></div>

            {/* Cartão de Texto */}
            <div className="tour-tooltip">
                <h3 className="tour-title">{step.title}</h3>
                <div className="tour-content" dangerouslySetInnerHTML={{ __html: step.content }} />
                
                <div className="tour-footer">
                    <div className="tour-dots">
                        {steps.map((_, i) => (
                            <div key={i} className={`tour-dot ${i === currentStep ? 'active' : ''}`} />
                        ))}
                    </div>
                    <div className="tour-actions">
                        <button className="tour-btn-sec" onClick={handlePrev} disabled={currentStep === 0}>VOLTAR</button>
                        <button className="tour-btn-pri" onClick={handleNext}>
                            {currentStep === steps.length - 1 ? 'CONCLUIR' : 'PRÓXIMO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}