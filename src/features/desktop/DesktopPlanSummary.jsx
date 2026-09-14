import { ArrowLeft, Edit3 } from 'lucide-react';
import { BALLOT_ROUTES } from '@/shared/constants/ballot';
import { formatScore } from '@/shared/utils/candidateMetrics';
import CandidateCardDesktop from './CandidateCardDesktop';
import DesktopActionBar from './DesktopActionBar';
import DesktopMobileHandoffPanel from './DesktopMobileHandoffPanel';
import DesktopPageIntro from './DesktopPageIntro';
import DesktopShell from './DesktopShell';
import { useDesktopHandoff } from './useDesktopHandoff';

function SummaryTile({ label, value, caption }) {
  return (
    <article className="desktop-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  );
}

function ReviewSection({ title, actionLabel, onAction, candidates, emptyTitle, emptyCaption }) {
  return (
    <section className="desktop-review-section">
      <header>
        <h2>{title}</h2>
        <button className="desktop-button-secondary nv-touch" type="button" onClick={onAction}>
          <Edit3 aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      </header>

      <div className="desktop-review-section__list">
        {candidates.length > 0 ? candidates.map((candidate) => (
          <CandidateCardDesktop
            key={candidate.id}
            candidate={candidate}
            selected
            actionLabel="Editar"
            onSelect={onAction}
          />
        )) : (
          <div className="desktop-empty-state">
            <strong>{emptyTitle}</strong>
            <span>{emptyCaption}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function DesktopPlanSummary({
  draft,
  estadoSigla,
  estadoNome,
  averageScore,
  deputadosFederais,
  senadores,
  hasCompletePlan,
  onNavigate,
  onBack
}) {
  const handoff = useDesktopHandoff(draft);
  const scoreLabel = averageScore > 0 ? formatScore(averageScore) : '--';
  const missingText = !estadoSigla
    ? 'Escolha seu estado para iniciar o plano.'
    : (!deputadosFederais.length
        ? 'Escolha 1 deputado federal para continuar.'
        : (senadores.length < 2 ? `Escolha ${2 - senadores.length} senador${2 - senadores.length > 1 ? 'es' : ''} para liberar o QR Code.` : 'Seu plano está pronto para continuar no celular.'));

  return (
    <DesktopShell
      currentStep="resumo"
      onBack={onBack}
      onMobileCta={handoff.generate}
      mobileCtaLabel="Gerar QR"
    >
      <div className="desktop-summary-layout desktop-container">
        <section className="desktop-summary-main">
          <DesktopPageIntro
            badge="Revisão"
            title="Resumo"
            limitText="Use o computador para revisar. Salve, compartilhe e continue pelo celular."
          >
            Revise suas escolhas no computador e continue pelo celular para salvar e compartilhar.
          </DesktopPageIntro>

          <div className="desktop-summary-tiles" aria-label="Resumo do plano">
            <SummaryTile label="Estado" value={estadoSigla || '--'} caption={estadoSigla ? estadoNome : 'Troque ou escolha'} />
            <SummaryTile label="Nota média" value={scoreLabel} caption="Média do plano" />
          </div>

          <div className={`desktop-plan-status ${hasCompletePlan ? 'is-complete' : 'is-incomplete'}`}>
            <strong>{hasCompletePlan ? 'Seu plano está pronto para continuar no celular' : 'Seu plano ainda está incompleto'}</strong>
            <span>{missingText}</span>
          </div>

          <DesktopActionBar>
            <button className="desktop-button-secondary nv-touch" type="button" onClick={() => onNavigate(BALLOT_ROUTES.estado)}>
              Trocar estado
            </button>
            <button className="desktop-button-secondary nv-touch" type="button" onClick={() => onNavigate(BALLOT_ROUTES.deputadoFederal)}>
              Editar deputado
            </button>
            <button className="desktop-button-primary nv-touch" type="button" onClick={() => onNavigate(BALLOT_ROUTES.senadores)}>
              Escolher senadores
            </button>
            <button className="desktop-button-ghost nv-touch" type="button" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Voltar
            </button>
          </DesktopActionBar>

          <ReviewSection
            title="Deputado Federal"
            actionLabel={deputadosFederais.length ? 'Editar deputado' : 'Escolher deputado'}
            onAction={() => onNavigate(BALLOT_ROUTES.deputadoFederal)}
            candidates={deputadosFederais.slice(0, 1)}
            emptyTitle="Nenhum deputado escolhido"
            emptyCaption="Escolha um deputado para completar a revisão."
          />

          <ReviewSection
            title="Senadores"
            actionLabel={senadores.length ? 'Editar senadores' : 'Escolher senadores'}
            onAction={() => onNavigate(BALLOT_ROUTES.senadores)}
            candidates={senadores.slice(0, 2)}
            emptyTitle="Nenhum senador escolhido"
            emptyCaption="Escolha dois senadores para liberar o QR do rascunho."
          />
        </section>

        <DesktopMobileHandoffPanel handoff={handoff} title="Finalize pelo celular" />
      </div>
    </DesktopShell>
  );
}
