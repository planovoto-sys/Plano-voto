import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Link2, Send, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { APP_SHARE_URL } from './shareCardService';
import { sharedSelectionMessage, sharedSelectionUrl } from './sharedSelectionModel';
import { disableSharedSelection, getMySharedSelection, publishSharedSelection, sharedSelectionError } from './sharedSelectionService';
import './SharedSelection.css';

export default function PublishSelectionCard() {
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState({ url: '', file: null });
  const operation = useRef(false);
  const link = publication?.active ? sharedSelectionUrl(publication.id, APP_SHARE_URL) : '';

  useEffect(() => {
    let cancelled = false;
    getMySharedSelection().then((data) => { if (!cancelled) setPublication(data); })
      .catch(() => { if (!cancelled) setMessage('Não foi possível consultar sua publicação. Tente publicar novamente.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!link) return undefined;
    let cancelled = false;
    QRCode.toDataURL(link, { width: 640, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#111811', light: '#ffffff' } })
      .then((url) => {
        const bytes = Uint8Array.from(atob(url.split(',')[1]), (char) => char.charCodeAt(0));
        if (!cancelled) setQr({ url, file: new File([bytes], 'bomdevoto-minha-selecao.png', { type: 'image/png' }) });
      }).catch(() => { if (!cancelled) setMessage('O link está pronto. Não foi possível gerar o QR Code neste navegador.'); });
    return () => { cancelled = true; };
  }, [link]);

  const run = async (action) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setMessage('');
    try {
      if (action === 'publish') {
        if (!consent) return;
        setPublication(await publishSharedSelection());
        setConsent(false);
        setMessage('Seleção publicada. O link inclui todos os candidatos salvos, não só o resumo.');
      } else {
        await disableSharedSelection();
        setPublication((current) => current ? { ...current, active: false } : null);
        setQr({ url: '', file: null });
        setMessage('Link desativado. As cópias que outras pessoas já importaram não são apagadas.');
      }
    } catch (error) { setMessage(sharedSelectionError(error)); }
    finally { operation.current = false; setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMessage('Link copiado.'); }
    catch { setMessage('Selecione e copie o link no campo abaixo.'); }
  };
  const shareImage = async () => {
    try { await navigator.share({ files: [qr.file], title: 'Minha seleção — Bom de Voto', text: sharedSelectionMessage(link) }); }
    catch (error) { if (error.name !== 'AbortError') setMessage('Use “Baixar QR Code” ou compartilhe o link pelo WhatsApp.'); }
  };

  return (
    <section className="sp-action-card sp-action-card--invite published-selection">
      <div className="sp-action-card__head">
        <div className="sp-action-card__icon" aria-hidden="true"><Share2 size={22} /></div>
        <div className="sp-action-card__text"><strong>Compartilhar minha seleção</strong><span>Deixe outras pessoas revisarem e usarem os candidatos que você selecionou.</span></div>
      </div>
      {loading ? <p role="status">Consultando sua publicação...</p> : <>
        {link && <div className="published-selection__preview">
          {qr.url && <img src={qr.url} width="220" height="220" alt="QR Code da sua seleção no Bom de Voto" />}
          <p>{publication.count} candidatos · {publication.state} · versão {publication.revision}</p>
          <label>Link da seleção<input readOnly value={link} onFocus={(event) => event.target.select()} /></label>
          <div className="selection-actions">
            <a href={`https://wa.me/?text=${encodeURIComponent(sharedSelectionMessage(link))}`} target="_blank" rel="noopener noreferrer"><Send size={17} /> WhatsApp</a>
            <button type="button" onClick={copy}><Copy size={17} /> Copiar link</button>
            {qr.url && <a href={qr.url} download="bomdevoto-minha-selecao.png"><Download size={17} /> Baixar QR Code</a>}
            {qr.file && navigator.canShare?.({ files: [qr.file] }) && <button type="button" onClick={shareImage}><Share2 size={17} /> Compartilhar QR Code</button>}
          </div>
          <p>Use o QR Code em vídeos e podcasts. Qualquer pessoa com o link poderá ver esta seleção.</p>
        </div>}
        <label className="selection-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} />
          Autorizo publicar todos os candidatos da minha seleção salva. Meu e-mail e os dados da conta não serão publicados.
        </label>
        <button type="button" className="sp-action-card__btn sp-action-card__btn--invite" disabled={!consent || busy} onClick={() => run('publish')}>
          <Link2 size={17} /> {busy ? 'Aguarde...' : link ? 'Atualizar seleção publicada' : 'Publicar minha seleção'}
        </button>
        {link && <button type="button" className="selection-text-button" disabled={busy} onClick={() => run('disable')}>Desativar link</button>}
      </>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
