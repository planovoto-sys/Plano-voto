import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Share2, X, Download } from 'lucide-react';
import { useNotify } from '@/features/notifications/useNotify';
import {
  createShareAnalysis,
  downloadShareImage,
  shareTemplate,
  SHARE_CARD_TEMPLATES
} from '@/features/sharing/shareCardService';

import './ShareChoicePanel.css';

const clampPercent = (val) => Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
const getCandidateName = (name, fallback) => name || fallback;

function SharePreviewArtwork({ templateId, analysis }) {
  const deputadoName = getCandidateName(analysis.deputadoName, 'Deputado federal');
  const senatorOne = getCandidateName(analysis.senatorNames[0], 'Senador 1');
  const senatorTwo = getCandidateName(analysis.senatorNames[1], 'Senador 2');
  const locationLine = analysis.estadoSigla ? `${analysis.estadoNome} — ${analysis.estadoSigla}` : 'Plano Nacional';
  
  const scoreProgress = clampPercent(analysis.averageScore * 10);
  const chanceProgress = clampPercent(analysis.averageChance);

  const renderBrand = () => (
    <div className="sp-card-brand">
      <div className="sp-card-brand__logo">
        <strong>BOM DE VOTO</strong>
        <span>{locationLine}</span>
      </div>
      <div className="sp-card-brand__year">{analysis.year}</div>
    </div>
  );

  if (templateId === 'completo') {
    return (
      <div className="sp-card-inner">
        {renderBrand()}
        <div className="sp-card-widget sp-card-widget--split">
          <div><small>Deputado</small><strong>1</strong></div>
          <div><small>Senadores</small><strong>2</strong></div>
        </div>
        <div className="sp-card-context">
          <h3>Candidatos</h3>
          <p>Nomes revelados</p>
          <div className="sp-card-list">
            <div className="sp-card-list-item">
              <small>Federal</small><strong>{deputadoName}</strong>
            </div>
            <div className="sp-card-list-item">
              <small>Senador</small><strong>{senatorOne}</strong>
            </div>
            <div className="sp-card-list-item">
              <small>Senador</small><strong>{senatorTwo}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'termometro') {
    return (
      <div className="sp-card-inner">
        {renderBrand()}
        <div className="sp-card-widget sp-card-widget--split">
          <div>
            <small>Nota</small><strong>{analysis.scoreBand}</strong>
            <div className="sp-progress-bar" style={{ '--progress': `${scoreProgress}%` }} />
          </div>
          <div>
            <small>Viabilidade</small><strong>{analysis.chanceBand}</strong>
            <div className="sp-progress-bar" style={{ '--progress': `${chanceProgress}%` }} />
          </div>
        </div>
        <div className="sp-card-context">
          <h3>Indicadores</h3>
          <p>Média do Plano</p>
          <div className="sp-card-list">
            <div className="sp-card-list-item">
              <small>Nota Média Geral</small><strong>{analysis.averageScoreLabel}</strong>
            </div>
            <div className="sp-card-list-item">
              <small>Chance Média</small><strong>{analysis.averageChanceLabel}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'checklist') {
    return (
      <div className="sp-card-inner">
        {renderBrand()}
        <div className="sp-card-widget">
          <small>Status</small>
          <strong>Pronto para Revisão</strong>
        </div>
        <div className="sp-card-context">
          <h3>Checklist</h3>
          <p>Sem nomes de candidatos</p>
          <div className="sp-card-list">
            <div className="sp-card-check-item">Estado Escolhido</div>
            <div className="sp-card-check-item">Deputado Escolhido</div>
            <div className="sp-card-check-item">Senadores Escolhidos</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-card-inner">
      {renderBrand()}
      <div className="sp-card-widget">
        <small>Perfil do plano</small>
        <strong>{analysis.profile.title}</strong>
      </div>
      <div className="sp-card-context">
        <h3>Resumo Geral</h3>
        <p>Dados consolidados</p>
        <div className="sp-card-list">
          <div className="sp-card-list-item">
            <small>Média de Nota</small>
            <strong>{analysis.averageScoreLabel}</strong>
          </div>
          <div className="sp-card-list-item">
            <small>Viabilidade Média</small>
            <strong>{analysis.averageChanceLabel}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareGallery({ activeTemplateId, analysis, onSelect }) {
  const trackRef = useRef(null);
  
  const handleScroll = useCallback(() => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const trackCenter = track.getBoundingClientRect().left + track.offsetWidth / 2;
    let closestTemplate = activeTemplateId;
    let minDistance = Infinity;

    Array.from(track.children).forEach((card) => {
      const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
      const distance = Math.abs(trackCenter - cardCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestTemplate = card.dataset.id;
      }
    });

    if (closestTemplate && closestTemplate !== activeTemplateId) {
      onSelect(closestTemplate);
    }
  }, [activeTemplateId, onSelect]);

  const scrollToTemplate = (templateId) => {
    onSelect(templateId);
    const track = trackRef.current;
    const targetCard = track?.querySelector(`[data-id="${templateId}"]`);
    if (targetCard && track) {
      targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  return (
    <div className="share-gallery-container">
      <div 
        ref={trackRef} 
        className="share-gallery-track nv-scroll" 
        onScroll={handleScroll}
      >
        {SHARE_CARD_TEMPLATES.map((template) => (
          <div
            key={template.id}
            data-id={template.id}
            className={`share-preview-card ${template.id === activeTemplateId ? 'is-active' : ''}`}
            onClick={() => scrollToTemplate(template.id)}
          >
            <SharePreviewArtwork templateId={template.id} analysis={analysis} />
          </div>
        ))}
      </div>
      <div className="share-gallery-dots">
        {SHARE_CARD_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            aria-label={`Ir para ${template.label}`}
            className={`share-dot ${template.id === activeTemplateId ? 'is-active' : ''}`}
            onClick={() => scrollToTemplate(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ShareChoicePanel({ 
  shareData, 
  className = '', 
  appearance = 'panel',
  isOpenControlled,
  onCloseControlled
}) {
  const notify = useNotify();
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const [templateId, setTemplateId] = useState('resumo');
  const [shareNoticeAccepted, setShareNoticeAccepted] = useState(false);
  const [status, setStatus] = useState('');
  
  const analysis = useMemo(() => createShareAnalysis(shareData), [shareData]);
  const isFab = appearance === 'fab';
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : isInternalOpen;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hide-bottom-nav');

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [isOpen]);

  const handleClose = () => {
    if (onCloseControlled) onCloseControlled();
    setIsInternalOpen(false);
  };

  const executeAction = async (actionFn, successMsg) => {
    setStatus('');
    try {
      const result = await actionFn();
      const finalMsg = typeof successMsg === 'function' ? successMsg(result) : successMsg;
      setStatus(finalMsg);
      notify.success(finalMsg);
    } catch (error) {
      const errorMsg = error?.message || 'Não foi possível compartilhar.';
      setStatus(errorMsg);
      notify.error(errorMsg);
    }
  };

  const handleShareText = () => executeAction(
    () => shareTemplate(templateId, shareData),
    (res) => res === 'copied' ? 'Link copiado!' : 'Enviado com sucesso.'
  );

  const handleDownload = () => executeAction(
    () => downloadShareImage(templateId, shareData), 
    'Imagem salva na galeria.'
  );

  if (!shareData) return null;

  const modalRender = isOpen ? (
    <div className="share-modal-overlay share-panel-wrapper" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="share-modal-sheet">
        <div className="share-modal-header">
          <h2>Escolha a Arte</h2>
          <button className="share-modal-close" onClick={handleClose} aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        <div className="share-modal-body nv-scroll">
          <div className="share-legal-notice">
            <p>O conteúdo compartilhado circula fora do Bom de Voto, sujeito às redes sociais onde for postado.</p>
            <label>
              <input 
                type="checkbox" 
                checked={shareNoticeAccepted} 
                onChange={(e) => setShareNoticeAccepted(e.target.checked)} 
              />
              <span>Entendi e aceito compartilhar.</span>
            </label>
            <div className="share-legal-links">
              <Link to="/aviso-eleitoral">Aviso Eleitoral</Link>
              <Link to="/politica-de-privacidade">Privacidade</Link>
            </div>
          </div>

          <ShareGallery 
            activeTemplateId={templateId} 
            analysis={analysis} 
            onSelect={setTemplateId} 
          />

          <div className="share-actions">
            {status && <span className="share-actions-status">{status}</span>}
            <button className="share-btn-primary" onClick={handleShareText}>
              <Share2 size={18} /> Compartilhar Imagem
            </button>
            <button className="share-btn-secondary" onClick={handleDownload}>
              <Download size={18} /> Salvar Imagem
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const renderTriggers = isOpenControlled === undefined && (
    isFab ? (
      <button 
        className={`share-trigger-fab ${className}`} 
        onClick={() => setIsInternalOpen(true)}
        aria-label="Abrir painel de compartilhamento"
      >
        <Share2 size={24} />
      </button>
    ) : (
      <div className={`share-trigger-panel ${className}`}>
        <div className="share-trigger-panel__info">
          <strong>Compartilhar meu plano</strong>
          <span>Gere uma arte para as redes sociais</span>
        </div>
        <button className="share-trigger-btn" onClick={() => setIsInternalOpen(true)}>
          <Share2 size={18} /> Abrir
        </button>
      </div>
    )
  );

  return (
    <>
      {renderTriggers}
      {modalRender && (typeof document !== 'undefined' ? createPortal(modalRender, document.body) : modalRender)}
    </>
  );
}