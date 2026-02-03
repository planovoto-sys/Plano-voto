import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="page-white centered-layout">
            {/* 1. Header Minimalista (Identidade Visual) */}
            <header className="not-found-header">
                <h1 className="brand-medium">vote<span className="brand-highlight-small">list</span></h1>
            </header>

            {/* 2. A Animação Temática (Urna/Lista) */}
            <div className="animation-stage">
                <svg viewBox="0 0 100 100" className="vote-loader">
                    {/* A Caixa (Urna) */}
                    <rect x="25" y="35" width="50" height="40" rx="4" className="box-shape" />
                    <path d="M 25,35 L 50,55 L 75,35" className="box-flap" />

                    {/* O "Voto" (Papelzinho) entrando e saindo */}
                    <g className="paper-group">
                        <rect x="40" y="10" width="20" height="25" rx="2" className="paper-shape" />
                        <line x1="45" y1="18" x2="55" y2="18" className="paper-lines" />
                        <line x1="45" y1="23" x2="55" y2="23" className="paper-lines" />
                    </g>

                    {/* O Símbolo de Erro/Dúvida que aparece */}
                    <text x="50" y="65" textAnchor="middle" className="error-symbol">?</text>
                </svg>
            </div>

            {/* 3. Texto no Tom do Sistema */}
            <div className="text-content">
                <h1 className="status-code">404</h1>
                <h2 className="status-message">Pagina Não Encontrada</h2>
                <p className="status-description">
                
                    Pode ser um link antigo ou uma área em desenvolvimento.
                </p>

                <button className="btn-clean-action" onClick={() => navigate('/meu-plano')}>
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
}