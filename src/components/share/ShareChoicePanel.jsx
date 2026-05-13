import { useMemo, useState } from 'react';
import { ClearIcon, CopyIcon, DownloadIcon, ShareIcon } from '@/components/icons/AppIcons';
import {
  copyShareText,
  createShareAnalysis,
  downloadShareImage,
  getShareChanceBand,
  getShareScoreBand,
  shareTemplate,
  SHARE_CARD_TEMPLATES
} from '@/services/share/shareCardService';
import './ShareChoicePanel.css';

const getBarStyle = (value) => ({ '--share-bar-value': `${value}%` });

function SharePreview({ templateId, analysis }) {
  if (templateId === 'placar') {
    return (
      <article className="share-preview-card share-preview-card--placar">
        <span className="share-preview-card__eyebrow">MEU PLACAR ELEITORAL</span>
        <h3>{analysis.estadoNome}</h3>
        <div className="share-score-list">
          <span>Deputado Federal <strong>Nota {analysis.deputadoScoreBand} · Viabilidade {analysis.deputadoChanceBand}</strong></span>
          <span>Senador 1 <strong>Nota {analysis.senatorOneScoreBand} · Viabilidade {analysis.senatorOneChanceBand}</strong></span>
          <span>Senador 2 <strong>Nota {analysis.senatorTwoScoreBand} · Viabilidade {analysis.senatorTwoChanceBand}</strong></span>
        </div>
        <p>Foco em viabilidade {analysis.chanceBand.toLowerCase()} e avaliação {analysis.scoreBand.toLowerCase()}.</p>
        <small>Candidatos ocultos</small>
      </article>
    );
  }

  if (templateId === 'blindado') {
    return (
      <article className="share-preview-card share-preview-card--blindado">
        <span className="share-preview-card__eyebrow">VOTO BLINDADO</span>
        <h3>Minha escolha não é palpite. É análise.</h3>
        <div className="share-check-list">
          <span>Deputado Federal escolhido</span>
          <span>2 Senadores escolhidos</span>
          <span>Critérios analisados</span>
          <span>Nomes protegidos</span>
        </div>
        <p>{analysis.estadoNome} · {analysis.year}</p>
      </article>
    );
  }

  if (templateId === 'termometro') {
    return (
      <article className="share-preview-card share-preview-card--termometro">
        <span className="share-preview-card__eyebrow">TERMÔMETRO DA MINHA ESCOLHA</span>
        <h3>{analysis.profile.title}</h3>
        <div className="share-meter-list">
          <span>Segurança eleitoral <i><b style={getBarStyle(analysis.termometer.security)}></b></i></span>
          <span>Avaliação técnica <i><b style={getBarStyle(analysis.termometer.technical)}></b></i></span>
          <span>Conclusão do fluxo <i><b style={getBarStyle(analysis.termometer.completion)}></b></i></span>
          <span>Privacidade <i><b style={getBarStyle(analysis.termometer.privacy)}></b></i></span>
        </div>
        <small>Candidatos ocultos</small>
      </article>
    );
  }

  return (
    <article className="share-preview-card share-preview-card--perfil">
      <span className="share-preview-card__eyebrow">MEU PERFIL POLÍTICO</span>
      <p>{analysis.estadoNome} · {analysis.year}</p>
      <h3>{analysis.profile.title}</h3>
      <span className="share-preview-card__summary">{analysis.profile.summary}</span>
      <div className="share-priority-list">
        {analysis.profile.priorities.map((priority, index) => (
          <span key={priority}>{index < 2 ? '↑' : '↓'} {priority}</span>
        ))}
      </div>
      <small>Deputado e senadores definidos · nomes ocultos</small>
    </article>
  );
}

export default function ShareChoicePanel({ shareData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateId, setTemplateId] = useState('perfil');
  const [status, setStatus] = useState('');
  const analysis = useMemo(() => {
    const baseAnalysis = createShareAnalysis(shareData);
    const getScoreBand = (candidate) => (candidate ? getShareScoreBand(candidate) : 'Pendente');
    const getChanceBand = (candidate) => (candidate ? getShareChanceBand(candidate) : 'Pendente');

    return {
      ...baseAnalysis,
      deputadoScoreBand: getScoreBand(baseAnalysis.deputado),
      deputadoChanceBand: getChanceBand(baseAnalysis.deputado),
      senatorOneScoreBand: getScoreBand(baseAnalysis.senadores[0]),
      senatorOneChanceBand: getChanceBand(baseAnalysis.senadores[0]),
      senatorTwoScoreBand: getScoreBand(baseAnalysis.senadores[1]),
      senatorTwoChanceBand: getChanceBand(baseAnalysis.senadores[1])
    };
  }, [shareData]);

  const activeTemplate = SHARE_CARD_TEMPLATES.find((template) => template.id === templateId) || SHARE_CARD_TEMPLATES[0];

  const runAction = async (action) => {
    setStatus('');
    try {
      const result = await action();
      setStatus(result === 'copied' ? 'Texto copiado para compartilhar.' : 'Pronto para compartilhar.');
    } catch (error) {
      setStatus(error?.message || 'Não foi possível concluir o compartilhamento.');
    }
  };

  if (!shareData) return null;

  return (
    <section className="share-choice-panel nv-no-overflow" aria-labelledby="share-choice-title">
      <div className="share-choice-panel__copy">
        <strong id="share-choice-title">Compartilhe sem revelar suas escolhas</strong>
        <span>Escolha um modelo com perfil, placar ou privacidade. Nenhum nome de candidato aparece.</span>
      </div>
      <button className="share-choice-panel__button nv-touch" type="button" onClick={() => setIsOpen(true)}>
        <ShareIcon />
        <span>Compartilhar</span>
      </button>

      {isOpen && (
        <div className="share-modal nv-no-overflow" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <div className="share-modal__content nv-no-overflow">
            <header className="share-modal__header">
              <div>
                <span>Escolha o que compartilhar</span>
                <h2 id="share-modal-title">{activeTemplate.label}</h2>
              </div>
              <button className="share-modal__close nv-touch" type="button" onClick={() => setIsOpen(false)} aria-label="Fechar">
                <ClearIcon />
              </button>
            </header>

            <div className="share-template-tabs" role="tablist" aria-label="Modelos de compartilhamento">
              {SHARE_CARD_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`nv-touch ${template.id === templateId ? 'is-active' : ''}`}
                  onClick={() => {
                    setTemplateId(template.id);
                    setStatus('');
                  }}
                >
                  {template.shortLabel}
                </button>
              ))}
            </div>

            <p className="share-template-description">{activeTemplate.description}</p>
            <SharePreview templateId={templateId} analysis={analysis} />

            <div className="share-modal__actions">
              <button className="nv-touch" type="button" onClick={() => runAction(() => shareTemplate(templateId, shareData))}>
                <ShareIcon />
                <span>Compartilhar</span>
              </button>
              <button className="nv-touch" type="button" onClick={() => runAction(() => copyShareText(templateId, shareData).then(() => 'copied'))}>
                <CopyIcon />
                <span>Copiar texto</span>
              </button>
              <button className="nv-touch" type="button" onClick={() => runAction(() => downloadShareImage(templateId, shareData).then(() => 'shared'))}>
                <DownloadIcon />
                <span>Imagem</span>
              </button>
            </div>

            {status && <p className="share-modal__status" role="status">{status}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
