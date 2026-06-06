import { Filter, Search } from 'lucide-react';
import { STATE_NAMES } from '@/shared/constants/states';
import { getCandidateName } from '@/shared/utils/candidateMetrics';
import CandidateCardDesktop from './CandidateCardDesktop';
import DesktopActionBar from './DesktopActionBar';
import DesktopMobileHandoffPanel from './DesktopMobileHandoffPanel';
import DesktopPageIntro from './DesktopPageIntro';
import DesktopShell from './DesktopShell';
import { useDesktopHandoff } from './useDesktopHandoff';

const getOfficeCopy = (variant) => (
  variant === 'office-senado'
    ? {
        step: 'senador',
        badge: 'Etapa 3',
        title: 'Escolha seus senadores',
        subtitle: 'Selecione dois nomes para completar seu plano.',
        required: 2,
        sidebarTitle: 'Senadores',
        missing: (count) => `Faltam ${Math.max(0, 2 - count)} senadores para completar.`
      }
    : {
        step: 'deputado',
        badge: 'Etapa 2',
        title: 'Escolha seu deputado federal',
        subtitle: 'Selecione um nome para seguir com a prévia do seu plano.',
        required: 1,
        sidebarTitle: 'Deputado Federal',
        missing: (count) => (count > 0 ? 'Deputado selecionado.' : 'Falta escolher 1 deputado federal.')
      }
);

function DesktopPlanSidebar({ draftStateLabel, selectedCandidates, officeCopy, onReview }) {
  const selectedCount = selectedCandidates.length;

  return (
    <aside className="desktop-plan-sidebar">
      <span className="desktop-plan-sidebar__eyebrow">Meu plano</span>
      <h2>Rascunho atual</h2>

      <div className="desktop-plan-sidebar__item">
        <span>Estado</span>
        <strong>{draftStateLabel || 'Escolha seu estado'}</strong>
      </div>

      <div className="desktop-plan-sidebar__item">
        <span>{officeCopy.sidebarTitle}</span>
        <strong>{selectedCount > 0 ? `${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}` : 'Nenhum escolhido'}</strong>
      </div>

      <div className="desktop-plan-sidebar__selected">
        {selectedCandidates.length > 0 ? selectedCandidates.map((candidate) => (
          <span key={candidate.id}>{getCandidateName(candidate)}</span>
        )) : (
          <span>Use a lista ao lado para montar a prévia.</span>
        )}
      </div>

      <p>{officeCopy.missing(selectedCount)}</p>
      <button className="desktop-button-secondary nv-touch" type="button" onClick={onReview}>
        Ver nossovoto
      </button>
    </aside>
  );
}

export default function DesktopCandidateSelection({
  variant,
  candidates,
  selectedCandidates,
  featuredCandidateId,
  searchValue,
  onSearchChange,
  filterItems,
  activeFilterId,
  onFilterSelect,
  onCandidateSelect,
  onContinue,
  onBack,
  onReview,
  loading,
  draft,
  draftStateLabel,
  personalizedFieldsLocked
}) {
  const officeCopy = getOfficeCopy(variant);
  const handoff = useDesktopHandoff(draft);
  const visibleCandidates = candidates.slice(0, 18);
  const hasMoreCandidates = candidates.length > visibleCandidates.length;
  const stateName = draft?.estado ? STATE_NAMES[draft.estado] || draft.estado : '';

  return (
    <DesktopShell
      currentStep={officeCopy.step}
      onBack={onBack}
      onMobileCta={handoff.generate}
      mobileCtaLabel="Gerar QR"
    >
      <div className="desktop-candidates-layout desktop-container">
        <DesktopPlanSidebar
          draftStateLabel={draftStateLabel || (stateName ? `${stateName} (${draft.estado})` : '')}
          selectedCandidates={selectedCandidates}
          officeCopy={officeCopy}
          onReview={onReview}
        />

        <section className="desktop-candidate-list-panel">
          <DesktopPageIntro
            badge={officeCopy.badge}
            title={officeCopy.title}
            limitText="Você está vendo uma prévia no computador. Detalhes completos ficam disponíveis no celular."
          >
            {officeCopy.subtitle}
          </DesktopPageIntro>

          <DesktopActionBar>
            {selectedCandidates.length > 0 && (
              <button className="desktop-button-primary nv-touch" type="button" onClick={onContinue} disabled={loading}>
                Continuar
              </button>
            )}
            <button className="desktop-button-secondary nv-touch" type="button" onClick={() => onFilterSelect({ id: 'selecionados', mode: 'selecionados' })}>
              Ver selecionados
            </button>
            <button className="desktop-button-ghost nv-touch" type="button" onClick={onBack}>
              Voltar
            </button>
          </DesktopActionBar>

          <div className="desktop-candidate-toolbar">
            <label className="desktop-candidate-search">
              <span>Pesquisar candidatos ou partidos</span>
              <Search aria-hidden="true" />
              <input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Pesquisar candidatos ou partidos"
              />
            </label>

            <div className="desktop-candidate-filters" aria-label="Filtros de candidatos">
              <Filter aria-hidden="true" />
              {filterItems.map((item) => (
                <button
                  key={item.id}
                  className={`desktop-candidate-filter nv-touch ${item.id === activeFilterId || item.mode === activeFilterId ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => onFilterSelect(item)}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="desktop-candidate-results" id="tour-lista">
            {visibleCandidates.length > 0 ? visibleCandidates.map((candidate) => {
              const selected = selectedCandidates.some((item) => item.id === candidate.id);
              const featured = candidate.id === featuredCandidateId || candidate.isChanceFeatured;

              return (
                <CandidateCardDesktop
                  key={candidate.id}
                  candidate={candidate}
                  selected={selected}
                  featured={featured}
                  locked={personalizedFieldsLocked}
                  disabled={loading}
                  actionLabel={selected ? 'Remover' : 'Escolher'}
                  onSelect={() => onCandidateSelect(candidate)}
                />
              );
            }) : (
              <div className="desktop-empty-state">
                <strong>Nenhum candidato encontrado</strong>
                <span>Tente buscar por nome, partido ou número.</span>
              </div>
            )}
          </div>

          {hasMoreCandidates && (
            <div className="desktop-candidate-more">
              <span>Mostrando 18 de {candidates.length} candidatos para manter a prévia leve.</span>
              <span>No celular, a navegação completa fica mais simples.</span>
            </div>
          )}
        </section>

        <DesktopMobileHandoffPanel handoff={handoff} title="A seleção completa é no celular" />
      </div>
    </DesktopShell>
  );
}
