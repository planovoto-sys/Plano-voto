import React, { useEffect, useState, useCallback } from 'react';
import './TourModal.css';

export default function TourModal({ steps, isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [tooltipPos, setTooltipPos] = useState('bottom'); 

    useEffect(() => {
        let frameId = null;
        let timer = null;

        if (isOpen) {
            frameId = requestAnimationFrame(() => {
                setIsRendered(true);
                setIsFadingOut(false);
                setCurrentStep(0);
                setTooltipPos('bottom');
            });
        } else if (isRendered) {
            frameId = requestAnimationFrame(() => {
                setIsFadingOut(true);
                timer = setTimeout(() => {
                    setIsRendered(false);
                    setTargetRect(null);
                }, 400);
            });
        }

        return () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            if (timer !== null) clearTimeout(timer);
        };
    }, [isOpen, isRendered]);

    const updatePosition = useCallback(() => {
        if (!isOpen || isFadingOut) return;
        const step = steps[currentStep];
        if (!step) return;

        setTimeout(() => {
            const el = document.querySelector(step.target);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    setTargetRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    });

                    if (rect.top > window.innerHeight / 2) {
                        setTooltipPos('top');
                    } else {
                        setTooltipPos('bottom');
                    }
                }, 400);
            } else {
                setTargetRect(null);
            }
        }, 50); 
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
    const padding = 8; 

    return (
        <div className={`tour-overlay-container ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
            <div className="tour-highlight-box" style={{
                top: targetRect ? targetRect.top - padding : '50%',
                left: targetRect ? targetRect.left - padding : '50%',
                width: targetRect ? targetRect.width + padding * 2 : 0,
                height: targetRect ? targetRect.height + padding * 2 : 0,
                opacity: targetRect ? 1 : 0
            }}></div>

            <div className={`tour-tooltip pos-${tooltipPos}`}>
                <h3 className="tour-title">{step.title}</h3>
                <div className="tour-content" dangerouslySetInnerHTML={{ __html: step.content }} />
                
                <div className="tour-footer">
                    <div className="tour-footer-left">
                        <button
                            className="tour-btn-sec"
                            type="button"
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                        >
                            VOLTAR
                        </button>
                    </div>
                    <div className="tour-dots">
                        {steps.map((_, i) => (
                            <div key={i} className={`tour-dot ${i === currentStep ? 'active' : ''}`} />
                        ))}
                    </div>
                    <div className="tour-footer-right">
                        <button className="tour-btn-pri" type="button" onClick={handleNext}>
                            {currentStep === steps.length - 1 ? 'CONCLUIR' : 'AVANÇAR'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
