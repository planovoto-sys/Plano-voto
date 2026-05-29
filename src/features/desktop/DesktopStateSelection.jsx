import { Search } from 'lucide-react';
import DesktopActionBar from './DesktopActionBar';
import DesktopMobileHandoffPanel from './DesktopMobileHandoffPanel';
import DesktopPageIntro from './DesktopPageIntro';
import DesktopShell from './DesktopShell';
import { useDesktopHandoff } from './useDesktopHandoff';

export default function DesktopStateSelection({
  states,
  selectedState,
  searchValue,
  onSearchChange,
  onStateSelect,
  onContinue,
  loading,
  draft
}) {
  const handoff = useDesktopHandoff(draft);

  return (
    <DesktopShell
      currentStep="estado"
      onMobileCta={handoff.generate}
      mobileCtaLabel="Gerar QR"
    >
      <div className="desktop-state-layout desktop-container">
        <section className="desktop-flow-card desktop-state-panel">
          <DesktopPageIntro
            badge="Etapa 1"
            title="Escolha seu estado"
            limitText="Você está vendo uma prévia no computador. Para salvar e continuar depois, use o celular."
          >
            Selecione onde você vota para ver os candidatos disponíveis.
          </DesktopPageIntro>

          <label className="desktop-search">
            <span>Pesquisar estados</span>
            <Search aria-hidden="true" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Pesquisar estados"
            />
          </label>

          <DesktopActionBar>
            <button
              className="desktop-button-primary nv-touch"
              type="button"
              onClick={onContinue}
              disabled={!selectedState || loading}
            >
              Continuar com prévia
            </button>
            <span className="desktop-state-panel__hint">
              Para salvar seu plano, continue pelo celular.
            </span>
          </DesktopActionBar>

          <div className="desktop-state-grid" id="tour-lista">
            {states.length > 0 ? states.map((state) => {
              const isSelected = selectedState?.sigla === state.sigla;

              return (
                <button
                  key={state.sigla}
                  className={`desktop-state-card nv-touch ${isSelected ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => onStateSelect(state)}
                  disabled={loading}
                  aria-pressed={isSelected}
                >
                  <strong>{state.nome}</strong>
                  <span>{state.sigla}</span>
                </button>
              );
            }) : (
              <div className="desktop-empty-state">
                <strong>Nenhum estado encontrado</strong>
                <span>Tente buscar pelo nome ou pela sigla.</span>
              </div>
            )}
          </div>
        </section>

        <DesktopMobileHandoffPanel handoff={handoff} title="Comece aqui, continue no celular" />
      </div>
    </DesktopShell>
  );
}
