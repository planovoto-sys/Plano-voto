import { useEffect, useRef, useState } from 'react';
import { QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { APP_SHARE_URL } from './shareCardService';
import { sharedSelectionMessage, sharedSelectionUrl } from './sharedSelectionModel';
import { disableSharedSelection, getMySharedSelection, publishSharedSelection, sharedSelectionError } from './sharedSelectionService';
import './SharedSelection.css';

export default function PublishSelectionCard({ shareData = null }) {
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState({ link: '', url: '' });
  const operation = useRef(false);
  const link = publication?.active ? sharedSelectionUrl(publication.id, APP_SHARE_URL) : '';
  const qrPayload = link ? `${link}${link.includes('?') ? '&' : '?'}rev=${publication?.revision ?? Date.now()}` : '';
  const qrKey = publication?.id && publication?.revision ? `${publication.id}:${publication.revision}` : link;
  const qrUrl = qr.link === qrKey ? qr.url : '';
  const mergePublication = (current, next) => {
    if (!next || typeof next !== 'object') return current;
    const merged = { ...(current || {}), ...next };
    if (!merged.id && current?.id) merged.id = current.id;
    if (!merged.state && current?.state) merged.state = current.state;
    if (merged.active === undefined && current?.active !== undefined) merged.active = current.active;
    return merged;
  };

  useEffect(() => {
    let cancelled = false;
    getMySharedSelection().then((data) => {
      if (!cancelled) { setPublication((current) => mergePublication(current, data)); setLoadError(false); }
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry, shareData]);

  useEffect(() => {
    if (!link) { setQr({ link: '', url: '' }); return undefined; }
    let cancelled = false;
    const nextKey = `${publication.id}:${publication.revision}`;
    setQr((current) => current.link === nextKey ? current : { link: nextKey, url: '' });
    QRCode.toDataURL(qrPayload, { width: 512, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#123d2b', light: '#ffffff' } })
      .then((url) => { if (!cancelled) setQr({ link: nextKey, url }); })
      .catch(() => { if (!cancelled) setMessage('O QR Code não carregou. Você ainda pode compartilhar o link.'); });
    return () => { cancelled = true; };
  }, [link, qrPayload, publication?.id, publication?.revision]);

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
        setQr({ link: '', url: '' });
        setMessage('Link desativado. As cópias já recebidas continuam com seus amigos.');
      }
      setConfirmation(null);
    } catch (error) { setMessage(sharedSelectionError(error)); }
    finally { operation.current = false; setBusy(false); }
  };

  const share = async () => {
    if (operation.current) return;
    if (!link) { setConfirmation('publish'); setMessage(''); return; }
    if (!navigator.share) {
      setMessage('Use os links abaixo para enviar sua seleção.');
      return;
    }
    operation.current = true; setBusy(true); setMessage('');
    try {
      const payload = {
        title: 'Minha seleção — Bom de Voto',
        text: sharedSelectionMessage(link),
        url: link,
      };
      if (qrUrl && typeof fetch === 'function') {
        try {
          const blob = await fetch(qrUrl).then((response) => response.blob());
          payload.files = [new File([blob], 'bomdevoto-minha-selecao.png', { type: 'image/png' })];
        } catch {
          // A imagem do QR é opcional; o link e a mensagem continuam válidos.
        }
      }
      await navigator.share(payload);
    } catch (error) {
      if (error.name !== 'AbortError') { setMessage('Escolha abaixo como enviar sua seleção.'); }
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
      </>}
      {message && <p className="published-selection__status" role="status">{message}</p>}
    </section>
  );
}
