import {
  formatScore,
  getCandidateChance,
  getCandidateName,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';

const APP_SHARE_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'https://nossovoto.org';
const SHARE_YEAR = '2026';
const SHARE_COLORS = {
  bg: '#fbfcfd',
  surface: '#ffffff',
  text: '#002a54',
  body: '#425166',
  muted: '#6d7887',
  line: 'rgba(0, 42, 84, 0.1)',
  rowLine: 'rgba(0, 42, 84, 0.08)',
  card: '#fffefb',
  cardDepth: '#fff6eb',
  cardText: '#002a54',
  cardMuted: 'rgba(0, 42, 84, 0.74)',
  cardLine: 'rgba(202, 132, 36, 0.24)',
  cardPanel: 'rgba(255, 255, 255, 0.78)',
  cardPanelStrong: 'rgba(255, 255, 255, 0.9)',
  cardTrack: 'rgba(70, 58, 42, 0.18)',
  orange: '#ff9800',
  orangeDark: '#bd6400',
  orangeSoft: '#fff4e0',
  success: '#72d552',
  successSoft: '#f1ffef',
  successLine: '#dcefd7',
  metricLine: '#f1dfd3'
};

export const SHARE_CARD_TEMPLATES = [
  {
    id: 'resumo',
    label: 'Plano pronto',
    shortLabel: 'Resumo',
    thumbnailTitle: 'Plano pronto',
    thumbnailSubtitle: 'Nomes ocultos',
    tag: 'Seguro',
    description: 'Nomes ocultos'
  },
  {
    id: 'completo',
    label: 'Candidatos escolhidos',
    shortLabel: 'Completo',
    thumbnailTitle: 'Candidatos escolhidos',
    thumbnailSubtitle: 'Mostra nomes',
    tag: 'Mostra nomes',
    description: 'Mostra nomes'
  },
  {
    id: 'termometro',
    label: 'Termômetros',
    shortLabel: 'Termômetros',
    thumbnailTitle: '33% viabilidade',
    thumbnailSubtitle: '7,61 média',
    tag: 'Visual',
    description: 'Viabilidade e média'
  },
  {
    id: 'checklist',
    label: 'Checklist',
    shortLabel: 'Checklist',
    thumbnailTitle: 'Estado ✓',
    thumbnailSubtitle: 'Deputado ✓ Senadores ✓',
    tag: 'Sem nomes',
    description: 'Sem nomes'
  }
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const average = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const hasCandidateScore = (candidate) => candidate?.temNotaCandidato !== false && candidate?.tem_nota_candidato !== false;

export const getShareScoreBand = (value) => {
  const score = typeof value === 'number' ? value : getCandidateSystemScore(value);

  if (score >= 8.5) return 'Excelente';
  if (score >= 7) return 'Boa';
  if (score > 0) return 'Atenção';
  return 'Sem nota';
};

export const getShareChanceBand = (value) => {
  const chance = typeof value === 'number' ? value : getCandidateChance(value);

  if (chance >= 70) return 'Alta';
  if (chance >= 35) return 'Média';
  if (chance > 0) return 'Baixa';
  return 'Baixa';
};

const getProfile = ({ averageScore, averageChance, renovationRatio, mandateRatio }) => {
  if (renovationRatio >= 0.67) {
    return {
      title: 'Renovador',
      summary: 'Você tende a abrir espaço para nomes fora da última legislatura.',
      priorities: ['Renovação política', 'Comparação por dados', 'Escolhas privadas']
    };
  }

  if (mandateRatio >= 0.67 && averageChance >= 50) {
    return {
      title: 'Conservador de mandato',
      summary: 'Você valorizou nomes já avaliados e com histórico conhecido.',
      priorities: ['Experiência recente', 'Boa avaliação', 'Menor incerteza']
    };
  }

  if (averageChance >= 70 && averageScore >= 7) {
    return {
      title: 'Estratégico',
      summary: 'Você combinou viabilidade real de eleição com avaliação positiva.',
      priorities: ['Mais viabilidade de eleição', 'Boa avaliação', 'Menor risco de desperdiçar voto']
    };
  }

  if (averageScore >= 8.2) {
    return {
      title: 'Técnico',
      summary: 'Você priorizou avaliação forte antes de olhar só para viabilidade.',
      priorities: ['Nota alta', 'Critério técnico', 'Comparação objetiva']
    };
  }

  if (averageChance >= 80) {
    return {
      title: 'Voto útil',
      summary: 'Você concentrou suas escolhas em nomes com viabilidade elevada.',
      priorities: ['Viabilidade alta', 'Decisão pragmática', 'Segurança eleitoral']
    };
  }

  if (averageChance < 35 && averageScore >= 7) {
    return {
      title: 'Ousado',
      summary: 'Você aceitou mais risco para defender candidatos bem avaliados.',
      priorities: ['Boa avaliação', 'Convicção', 'Menos foco em favoritismo']
    };
  }

  if (averageScore >= 7 && averageChance >= 35) {
    return {
      title: 'Equilibrado',
      summary: 'Você misturou avaliação e viabilidade sem depender de um único critério.',
      priorities: ['Equilíbrio', 'Boa avaliação', 'Viabilidade moderada']
    };
  }

  return {
    title: 'Independente',
    summary: 'Você montou uma estratégia própria, sem seguir apenas os favoritos.',
    priorities: ['Escolha própria', 'Análise comparativa', 'Privacidade']
  };
};

export const createShareAnalysis = (shareData) => {
  const deputado = shareData?.deputado || null;
  const senadores = shareData?.senadores || [];
  const selectedCandidates = [deputado, ...senadores].filter(Boolean);
  const scores = selectedCandidates.map((candidate) => getCandidateSystemScore(candidate)).filter((score) => score > 0);
  const chances = selectedCandidates.map((candidate) => getCandidateChance(candidate));
  const averageScore = average(scores);
  const averageChance = average(chances);
  const renovationRatio = selectedCandidates.length
    ? selectedCandidates.filter((candidate) => !hasCandidateScore(candidate)).length / selectedCandidates.length
    : 0;
  const mandateRatio = selectedCandidates.length
    ? selectedCandidates.filter((candidate) => hasCandidateScore(candidate) && getCandidateSystemScore(candidate) > 0).length / selectedCandidates.length
    : 0;
  const profile = getProfile({ averageScore, averageChance, renovationRatio, mandateRatio });
  const deputadoName = getCandidateName(deputado);
  const senatorNames = senadores.map((candidate) => getCandidateName(candidate)).filter(Boolean);

  return {
    estadoNome: shareData?.estadoNome || shareData?.estadoSigla || 'Brasil',
    estadoSigla: shareData?.estadoSigla || '',
    year: shareData?.year || SHARE_YEAR,
    url: shareData?.url || APP_SHARE_URL,
    userName: shareData?.userName || shareData?.profileName || '',
    deputado,
    deputadoName,
    senadores,
    senatorNames,
    selectedCandidates,
    completedCount: selectedCandidates.length,
    averageScore,
    averageChance,
    averageScoreLabel: averageScore > 0 ? formatScore(averageScore) : '--',
    averageChanceLabel: `${Math.round(clamp(averageChance))}%`,
    scoreBand: getShareScoreBand(averageScore),
    chanceBand: getShareChanceBand(averageChance),
    profile,
    termometer: {
      security: Math.round(clamp(averageChance)),
      technical: Math.round(clamp(averageScore * 10)),
      completion: Math.round(clamp((selectedCandidates.length / 3) * 100)),
      privacy: 100
    }
  };
};

const getTemplateLines = (templateId, analysis) => {
  const deputadoName = analysis.deputadoName || 'Deputado federal definido';
  const senatorOne = analysis.senatorNames[0] || 'Senador 1 definido';
  const senatorTwo = analysis.senatorNames[1] || 'Senador 2 definido';

  if (templateId === 'resumo') {
    return [
      'Resumo geral',
      'Tudo em um card',
      `${analysis.estadoNome} • ${analysis.year}`,
      `${analysis.averageScoreLabel} média de nota`,
      `${analysis.averageChanceLabel} viabilidade`,
      'Monte o seu também',
      'nossovoto.org'
    ];
  }

  if (templateId === 'completo') {
    return [
      'Candidatos escolhidos',
      `Estado: ${analysis.estadoNome}`,
      'Deputado Federal',
      deputadoName,
      'Senadores',
      senatorOne,
      senatorTwo,
      'Monte o seu também',
      'nossovoto.org'
    ];
  }

  if (templateId === 'termometro') {
    return [
      'Indicadores do plano',
      `${analysis.averageChanceLabel} Viabilidade geral`,
      `${analysis.averageScoreLabel} Média das notas`,
      'Indicadores de apoio para revisar o plano.',
      'Monte o seu também',
      'nossovoto.org'
    ];
  }

  return [
    'Checklist do plano',
    'Estado escolhido ✓',
    'Deputado federal escolhido ✓',
    'Senadores escolhidos ✓',
    'Rascunho revisado ✓',
    'Agora é revisar antes da decisão final.',
    'Monte o seu também',
    'nossovoto.org'
  ];
};

export const buildShareText = (templateId, shareData) => {
  const analysis = createShareAnalysis(shareData);
  return [
    ...getTemplateLines(templateId, analysis),
    '',
    analysis.url
  ].join('\n');
};

const wrapCanvasText = (context, text, maxWidth) => {
  const words = String(text).split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = testLine;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};

const drawTextBlock = (context, lines, options) => {
  let y = options.y;
  lines.forEach((line) => {
    context.font = line.font || options.font;
    context.fillStyle = line.color || options.color;
    context.textAlign = line.align || 'left';
    const wrappedLines = wrapCanvasText(context, line.text, options.maxWidth);
    wrappedLines.forEach((wrappedLine) => {
      context.fillText(wrappedLine, options.x, y);
      y += line.lineHeight || options.lineHeight;
    });
    y += line.after || 0;
  });
};

const drawRoundedRect = (context, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);

  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, safeRadius);
    return;
  }

  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
};

