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
  onLimiteAtingido
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

  if (carregando) return <div className="loading">CARREGANDO...</div>;

  const partesTitulo = titulo ? titulo.split(' ') : [''];
  const tituloPrincipal = partesTitulo[0];
  const subTitulo = partesTitulo.slice(1).join(' ');

  // Define a classe do tema dinamicamente
  const themeClass = abaAtiva === 'mudar' ? 'theme-mudar' : 'theme-manter';

  return (
    <div className={`select-base-container ${themeClass}`}>
      <div className="green-banner-selection">
        <h2>{tituloPrincipal}</h2>
        {subTitulo && <h3>{subTitulo}</h3>}
        <div className="triangle-down"></div>
      </div>

      {abas.length > 0 && (
        <div className="tabs-toggle-container">
          <div className="tabs-toggle">
            {abas.map((aba) => (
              <button key={aba} className={`tab-toggle-btn ${abaAtiva === aba ? 'active' : ''}`} onClick={() => setAbaAtiva(aba)}>
                {aba}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="list-wrapper">
        <div className="list-scroll-box">
          
          {dados.length > 0 ? (
            dados.map((item) => {
              const isSelected = selecionados.some((v) => v.id === item.id);
              return (
                <div key={item.id} className={`base-card ${isSelected ? 'selected' : ''}`} onClick={() => handleSelect(item)}>
                  {renderItem(item, isSelected)}
                </div>
              );
            })
          ) : (
            <div className="no-data">Nenhum candidato na lista.</div>
          )}

          {mostrarBusca && (
            <div className="search-container">
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
                      {buscaNaPrincipal && dadosBusca.length === 0 && (
                        <div className="no-data-search">Este candidato já está exibido na lista acima.</div>
                      )}

                      {dadosBusca.length > 0 && (
                        <>
                          {buscaNaPrincipal && (
                            <div className="search-info-msg">
                              * Alguns resultados já estão exibidos na lista acima.
                            </div>
                          )}
                          {dadosBusca.map((item) => {
                            const isSelected = selecionados.some((v) => v.id === item.id);
                            return (
                              <div
                                key={item.id}
                                className={`base-card search-result-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelect(item)}
                              >
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