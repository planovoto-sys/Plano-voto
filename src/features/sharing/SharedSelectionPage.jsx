import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { BRAZILIAN_STATES } from '@/shared/constants/states';
import { useUser } from '@/shared/hooks/useUser';
import { authReady, signInWithGoogle, usesSupabaseAuth } from '@/shared/auth/authService';
import LogoCompleta from '@/shared/ui/brand/LogoCompleta';
import {
  clearSharedSelectionReturn, eligibleSharedCandidates, getSharedCandidateOffice,
  isSharedSelectionId, rememberSharedSelectionReturn, SHARED_SELECTION_PREFIX,
  readSharedSelectionDraft, writeSharedSelectionDraft,
} from './sharedSelectionModel';
import { importSharedSelection, readImportContext, readSharedSelection, sharedSelectionError } from './sharedSelectionService';
import './SharedSelection.css';

const offices = [['presidente', 'Presidente'], ['senadores', 'Senadores'], ['deputado_federal', 'Deputados federais']];

export default function SharedSelectionPage({ summary = false }) {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [load, setLoad] = useState({ key: '', shared: null, context: null, error: '' });
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requiresReload, setRequiresReload] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const key = `${id}:${user?.uid || 'visitor'}:${retry}:${summary ? 'summary' : 'edit'}`;

  useEffect(() => {
    let cancelled = false;
    if (user?.uid) clearSharedSelectionReturn();
    const fetch = async () => {
      try {
        if (!isSharedSelectionId(id)) throw new Error('SHARE_UNAVAILABLE');
        const [shared, context] = await Promise.all([
          readSharedSelection(id), user?.uid && usesSupabaseAuth ? readImportContext(user.uid) : Promise.resolve(null),
        ]);
        if (!shared || shared.election_id !== ACTIVE_ELECTION_ID) throw new Error('SHARE_UNAVAILABLE');
        const local = readSharedSelectionDraft(id);
        if (summary && !local) throw new Error('LOCAL_DRAFT_MISSING');
        if (summary && local.revision !== shared.revision) throw new Error('SHARE_CHANGED');
        if (cancelled) return;
        setState(local?.state || context?.state || shared.state);
        setSelectedIds(local?.candidateIds || shared.candidates.map((candidate) => candidate.id));
        setConfirm(false); setMessage(''); setRequiresReload(false);
        setSaved(false);
        setLoad({ key, shared, context, error: '' });
      } catch (error) {
        if (!cancelled) setLoad({ key, shared: null, context: null, error: sharedSelectionError(error) });
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [id, user?.uid, key, summary]);

  const shared = load.key === key ? load.shared : null;
  const eligible = eligibleSharedCandidates(shared?.candidates || [], state);
  const chosen = eligible.filter((candidate) => selectedIds.includes(candidate.id));
  const reviewPath = `${SHARED_SELECTION_PREFIX}${id}`;
  const summaryPath = `${reviewPath}/resumo`;
  const persistLocal = () => writeSharedSelectionDraft({
    id, revision: shared.revision, state, candidateIds: chosen.map((candidate) => candidate.id),
  });
  const previewSummary = () => {
    if (!persistLocal()) {
      setMessage('Não foi possível manter o rascunho neste navegador. Permita o armazenamento de sessão e tente novamente.');
      return;
    }
    navigate(summaryPath);
  };
  const login = async () => {
    if (saving.current || !chosen.length) return;
    if (!persistLocal() || !rememberSharedSelectionReturn(summaryPath)) {
      setMessage('Não foi possível preservar suas escolhas para o login. Permita o armazenamento de sessão e tente novamente.');
      return;
    }
    saving.current = true; setBusy(true); setMessage('');
    try {
      await signInWithGoogle();
    } catch {
      setMessage('Não foi possível entrar. Suas escolhas continuam neste dispositivo; tente novamente.');
    } finally { saving.current = false; setBusy(false); }
  };
  const toggle = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setConfirm(false);
  };
  const apply = async () => {
    if (!user?.uid || !shared || !confirm || requiresReload || saving.current || !chosen.length) return;
    saving.current = true; setBusy(true); setMessage('');
    try {
      await importSharedSelection({ userId: user.uid, shared, state,
        candidateIds: chosen.map((candidate) => candidate.id), expectedUpdatedAt: load.context?.updated_at || null });
      setSaved(true); setConfirm(false); clearSharedSelectionReturn();
    } catch (error) {
      setMessage(sharedSelectionError(error)); setRequiresReload(true); setConfirm(false);
    } finally { saving.current = false; setBusy(false); }
  };

  return (
    <main className="selection-import nv-screen">
      <div className="selection-import__shell">
        <Link to="/" aria-label="Início do Bom de Voto"><LogoCompleta className="selection-import__logo" /></Link>
        <header><h1>{summary ? 'Resumo das suas escolhas' : 'Uma seleção para você conhecer'}</h1><p>{summary ? 'Confira os itens que você manteve. Este resumo reproduz suas escolhas, sem selecionar nomes por você.' : 'Revise a seleção compartilhada. Você pode ajustar a lista antes de entrar.'}</p></header>
        {load.key !== key ? <p role="status">Carregando seleção...</p> : load.error ? <div role="alert" className="selection-import__notice">
          <p>{load.error}</p><button className="selection-primary" onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>{summary && <Link to={reviewPath}>Voltar à seleção compartilhada</Link>}<Link to="/">Abrir o Bom de Voto</Link>
        </div> : shared && <>
          <div className="selection-import__notice">
            <p>Seleção de {shared.state} · versão {shared.revision} · publicada em {new Date(shared.published_at).toLocaleDateString('pt-BR')}</p>
            <p>Esta é uma cópia da lista compartilhada. Você decide quais itens manter na sua seleção.</p>
            {shared.candidates.length < shared.published_count && <p>Alguns candidatos publicados não estão mais disponíveis e não serão importados.</p>}
          </div>
          <label>Seu estado<select value={state} disabled={busy || summary} onChange={(event) => { setState(event.target.value); setConfirm(false); }}>
            {BRAZILIAN_STATES.map((item) => <option key={item.sigla} value={item.sigla}>{item.nome} ({item.sigla})</option>)}
          </select></label>
          {state !== shared.state && <p role="status">Esta seleção é de {shared.state}. Para {state}, apenas os candidatos a Presidente poderão ser aproveitados. Você escolherá senadores e deputados do seu estado depois.</p>}
          {!user && <div className="selection-import__notice"><p>{summary ? 'Suas escolhas estão apenas neste dispositivo. Entre para salvá-las na sua conta.' : 'Não é preciso fazer login agora. Ajuste a lista e avance para conferir o resumo.'}</p></div>}
          {offices.map(([office, title]) => {
            const candidates = (summary ? chosen : eligible).filter((candidate) => getSharedCandidateOffice(candidate) === office);
            return candidates.length ? <section key={office} aria-label={title}><h2>{title} ({candidates.length})</h2>
              {candidates.map((candidate) => <label key={candidate.id} className="selection-import__candidate">
                {!summary && <input type="checkbox" checked={selectedIds.includes(candidate.id)} onChange={() => toggle(candidate.id)} disabled={busy || requiresReload} />}
                <span><strong>{candidate.nome}</strong><small>{candidate.partido || 'Partido não informado'}{candidate.numero ? ` · ${candidate.numero}` : ''}</small></span>
              </label>)}
            </section> : null;
          })}
          {!eligible.length && <p>Nenhum candidato desta seleção está disponível para o estado escolhido.</p>}
          {user && !usesSupabaseAuth && <p>O compartilhamento de seleções requer uma conta conectada ao Supabase.</p>}
          {!summary && <button className="selection-primary" disabled={busy || requiresReload || !chosen.length} onClick={previewSummary}>Ver resumo das minhas escolhas ({chosen.length})</button>}
          {summary && !busy && <Link to={reviewPath}>Editar minha seleção</Link>}
          {summary && !user && <button className="selection-primary" disabled={busy || !authReady || !usesSupabaseAuth || requiresReload || !chosen.length} onClick={login}>{busy ? 'Abrindo login...' : 'Entrar com Google para salvar'}</button>}
          {summary && user && usesSupabaseAuth && !confirm && !saved && <button className="selection-primary" disabled={busy || requiresReload || !chosen.length} onClick={() => setConfirm(true)}>Salvar minhas escolhas</button>}
          {saved && <div className="selection-import__notice" role="status"><strong>Suas escolhas foram salvas na conta.</strong><Link to="/home">Continuar no aplicativo</Link></div>}
          {confirm && <section className="selection-import__confirmation" aria-label="Confirmar importação">
            <h2>Confirmar suas escolhas?</h2>
            <p>Serão salvos {chosen.length} candidatos para {state}. {load.context ? 'Suas seleções anteriores serão substituídas, inclusive as de outros cargos.' : 'A seleção será salva na sua conta.'}</p>
            {load.context?.state && load.context.state !== state && <p>As escolhas salvas anteriormente são de {load.context.state}. Ao confirmar, o estado deste rascunho passará a ser {state}.</p>}
            <p>Alterações futuras do autor não modificarão sua cópia.</p>
            <button className="selection-primary" disabled={busy} onClick={apply}>{busy ? 'Salvando...' : 'Confirmar e salvar na minha conta'}</button>
            <button className="selection-text-button" disabled={busy} onClick={() => setConfirm(false)}>Voltar à revisão</button>
          </section>}
          {message && <p role="alert">{message}</p>}
          {requiresReload && <button className="selection-primary" onClick={() => setRetry((n) => n + 1)}>Recarregar e revisar</button>}
          <p>Abrir este link não registra seleções. Só a confirmação na sua conta atualiza as contagens. O app não realiza votação oficial.</p>
        </>}
      </div>
    </main>
  );
}
