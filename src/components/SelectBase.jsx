import React, { useState, useEffect } from 'react';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  limiteSelecao = 1,
  selecaoInicial = [],
  mostrarFiltros = false,
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
  const [substituicaoPendente, setSubstituicaoPendente] = useState(null);

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
        setSubstituicaoPendente(item);
      }
    }
  };

  const confirmarSubstituicao = (itemAntigo) => {
    const novaSelecao = selecionados.filter((s) => s.id !== itemAntigo.id);
    setSelecionados([...novaSelecao, substituicaoPendente]);
    setSubstituicaoPendente(null);
  };

  if (carregando) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="select-base-container">
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
          // CORREÇÃO AQUI: Exige a quantidade exata para prosseguir
          disabled={selecionados.length !== limiteSelecao}
        >
          <div className="arrow-right"></div>
        </button>
      </div>

      {substituicaoPendente && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">LIMITE ATINGIDO</h3>
            <p className="modal-text">
              Você já selecionou {limiteSelecao} opções. Deseja remover qual candidato para adicionar <strong>{substituicaoPendente.Nome}</strong>?
            </p>
            
            <div className="modal-options-list">
              {selecionados.map((sel) => (
                <button 
                  key={sel.id} 
                  className="btn-modal-substituir"
                  onClick={() => confirmarSubstituicao(sel)}
                >
                  Substituir <strong>{sel.Nome}</strong>
                </button>
              ))}
            </div>

            <button 
              className="btn-modal-cancelar" 
              onClick={() => setSubstituicaoPendente(null)}
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}