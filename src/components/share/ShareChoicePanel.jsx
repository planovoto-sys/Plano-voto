import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ClearIcon, DownloadIcon, ShareIcon } from '@/components/icons/AppIcons';
import {
  createShareAnalysis,
  downloadShareImage,
  shareTemplate,
  SHARE_CARD_TEMPLATES
} from '@/services/share/shareCardService';
import './ShareChoicePanel.css';

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const getCandidateName = (name, fallback) => name || fallback;

function ShareArtworkBrand({ analysis, locationLine }) {
  return (
    <div className="share-art-card__brand">
      <div className="share-art-card__brand-copy">
        <strong>NOSSOVOTO.ORG</strong>
        <span>{locationLine}</span>
      </div>
      <small>{analysis.year}</small>
    </div>
  );
}

function ShareArtworkVisual({ templateId, analysis, scoreProgress, chanceProgress }) {
  if (templateId === 'completo') {
    return (
      <div className="share-art-card__visual share-art-card__visual--split" aria-hidden="true">
        <span className="share-art-card__visual-item">
          <small>Deputado</small>
          <strong>1 definido</strong>
        </span>
        <span className="share-art-card__visual-item">
          <small>Senadores</small>
          <strong>2 definidos</strong>
        </span>
      </div>
    );
  }

  if (templateId === 'termometro') {
    return (
      <div className="share-art-card__visual share-art-card__visual--meters" aria-hidden="true">
        <span className="share-art-card__visual-item">
          <small>Nota</small>
          <strong>{analysis.scoreBand}</strong>
          <i style={{ '--share-stat-progress': `${scoreProgress}%` }} />
        </span>
        <span className="share-art-card__visual-item">
          <small>Viabilidade</small>
          <strong>{analysis.chanceBand}</strong>
          <i style={{ '--share-stat-progress': `${chanceProgress}%` }} />
        </span>
      </div>
    );
  }

  if (templateId === 'checklist') {
    return (
      <div className="share-art-card__visual share-art-card__visual--steps" aria-hidden="true">
        <span>01</span>
        <span>02</span>
        <span>03</span>
      </div>
    );
  }

  return (
    <div className="share-art-card__visual share-art-card__visual--profile">
      <small>Perfil do plano</small>
      <strong>{analysis.profile.title}</strong>
      <span>{Math.min(analysis.completedCount, 3)}/3 escolhas definidas</span>
    </div>
  );
}

function ShareArtworkCard({ templateId, analysis, variant = 'main' }) {
  const deputadoName = getCandidateName(analysis.deputadoName, 'Deputado federal definido');
  const senatorOne = getCandidateName(analysis.senatorNames[0], 'Senador 1 definido');
  const senatorTwo = getCandidateName(analysis.senatorNames[1], 'Senador 2 definido');
  const locationLine = analysis.estadoSigla
    ? `${analysis.estadoNome} — ${analysis.estadoSigla}`
    : `${analysis.estadoNome} — ${analysis.year}`;
  const chanceProgress = clampPercent(analysis.averageChance);
  const scoreProgress = clampPercent(analysis.averageScore * 10);

  if (templateId === 'completo') {
    return (
      <article className={`share-art-card share-art-card--completo share-art-card--${variant}`}>
        <ShareArtworkBrand analysis={analysis} locationLine={locationLine} />
        <ShareArtworkVisual templateId={templateId} analysis={analysis} scoreProgress={scoreProgress} chanceProgress={chanceProgress} />
        <div className="share-art-card__content">
          <h3>Candidatos escolhidos</h3>
          <p>Com nomes no card</p>
          <div className="share-art-card__candidate-list">
            <span>
              <small>Deputado Federal</small>
              <strong>{deputadoName}</strong>
            </span>
            <span>
              <small>Senador</small>
              <strong>{senatorOne}</strong>
            </span>
            <span>
              <small>Senador</small>
              <strong>{senatorTwo}</strong>
            </span>
          </div>
        </div>
      </article>
    );
  }

  if (templateId === 'termometro') {
    return (
      <article className={`share-art-card share-art-card--termometro share-art-card--${variant}`}>
        <ShareArtworkBrand analysis={analysis} locationLine={locationLine} />
        <ShareArtworkVisual templateId={templateId} analysis={analysis} scoreProgress={scoreProgress} chanceProgress={chanceProgress} />
        <div className="share-art-card__content">
          <h3>Indicadores do plano</h3>
          <p>Nota e viabilidade</p>
          <div className="share-art-card__stats share-art-card__stats--stacked">
            <span>
              <strong>{analysis.averageScoreLabel}</strong>
              <small>MÉDIA DE NOTA</small>
              <i style={{ '--share-stat-progress': scoreProgress }} />
            </span>
            <span>
              <strong>{analysis.averageChanceLabel}</strong>
              <small>VIABILIDADE</small>
              <i style={{ '--share-stat-progress': chanceProgress }} />
            </span>
          </div>
        </div>
      </article>
    );
  }

  if (templateId === 'checklist') {
    return (
      <article className={`share-art-card share-art-card--checklist share-art-card--${variant}`}>
        <ShareArtworkBrand analysis={analysis} locationLine={locationLine} />
        <ShareArtworkVisual templateId={templateId} analysis={analysis} scoreProgress={scoreProgress} chanceProgress={chanceProgress} />
        <div className="share-art-card__content">
          <h3>Checklist do plano</h3>
          <p>Sem nomes de candidatos</p>
          <div className="share-art-card__checklist">
            <span>Estado escolhido</span>
            <span>Deputado federal definido</span>
            <span>Dois senadores definidos</span>
            <span>Plano pronto para revisar</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`share-art-card share-art-card--resumo share-art-card--${variant}`}>
      <ShareArtworkBrand analysis={analysis} locationLine={locationLine} />
      <ShareArtworkVisual templateId={templateId} analysis={analysis} scoreProgress={scoreProgress} chanceProgress={chanceProgress} />
      <div className="share-art-card__content">
        <h3>Resumo geral</h3>
        <p>Tudo em um card</p>
        <div className="share-art-card__stats">
          <span>
            <strong>{analysis.averageScoreLabel}</strong>
            <small>MÉDIA DE NOTA</small>
            <i style={{ '--share-stat-progress': `${scoreProgress}%` }} />
          </span>
          <span>
            <strong>{analysis.averageChanceLabel}</strong>
            <small>VIABILIDADE</small>
            <i style={{ '--share-stat-progress': `${chanceProgress}%` }} />
          </span>
        </div>
      </div>
    </article>
  );
}

