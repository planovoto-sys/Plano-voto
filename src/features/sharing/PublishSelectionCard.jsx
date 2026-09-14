import { useEffect, useRef, useState } from 'react';
import { Copy, Download, MessageCircle, QrCode, RefreshCw, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { APP_SHARE_URL } from './shareCardService';
import { sharedSelectionMessage, sharedSelectionUrl } from './sharedSelectionModel';
import { disableSharedSelection, getMySharedSelection, publishSharedSelection, sharedSelectionError } from './sharedSelectionService';
import './SharedSelection.css';

export default function PublishSelectionCard() {
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState({ link: '', url: '' });
  const operation = useRef(false);
  const link = publication?.active ? sharedSelectionUrl(publication.id, APP_SHARE_URL) : '';
  const qrUrl = qr.link === link ? qr.url : '';

  useEffect(() => {
    let cancelled = false;
    getMySharedSelection().then((data) => {
      if (!cancelled) { setPublication(data); setLoadError(false); }
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => {
    if (!link) return undefined;
    let cancelled = false;
    QRCode.toDataURL(link, { width: 512, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#123d2b', light: '#ffffff' } })
      .then((url) => { if (!cancelled) setQr({ link, url }); })
      .catch(() => { if (!cancelled) setMessage('O QR Code não carregou. Você ainda pode compartilhar o link.'); });
    return () => { cancelled = true; };
  }, [link]);

  const run = async (action) => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setMessage('');
    try {
      if (action === 'publish') {
        setPublication(await publishSharedSelection());
        setMessage('Sua seleção está pronta para compartilhar.');
      } else {
        await disableSharedSelection();
        setPublication((current) => current ? { ...current, active: false } : null);
        setQr({ link: '', url: '' }); setOptionsOpen(false);
        setMessage('Link desativado. As cópias já recebidas continuam com seus amigos.');
      }
      setConfirmation(null);
    } catch (error) { setMessage(sharedSelectionError(error)); }
    finally { operation.current = false; setBusy(false); }
  };

  const share = async () => {
    if (operation.current) return;
    if (!link) { setConfirmation('publish'); setMessage(''); return; }
    setOptionsOpen(true);
    if (!navigator.share) return;
    operation.current = true; setBusy(true); setMessage('');
    try {
      await navigator.share({ title: 'Minha seleção — Bom de Voto', text: 'Veja minha seleção no Bom de Voto. Você pode revisar os candidatos antes de usar.', url: link });
    } catch (error) {
      if (error.name !== 'AbortError') { setOptionsOpen(true); setMessage('Escolha abaixo como enviar sua seleção.'); }
    } finally { operation.current = false; setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMessage('Link da seleção copiado.'); }
    catch { setMessage('Selecione e copie o link no campo abaixo.'); }
  };

  return (
    <section className="sp-action-card sp-action-card--invite published-selection">
      <div className="sp-action-card__head">
        <div className="sp-action-card__icon" aria-hidden="true"><Share2 size={24} strokeWidth={1.8} /></div>
        <div className="sp-action-card__text"><h3>Compartilhar minha seleção</h3><p>Compartilhe seus candidatos</p></div>
      </div>
      {loading ? <div className="published-selection__loading" role="status">Preparando sua seleção…</div> : loadError ? (
        <div className="published-selection__confirmation">
          <p role="alert">Não foi possível carregar seu link.</p>
          <button type="button" className="sp-action-card__btn sp-action-card__btn--invite" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Tentar novamente</button>
        </div>
      ) : confirmation ? (
        <div className="published-selection__confirmation">
          <p>{confirmation === 'disable'
            ? 'Desativar este link? As cópias que seus amigos já receberam serão mantidas.'
            : link ? 'Atualizar o link com todos os candidatos que você tem salvos agora?'
              : 'Quem receber o link poderá ver e usar sua seleção. Seu nome e e-mail não serão publicados.'}</p>
          <button type="button" className="sp-action-card__btn sp-action-card__btn--invite" disabled={busy} onClick={() => run(confirmation === 'disable' ? 'disable' : 'publish')}>
            {busy ? 'Aguarde…' : confirmation === 'disable' ? 'Desativar link' : link ? 'Atualizar seleção' : 'Criar link da seleção'}
          </button>
          <button type="button" className="published-selection__subtle" disabled={busy} onClick={() => { setConfirmation(null); setMessage(''); }}>Cancelar</button>
        </div>
      ) : <>
        {link && <div className="published-selection__preview">
          {qrUrl ? <img src={qrUrl} width="144" height="144" alt="QR Code da sua seleção no Bom de Voto" />
            : <div className="published-selection__qr-placeholder" aria-hidden="true"><QrCode size={38} /></div>}
          <span>{publication.count} candidatos · {publication.state}</span>
        </div>}
        <button type="button" className="sp-action-card__btn sp-action-card__btn--invite" disabled={busy} onClick={share}><Share2 size={19} /> {busy ? 'Aguarde…' : 'Compartilhar'}</button>
        {link && <>
          <a className="published-selection__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(sharedSelectionMessage(link))}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} aria-hidden="true" /> WhatsApp</a>
          <div className="published-selection__options" hidden={!optionsOpen}>
            <div className="selection-actions">
              <button type="button" onClick={copy}><Copy size={17} /> Copiar link</button>
              {qrUrl && <a href={qrUrl} download="bomdevoto-minha-selecao.png"><Download size={17} /> Baixar QR Code</a>}
            </div>
            <label>Link da seleção<input readOnly value={link} onFocus={event => event.target.select()} /></label>
            <p>Mudou seus candidatos? Atualize a seleção antes de enviar.</p>
            <button type="button" className="published-selection__manage" disabled={busy} onClick={() => setConfirmation('publish')}><RefreshCw size={16} /> Atualizar seleção</button>
            <button type="button" className="published-selection__subtle" disabled={busy} onClick={() => setConfirmation('disable')}>Desativar link</button>
            <button type="button" className="published-selection__subtle" onClick={() => setOptionsOpen(false)}>Fechar</button>
          </div>
        </>}
      </>}
      {message && <p className="published-selection__status" role="status">{message}</p>}
    </section>
  );
}
