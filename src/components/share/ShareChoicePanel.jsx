import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClearIcon, CopyIcon, DownloadIcon, ShareIcon } from '@/components/icons/AppIcons';
import {
  createShareAnalysis,
  downloadShareImage,
  shareTemplate,
  SHARE_CARD_TEMPLATES
} from '@/services/share/shareCardService';
import './ShareChoicePanel.css';

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const getCandidateName = (name, fallback) => name || fallback;

function ShareArtworkCard({ templateId, analysis, variant = 'main' }) {
  const deputadoName = getCandidateName(analysis.deputadoName, 'Deputado federal definido');
  const senatorOne = getCandidateName(analysis.senatorNames[0], 'Senador 1 definido');
  const senatorTwo = getCandidateName(analysis.senatorNames[1], 'Senador 2 definido');
  const locationLine = `${analysis.estadoNome} • ${analysis.year}`;

  if (templateId === 'completo') {
    return (
      <article className={`share-art-card share-art-card--completo share-art-card--${variant}`}>
        <div className="share-art-card__brand">
          <strong>nossovoto.org</strong>
          <span>Mostra nomes</span>
        </div>
        <h3>Meu plano de voto</h3>
        <p>Estado: {analysis.estadoNome}</p>
        <div className="share-art-card__candidate-list">
          <span>Deputado Federal</span>
          <strong>{deputadoName}</strong>
          <span>Senadores</span>
          <strong>{senatorOne}</strong>
          <strong>{senatorTwo}</strong>
        </div>
        <div className="share-art-card__cta">
          <span>Monte o seu também</span>
          <strong>nossovoto.org</strong>
        </div>
      </article>
    );
  }

  if (templateId === 'termometro') {
    return (
      <article className={`share-art-card share-art-card--termometro share-art-card--${variant}`}>
        <div className="share-art-card__brand">
          <strong>nossovoto.org</strong>
          <span>Visual</span>
        </div>
        <h3>Meu plano em números</h3>
        <div className="share-art-card__meters">
          <span style={{ '--share-meter-value': clampPercent(analysis.averageChance) }}>
            <i><strong>{analysis.averageChanceLabel}</strong></i>
            <small>Viabilidade geral</small>
          </span>
          <span className="share-art-card__meter--score" style={{ '--share-meter-value': clampPercent(analysis.averageScore * 10) }}>
            <i><strong>{analysis.averageScoreLabel}</strong></i>
            <small>Média das notas</small>
          </span>
        </div>
        <p>Indicadores de apoio para revisar o plano.</p>
        <div className="share-art-card__cta">
          <span>Monte o seu também</span>
          <strong>nossovoto.org</strong>
        </div>
      </article>
    );
  }

  if (templateId === 'checklist') {
    return (
      <article className={`share-art-card share-art-card--checklist share-art-card--${variant}`}>
        <div className="share-art-card__brand">
          <strong>nossovoto.org</strong>
          <span>Sem nomes</span>
        </div>
        <h3>Checklist do meu plano</h3>
        <div className="share-art-card__checklist">
          <span>Estado escolhido ✓</span>
          <span>Deputado federal escolhido ✓</span>
          <span>Senadores escolhidos ✓</span>
          <span>Rascunho revisado ✓</span>
        </div>
        <p>Agora é revisar antes da decisão final.</p>
        <div className="share-art-card__cta">
          <span>Monte o seu também</span>
          <strong>nossovoto.org</strong>
        </div>
      </article>
    );
  }

  return (
    <article className={`share-art-card share-art-card--resumo share-art-card--${variant}`}>
      <div className="share-art-card__brand">
        <strong>nossovoto.org</strong>
        <span>Seguro</span>
      </div>
      <h3>Meu plano de voto está pronto</h3>
      <p>{locationLine}</p>
      <div className="share-art-card__checklist">
        <span>Deputado federal definido</span>
        <span>Senadores definidos</span>
        <span>Nomes ocultos por privacidade</span>
      </div>
      <div className="share-art-card__cta">
        <span>Monte o seu também</span>
        <strong>nossovoto.org</strong>
      </div>
    </article>
  );
}

function ShareMainGallery({ activeTemplateId, analysis, onSelect, actions }) {
  const galleryRef = useRef(null);
  const cardRefs = useRef(new Map());
  const scrollFrameRef = useRef(0);
  const dragStateRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });

  useEffect(() => {
    const activeCard = cardRefs.current.get(activeTemplateId);
    activeCard?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [activeTemplateId]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const selectCenteredCard = () => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const galleryRect = gallery.getBoundingClientRect();
    const galleryCenter = galleryRect.left + galleryRect.width / 2;
    let closestTemplateId = activeTemplateId;
    let closestDistance = Number.POSITIVE_INFINITY;

    SHARE_CARD_TEMPLATES.forEach((template) => {
      const card = cardRefs.current.get(template.id);
      if (!card) return;

      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - galleryCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTemplateId = template.id;
      }
    });

    if (closestTemplateId !== activeTemplateId) onSelect(closestTemplateId);
  };

  const handleScroll = () => {
    if (typeof window === 'undefined') return;

    window.cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = window.requestAnimationFrame(selectCenteredCard);
  };

  const handlePointerDown = (event) => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: gallery.scrollLeft,
      moved: false
    };
    gallery.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const gallery = galleryRef.current;
    const dragState = dragStateRef.current;
    if (!gallery || !dragState.active) return;

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 5) dragState.moved = true;
    gallery.scrollLeft = dragState.startScrollLeft - deltaX;
  };

  const endDrag = () => {
    dragStateRef.current.active = false;
  };

  return (
    <div className="share-main-gallery">
      <section className="share-gallery-stage" aria-label="Galeria de artes para compartilhar">
        <div
          ref={galleryRef}
          className="share-gallery-track"
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          {SHARE_CARD_TEMPLATES.map((template) => (
            <button
              key={template.id}
              ref={(element) => {
                if (element) cardRefs.current.set(template.id, element);
                else cardRefs.current.delete(template.id);
              }}
              type="button"
              className={`share-gallery-slide nv-touch ${template.id === activeTemplateId ? 'is-active' : ''}`}
              aria-label={`Selecionar ${template.label}`}
              aria-pressed={template.id === activeTemplateId}
              onClick={() => {
                if (dragStateRef.current.moved) {
                  dragStateRef.current.moved = false;
                  return;
                }
                onSelect(template.id);
              }}
            >
              <ShareArtworkCard templateId={template.id} analysis={analysis} />
            </button>
          ))}
        </div>
      </section>

      <div className="share-gallery-actions" aria-label="Ações de compartilhamento">
        {actions}
      </div>
    </div>
  );
}

