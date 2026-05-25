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
      'Meu plano de voto está pronto',
      `${analysis.estadoNome} • ${analysis.year}`,
      'Deputado federal definido',
      'Senadores definidos',
      'Nomes ocultos por privacidade',
      'Monte o seu também',
      'nossovoto.org'
    ];
  }

  if (templateId === 'completo') {
    return [
      'Meu plano de voto',
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
      'Meu plano em números',
      `${analysis.averageChanceLabel} Viabilidade geral`,
      `${analysis.averageScoreLabel} Média das notas`,
      'Indicadores de apoio para revisar o plano.',
      'Monte o seu também',
      'nossovoto.org'
    ];
  }

  return [
    'Checklist do meu plano',
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

const drawStoryCta = (context, analysis, x, y, width) => {
  context.fillStyle = SHARE_COLORS.text;
  context.beginPath();
  drawRoundedRect(context, x, y, width, 122, 30);
  context.fill();
  context.fillStyle = SHARE_COLORS.surface;
  context.font = '800 36px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('Monte o seu também', x + 34, y + 52);
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.font = '800 30px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText((analysis.url || APP_SHARE_URL).replace('https://', ''), x + 34, y + 94);
};

const drawMetricBox = (context, x, y, width, height, label, value, percent, color = SHARE_COLORS.orange) => {
  const progress = clamp(percent);
  const centerX = x + width / 2;
  const centerY = y + 84;
  const radius = 58;
  context.fillStyle = color === SHARE_COLORS.success ? SHARE_COLORS.successSoft : SHARE_COLORS.orangeSoft;
  context.beginPath();
  drawRoundedRect(context, x, y, width, height, 28);
  context.fill();
  context.strokeStyle = color === SHARE_COLORS.success ? SHARE_COLORS.successLine : SHARE_COLORS.metricLine;
  context.lineWidth = 2;
  context.stroke();

  context.lineWidth = 16;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(169, 169, 169, 0.25)';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = color;
  context.beginPath();
  context.arc(centerX, centerY, radius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (progress / 100)));
  context.stroke();

  context.fillStyle = SHARE_COLORS.surface;
  context.beginPath();
  context.arc(centerX, centerY, 44, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = color;
  context.font = '800 34px "Plus Jakarta Sans", Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(value, centerX, centerY + 11);
  context.fillStyle = SHARE_COLORS.muted;
  context.font = '800 28px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(label, centerX, y + height - 42);
  context.lineCap = 'butt';
  context.textAlign = 'left';
};

const drawShareCanvas = (templateId, analysis, canvas) => {
  const template = SHARE_CARD_TEMPLATES.find((item) => item.id === templateId) || SHARE_CARD_TEMPLATES[0];
  const context = canvas.getContext('2d');
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, SHARE_COLORS.bg);
  background.addColorStop(0.5, templateId === 'termometro' ? SHARE_COLORS.bg : SHARE_COLORS.surface);
  background.addColorStop(1, templateId === 'resumo' ? SHARE_COLORS.successSoft : SHARE_COLORS.surface);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = SHARE_COLORS.surface;
  context.beginPath();
  drawRoundedRect(context, 62, 62, 956, 1796, 42);
  context.fill();
  context.strokeStyle = SHARE_COLORS.line;
  context.lineWidth = 3;
  context.stroke();

  const contentX = 112;
  const contentWidth = 856;
  const tagText = template.tag.toUpperCase();

  context.fillStyle = SHARE_COLORS.text;
  context.font = '800 38px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('nossovoto.org', contentX, 150);

  context.fillStyle = SHARE_COLORS.orangeSoft;
  context.beginPath();
  const tagWidth = Math.min(340, context.measureText(tagText).width + 72);
  drawRoundedRect(context, width - contentX - tagWidth, 112, tagWidth, 54, 27);
  context.fill();
  context.fillStyle = SHARE_COLORS.orangeDark;
  context.font = '800 23px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(tagText, width - contentX - tagWidth + 36, 148);

  if (templateId === 'resumo') {
    drawTextBlock(context, [
      { text: 'Meu plano de voto está pronto', font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 }
    ], { x: contentX, y: 320, maxWidth: contentWidth, font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 });
    context.fillStyle = SHARE_COLORS.body;
    context.font = '800 38px "Plus Jakarta Sans", Arial, sans-serif';
    context.fillText(`${analysis.estadoNome} • ${analysis.year}`, contentX, 600);
    drawInfoRows(context, [
      'Deputado federal definido',
      'Senadores definidos',
      { text: 'Nomes ocultos por privacidade', color: SHARE_COLORS.orangeDark }
    ], contentX, 690, contentWidth);
  } else if (templateId === 'completo') {
    const senatorOne = analysis.senatorNames[0] || 'Senador 1 definido';
    const senatorTwo = analysis.senatorNames[1] || 'Senador 2 definido';
    drawTextBlock(context, [
      { text: 'Meu plano de voto', font: '800 92px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 96 }
    ], { x: contentX, y: 320, maxWidth: contentWidth, font: '800 92px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 96 });
    context.fillStyle = SHARE_COLORS.body;
    context.font = '800 38px "Plus Jakarta Sans", Arial, sans-serif';
    context.fillText(`Estado: ${analysis.estadoNome}`, contentX, 575);
    drawInfoRows(context, [
      { text: 'Deputado Federal', color: SHARE_COLORS.orangeDark, font: '800 27px "Plus Jakarta Sans", Arial, sans-serif' },
      { text: analysis.deputadoName || 'Deputado federal definido', color: SHARE_COLORS.text, font: '800 42px "Plus Jakarta Sans", Arial, sans-serif' },
      { text: 'Senadores', color: SHARE_COLORS.orangeDark, font: '800 27px "Plus Jakarta Sans", Arial, sans-serif' },
      { text: senatorOne, color: SHARE_COLORS.text, font: '800 40px "Plus Jakarta Sans", Arial, sans-serif' },
      { text: senatorTwo, color: SHARE_COLORS.text, font: '800 40px "Plus Jakarta Sans", Arial, sans-serif' }
    ], contentX, 660, contentWidth, { minHeight: 70 });
  } else if (templateId === 'termometro') {
    drawTextBlock(context, [
      { text: 'Meu plano em números', font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 }
    ], { x: contentX, y: 320, maxWidth: contentWidth, font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 });
    drawMetricBox(context, contentX, 650, 405, 238, 'Viabilidade geral', analysis.averageChanceLabel, analysis.averageChance);
    drawMetricBox(context, contentX + 451, 650, 405, 238, 'Média das notas', analysis.averageScoreLabel, analysis.averageScore * 10, SHARE_COLORS.success);
    drawTextBlock(context, [
      { text: 'Indicadores de apoio para revisar o plano.', font: '700 40px Inter, Arial, sans-serif', color: SHARE_COLORS.body, lineHeight: 50 }
    ], { x: contentX, y: 1010, maxWidth: contentWidth, font: '700 40px Inter, Arial, sans-serif', color: SHARE_COLORS.body, lineHeight: 50 });
  } else {
    drawTextBlock(context, [
      { text: 'Checklist do meu plano', font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 }
    ], { x: contentX, y: 320, maxWidth: contentWidth, font: '800 88px "Plus Jakarta Sans", Arial, sans-serif', color: SHARE_COLORS.text, lineHeight: 92 });
    drawInfoRows(context, [
      'Estado escolhido ✓',
      'Deputado federal escolhido ✓',
      'Senadores escolhidos ✓',
      'Rascunho revisado ✓'
    ], contentX, 650, contentWidth);
    drawTextBlock(context, [
      { text: 'Agora é revisar antes da decisão final.', font: '700 38px Inter, Arial, sans-serif', color: SHARE_COLORS.body, lineHeight: 48 }
    ], { x: contentX, y: 1120, maxWidth: contentWidth, font: '700 38px Inter, Arial, sans-serif', color: SHARE_COLORS.body, lineHeight: 48 });
  }

  drawStoryCta(context, analysis, contentX, 1630, 520);
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
