import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import QRCode from 'qrcode';
import { BALLOT_ROUTES } from '@/constants/ballot';
import { STATE_NAMES } from '@/constants/states';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/services/firebase/firebase';
import {
  fetchRemoteBallotDraft,
  getBallotProgress,
  readBallotDraft
} from '@/services/voting/votingService';
import ShareChoicePanel from '@/components/share/ShareChoicePanel';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import AppFooter from '@/components/layout/AppFooter';
import { BackIcon } from '@/components/icons/AppIcons';
import {
  formatScore,
  getCandidateChance,
  getCandidateName,
  getCandidateParty,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';
import './MeuPlano.css';

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getAverageChance = (candidates) => average(candidates.map((candidate) => getCandidateChance(candidate)));

const getAverageScore = (candidates) => (
  average(candidates.map((candidate) => getCandidateSystemScore(candidate)).filter((score) => score > 0))
);

const getPlanUrl = () => {
  if (typeof window === 'undefined') return 'https://nossovoto.org/meu-plano';
  return `${window.location.origin}${BALLOT_ROUTES.meuPlano}`;
};

function MetricThermometer({ title, value, displayValue, caption }) {
  const progress = clampPercent(value);

  return (
    <article className="my-plan-meter" style={{ '--my-plan-meter-value': progress }}>
      <span className="my-plan-meter__gauge" aria-hidden="true">
        <strong>{displayValue}</strong>
      </span>
      <div>
        <h3>{title}</h3>
        <p>{caption}</p>
      </div>
    </article>
  );
}

function CandidateSummaryCard({ candidate, fallbackTitle, onEdit }) {
  if (!candidate) {
    return (
      <article className="my-plan-candidate my-plan-candidate--empty">
        <div>
          <strong>{fallbackTitle}</strong>
          <span>Pendente</span>
        </div>
        <button type="button" onClick={onEdit}>Escolher</button>
      </article>
    );
  }

  const name = getCandidateName(candidate);
  const party = getCandidateParty(candidate);
  const score = getCandidateSystemScore(candidate);
  const chance = getCandidateChance(candidate);

  return (
    <article className="my-plan-candidate">
      <div className="my-plan-candidate__identity">
        <strong>{name || fallbackTitle}</strong>
        <span>{party || 'Partido não informado'}</span>
      </div>
      <dl className="my-plan-candidate__metrics">
        <div>
          <dt>Nota</dt>
          <dd>{score > 0 ? formatScore(score) : '--'}</dd>
        </div>
        <div>
          <dt>Viabilidade</dt>
          <dd>{chance}%</dd>
        </div>
      </dl>
    </article>
  );
}

function OfficeViabilityRow({ label, candidates, route, onEdit }) {
  const averageChance = getAverageChance(candidates);
  const completed = candidates.length > 0;

  return (
    <article className="my-plan-office-row">
      <div>
        <span>{label}</span>
        <strong>{completed ? `${Math.round(averageChance)}%` : 'Pendente'}</strong>
      </div>
      <button type="button" onClick={() => onEdit(route)}>
        Editar
      </button>
    </article>
  );
}

export default function MeuPlano() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const localDraft = user?.uid ? readBallotDraft(user.uid, userData?.estado) : null;
  const [remoteDraftState, setRemoteDraftState] = useState({ userId: null, draft: null, loading: false });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [planUrl] = useState(() => getPlanUrl());

  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;
    const fallbackDraft = readBallotDraft(user.uid, userData?.estado);

    queueMicrotask(() => {
      if (!cancelled) {
        setRemoteDraftState({ userId: user.uid, draft: null, loading: true });
      }
    });

    fetchRemoteBallotDraft(user.uid, fallbackDraft.estado || userData?.estado)
      .then((remoteDraft) => {
        if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: remoteDraft, loading: false });
      })
      .catch(() => {
        if (!cancelled) setRemoteDraftState({ userId: user.uid, draft: fallbackDraft, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, userData?.estado]);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(planUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff'
      }
    }).then((url) => {
      if (!cancelled) setQrCodeUrl(url);
    }).catch(() => {
      if (!cancelled) setQrCodeUrl('');
    });

    return () => {
      cancelled = true;
    };
  }, [planUrl]);

  const loadingDraft = remoteDraftState.userId === user?.uid && remoteDraftState.loading;
  const currentDraft = remoteDraftState.userId === user?.uid && remoteDraftState.draft
    ? remoteDraftState.draft
    : localDraft;
  const estadoSigla = currentDraft?.estado || userData?.estado || '';
  const estadoNome = estadoSigla ? STATE_NAMES[estadoSigla] || estadoSigla : 'Estado não selecionado';
  const deputadoFederal = currentDraft?.candidate_groups?.deputado_federal?.[0]
    || currentDraft?.selections?.deputado_federal?.[0]
    || null;
  const senadores = currentDraft?.candidate_groups?.senadores_1?.length
    ? currentDraft.candidate_groups.senadores_1
    : currentDraft?.selections?.senadores || [];
  const selectedCandidates = [deputadoFederal, ...senadores].filter(Boolean);
  const planProgress = currentDraft ? getBallotProgress(currentDraft) : null;
  const averageChance = getAverageChance(selectedCandidates);
  const averageScore = getAverageScore(selectedCandidates);
  const scoreMeterValue = averageScore * 10;
  const profileName = userData?.name || user?.displayName || 'Usuário';
  const profileEmail = userData?.email || user?.email || '';
  const profileImage = userData?.profile_image || user?.photoURL || '';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'N';
  const canSharePlan = Boolean(deputadoFederal && senadores.length >= 2 && estadoSigla);
  const shareData = canSharePlan ? {
    estadoSigla,
    estadoNome,
    deputado: deputadoFederal,
    senadores: senadores.slice(0, 2),
    url: planUrl
  } : null;

  const handleEdit = (route = BALLOT_ROUTES.deputadoFederal) => {
    navigate(route, { state: { bypassVoteRedirect: true } });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/', { replace: true });
  };

  if (userLoading || loadingDraft) {
    return <div className="loading nv-screen" role="status" aria-live="polite">CARREGANDO...</div>;
  }

  return (
    <div className="my-plan-page prototype-page nv-screen">
      <header className="my-plan-header">
        <button
          className="my-plan-header__back nv-touch"
          type="button"
          onClick={() => navigate(BALLOT_ROUTES.senadores, { state: { bypassVoteRedirect: true } })}
          aria-label="Voltar"
        >
          <BackIcon />
        </button>
        <div className="my-plan-header__brand">
          <strong>nossoVoto<span>.org</span></strong>
          <small>Meu plano</small>
        </div>
      </header>

      <main className="my-plan-scroll prototype-scroll nv-scroll">
        <div className="my-plan-shell">
          <section className="my-plan-hero" aria-label="Resumo do plano">
            <div className="my-plan-profile">
              {profileImage ? (
                <img src={profileImage} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden="true">{profileInitial}</span>
              )}
              <div>
                <strong>{profileName}</strong>
                {profileEmail && <small>{profileEmail}</small>}
              </div>
            </div>

            <div className="my-plan-state">
              <span>Estado escolhido</span>
              <strong>{estadoNome}{estadoSigla ? ` (${estadoSigla})` : ''}</strong>
            </div>
          </section>

          <section className="my-plan-meters" aria-label="Indicadores do plano">
            <MetricThermometer
              title="Viabilidade geral"
              value={averageChance}
              displayValue={`${Math.round(averageChance)}%`}
              caption="Indicador médio de viabilidade dos candidatos escolhidos."
            />
            <MetricThermometer
              title="Média das notas"
              value={scoreMeterValue}
              displayValue={averageScore > 0 ? formatScore(averageScore) : '--'}
              caption="Média das notas disponíveis no sistema."
            />
            <p className="my-plan-meters__note">
              Esses termômetros são indicadores neutros baseados nos dados disponíveis. Eles ajudam a revisar o plano, mas não são recomendação absoluta de voto.
            </p>
          </section>

          <section className="my-plan-section" aria-labelledby="my-plan-candidates-title">
            <div className="my-plan-section__heading">
              <h2 id="my-plan-candidates-title">Candidatos escolhidos</h2>
              <p>Revise os nomes salvos por cargo.</p>
            </div>

            <div className="my-plan-office">
              <h3>Deputado Federal</h3>
              <CandidateSummaryCard
                candidate={deputadoFederal}
                fallbackTitle="Deputado Federal"
                onEdit={() => handleEdit(BALLOT_ROUTES.deputadoFederal)}
              />
            </div>

            <div className="my-plan-office">
              <h3>Senadores</h3>
              <div className="my-plan-senators">
                {[0, 1].map((index) => (
                  <CandidateSummaryCard
                    key={senadores[index]?.id || `senador-${index}`}
                    candidate={senadores[index]}
                    fallbackTitle={`Senador ${index + 1}`}
                    onEdit={() => handleEdit(BALLOT_ROUTES.senadores)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="my-plan-section" aria-labelledby="my-plan-summary-title">
            <div className="my-plan-section__heading">
              <h2 id="my-plan-summary-title">Resumo por cargo</h2>
              <p>Média de viabilidade dos cargos selecionados.</p>
            </div>
            <div className="my-plan-office-summary">
              <OfficeViabilityRow
                label="Deputado Federal"
                candidates={deputadoFederal ? [deputadoFederal] : []}
                route={BALLOT_ROUTES.deputadoFederal}
                onEdit={handleEdit}
              />
              <OfficeViabilityRow
                label="Senadores"
                candidates={senadores}
                route={BALLOT_ROUTES.senadores}
                onEdit={handleEdit}
              />
            </div>
          </section>

          <section className="my-plan-actions" aria-label="Ações do plano">
            {shareData ? (
              <ShareChoicePanel shareData={shareData} className="my-plan-share-panel" />
            ) : (
              <div className="my-plan-share-disabled">
                <strong>Compartilhar plano</strong>
                <span>Complete deputado federal e dois senadores para liberar o compartilhamento.</span>
              </div>
            )}

            <button className="my-plan-edit-action nv-touch" type="button" onClick={() => handleEdit(planProgress?.hasDeputadoFederal ? BALLOT_ROUTES.senadores : BALLOT_ROUTES.deputadoFederal)}>
              Editar escolhas
            </button>
          </section>

          <aside className="my-plan-qr" aria-label="Continuar no celular">
            <div>
              <strong>Continuar no celular</strong>
              <span>Escaneie para abrir seu plano neste aparelho.</span>
            </div>
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code para abrir Meu Plano" />}
          </aside>

          <button className="my-plan-logout nv-touch" type="button" onClick={handleLogout}>
            Sair da conta
          </button>

          <AppFooter className="app-footer--scroll-content" />
        </div>
      </main>

      <BottomNavigation currentStep="nossovoto" placement="footer" />
    </div>
  );
}