function ShareThumbnailStrip({ activeTemplateId, onSelect }) {
  const stripRef = useRef(null);
  const thumbnailRefs = useRef(new Map());

  useEffect(() => {
    const strip = stripRef.current;
    const activeThumbnail = thumbnailRefs.current.get(activeTemplateId);
    if (!strip || !activeThumbnail) return;

    const nextScrollLeft = activeThumbnail.offsetLeft - (strip.clientWidth - activeThumbnail.clientWidth) / 2;
    strip.scrollTo({
      left: Math.max(0, nextScrollLeft),
      behavior: 'smooth'
    });
  }, [activeTemplateId]);

  return (
    <div ref={stripRef} className="share-thumbnail-strip" aria-label="Modelos de compartilhamento">
      {SHARE_CARD_TEMPLATES.map((template) => (
        <button
          key={template.id}
          ref={(element) => {
            if (element) thumbnailRefs.current.set(template.id, element);
            else thumbnailRefs.current.delete(template.id);
          }}
          type="button"
          className={`share-thumbnail nv-touch ${template.id === activeTemplateId ? 'is-active' : ''}`}
          aria-label={`Selecionar ${template.label}`}
          aria-pressed={template.id === activeTemplateId}
          onClick={() => onSelect(template.id)}
        >
          <span>{template.tag}</span>
          <strong>{template.label}</strong>
          <small>{template.description}</small>
        </button>
      ))}
    </div>
  );
}

const copyLinkToClipboard = async (url) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = url;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
};

export default function ShareChoicePanel({ shareData, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateId, setTemplateId] = useState('resumo');
  const [status, setStatus] = useState('');
  const analysis = useMemo(() => createShareAnalysis(shareData), [shareData]);
  const activeTemplate = SHARE_CARD_TEMPLATES.find((template) => template.id === templateId) || SHARE_CARD_TEMPLATES[0];

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleTemplateSelect = (nextTemplateId) => {
    setTemplateId(nextTemplateId);
    setStatus('');
  };

  const runAction = async (action, successMessage) => {
    setStatus('');
    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error?.message || 'Não foi possível concluir o compartilhamento.');
    }
  };

  if (!shareData) return null;

  const galleryActions = (
    <>
      <button className="share-gallery-actions__primary nv-touch" type="button" onClick={() => runAction(() => shareTemplate(templateId, shareData), 'Pronto para compartilhar.')}>
        <ShareIcon />
        <span>Compartilhar</span>
      </button>
      <button className="share-gallery-actions__secondary nv-touch" type="button" onClick={() => runAction(() => downloadShareImage(templateId, shareData), 'Imagem baixada.')}>
        <DownloadIcon />
        <span>Baixar imagem</span>
      </button>
      <button className="share-gallery-actions__link nv-touch" type="button" onClick={() => runAction(() => copyLinkToClipboard(analysis.url), 'Link copiado.')}>
        <CopyIcon />
        <span>Copiar link</span>
      </button>
    </>
  );

  const shareModal = isOpen ? (
    <div className="share-modal nv-no-overflow" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <div className="share-modal__content nv-no-overflow">
        <header className="share-modal__header">
          <div>
            <h2 id="share-modal-title">Compartilhar meu plano</h2>
            <p>Arraste para escolher uma arte pronta</p>
          </div>
          <button className="share-modal__close nv-touch" type="button" onClick={() => setIsOpen(false)} aria-label="Fechar">
            <ClearIcon />
          </button>
        </header>

        <div className="share-modal__body">
          <ShareMainGallery
            activeTemplateId={templateId}
            analysis={analysis}
            onSelect={handleTemplateSelect}
            actions={galleryActions}
          />

          <section className="share-thumbnail-panel" aria-label="Modelos">
            <div className="share-preview-panel__heading">
              <span>{activeTemplate.tag}</span>
              <strong>{activeTemplate.label}</strong>
              <small>{activeTemplate.description}</small>
            </div>
            <ShareThumbnailStrip activeTemplateId={templateId} onSelect={handleTemplateSelect} />
          </section>
        </div>

        {status && <p className="share-modal__status" role="status">{status}</p>}
      </div>
    </div>
  ) : null;

  return (
    <section className={`share-choice-panel nv-no-overflow ${className}`.trim()} aria-labelledby="share-choice-title">
      <div className="share-choice-panel__copy">
        <strong id="share-choice-title">Compartilhar meu plano</strong>
        <span>Escolha uma arte pronta e compartilhe em poucos toques.</span>
      </div>
      <button className="share-choice-panel__button nv-touch" type="button" onClick={() => setIsOpen(true)}>
        <ShareIcon />
        <span>Compartilhar</span>
      </button>

      {shareModal && (typeof document === 'undefined' ? shareModal : createPortal(shareModal, document.body))}
    </section>
  );
}
