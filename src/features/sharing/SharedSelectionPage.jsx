import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ACTIVE_ELECTION_ID, BALLOT_ROUTES } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import { usesSupabaseAuth } from '@/shared/auth/authService';
import LoginPage from '@/features/auth/LoginPage';
import {
  clearVoteReceipt, draftHasBallotSelections, getDraftActiveCandidateIds,
  normalizeDraft, persistBallotDraft,
} from '@/features/ballot';
import {
  invalidateCandidateTalliesCache, invalidateStateChoiceCountsCache,
} from '@/features/candidate-selection/candidateService';
import AppHeader from '@/shared/ui/layout/AppHeader';
import LoadingScreen from '@/shared/ui/feedback/LoadingScreen';
import ConfirmModal from '@/shared/ui/feedback/ConfirmModal';
import {
  clearSharedSelectionDraft, clearSharedSelectionReturn, clearSharedSelectionSource,
  isSharedSelectionId, readSharedSelectionSource, SHARED_SELECTION_PREFIX,
  writeSharedSelectionSource,
} from './sharedSelectionModel';
import { importSharedSelection, readImportContext, readSharedSelection, sharedSelectionError } from './sharedSelectionService';
import './SharedSelection.css';

// O link é somente uma porta de entrada. Após importar, todas as telas
// e os salvamentos por etapa são os mesmos do aplicativo normal.
function SharedSelectionEntry({ id, userId, onRetry }) {
  const navigate = useNavigate();
  const [load, setLoad] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const fetch = async () => {
      try {
        const [shared, context] = await Promise.all([readSharedSelection(id), readImportContext(userId)]);
        if (cancelled) return;
        if (!shared || shared.election_id !== ACTIVE_ELECTION_ID) throw new Error('SHARE_UNAVAILABLE');
        if (!shared.candidates?.length) throw new Error('CANDIDATES_CHANGED');
        const draft = normalizeDraft({ ...context?.selections, estado: context?.state }, context?.state);
        const source = readSharedSelectionSource(userId, ACTIVE_ELECTION_ID);
        // Reabrir o mesmo QR não reaplica a lista sobre as edições já realizadas.
        if (context && source?.id === id && source.revision === shared.revision) {
          persistBallotDraft(userId, draft);
          clearSharedSelectionReturn();
          navigate(BALLOT_ROUTES.estado, { replace: true, state: { bypassVoteRedirect: true } });
          return;
        }
        setLoad({ shared, context, draft, needsConfirmation: draftHasBallotSelections(draft) });
      } catch (cause) {
        if (!cancelled) setError(sharedSelectionError(cause));
      }
    };
    void fetch();
    return () => { cancelled = true; active.current = false; };
  }, [id, userId, navigate]);

  const apply = useCallback(async () => {
    if (!load || saving.current) return;
    saving.current = true;
    setBusy(true);
    const previousSource = readSharedSelectionSource(userId, ACTIVE_ELECTION_ID);
    const { shared, context, draft } = load;
    const nextSource = {
      userId, electionId: ACTIVE_ELECTION_ID, id: shared.id, revision: shared.revision,
      state: shared.state, candidateIds: shared.candidates.map((candidate) => candidate.id),
    };
    // Verifica armazenamento ANTES de mudar a conta. Salvamentos posteriores
    // do rascunho editável nunca reescrevem esta referência.
    if (!writeSharedSelectionSource({ ...nextSource, applied: false })) {
      setError('Permita o armazenamento de sessão para preservar a referência da seleção e tente novamente.');
      setBusy(false); saving.current = false;
      return;
    }
    try {
      await importSharedSelection({
        userId, shared, state: shared.state,
        candidateIds: shared.candidates.map((candidate) => candidate.id),
        expectedUpdatedAt: context?.updated_at || null,
      });
      if (!active.current) return;
      if (!writeSharedSelectionSource(nextSource)) throw new Error('SOURCE_STORAGE_FAILED');
      clearVoteReceipt(userId);
      invalidateCandidateTalliesCache([...getDraftActiveCandidateIds(draft), ...shared.candidates.map((candidate) => candidate.id)], { estado: context?.state });
      invalidateCandidateTalliesCache(shared.candidates.map((candidate) => candidate.id), { estado: shared.state });
      invalidateStateChoiceCountsCache([context?.state, shared.state].filter(Boolean));
      clearSharedSelectionReturn();
      clearSharedSelectionDraft();
      if (active.current) navigate(BALLOT_ROUTES.estado, { replace: true, state: { bypassVoteRedirect: true } });
    } catch (cause) {
      if (active.current) {
        if (previousSource) writeSharedSelectionSource(previousSource); else clearSharedSelectionSource();
        setError(sharedSelectionError(cause));
      }
    } finally {
      saving.current = false;
      if (active.current) setBusy(false);
    }
  }, [load, userId, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (load && !load.needsConfirmation && !error) {
      queueMicrotask(() => { if (!cancelled) void apply(); });
    }
    return () => { cancelled = true; };
  }, [load, error, apply]);

  const keepMyChoices = () => {
    if (saving.current) return;
    if (load?.context && !error) persistBallotDraft(userId, load.draft);
    clearSharedSelectionReturn();
    navigate(error ? '/' : BALLOT_ROUTES.estado, { replace: true, state: { bypassVoteRedirect: true } });
  };

  if (!error && (!load || busy || !load.needsConfirmation)) return <LoadingScreen />;

  return (
    <div className="selection-import prototype-page nv-screen">
      <AppHeader variant="default" onBack={keepMyChoices} />
      <main className="selection-import__scroll prototype-scroll nv-scroll">
        <div className="selection-import__shell">
          <span className="selection-import__eyebrow">Seleção compartilhada</span>
          {error && <div className="selection-import__notice" role="alert">
            <p>{error}</p>
            <button type="button" className="selection-primary" onClick={onRetry}>Tentar novamente</button>
            <button type="button" className="selection-text-button" onClick={keepMyChoices}>Manter minhas escolhas</button>
          </div>}
        </div>
      </main>
      <ConfirmModal
        isOpen={Boolean(load?.needsConfirmation && !error)}
        titulo="USAR SELEÇÃO COMPARTILHADA?"
        mensagem={`Sua conta já tem escolhas salvas${load?.context?.state ? ` em ${load.context.state}` : ''}. Deseja substituí-las pela seleção recebida de ${load?.shared.state}? Depois, você poderá desmarcar ou acrescentar candidatos nas telas do app. A lista original continuará guardada como referência nesta sessão.`}
        textoConfirmar="USAR SELEÇÃO"
        textoCancelar="MANTER AS MINHAS"
        onConfirm={apply}
        onCancel={keepMyChoices}
      />
    </div>
  );
}

export default function SharedSelectionPage() {
  const { id } = useParams();
  const { user, loading } = useUser();
  const [retry, setRetry] = useState(0);
  if (loading) return <LoadingScreen />;
  if (!isSharedSelectionId(id) || !usesSupabaseAuth) return (
    <div className="selection-import prototype-page nv-screen">
      <AppHeader variant="default" />
      <main className="selection-import__scroll prototype-scroll nv-scroll">
        <div className="selection-import__notice" role="alert">
          <p>{!isSharedSelectionId(id) ? 'Link de seleção inválido.' : 'O compartilhamento requer uma conta conectada ao Supabase.'}</p>
          <Link to="/">Abrir o Bom de Voto</Link>
        </div>
      </main>
    </div>
  );
  if (!user?.uid) return <LoginPage sharedSelectionPath={`${SHARED_SELECTION_PREFIX}${id}`} />;
  return <SharedSelectionEntry key={`${id}:${user.uid}:${retry}`} id={id} userId={user.uid} onRetry={() => setRetry((value) => value + 1)} />;
}
