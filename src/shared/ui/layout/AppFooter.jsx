import { useEffect, useId, useState } from 'react';
import { Download, Share2, Smartphone, SquarePlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPwaInstallState,
  requestPwaInstall,
  subscribeToPwaInstallState
} from '@/pwa/installPrompt';
import './AppFooter.css';

export default function AppFooter({ className = '' }) {
  const currentYear = new Date().getFullYear();
  const instructionsTitleId = useId();
  const [installState, setInstallState] = useState(getPwaInstallState);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => subscribeToPwaInstallState(() => {
    setInstallState(getPwaInstallState());
  }), []);

  useEffect(() => {
    if (!instructionsOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setInstructionsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [instructionsOpen]);

  const handleInstall = async () => {
    if (installState.isIos) {
      setInstructionsOpen(true);
      return;
    }

    const result = await requestPwaInstall();
    if (result.outcome === 'unavailable' || result.outcome === 'error') {
      setInstructionsOpen(true);
    }
  };

  return (
    <>
      <footer className={`app-footer nv-no-overflow ${className}`.trim()}>
        <div className="app-footer__bar" />
        <div className="app-footer__inner">
          <div className="app-footer__brand">
            <strong>Bom de Voto</strong>
            <span>Voto consciente, simples e organizado.</span>
          </div>

          <div className="app-footer__links">
            <Link to="/sobre-nos">Sobre nós</Link>
            <Link to="/termos-de-uso">Termos & Aviso Eleitoral</Link>
            <Link to="/politica-de-privacidade">Privacidade e Dados</Link>
          </div>

          <div className="app-footer__actions">
            {!installState.installed && (
              <button className="app-footer__install nv-touch" type="button" onClick={handleInstall}>
                <Download aria-hidden="true" />
                <span>Instalar o app</span>
              </button>
            )}
            <div className="app-footer__contact">
              <a href="mailto:contato.bomdevoto@gmail.com">contato.bomdevoto@gmail.com</a>
            </div>
          </div>

          <div className="app-footer__copyright">
            <span>© {currentYear} Bom de Voto. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {instructionsOpen && (
        <div
          className="app-install-overlay"
          onMouseDown={(event) => event.target === event.currentTarget && setInstructionsOpen(false)}
        >
          <section className="app-install-dialog" role="dialog" aria-modal="true" aria-labelledby={instructionsTitleId}>
            <button
              className="app-install-dialog__close nv-touch"
              type="button"
              onClick={() => setInstructionsOpen(false)}
              aria-label="Fechar instruções de instalação"
            >
              <X aria-hidden="true" />
            </button>

            <div className="app-install-dialog__icon" aria-hidden="true">
              <Smartphone />
            </div>
            <h2 id={instructionsTitleId}>Instale o Bom de Voto</h2>
            <p>Adicione o app à tela inicial para abrir mais rápido e usar como aplicativo.</p>

            {installState.isIos ? (
              <>
                {!installState.isSafari && (
                  <div className="app-install-dialog__notice">
                    Primeiro, abra <strong>bomdevoto.com.br</strong> no Safari.
                  </div>
                )}
                <ol className="app-install-steps">
                  <li>
                    <span><Share2 aria-hidden="true" /></span>
                    <div><strong>Toque em Compartilhar</strong><small>Use o botão com uma seta apontando para cima.</small></div>
                  </li>
                  <li>
                    <span><SquarePlus aria-hidden="true" /></span>
                    <div><strong>Adicionar à Tela de Início</strong><small>Role a lista. Se não aparecer, abra “Editar Ações”.</small></div>
                  </li>
                  <li>
                    <span>3</span>
                    <div><strong>Ative “Abrir como App Web”</strong><small>Essa opção pode já estar ativada no seu iPhone.</small></div>
                  </li>
                  <li>
                    <span>4</span>
                    <div><strong>Toque em Adicionar</strong><small>O ícone aparecerá na sua tela inicial.</small></div>
                  </li>
                </ol>
              </>
            ) : (
              <ol className="app-install-steps">
                <li><span>1</span><div><strong>Abra o menu do navegador</strong><small>Toque no botão de três pontos.</small></div></li>
                <li><span>2</span><div><strong>Escolha “Instalar app”</strong><small>Em alguns navegadores aparece como “Adicionar à tela inicial”.</small></div></li>
                <li><span>3</span><div><strong>Confirme a instalação</strong><small>O Bom de Voto aparecerá junto aos seus aplicativos.</small></div></li>
              </ol>
            )}

            <button className="app-install-dialog__done nv-touch" type="button" onClick={() => setInstructionsOpen(false)}>
              Entendi
            </button>
          </section>
        </div>
      )}
    </>
  );
}