const drawInfoRows = (context, rows, x, y, width, options = {}) => {
  let currentY = y;
  const font = options.font || '800 38px "Plus Jakarta Sans", Arial, sans-serif';
  const lineHeight = options.lineHeight || 48;
  context.font = font;

  rows.forEach((row) => {
    const rowText = typeof row === 'string' ? row : row.text;
    const rowColor = typeof row === 'string' ? SHARE_COLORS.text : row.color || SHARE_COLORS.text;
    const rowFont = typeof row === 'string' ? font : row.font || font;
    context.font = rowFont;
    const wrappedLines = wrapCanvasText(context, rowText, width - 56);
    const rowHeight = Math.max(options.minHeight || 78, wrappedLines.length * lineHeight + 32);

    context.fillStyle = options.background || 'rgba(255, 255, 255, 0.82)';
    context.beginPath();
    drawRoundedRect(context, x, currentY, width, rowHeight, 22);
    context.fill();
    context.strokeStyle = options.border || SHARE_COLORS.rowLine;
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = rowColor;
    wrappedLines.forEach((line, index) => {
      context.fillText(line, x + 28, currentY + 44 + (index * lineHeight));
    });

    currentY += rowHeight + (options.gap || 18);
  });

  return currentY;
};

const getCanvasLocationLine = (analysis) => (
  analysis.estadoSigla ? `${analysis.estadoNome} — ${analysis.estadoSigla}` : `${analysis.estadoNome} — ${analysis.year}`
);

