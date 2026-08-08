import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Share2, X, Heart, Users, ChevronRight, Eye, EyeOff, Check, Rocket } from 'lucide-react';
import QRCode from 'qrcode';
import { useNotify } from '@/features/notifications/useNotify';
import { APP_SHARE_URL } from '@/features/sharing/shareCardService';

import './ShareChoicePanel.css';

const INVITE_MESSAGE = 'Conheça o Bom de Voto! Monte seu plano de voto de forma simples, privada e segura. Bom de Voto';

const DONATION_AMOUNTS = [5, 10, 20, 50, 100];

const DONATION_DATA = {
  pixKey: 'apoio@bomdevoto.com.br',
  pixName: 'Bom de Voto',
  paypalUrl: 'https://paypal.me/bomdevoto'
};

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', description: 'Pagamento instantâneo' },
  { id: 'paypal', label: 'PayPal', description: 'Conta PayPal' },
  { id: 'card', label: 'Cartão', description: 'Crédito ou débito' }
];

function DonationQRCode({ value, label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return undefined;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 180,
      margin: 1,
      color: {
        dark: '#1d1d1d',
        light: '#ffffff'
      }
    });
    return undefined;
  }, [value]);

  return (
    <div className="sp-donation-qr">
      <canvas ref={canvasRef} aria-label={`QR Code ${label}`} />
      <span>{label}</span>
    </div>
  );
}

