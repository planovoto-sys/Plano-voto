import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LogIn, Save } from 'lucide-react';
import { BottomNavigationView } from '@/app/shell/BottomNavigation';
import { CANDIDATE_ROUTES } from '@/shared/constants/candidateRoutes';
import { SearchIcon } from '@/shared/icons/AppIcons';
import { normalizeSearch } from '@/shared/utils/search';
import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { BRAZILIAN_STATES } from '@/shared/constants/states';
import { useUser } from '@/shared/hooks/useUser';
import { authReady, signInWithGoogle, usesSupabaseAuth } from '@/shared/auth/authService';
import { fetchCandidatesByOffice } from '@/features/candidate-selection/candidateService';
import { fetchCandidatesByIds } from '@/features/ballot';
import CandidateCard from '@/features/candidate-selection/CandidateCard';
import AppHeader from '@/shared/ui/layout/AppHeader';
import {
  clearSharedSelectionReturn, eligibleSharedCandidates, getSharedCandidateOffice,
  isSharedSelectionId, rememberSharedSelectionReturn, SHARED_SELECTION_PREFIX,
  readSharedSelectionDraft, sharedSelectionAuthRedirectUrl, writeSharedSelectionDraft,
} from './sharedSelectionModel';
import { importSharedSelection, readImportContext, readSharedSelection, sharedSelectionError } from './sharedSelectionService';
import '@/features/candidate-selection/styles/candidate-card.css';
import './SharedSelection.css';

const STEPS = [
  { id: 'estado', navId: 'estado', title: 'Escolha seu estado' },
  { id: 'presidente', navId: 'presidente', title: CANDIDATE_ROUTES.presidente.titulo, office: 'Presidente', subtitle: CANDIDATE_ROUTES.presidente.subtitulo },
  { id: 'senadores', navId: 'senador', title: 'Senadores', office: 'Senador', subtitle: CANDIDATE_ROUTES.senadores.subtitulo },
  { id: 'deputado_federal', navId: 'deputado', title: 'Deputados Federais', office: 'Deputado Federal', subtitle: CANDIDATE_ROUTES.deputadoFederal.subtitulo },
];
const VALID_STEPS = new Set(STEPS.map((step) => step.id));
const offices = [['presidente', 'Presidente'], ['senadores', 'Senadores'], ['deputado_federal', 'Deputados federais']];
const candidateName = (candidate) => String(candidate?.nome || candidate?.name || '');
const sortCandidates = (items) => [...items].sort((a, b) => candidateName(a).localeCompare(candidateName(b), 'pt-BR'));