const drawCanvasPill = (context, text, x, y, options = {}) => {
  const height = options.height || 46;
  const paddingX = options.paddingX || 24;
  context.font = options.font || '800 22px "Plus Jakarta Sans", Arial, sans-serif';
  const width = options.width || Math.ceil(context.measureText(text).width + paddingX * 2);

  context.fillStyle = options.background || SHARE_COLORS.orangeSoft;
  context.beginPath();
  drawRoundedRect(context, x, y, width, height, height / 2);
  context.fill();

  if (options.border) {
    context.strokeStyle = options.border;
    context.lineWidth = 2;
    context.stroke();
  }

  const previousAlign = context.textAlign;
  const previousBaseline = context.textBaseline;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = options.color || SHARE_COLORS.orangeDark;
  context.fillText(text, x + width / 2, y + height / 2);
  context.textAlign = previousAlign;
  context.textBaseline = previousBaseline;

  return width;
};

const drawCanvasVisualItem = (context, x, y, width, height, label, value, progress = null) => {
  context.fillStyle = 'rgba(255, 255, 255, 0.62)';
  context.beginPath();
  drawRoundedRect(context, x, y, width, height, 24);
  context.fill();
  context.strokeStyle = 'rgba(202, 132, 36, 0.14)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = SHARE_COLORS.orangeDark;
  context.font = '800 21px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(label.toUpperCase(), x + 28, y + 42);
  context.fillStyle = SHARE_COLORS.cardText;
  context.font = '800 34px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(value, x + 28, y + 88);

  if (progress !== null) {
    drawProgressBar(context, x + 28, y + height - 34, width - 56, progress, 10);
  }
};

