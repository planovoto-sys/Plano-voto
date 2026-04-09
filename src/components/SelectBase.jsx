import React, { useState, useEffect } from 'react';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  limiteSelecao = 1,
  selecaoInicial = [], // Permite carregar itens já salvos do Firebase
  mostrarFiltros = false, // Habilita/Desabilita as "pills" (mulheres, todos...)
  mostrarBotaoTodos = false,
  textoBotaoTodos = "",
  onToggleTodos,
  renderItem, 
  onConfirmar,
  onVoltar,
  carregando = false,
  mensagemVazio = "Nenhum dado encontrado."
}) {
  const [selecionados, setSelecionados] = useState([]);

  // Quando a tela carrega, seleciona visualmente os que já estão salvos no perfil
  useEffect(() => {
    if (selecaoInicial.length > 0 && selecionados.length === 0) {
      setSelecionados(selecaoInicial);
    }
  }, [selecaoInicial]);

  const handleSelect = (item) => {
    const isSelected = selecionados.some((s) => s.id === item.id);

    if (isSelected) {
      setSelecionados(selecionados.filter((s) => s.id !== item.id));
    } else {
      if (limiteSelecao === 1) {
        setSelecionados([item]); 
      } else if (selecionados.length < limiteSelecao) {
        setSelecionados([...selecionados, item]); 
      } else {
        alert(`Você só pode selecionar até ${limiteSelecao} opções.`);
      }
    }
  };

  if (carregando) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="select-base-container">
      {/* Pills de filtro só aparecem se solicitado */}
      {mostrarFiltros && (
        <div className="top-pills">
          <span className="pill">mulheres</span>
          <span className="pill active">todos</span>
          <span className="pill">novatos</span>
        </div>
      )}

      <div className="green-banner-selection">
        <h2>{titulo}</h2>
        <div className="triangle-down"></div>
        {mostrarBotaoTodos && (
          <button className="btn-visualizar-todos" onClick={onToggleTodos}>
            {textoBotaoTodos}
          </button>
        )}
      </div>

      <div className="list-wrapper">
        <div className="list-scroll-box">
          {dados.length > 0 ? (
            dados.map((item) => {
              const isSelected = selecionados.some((s) => s.id === item.id);
              return (
                <div 
                  key={item.id} 
                  className={`base-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  {renderItem(item)}
                </div>
              );
            })
          ) : (
            <div className="no-data">{mensagemVazio}</div>
          )}
        </div>
      </div>

      <div className="navigation-footer">
        <button className="nav-btn" onClick={onVoltar}>
          <div className="arrow-left"></div>
        </button>
        <button 
          className="nav-btn btn-confirm" 
          onClick={() => onConfirmar(selecionados)} 
          disabled={selecionados.length === 0}
        >
          <div className="arrow-right"></div>
        </button>
      </div>
    </div>
  );
}