function ShareMainGallery({ activeTemplateId, analysis, onSelect, actions }) {
  const galleryRef = useRef(null);
  const cardRefs = useRef(new Map());
  const scrollFrameRef = useRef(0);
  const scrollSettledTimerRef = useRef(0);
  const programmaticScrollRef = useRef(false);
  const dragStateRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const activeTemplateIndex = Math.max(0, SHARE_CARD_TEMPLATES.findIndex((template) => template.id === activeTemplateId));

  useEffect(() => {
    const activeCard = cardRefs.current.get(activeTemplateId);
    programmaticScrollRef.current = true;
    activeCard?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });

    if (typeof window !== 'undefined') {
      window.clearTimeout(scrollSettledTimerRef.current);
      scrollSettledTimerRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 360);
    }
  }, [activeTemplateId]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') {
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.clearTimeout(scrollSettledTimerRef.current);
    }
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
    if (programmaticScrollRef.current) return;

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
    programmaticScrollRef.current = false;
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

  const goToRelativeTemplate = (offset) => {
    const nextIndex = (activeTemplateIndex + offset + SHARE_CARD_TEMPLATES.length) % SHARE_CARD_TEMPLATES.length;
    onSelect(SHARE_CARD_TEMPLATES[nextIndex].id);
  };

  return (
    <div className="share-main-gallery">
      <section className="share-gallery-stage" aria-label="Galeria de artes para compartilhar">
        <button
          className="share-gallery-nav share-gallery-nav--previous nv-touch"
          type="button"
          onClick={() => goToRelativeTemplate(-1)}
          aria-label="Arte anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
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
        <button
          className="share-gallery-nav share-gallery-nav--next nv-touch"
          type="button"
          onClick={() => goToRelativeTemplate(1)}
          aria-label="Próxima arte"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      <div className="share-gallery-dots" aria-label="Selecionar arte">
        {SHARE_CARD_TEMPLATES.map((template) => (
          <button
            key={template.id}
            className={`share-gallery-dot nv-touch ${template.id === activeTemplateId ? 'is-active' : ''}`}
            type="button"
            aria-label={`Selecionar ${template.label}`}
            aria-pressed={template.id === activeTemplateId}
            onClick={() => onSelect(template.id)}
          />
        ))}
      </div>

      <div className="share-gallery-actions" aria-label="Ações de compartilhamento">
        {actions}
      </div>
    </div>
  );
}

export default function ShareChoicePanel({ shareData, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateId, setTemplateId] = useState('resumo');
  const [status, setStatus] = useState('');
  const analysis = useMemo(() => createShareAnalysis(shareData), [shareData]);

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
      const result = await action();
      setStatus(typeof successMessage === 'function' ? successMessage(result) : successMessage);
    } catch (error) {
      setStatus(error?.message || 'Não foi possível concluir o compartilhamento.');
    }
  };

  if (!shareData) return null;

  const galleryActions = (
    <>
      <button
        className="share-gallery-actions__primary nv-touch"
        type="button"
        onClick={() => runAction(
          () => shareTemplate(templateId, shareData),
          (result) => (result === 'copied' ? 'Texto copiado para compartilhar.' : 'Imagem pronta para compartilhar.')
        )}
      >
        <ShareIcon />
        <span>Compartilhar imagem</span>
      </button>
      <button className="share-gallery-actions__secondary nv-touch" type="button" onClick={() => runAction(() => downloadShareImage(templateId, shareData), 'Imagem salva.')}>
        <DownloadIcon />
        <span>Salvar imagem</span>
      </button>
    </>
  );

  const shareModal = isOpen ? (
    <div
      className="share-modal nv-no-overflow"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <div className="share-modal__content nv-no-overflow">
        <span className="share-modal__handle" aria-hidden="true" />
        <header className="share-modal__header">
          <h2 id="share-modal-title">Escolha o que compartilhar</h2>
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
        </div>

        {status && <p className="share-modal__status" role="status">{status}</p>}
        <button className="share-modal__cancel nv-touch" type="button" onClick={() => setIsOpen(false)}>
          Cancelar
        </button>
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