const drawCanvasVisualPanel = (context, templateId, analysis, x, y, width, height) => {
  context.fillStyle = SHARE_COLORS.cardPanelStrong;
  context.beginPath();
  drawRoundedRect(context, x, y, width, height, 34);
  context.fill();
  context.strokeStyle = 'rgba(202, 132, 36, 0.18)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = SHARE_COLORS.orange;
  context.beginPath();
  drawRoundedRect(context, x, y + 34, 8, height - 68, 4);
  context.fill();

  if (templateId === 'completo') {
    const tileWidth = (width - 108) / 2;
    drawCanvasVisualItem(context, x + 42, y + 42, tileWidth, height - 84, 'Deputado', '1 definido');
    drawCanvasVisualItem(context, x + 66 + tileWidth, y + 42, tileWidth, height - 84, 'Senadores', '2 definidos');
    return;
  }

  if (templateId === 'termometro') {
    const tileWidth = (width - 108) / 2;
    drawCanvasVisualItem(context, x + 42, y + 42, tileWidth, height - 84, 'Nota', analysis.scoreBand, analysis.averageScore * 10);
    drawCanvasVisualItem(context, x + 66 + tileWidth, y + 42, tileWidth, height - 84, 'Viabilidade', analysis.chanceBand, analysis.averageChance);
    return;
  }

  if (templateId === 'checklist') {
    const circleSize = 104;
    const gap = 36;
    const startX = x + (width - (circleSize * 3 + gap * 2)) / 2;
    [1, 2, 3].forEach((step, index) => {
      const circleX = startX + index * (circleSize + gap);
      context.fillStyle = 'rgba(255, 255, 255, 0.68)';
      context.beginPath();
      context.arc(circleX + circleSize / 2, y + height / 2, circleSize / 2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(202, 132, 36, 0.18)';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = SHARE_COLORS.orange;
      context.font = '800 40px "Plus Jakarta Sans", Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(step).padStart(2, '0'), circleX + circleSize / 2, y + height / 2);
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
    });
    return;
  }

  const profileTitle = analysis.profile?.title || 'Plano pronto';
  context.fillStyle = SHARE_COLORS.orangeDark;
  context.font = '800 22px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('PERFIL DO PLANO', x + 42, y + 58);
  context.fillStyle = SHARE_COLORS.cardText;
  context.font = '800 52px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(profileTitle, x + 42, y + 116);
  context.fillStyle = SHARE_COLORS.cardMuted;
  context.font = '700 27px Inter, Arial, sans-serif';
  wrapCanvasText(analysis.profile?.summary || 'Plano montado para revisar antes da decisão.', width - 84)
    .slice(0, 2)
    .forEach((line, index) => {
      context.fillText(line, x + 42, y + 158 + index * 34);
    });
  drawCanvasPill(context, `${Math.min(analysis.completedCount, 3)}/3 escolhas`, x + width - 260, y + 40, {
    width: 198,
    height: 44,
    font: '800 22px "Plus Jakarta Sans", Arial, sans-serif',
    border: 'rgba(202, 132, 36, 0.16)'
  });
};

const drawCanvasCardBase = (context, width, height, analysis) => {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, SHARE_COLORS.card);
  background.addColorStop(1, SHARE_COLORS.cardDepth);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = SHARE_COLORS.orange;
  context.fillRect(0, 0, width, 10);

  const shade = context.createLinearGradient(0, height * 0.52, 0, height);
  shade.addColorStop(0, 'rgba(255, 248, 239, 0)');
  shade.addColorStop(1, 'rgba(255, 241, 216, 0.66)');
  context.fillStyle = shade;
  context.fillRect(0, height * 0.52, width, height * 0.48);

  context.fillStyle = SHARE_COLORS.orange;
  context.font = '800 32px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('NOSSOVOTO.ORG', 112, 128);
  context.fillStyle = SHARE_COLORS.cardMuted;
  context.font = '700 34px Inter, Arial, sans-serif';
  context.fillText(getCanvasLocationLine(analysis), 112, 180);
  drawCanvasPill(context, analysis.year, width - 238, 96, {
    width: 126,
    height: 48,
    font: '800 22px "Plus Jakarta Sans", Arial, sans-serif',
    border: 'rgba(202, 132, 36, 0.18)'
  });
};

