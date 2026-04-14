import React, { useState, useEffect } from 'react';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  limiteSelecao,
  selecaoInicial = [],
  carregando,
  mostrarBotaoTodos,
  textoBotaoTodos,
  onToggleTodos,
  onConfirmar,
  onVoltar,
  renderItem,
  // Props para a barra de navegação superior
  abas = [],
  abaAtiva = '',
  setAbaAtiva = () => {}
}) {
  const [selecionados, setSelecionados] = useState(selecaoInicial);

  useEffect(() => {
    setSelecionados(selecaoInicial);
  }, [selecaoInicial]);

  const handleSelect = (item) => {
    setSelecionados((prev) => {
      const jaSelecionado = prev.find((v) => v.id === item.id);
      if (jaSelecionado) {
        return prev.filter((v) => v.id !== item.id);
      }
      if (prev.length < limiteSelecao) {
        return [...prev, item];
      }
      // Se já atingiu o limite e o limite é 1, apenas substitui
      if (limiteSelecao === 1) {
        return [item];
      }
      return prev; // Ignora se o limite já foi atingido
    });
  };

  const handleConfirmar = () => {
    if (onConfirmar) {
      onConfirmar(selecionados);
    }
  };

  if (carregando) return <div className="loading">CARREGANDO...</div>;

  return (
    <div className={`select-base-container theme-${abaAtiva || 'geral'}`}>
      
      {/* BARRA SUPERIOR (PILLS) - Só aparece se a tela passar a prop "abas" */}
      {abas.length > 0 && (
        <div className="header-nav-container">
          <div className="pills-wrapper">
            {abas.map((aba) => (
              <button
                key={aba}
                className={`pill-nav ${abaAtiva === aba ? 'active' : ''}`}
                onClick={() => setAbaAtiva(aba)}
              >
                {aba}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BANNER PRINCIPAL */}
      <div className="green-banner-selection">
        <h2>{titulo}</h2>
        {mostrarBotaoTodos && (
          <button className="btn-visualizar-todos" onClick={onToggleTodos}>
            {textoBotaoTodos}
          </button>
        )}
        <div className="triangle-down"></div>
      </div>

      {/* LISTA */}
      <div className="list-wrapper">
        <div className="list-scroll-box">
          {dados.length > 0 ? (
            dados.map((item) => {
              const isSelected = selecionados.some((v) => v.id === item.id);
              return (
                <div
                  key={item.id}
                  className={`base-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  {renderItem(item, isSelected)}
                </div>
              );
            })
          ) : (
            <div className="no-data">Nenhum dado encontrado para a sua seleção.</div>
          )}
        </div>
      </div>

      {/* RODAPÉ DE NAVEGAÇÃO */}
      <footer className="navigation-footer">
        <button className="nav-btn btn-voltar" onClick={onVoltar}>
          <i className="arrow-left"></i>
        </button>
        <button
          className="nav-btn btn-confirm"
          onClick={handleConfirmar}
          disabled={selecionados.length === 0}
        >
          <i className="arrow-right"></i>
        </button>
      </footer>
    </div>
  );
}