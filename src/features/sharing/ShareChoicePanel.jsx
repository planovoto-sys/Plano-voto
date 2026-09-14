import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Rocket, Send, Users, X } from 'lucide-react';
import { WHATSAPP_INVITE_URL } from './whatsappInvite';
import { usesSupabaseAuth } from '@/shared/auth/authService';
import PublishSelectionCard from './PublishSelectionCard';
import './ShareChoicePanel.css';

const DONATION_URL = 'https://www.kickante.com.br/vaquinha-online/voce-e-bom-de-voto/pagamento?action=securePix';

function ActionCard({ support = false, icon, title, description, href, children }) {
  const tone = support ? 'support' : 'invite';
  return (
    <section className={`sp-action-card sp-action-card--${tone}`}>
      <div className="sp-action-card__head">
        <div className="sp-action-card__icon" aria-hidden="true">{icon}</div>
        <div className="sp-action-card__text"><h3>{title}</h3><p>{description}</p></div>
      </div>
      <a className={`sp-action-card__btn sp-action-card__btn--${tone}`} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    </section>
  );
}

export default function ShareChoicePanel({ shareData, className = '', appearance = 'panel', isOpenControlled, onCloseControlled }) {
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const sheetRef = useRef(null);
  const titleId = useId();
  const isOpen = Boolean(shareData) && (isOpenControlled !== undefined ? isOpenControlled : isInternalOpen);
  const handleClose = useCallback(() => {
    onCloseControlled?.();
    setIsInternalOpen(false);
  }, [onCloseControlled]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('hide-bottom-nav');
    sheetRef.current?.querySelector('.share-modal-close')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); handleClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...sheetRef.current.querySelectorAll('button:not(:disabled), a[href], input')]
        .filter((element) => !element.closest('[hidden]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('hide-bottom-nav');
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [handleClose, isOpen]);

  if (!shareData) return null;
  return (
    <>
      {isOpenControlled === undefined && (appearance === 'fab' ? (
        <button type="button" className={`share-trigger-fab ${className}`} onClick={() => setIsInternalOpen(true)} aria-label="Abrir painel de compartilhamento"><Rocket size={24} /></button>
      ) : (
        <div className={`share-trigger-panel ${className}`}>
          <div className="share-trigger-panel__info"><strong>Ajude o Bom de Voto</strong><span>Compartilhe, convide ou apoie</span></div>
          <button type="button" className="share-trigger-btn" onClick={() => setIsInternalOpen(true)}><Rocket size={18} /> Abrir</button>
        </div>
      ))}
      {isOpen && createPortal(
        <div className="share-modal-overlay share-panel-wrapper" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
          <div ref={sheetRef} className="share-modal-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="share-modal-handle" aria-hidden="true" />
            <div className="share-modal-header">
              <div className="share-modal-header__text"><h2 id={titleId}>Ajude o Bom de Voto</h2><p>{usesSupabaseAuth ? '3' : '2'} formas simples de ajudar</p></div>
              <button type="button" className="share-modal-close" onClick={handleClose} aria-label="Fechar compartilhamento"><X size={21} /></button>
            </div>
            <div className="share-modal-body nv-scroll">
              <div className="sp-action-list">
                {usesSupabaseAuth && <PublishSelectionCard />}
                <ActionCard icon={<Users size={24} strokeWidth={1.8} />} title="Convidar novos eleitores" description="Convide seus amigos" href={WHATSAPP_INVITE_URL}><Send size={19} /> Convidar</ActionCard>
                <ActionCard support icon={<Heart size={24} strokeWidth={1.8} />} title="Apoiar o Bom de Voto" description="Ajude o projeto a continuar" href={DONATION_URL}><Heart size={19} /> Apoiar</ActionCard>
              </div>
            </div>
          </div>
        </div>, document.body,
      )}
    </>
  );
}