function DonationPaymentSheet({ isOpen, onClose }) {
  const notify = useNotify();
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [anonymous, setAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cardPaid, setCardPaid] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const selectedAmount = customAmount
    ? Math.max(0, Number(customAmount.replace(',', '.')) || 0)
    : amount;

  const formattedAmount = `R$ ${selectedAmount.toFixed(2).replace('.', ',')}`;

  const handleConfirm = async () => {
    if (selectedAmount <= 0) {
      notify.error('Escolha um valor para doar.');
      return;
    }
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setProcessing(false);
    setCardPaid(true);
  };

  if (!isOpen) return null;

  return (
    <div className="sp-payment-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-payment-sheet">
        <div className="sp-payment-header">
          <button className="sp-payment-back" type="button" onClick={onClose} aria-label="Voltar">
            <ChevronRight size={22} className="sp-payment-back-icon" />
          </button>
          <h2>Apoie o Bom de Voto</h2>
          <button className="share-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        <div className="sp-payment-body nv-scroll">
          {cardPaid ? (
            <div className="sp-payment-success">
              <div className="sp-payment-success__icon">
                <Check size={34} strokeWidth={3} />
              </div>
              <strong>Obrigado pelo seu apoio!</strong>
              <span>
                Sua doação de {formattedAmount} foi registrada{anonymous ? ' de forma anônima' : ''} (simulação — os
                dados de pagamento ainda são fictícios).
              </span>
              <button className="sp-payment-done" type="button" onClick={onClose}>
                Concluir
              </button>
            </div>
          ) : (
            <>
              <div className="sp-payment-section">
                <span className="sp-payment-label">1. Escolha o valor</span>
                <div className="sp-amount-grid">
                  {DONATION_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`sp-amount-chip ${!customAmount && amount === value ? 'is-active' : ''}`}
                      onClick={() => {
                        setAmount(value);
                        setCustomAmount('');
                      }}
                    >
                      R$ {value}
                    </button>
                  ))}
                </div>
                <input
                  className="sp-amount-input"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  placeholder="Outro valor"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </div>

              <div className="sp-payment-section">
                <span className="sp-payment-label">2. Forma de pagamento</span>
                <div className="sp-payment-methods">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`sp-payment-method ${paymentMethod === method.id ? 'is-active' : ''}`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <span className="sp-payment-method__radio" aria-hidden="true" />
                      <span className="sp-payment-method__text">
                        <strong>{method.label}</strong>
                        <small>{method.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <label className={`sp-anonymous-toggle ${anonymous ? 'is-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <span className="sp-anonymous-toggle__icon" aria-hidden="true">
                  {anonymous ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
                <span className="sp-anonymous-toggle__text">
                  <strong>Doação anônima</strong>
                  <small>Não exibir seu nome na lista de apoiadores</small>
                </span>
              </label>

              {paymentMethod === 'pix' && selectedAmount > 0 && (
                <div className="sp-payment-pix">
                  <DonationQRCode
                    value={`00020126580014BR.GOV.BCB.PIX0136${DONATION_DATA.pixKey}52040000530398654${selectedAmount.toFixed(2).replace('.', '').padStart(10, '0')}5802BR5911BOM DE VOTO6009SAO PAULO`}
                    label={`QR Code PIX — ${formattedAmount}`}
                  />
                  <div className="sp-payment-pix__info">
                    <span>Pague com qualquer banco usando o QR Code ou a chave:</span>
                    <strong>{DONATION_DATA.pixKey}</strong>
                    <small>Os dados exibidos são fictícios.</small>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal' && (
                <a className="sp-payment-paypal" href={DONATION_DATA.paypalUrl} target="_blank" rel="noopener noreferrer">
                  <strong>Doar {formattedAmount} com PayPal</strong>
                  <span>Você será redirecionado para a página do PayPal (simulação).</span>
                </a>
              )}

              {paymentMethod === 'card' && (
                <div className="sp-payment-card">
                  <span className="sp-payment-label">Dados do cartão (fictícios)</span>
                  <div className="sp-card-fields">
                    <input className="sp-card-input" type="text" inputMode="numeric" placeholder="Número do cartão" maxLength="19" />
                    <input className="sp-card-input" type="text" placeholder="Nome impresso" />
                    <div className="sp-card-row">
                      <input className="sp-card-input" type="text" inputMode="numeric" placeholder="MM/AA" maxLength="5" />
                      <input className="sp-card-input" type="text" inputMode="numeric" placeholder="CVV" maxLength="4" />
                    </div>
                  </div>
                </div>
              )}

              <button className="sp-payment-submit" type="button" disabled={processing || selectedAmount <= 0} onClick={handleConfirm}>
                {processing ? 'Processando...' : `Doar ${formattedAmount}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DonationCard({ onOpenPayment }) {
  return (
    <div className="sp-support-card">
      <div className="sp-support-card__head">
        <div className="sp-support-card__icon" aria-hidden="true">
          <Heart size={22} strokeWidth={2.4} />
        </div>
        <div className="sp-support-card__text">
          <strong>Apoie o Bom de Voto</strong>
          <span>Doações e apoios mantêm o app gratuito para todos</span>
        </div>
      </div>
      <div className="sp-support-card__actions">
        <button className="sp-support-btn" type="button" onClick={onOpenPayment}>
          <Heart size={18} /> Apoiar agora
        </button>
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
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [status, setStatus] = useState('');

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

  const handleInvite = async () => {
    setStatus('');
    try {
      const text = `${INVITE_MESSAGE} ${shareData?.url || APP_SHARE_URL}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Bom de Voto',
          text,
          url: shareData?.url || APP_SHARE_URL
        });
        setStatus('Convite enviado com sucesso.');
        notify.success('Convite enviado com sucesso.');
        return;
      }

      await navigator.clipboard.writeText(text);
      setStatus('Mensagem de convite copiada!');
      notify.success('Mensagem de convite copiada!');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      const errorMsg = error?.message || 'Não foi possível enviar o convite.';
      setStatus(errorMsg);
      notify.error(errorMsg);
    }
  };

  if (!shareData) return null;

  const modalRender = isOpen ? (
    <div className="share-modal-overlay share-panel-wrapper" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="share-modal-sheet">
        <div className="share-modal-header">
          <h2>Compartilhar</h2>
          <button className="share-modal-close" onClick={handleClose} aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        <div className="share-modal-body nv-scroll">
          <div className="share-legal-notice">
            <p>O conteúdo compartilhado circula fora do Bom de Voto, sujeito às redes sociais onde for postado.</p>
            <div className="share-legal-links">
              <Link to="/aviso-eleitoral">Aviso Eleitoral</Link>
              <Link to="/politica-de-privacidade">Privacidade</Link>
            </div>
          </div>

          <div className="sp-action-list">
            <div className="sp-invite-card">
              <div className="sp-invite-card__head">
                <div className="sp-invite-card__icon" aria-hidden="true">
                  <Users size={22} strokeWidth={2.4} />
                </div>
                <div className="sp-invite-card__text">
                  <strong>Convidar novos eleitores ou amigos</strong>
                  <span>Ajude mais pessoas a montar seu plano de voto</span>
                </div>
              </div>
              <div className="sp-invite-card__actions">
                {status && <span className="share-actions-status">{status}</span>}
                <button className="sp-invite-btn" onClick={handleInvite}>
                  <Rocket size={18} /> Convidar
                </button>
              </div>
            </div>

            <DonationCard onOpenPayment={() => setIsPaymentOpen(true)} />
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
      {isOpen && (
        typeof document !== 'undefined'
          ? createPortal(
            <DonationPaymentSheet isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />,
            document.body
          )
          : <DonationPaymentSheet isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
      )}
    </>
  );
}