export default function SharedSelectionPage({ summary = false }) {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStep = searchParams.get('etapa') || 'estado';
  const currentStepId = summary ? 'resumo' : VALID_STEPS.has(requestedStep) ? requestedStep : 'estado';
  const currentStep = STEPS.find((step) => step.id === currentStepId) || null;
  const [load, setLoad] = useState({ key: '', shared: null, context: null, error: '' });
  const [candidateLoad, setCandidateLoad] = useState({ key: '', items: [], error: '' });
  const [summaryCandidates, setSummaryCandidates] = useState([]);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requiresReload, setRequiresReload] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState({ step: '', value: '', active: false });
  const searchRef = useRef(null);
  const summaryActionsRef = useRef(null);
  const searchValue = search.step === currentStepId ? search.value : '';
  const searchActive = search.step === currentStepId && search.active;
  const query = normalizeSearch(searchValue);
  const matchesSearch = (candidate) => !query || normalizeSearch(`${candidate.nome || ''} ${candidate.partido || ''} ${candidate.partido_sigla || ''} ${candidate.numero || ''}`).includes(query);
  const saving = useRef(false);
  const scrollContainer = useRef(null);
  const key = `${id}:${user?.uid || 'visitor'}:${retry}:${summary ? 'summary' : 'flow'}`;

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
        setConfirm(false); setMessage(''); setRequiresReload(false); setSaved(false);
        setLoad({ key, shared, context, error: '' });
      } catch (error) {
        if (!cancelled) setLoad({ key, shared: null, context: null, error: sharedSelectionError(error) });
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [id, user?.uid, key, summary]);

  const shared = load.key === key ? load.shared : null;
  const isLoading = load.key !== key;
  const eligibleShared = useMemo(() => eligibleSharedCandidates(shared?.candidates || [], state), [shared, state]);
  const reviewPath = `${SHARED_SELECTION_PREFIX}${id}`;
  const summaryPath = `${reviewPath}/resumo`;
  const stepPath = (stepId) => `${reviewPath}?etapa=${stepId}`;
  const persistLocal = (candidateIds = selectedIds) => writeSharedSelectionDraft({ id, revision: shared.revision, state, candidateIds });

  useEffect(() => {
    scrollContainer.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStepId]);

  useEffect(() => {
    if (!shared || !currentStep?.office || !state) return undefined;
    let cancelled = false;
    const candidateKey = `${currentStep.id}:${state}:${retry}`;
    const fetch = async () => {
      try {
        const items = await fetchCandidatesByOffice(currentStep.office, currentStep.id === 'presidente' ? null : state);
        if (!cancelled) setCandidateLoad({ key: candidateKey, items, error: '' });
      } catch {
        if (!cancelled) setCandidateLoad({ key: candidateKey, items: [], error: 'Não foi possível carregar os candidatos. Tente novamente.' });
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [currentStep?.id, currentStep?.office, retry, shared, state]);

  const candidateKey = currentStep?.office ? `${currentStep.id}:${state}:${retry}` : '';
  const allCandidates = useMemo(() => candidateLoad.key === candidateKey ? candidateLoad.items : [], [candidateKey, candidateLoad]);
  const candidatesById = useMemo(() => new Map(allCandidates.map((candidate) => [candidate.id, candidate])), [allCandidates]);
  const sharedForStep = useMemo(() => {
    if (!currentStep?.office) return [];
    return sortCandidates(eligibleShared
      .filter((candidate) => getSharedCandidateOffice(candidate) === currentStep.id)
      .map((candidate) => candidatesById.get(candidate.id) || candidate));
  }, [candidatesById, currentStep, eligibleShared]);
  const sharedIdsForStep = useMemo(() => new Set(sharedForStep.map((candidate) => candidate.id)), [sharedForStep]);
  const otherCandidates = useMemo(() => sortCandidates(allCandidates.filter((candidate) => !sharedIdsForStep.has(candidate.id))), [allCandidates, sharedIdsForStep]);

  useEffect(() => {
    if (!summary || !shared || !selectedIds.length) return undefined;
    let cancelled = false;
    fetchCandidatesByIds(selectedIds)
      .then((items) => { if (!cancelled) setSummaryCandidates(items); })
      .catch(() => { if (!cancelled) setSummaryCandidates([]); });
    return () => { cancelled = true; };
  }, [selectedIds, shared, summary]);

  const chosen = useMemo(() => {
    const available = new Map([
      ...(shared?.candidates || []).map((candidate) => [candidate.id, candidate]),
      ...allCandidates.map((candidate) => [candidate.id, candidate]),
      ...summaryCandidates.map((candidate) => [candidate.id, candidate]),
    ]);
    return selectedIds.map((candidateId) => available.get(candidateId)).filter(Boolean)
      .filter((candidate) => getSharedCandidateOffice(candidate) === 'presidente' || candidate.estado === state || candidate.uf === state);
  }, [allCandidates, selectedIds, shared, state, summaryCandidates]);

  const goToStep = (stepId) => {
    if (!shared || busy) return;
    if (selectedIds.length) persistLocal();
    navigate(stepPath(stepId));
  };
  const previewSummary = () => {
    if (!persistLocal()) { setMessage('Selecione pelo menos um candidato para continuar.'); return; }
    navigate(summaryPath);
  };
  const login = async () => {
    if (saving.current || !chosen.length) return;
    if (!persistLocal(chosen.map((candidate) => candidate.id)) || !rememberSharedSelectionReturn(summaryPath)) {
      setMessage('Não foi possível preservar suas escolhas para o login. Permita o armazenamento de sessão e tente novamente.'); return;
    }
    saving.current = true; setBusy(true); setMessage('');
    try { await signInWithGoogle({ redirectTo: sharedSelectionAuthRedirectUrl(window.location.origin) }); }
    catch { clearSharedSelectionReturn(); setMessage('Não foi possível entrar. Suas escolhas continuam neste dispositivo; tente novamente.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const toggle = (candidateId) => {
    setSelectedIds((current) => current.includes(candidateId) ? current.filter((value) => value !== candidateId) : [...current, candidateId]);
    setConfirm(false);
  };
  const apply = async () => {
    if (!user?.uid || !shared || !confirm || requiresReload || saving.current || !chosen.length) return;
    saving.current = true; setBusy(true); setMessage('');
    try {
      await importSharedSelection({ userId: user.uid, shared, state, candidateIds: chosen.map((candidate) => candidate.id), expectedUpdatedAt: load.context?.updated_at || null });
      setSaved(true); setConfirm(false); clearSharedSelectionReturn();
    } catch (error) { setMessage(sharedSelectionError(error)); setRequiresReload(true); setConfirm(false); }
    finally { saving.current = false; setBusy(false); }
  };

  const handleBack = () => {
    if (busy) return;
    if (confirm) { setConfirm(false); return; }
    if (summary) { navigate(stepPath('deputado_federal')); return; }
    const index = STEPS.findIndex((step) => step.id === currentStepId);
    if (index > 0) goToStep(STEPS[index - 1].id); else navigate('/');
  };
  const handleContinue = () => {
    if (summary) return;
    const index = STEPS.findIndex((step) => step.id === currentStepId);
    if (index < STEPS.length - 1) goToStep(STEPS[index + 1].id); else previewSummary();
  };
  const primaryAction = isLoading
    ? { label: 'Carregando', icon: ArrowRight, action: () => {}, disabled: true }
    : !shared || requiresReload
      ? { label: 'Tentar novamente', icon: ArrowRight, action: () => setRetry((n) => n + 1), disabled: busy }
      : !summary
        ? { label: currentStepId === 'deputado_federal' ? 'Ver resumo' : 'Avançar', icon: ArrowRight, action: handleContinue, disabled: busy }
        : !user
          ? { label: 'Entrar e salvar', icon: LogIn, action: login, disabled: busy || !authReady || !usesSupabaseAuth || !chosen.length }
          : saved
            ? { label: 'Continuar', icon: Check, action: () => navigate('/home'), disabled: false }
            : confirm
              ? { label: 'Confirmar', icon: Save, action: apply, disabled: busy || !chosen.length }
              : { label: 'Salvar escolhas', icon: Save, action: () => setConfirm(true), disabled: busy || !usesSupabaseAuth || !chosen.length };
  const PrimaryIcon = primaryAction.icon;

  const renderCandidateSection = (title, candidates, received = false) => candidates.length ? (
    <section className="selection-import__candidate-section" aria-label={title}>
      <div className="selection-import__section-heading"><h2>{title}</h2><span>{candidates.length}</span></div>
      <div className="selection-import__candidate-list">
        {candidates.map((candidate) => <div key={candidate.id} className={received ? 'selection-import__received-card' : ''}>
          {received && <span className="selection-import__received-label">Da seleção compartilhada</span>}
          <CandidateCard candidate={candidate} selected={selectedIds.includes(candidate.id)} onSelect={() => toggle(candidate.id)} disabled={busy || requiresReload} lockPersonalizedFields={!user} showNumberAbove />
        </div>)}
      </div>
    </section>
  ) : null;

  return (
    <div className="selection-import prototype-page nv-screen">
      <AppHeader
        variant="default"
        centeredBrand
        className="selection-import__header"
        onBack={handleBack}
        backLabel="Voltar"
        searchActive={searchActive}
        searchValue={searchValue}
        onSearchChange={(event) => setSearch({ step: currentStepId, active: true, value: event.target.value })}
        onSearchClose={() => setSearch({ step: currentStepId, active: false, value: '' })}
        searchRef={searchRef}
        searchPlaceholder="Pesquisar..."
        actions={<button type="button" className="app-header__icon-btn nv-touch" aria-label="Buscar" onClick={() => setSearch({ step: currentStepId, active: true, value: searchValue })}><SearchIcon /></button>}
      />
      <main ref={scrollContainer} className="selection-import__scroll prototype-scroll nv-scroll">
        <div className="selection-import__shell">
          {isLoading ? <p role="status">Carregando seleção...</p> : load.error ? <div role="alert" className="selection-import__notice">
            <p>{load.error}</p><button className="selection-primary" onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>
            {summary && <Link to={reviewPath}>Voltar à seleção compartilhada</Link>}<Link to="/">Abrir o Bom de Voto</Link>
          </div> : shared && <>
            <header className="selection-import__title">
              <span className="selection-import__eyebrow">Seleção compartilhada</span>
              <h1>{summary ? 'Resumo das suas escolhas' : currentStep.title}</h1>
              <p>{summary ? 'Confira os candidatos que você manteve ou acrescentou antes de salvar.' : currentStepId === 'estado' ? 'Confirme onde você vota para ver os candidatos disponíveis.' : currentStep.subtitle}</p>
            </header>

            {currentStepId === 'estado' && <>
              <div className="selection-import__notice"><p>Seleção de {shared.state} · versão {shared.revision} · publicada em {new Date(shared.published_at).toLocaleDateString('pt-BR')}</p><p>Esta é uma cópia independente. Você decide quais nomes manter e pode incluir outros candidatos.</p></div>
              <label className="selection-import__state-field">Seu estado<select value={state} disabled={busy} onChange={(event) => { setState(event.target.value); setConfirm(false); }}>
                {BRAZILIAN_STATES.filter((item) => item.sigla === state || !query || normalizeSearch(`${item.nome} ${item.sigla}`).includes(query)).map((item) => <option key={item.sigla} value={item.sigla}>{item.nome} ({item.sigla})</option>)}
              </select></label>
              {state !== shared.state && <p role="status">A lista recebida é de {shared.state}. Para {state}, somente os candidatos a Presidente serão mantidos; senadores e deputados serão exibidos conforme o novo estado.</p>}
            </>}

            {currentStep?.office && <>
              {candidateLoad.key !== candidateKey && <p role="status">Carregando candidatos...</p>}
              {candidateLoad.key === candidateKey && candidateLoad.error && <div className="selection-import__notice" role="alert"><p>{candidateLoad.error}</p></div>}
              {renderCandidateSection('Nomes recebidos', sharedForStep.filter(matchesSearch), true)}
              {renderCandidateSection('Outros candidatos', otherCandidates.filter(matchesSearch))}
              {candidateLoad.key === candidateKey && !sharedForStep.some(matchesSearch) && !otherCandidates.some(matchesSearch) && <p role="status">Nenhum candidato encontrado.</p>}
            </>}

            {summary && <>
              {!user && <div className="selection-import__notice"><p>Suas escolhas estão apenas neste dispositivo. Entre para salvá-las na sua conta.</p></div>}
              {offices.map(([office, title]) => {
                const candidates = chosen.filter((candidate) => getSharedCandidateOffice(candidate) === office && matchesSearch(candidate));
                return candidates.length ? <section key={office} className="selection-import__summary-section"><h2>{title} ({candidates.length})</h2>{candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected variant="summary" lockPersonalizedFields={!user} />)}</section> : null;
              })}
              {user && !usesSupabaseAuth && <p>O compartilhamento de seleções requer uma conta conectada ao Supabase.</p>}
              <div ref={summaryActionsRef} className="selection-import__summary-actions" tabIndex={-1}>
                <button className="selection-primary" type="button" onClick={primaryAction.action} disabled={primaryAction.disabled}><PrimaryIcon aria-hidden="true" size={20} />{busy ? 'Aguarde...' : primaryAction.label}</button>
              </div>
              {!busy && <Link className="selection-import__edit-link" to={stepPath('presidente')}>Editar minha seleção</Link>}
              {saved && <div className="selection-import__notice" role="status"><strong>Suas escolhas foram salvas na conta.</strong><Link to="/home">Continuar no aplicativo</Link></div>}
              {confirm && <section className="selection-import__confirmation" aria-label="Confirmar importação"><h2>Confirmar suas escolhas?</h2><p>Serão salvos {chosen.length} candidatos para {state}. {load.context ? 'Suas seleções anteriores serão substituídas, inclusive as de outros cargos.' : 'A seleção será salva na sua conta.'}</p>{load.context?.state && load.context.state !== state && <p>As escolhas salvas anteriormente são de {load.context.state}. Ao confirmar, o estado deste rascunho passará a ser {state}.</p>}<p>Alterações futuras do autor não modificarão sua cópia.</p><button className="selection-text-button" disabled={busy} onClick={() => setConfirm(false)}>Voltar à revisão</button></section>}
            </>}
            {message && <p role="alert">{message}</p>}
            <p className="selection-import__disclaimer">Abrir este link não registra seleções. Só a confirmação na sua conta atualiza as contagens. O app não realiza votação oficial.</p>
          </>}
        </div>
      </main>

      <BottomNavigationView
        activeStep={summary ? 'resultado' : currentStep.navId}
        allowAllSteps
        disabled={!shared || busy}
        continueDisabled={primaryAction.disabled}
        continueLabel={summary ? 'Revisar e salvar escolhas' : primaryAction.label}
        isFinalStep={summary}
        onNavigate={(step, isClickable) => {
          if (isClickable) goToStep(STEPS.find((item) => item.navId === step.id).id);
        }}
        onContinueClick={summary ? () => {
          summaryActionsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          summaryActionsRef.current?.focus({ preventScroll: true });
        } : primaryAction.action}
      />
    </div>
  );
}