const drawProgressBar = (context, x, y, width, percent, height = 18) => {
  const progress = clamp(percent);
  const radius = height / 2;
  context.fillStyle = SHARE_COLORS.cardTrack;
  context.beginPath();
  drawRoundedRect(context, x, y, width, height, radius);
  context.fill();
  context.fillStyle = SHARE_COLORS.orange;
  context.beginPath();
  drawRoundedRect(context, x, y, Math.max(height, width * (progress / 100)), height, radius);
  context.fill();
};

const drawCanvasStat = (context, x, y, width, label, value, percent) => {
  context.fillStyle = SHARE_COLORS.cardPanel;
  context.beginPath();
  drawRoundedRect(context, x, y, width, 184, 28);
  context.fill();
  context.strokeStyle = SHARE_COLORS.cardLine;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = SHARE_COLORS.orange;
  context.font = '800 76px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(value, x + 28, y + 82);
  context.fillStyle = SHARE_COLORS.cardMuted;
  context.font = '800 22px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(label, x + 30, y + 124);
  drawProgressBar(context, x + 30, y + 146, width - 60, percent, 14);
};

const drawCanvasTitle = (context, title, caption, y, contentX, contentWidth) => {
  drawTextBlock(context, [
    { text: title, font: '800 80px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.cardText, lineHeight: 84 }
  ], { x: contentX, y, maxWidth: contentWidth, font: '800 80px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.cardText, lineHeight: 84 });
  context.fillStyle = SHARE_COLORS.cardMuted;
  context.font = '700 38px Inter, Arial, sans-serif';
  context.fillText(caption, contentX, y + 112);
};

const drawShareCanvas = (templateId, analysis, canvas) => {
  const context = canvas.getContext('2d');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const contentX = 112;
  const contentWidth = 856;
  const rowOptions = {
    background: SHARE_COLORS.cardPanel,
    border: SHARE_COLORS.cardLine,
    gap: 16,
    minHeight: 82,
    font: '800 34px "Plus Jakarta Sans", Arial, sans-serif',
    lineHeight: 42
  };

  drawCanvasCardBase(context, width, height, analysis);
  drawCanvasVisualPanel(context, templateId, analysis, contentX, 262, contentWidth, 228);

  if (templateId === 'resumo') {
    drawCanvasTitle(context, 'Resumo geral', 'Tudo em um card', 624, contentX, contentWidth);
    const statWidth = (contentWidth - 28) / 2;
    drawCanvasStat(context, contentX, 916, statWidth, 'MÉDIA DE NOTA', analysis.averageScoreLabel, analysis.averageScore * 10);
    drawCanvasStat(context, contentX + statWidth + 28, 916, statWidth, 'VIABILIDADE', analysis.averageChanceLabel, analysis.averageChance);
  } else if (templateId === 'completo') {
    const senatorOne = analysis.senatorNames[0] || 'Senador 1 definido';
    const senatorTwo = analysis.senatorNames[1] || 'Senador 2 definido';
    drawCanvasTitle(context, 'Candidatos escolhidos', 'Com nomes no card', 566, contentX, contentWidth);
    drawInfoRows(context, [
      { text: `Deputado Federal: ${analysis.deputadoName || 'Deputado federal definido'}`, color: SHARE_COLORS.cardText },
      { text: `Senador: ${senatorOne}`, color: SHARE_COLORS.cardText },
      { text: `Senador: ${senatorTwo}`, color: SHARE_COLORS.cardText }
    ], contentX, 770, contentWidth, rowOptions);
  } else if (templateId === 'termometro') {
    drawCanvasTitle(context, 'Indicadores do plano', 'Nota e viabilidade', 594, contentX, contentWidth);
    drawCanvasStat(context, contentX, 846, 405, 'MÉDIA DE NOTA', analysis.averageScoreLabel, analysis.averageScore * 10);
    drawCanvasStat(context, contentX + 451, 846, 405, 'VIABILIDADE', analysis.averageChanceLabel, analysis.averageChance);
  } else {
    drawCanvasTitle(context, 'Checklist do plano', 'Sem nomes de candidatos', 566, contentX, contentWidth);
    drawInfoRows(context, [
      { text: '✓ Estado escolhido', color: SHARE_COLORS.cardText },
      { text: '✓ Deputado federal definido', color: SHARE_COLORS.cardText },
      { text: '✓ Dois senadores definidos', color: SHARE_COLORS.cardText },
      { text: '✓ Plano pronto para revisar', color: SHARE_COLORS.cardText }
    ], contentX, 770, contentWidth, rowOptions);
  }
};

export const createShareImageBlob = async (templateId, shareData) => {
  const analysis = createShareAnalysis(shareData);
  const canvas = document.createElement('canvas');
  drawShareCanvas(templateId, analysis, canvas);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível gerar a imagem de compartilhamento.'));
    }, 'image/png', 0.92);
  });
};

export const downloadShareImage = async (templateId, shareData) => {
  const blob = await createShareImageBlob(templateId, shareData);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nossovoto-${templateId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const copyShareText = async (templateId, shareData) => {
  const text = buildShareText(templateId, shareData);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
  return text;
};

export const shareTemplate = async (templateId, shareData) => {
  const text = buildShareText(templateId, shareData);
  const title = 'Compartilhar meu plano no Nosso Voto';

  if (navigator.share) {
    try {
      const blob = await createShareImageBlob(templateId, shareData);
      const file = new File([blob], `nossovoto-${templateId}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return 'shared';
      }
    } catch {
      // Se o navegador nao aceitar arquivo, tenta compartilhar texto.
    }

    await navigator.share({
      title,
      text,
      url: shareData?.url || APP_SHARE_URL
    });
    return 'shared';
  }

  await copyShareText(templateId, shareData);
  return 'copied';
};
