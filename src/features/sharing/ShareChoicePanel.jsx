import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Link2, Rocket, Send, ShieldCheck, Users, X } from 'lucide-react';
import { useNotify } from '@/features/notifications/useNotify';
import { APP_SHARE_URL } from '@/features/sharing/shareCardService';

import './ShareChoicePanel.css';

const INVITE_MESSAGE = '🫵 Você é bom de voto?\n\n🤨 Tem certeza?\n\n👉 https://bomdevoto.com.br';
const DONATION_URL = 'https://www.kickante.com.br/vaquinha-online/voce-e-bom-de-voto/pagamento?action=securePix';

function FacebookIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function XSocialIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function InviteCard({ href }) {
  return (
    <div className="sp-action-card sp-action-card--invite">
      <div className="sp-action-card__head">
        <div className="sp-action-card__icon" aria-hidden="true">
          <Users size={22} strokeWidth={2.4} />
        </div>
        <div className="sp-action-card__text">
          <strong>Convidar novos eleitores</strong>
          <span>Convide pessoas e ajude a tornar o voto mais consciente.</span>
        </div>
      </div>
      <div className="sp-action-card__actions">
        <a
          className="sp-action-card__btn sp-action-card__btn--invite"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Send size={17} /> Enviar convite
        </a>
      </div>
    </div>
  );
}

function SupportCard() {
  return (
    <div className="sp-action-card sp-action-card--support">
      <div className="sp-action-card__head">
        <div className="sp-action-card__icon" aria-hidden="true">
          <Heart size={22} strokeWidth={2.4} />
        </div>
        <div className="sp-action-card__text">
          <strong>Apoie o Bom de Voto</strong>
          <span>Contribua para manter o app gratuito e o projeto no ar.</span>
        </div>
      </div>
      <div className="sp-action-card__actions">
        <a className="sp-action-card__btn sp-action-card__btn--support" href={DONATION_URL} target="_blank" rel="noopener noreferrer">
          <Heart size={17} /> Apoiar o projeto
        </a>
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

  if (!shareData) return null;

  const shareLink = shareData?.url || APP_SHARE_URL;
  const shareText = INVITE_MESSAGE;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const shareChannels = [
    {
      id: 'facebook',
      label: 'Facebook',
      icon: FacebookIcon,
      bg: '#EAF1FB',
      fg: '#1877F2',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      icon: XSocialIcon,
      bg: '#F2F2F2',
      fg: '#111111',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: InstagramIcon,
      bg: '#F9EFF6',
      fg: '#C13584',
      href: `https://www.instagram.com/`
    }
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      notify.success('Link copiado!');
    } catch {
      notify.error('Não foi possível copiar o link. Tente novamente.');
    }
  };

  if (!shareData) return null;

  const modalRender = isOpen ? (
    <div className="share-modal-overlay share-panel-wrapper" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="share-modal-sheet">
        <div className="share-modal-handle" aria-hidden="true" />
        <div className="share-modal-header">
          <div className="share-modal-header__text">
            <h2>Ajude o Bom de Voto</h2>
            <span>Duas formas simples de fortalecer o projeto</span>
          </div>
          <button className="share-modal-close" onClick={handleClose} aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        <div className="share-modal-body nv-scroll">
          <div className="sp-action-list">
            <InviteCard href={whatsappHref} />
            <SupportCard />
          </div>

          {!import.meta.env.DEV && (
            <div className="sp-share-section">
              <span className="sp-share-section__label">Outras formas de compartilhar</span>
              <div className="sp-share-list">
                {shareChannels.map((channel) => (
                  <a
                    key={channel.id}
                    className="sp-share-item"
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span
                      className="sp-share-item__circle"
                      aria-hidden="true"
                      style={{ backgroundColor: channel.bg, color: channel.fg }}
                    >
                      <channel.icon size={20} />
                    </span>
                    <span className="sp-share-item__label">{channel.label}</span>
                  </a>
                ))}
                <button className="sp-share-item sp-share-item--copy" type="button" onClick={handleCopyLink}>
                  <span className="sp-share-item__circle" aria-hidden="true">
                    <Link2 size={20} />
                  </span>
                  <span className="sp-share-item__label">Copiar link</span>
                </button>
              </div>
            </div>
          )}

          <div className="sp-privacy-note">
            <ShieldCheck size={18} />
            <span>Seus dados estão protegidos e não são compartilhados indevidamente.</span>
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
        <Rocket size={24} />
      </button>
    ) : (
      <div className={`share-trigger-panel ${className}`}>
        <div className="share-trigger-panel__info">
          <strong>Compartilhar meu plano</strong>
          <span>Convide amigos e apoie o Bom de Voto</span>
        </div>
        <button className="share-trigger-btn" onClick={() => setIsInternalOpen(true)}>
          <Rocket size={18} /> Abrir
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
