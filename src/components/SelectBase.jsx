import React, { useState, useEffect } from 'react';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  dadosBusca = [],
  buscaNaPrincipal = false,
  buscaVazia = false,
  limiteSelecao,
  selecaoInicial = [],
  carregando,
  abas = [],
  abaAtiva = '',
  setAbaAtiva = () => {},
  mostrarBusca = false,
  valorBusca = '',
  onChangeBusca = () => {},
  onConfirmar,
  onVoltar,
  renderItem,
  onLimiteAtingido,
  onHelpClick // Prop para abrir o Tour
}) {
  const [selecionados, setSelecionados] = useState(selecaoInicial);

  useEffect(() => {
    setSelecionados(selecaoInicial);
  }, [selecaoInicial]);

  const handleSelect = (item) => {
    const jaSelecionado = selecionados.find((v) => v.id === item.id);
    if (jaSelecionado) {
      setSelecionados(selecionados.filter((v) => v.id !== item.id));
      return;
    }
    if (limiteSelecao === 1) {
      setSelecionados([item]);
      return;
    }
    if (selecionados.length >= limiteSelecao) {
      if (onLimiteAtingido) onLimiteAtingido(item);
      return;
    }
    setSelecionados([...selecionados, item]);
  };

  const handleConfirmar = () => {
    if (onConfirmar) onConfirmar(selecionados);
  };

  // FUNÇÃO NOVA: Anima o botão e depois dispara o evento para abrir o modal
  const handleHelpPress = (e) => {
      const btn = e.currentTarget;
      btn.classList.add('pulse-anim');
      setTimeout(() => btn.classList.remove('pulse-anim'), 400); // Remove a classe após animação
      if (onHelpClick) onHelpClick();
  };

  if (carregando) return <div className="loading">CARREGANDO...</div>;

  const partesTitulo = titulo ? titulo.split(' ') : [''];
  const tituloPrincipal = partesTitulo[0];
  const subTitulo = partesTitulo.slice(1).join(' ');

  const themeClass = abaAtiva === 'renovar' ? 'theme-renovar' : 'theme-reeleger';

  return (
    <div className={`select-base-container ${themeClass}`}>
      <div className="green-banner-selection">
        <h2>{tituloPrincipal}</h2>
        {subTitulo && <h3>{subTitulo}</h3>}
        <div className="triangle-down"></div>
        
        {/* BOTÃO DÚVIDAS ATUALIZADO */}
        {onHelpClick && (
            <button className="btn-help-floating" onClick={handleHelpPress}>
                <div className="help-icon">?</div>
                <span>Dúvidas</span>
            </button>
        )}
      </div>

      {abas.length > 0 && (
        <div className="tabs-toggle-container">
          <div className="tabs-toggle">
            {abas.map((aba) => (
              <button 
                key={aba} 
                id={`tour-${aba}`} 
                className={`tab-toggle-btn ${abaAtiva === aba ? 'active' : ''}`} 
                onClick={() => setAbaAtiva(aba)}
              >
                {aba}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="list-wrapper">
        <div className="list-scroll-box" id="tour-lista">
          
          {dados.length > 0 ? (
            dados.map((item) => {
              const isSelected = selecionados.some((v) => v.id === item.id);
              return (
                <div key={item.id} className={`base-card ${item.cardColorClass || 'card-yellow'} ${isSelected ? 'selected' : ''}`} onClick={() => handleSelect(item)}>
                  {renderItem(item, isSelected)}
                </div>
              );
            })
          ) : (
            <div className="no-data">Nenhum candidato na lista.</div>
          )}

          {mostrarBusca && (
            <div className="search-container" id="tour-busca">
              <div className="search-input-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Pesquisar outro candidato"
                  value={valorBusca}
                  onChange={(e) => onChangeBusca(e.target.value)}
                />
              </div>

              {valorBusca.trim().length > 0 && (
                <div className="search-results-wrapper">
                  <div className="search-results-title">Resultados da Pesquisa:</div>
                  {buscaVazia ? (
                    <div className="no-data-search">Não encontramos este Candidato.</div>
                  ) : (
                    <>
                      {buscaNaPrincipal && dadosBusca.length === 0 && <div className="no-data-search">Este candidato já está exibido na lista acima.</div>}
                      {dadosBusca.length > 0 && (
                        <>
                          {buscaNaPrincipal && <div className="search-info-msg">* Alguns resultados já estão exibidos na lista acima.</div>}
                          {dadosBusca.map((item) => {
                            const isSelected = selecionados.some((v) => v.id === item.id);
                            return (
                              <div key={item.id} className={`base-card search-result-card ${item.cardColorClass || 'card-yellow'} ${isSelected ? 'selected' : ''}`} onClick={() => handleSelect(item)}>
                                {renderItem(item, isSelected)}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      <footer className="navigation-footer">
        <button className="nav-btn" onClick={onVoltar}><i className="arrow-left"></i></button>
        <button className="nav-btn" onClick={handleConfirmar}><i className="arrow-right"></i></button>
      </footer>
    </div>
  );
}