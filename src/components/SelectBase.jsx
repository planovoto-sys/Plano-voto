import React, { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';
import { ClearIcon, InfoIcon } from './AppIcons';
import './SelectBase.css';

export default function SelectBase({
  titulo,
  dados,
  limiteSelecao,
  selecaoInicial = [],
  carregando,
  abas = [],
  abaAtiva = '',
  setAbaAtiva = () => {},
  mostrarBusca = false,
  valorBusca = '',
  onChangeBusca = () => {},
  textoBuscaFixo = null,
  onConfirmar,
  onVoltar,
  renderItem,
  onLimiteAtingido,
  onHelpClick,
  linhasVisiveis = 5
}) {
  const [selecionados, setSelecionados] = useState(selecaoInicial);
  const [modalMalAvaliado, setModalMalAvaliado] = useState({ aberto: false, item: null });

  useEffect(() => {
    setSelecionados(selecaoInicial);
  }, [selecaoInicial]);

  const handleSelect = (item) => {
    const jaSelecionado = selecionados.find((v) => v.id === item.id);
    if (jaSelecionado) {
      setSelecionados(selecionados.filter((v) => v.id !== item.id));
      return;
    }

    if (item.notaFinal !== undefined && item.notaFinal < 7) {
        setModalMalAvaliado({ aberto: true, item });
        return;
    }

    efetivarSelecao(item);
  };

  const efetivarSelecao = (item) => {
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

  const handleHelpPress = (e) => {
      const btn = e.currentTarget;
      btn.classList.add('pulse-anim');
      setTimeout(() => btn.classList.remove('pulse-anim'), 400); 
      if (onHelpClick) onHelpClick();
  };

  const handleClearBusca = () => {
    onChangeBusca('');
  };

  if (carregando) return <div className="loading">CARREGANDO...</div>;

  const partesTitulo = titulo ? titulo.split(' ') : [''];
  const tituloPrincipal = partesTitulo[0];
  const subTitulo = partesTitulo.slice(1).join(' ');

  const themeClass = abaAtiva === 'renovar' ? 'theme-renovar' : 'theme-reeleger';
  const layoutClass = abas.length > 0 ? 'has-tabs' : 'no-tabs';
  const canClearBusca = mostrarBusca && textoBuscaFixo === null && valorBusca.trim().length > 0;
  
  // Altura dinâmica baseada na prop linhasVisiveis
  const maxListHeight = `${linhasVisiveis * 80}px`;

  return (
    <div className={`select-base-container ${themeClass} ${layoutClass}`}>
      <div className="top-nav-bar">
        <div className="nav-spacer"></div>

        {mostrarBusca && (
          <div className={`top-search-wrapper ${canClearBusca ? 'has-clear-button' : ''}`}>
            <input
              id="tour-busca"
              type="text"
              placeholder="Pesquisar"
              value={textoBuscaFixo !== null ? textoBuscaFixo : valorBusca}
              onChange={(e) => onChangeBusca(e.target.value)}
              disabled={textoBuscaFixo !== null}
            />
            {canClearBusca && (
              <button className="btn-clear-search" type="button" onClick={handleClearBusca} aria-label="Limpar pesquisa">
                <ClearIcon />
              </button>
            )}
          </div>
        )}

        <div className="nav-action-right">
          {onHelpClick && (
            <button className="btn-help-icon top-icon-button" type="button" onClick={handleHelpPress} id="tour-help" aria-label="Abrir ajuda">
              <InfoIcon />
            </button>
          )}
        </div>
      </div>

      <div className="green-banner-selection">
        <h2>{tituloPrincipal}</h2>
        {subTitulo && <h3>{subTitulo}</h3>}
        <div className="triangle-down"></div>
      </div>

      {abas.length > 0 && (
        <div className="tabs-toggle-container">
          <div className="tabs-toggle">
            {/* O INDICADOR QUE DESLIZA COM ANIMAÇÃO */}
            <div className={`tab-active-indicator ${abaAtiva === 'renovar' ? 'right' : 'left'}`}></div>
            
            {abas.map((aba) => (
              <button
                type="button"
                key={aba} 
                id={`tour-${aba}`} 
                data-tab={aba}
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
        <div className="list-scroll-box" id="tour-lista" style={{ '--list-max-height': maxListHeight }}>
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
            <div className="no-data">Nenhum resultado encontrado.</div>
          )}
        </div>
      </div>

      <footer className="navigation-footer">
        <button className="nav-btn" type="button" onClick={onVoltar} aria-label="Voltar"><i className="arrow-left"></i></button>
        <button className="nav-btn" type="button" onClick={handleConfirmar} aria-label="Avancar"><i className="arrow-right"></i></button>
      </footer>

      <ConfirmModal
          isOpen={modalMalAvaliado.aberto}
          titulo="ATENÇÃO"
          mensagem={
              modalMalAvaliado.item?.temNotaCandidato
              ? "Você selecionou um candidato mal avaliado. Que tal selecionar um candidato melhor avaliado?"
              : "Você selecionou um candidato de um partido mal avaliado. Que tal selecionar um candidato de um partido melhor avaliado?"
          }
          textoConfirmar="SIM"
          textoCancelar="NÃO"
          tipo="aviso"
          onConfirm={() => {
              setModalMalAvaliado({ aberto: false, item: null });
          }}
          onCancel={() => {
              const itemToSelect = modalMalAvaliado.item;
              setModalMalAvaliado({ aberto: false, item: null });
              efetivarSelecao(itemToSelect); 
          }}
      />
    </div>
  );
}
