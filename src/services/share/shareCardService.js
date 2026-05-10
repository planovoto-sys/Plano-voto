import {
  getCandidateChance,
  getCandidateSystemScore
} from '@/utils/candidateMetrics';

const APP_SHARE_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'https://meuvoto.org';
const SHARE_YEAR = '2026';

export const SHARE_CARD_TEMPLATES = [
  {
    id: 'perfil',
    label: 'Perfil político',
    shortLabel: 'Perfil',
    description: 'Mostra o estilo de escolha sem revelar nomes.'
  },
  {
    id: 'placar',
    label: 'Placar eleitoral',
    shortLabel: 'Placar',
    description: 'Resume nota e chance em faixas seguras.'
  },
  {
    id: 'blindado',
    label: 'Voto blindado',
    shortLabel: 'Privacidade',
    description: 'Valoriza decisão salva e nomes protegidos.'
  },
  {
    id: 'termometro',
    label: 'Termômetro',
    shortLabel: 'Termômetro',
    description: 'Gera barras de segurança, avaliação e conclusão.'
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
      summary: 'Você combinou chance real de eleição com avaliação positiva.',
      priorities: ['Mais chance de eleição', 'Boa avaliação', 'Menor risco de desperdiçar voto']
    };
  }

  if (averageScore >= 8.2) {
    return {
      title: 'Técnico',
      summary: 'Você priorizou avaliação forte antes de olhar só para chance.',
      priorities: ['Nota alta', 'Critério técnico', 'Comparação objetiva']
    };
  }

  if (averageChance >= 80) {
    return {
      title: 'Voto útil',
      summary: 'Você concentrou suas escolhas em nomes com chance elevada.',
      priorities: ['Chance alta', 'Decisão pragmática', 'Segurança eleitoral']
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
      summary: 'Você misturou avaliação e chance sem depender de um único critério.',
      priorities: ['Equilíbrio', 'Boa avaliação', 'Chance moderada']
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

  return {
    estadoNome: shareData?.estadoNome || shareData?.estadoSigla || 'Brasil',
    estadoSigla: shareData?.estadoSigla || '',
    year: shareData?.year || SHARE_YEAR,
    url: shareData?.url || APP_SHARE_URL,
    deputado,
    senadores,
    selectedCandidates,
    completedCount: selectedCandidates.length,
    averageScore,
    averageChance,
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
  const locationLine = `${analysis.estadoNome} · ${analysis.year}`;

  if (templateId === 'placar') {
    return [
      'MEU PLACAR ELEITORAL',
      `Estado: ${analysis.estadoNome}`,
      '',
      `Deputado Federal: Nota ${analysis.deputado ? getShareScoreBand(analysis.deputado) : 'Pendente'} · Chance ${analysis.deputado ? getShareChanceBand(analysis.deputado) : 'Pendente'}`,
      `Senador 1: Nota ${analysis.senadores[0] ? getShareScoreBand(analysis.senadores[0]) : 'Pendente'} · Chance ${analysis.senadores[0] ? getShareChanceBand(analysis.senadores[0]) : 'Pendente'}`,
      `Senador 2: Nota ${analysis.senadores[1] ? getShareScoreBand(analysis.senadores[1]) : 'Pendente'} · Chance ${analysis.senadores[1] ? getShareChanceBand(analysis.senadores[1]) : 'Pendente'}`,
      '',
      `Resultado: foco em chance ${analysis.chanceBand.toLowerCase()} e avaliação ${analysis.scoreBand.toLowerCase()}.`,
      'Candidatos ocultos.'
    ];
  }

  if (templateId === 'blindado') {
    return [
      'VOTO BLINDADO',
      locationLine,
      '',
      'Eu comparei candidatos antes de escolher.',
      'Deputado Federal escolhido',
      '2 Senadores escolhidos',
      'Critérios analisados',
      'Nomes protegidos',
      '',
      'Minha escolha não é palpite. É análise.'
    ];
  }

  if (templateId === 'termometro') {
    return [
      'TERMÔMETRO DA MINHA ESCOLHA',
      `${analysis.estadoSigla || analysis.estadoNome} · ${analysis.year}`,
      '',
      `Segurança eleitoral: ${analysis.termometer.security}%`,
      `Avaliação técnica: ${analysis.termometer.technical}%`,
      `Conclusão do fluxo: ${analysis.termometer.completion}%`,
      `Privacidade: ${analysis.termometer.privacy}%`,
      '',
      `Resultado: ${analysis.profile.title}.`,
      'Candidatos ocultos.'
    ];
  }

  return [
    'MEU PERFIL POLÍTICO',
    locationLine,
    '',
    `Meu perfil de escolha: ${analysis.profile.title.toUpperCase()}`,
    analysis.profile.summary,
    '',
    'Priorizei candidatos com:',
    ...analysis.profile.priorities.map((priority) => `↑ ${priority}`),
    '',
    'Deputado Federal: escolha definida · nome oculto',
    'Senado: 2 escolhas definidas · nomes ocultos'
  ];
};

export const buildShareText = (templateId, shareData) => {
  const analysis = createShareAnalysis(shareData);
  return [
    ...getTemplateLines(templateId, analysis),
    '',
    'Descubra seu perfil de escolha no app:',
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

const drawBar = (context, x, y, width, label, value) => {
  context.fillStyle = '#4a4a4a';
  context.font = '800 27px Montserrat, Arial, sans-serif';
  context.fillText(label, x, y);
  context.fillStyle = '#e8ebee';
  context.beginPath();
  drawRoundedRect(context, x, y + 20, width, 18, 9);
  context.fill();
  context.fillStyle = '#4a4a4a';
  context.beginPath();
  drawRoundedRect(context, x, y + 20, width * (value / 100), 18, 9);
  context.fill();
  context.font = '900 28px Montserrat, Arial, sans-serif';
  context.fillText(`${value}%`, x + width + 24, y + 37);
};

const drawShareCanvas = (templateId, analysis, canvas) => {
  const context = canvas.getContext('2d');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  context.fillStyle = '#f4f4f4';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.beginPath();
  drawRoundedRect(context, 70, 70, 940, 1210, 28);
  context.fill();
  context.strokeStyle = '#dedede';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = '#4a4a4a';
  context.font = '900 34px Montserrat, Arial, sans-serif';
  context.fillText('meuvoto.org', 118, 142);

  context.strokeStyle = '#e8ebee';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(118, 178);
  context.lineTo(962, 178);
  context.stroke();

  if (templateId === 'termometro') {
    drawTextBlock(context, [
      { text: 'TERMÔMETRO DA MINHA ESCOLHA', font: '900 57px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 66 },
      { text: `${analysis.estadoNome} · ${analysis.year}`, font: '700 31px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 42, after: 58 }
    ], { x: 118, y: 280, maxWidth: 820, font: '700 30px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 40 });

    drawBar(context, 118, 510, 650, 'Segurança eleitoral', analysis.termometer.security);
    drawBar(context, 118, 635, 650, 'Avaliação técnica', analysis.termometer.technical);
    drawBar(context, 118, 760, 650, 'Conclusão do fluxo', analysis.termometer.completion);
    drawBar(context, 118, 885, 650, 'Privacidade', analysis.termometer.privacy);

    drawTextBlock(context, [
      { text: `Resultado: ${analysis.profile.title}`, font: '900 45px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 54 },
      { text: 'Candidatos ocultos. Veja como fica o seu termômetro.', font: '700 28px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 38 }
    ], { x: 118, y: 1080, maxWidth: 820, font: '700 30px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 40 });
  } else {
    const lines = templateId === 'placar'
      ? [
          { text: 'MEU PLACAR ELEITORAL', font: '900 62px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 72 },
          { text: `Estado: ${analysis.estadoNome}`, font: '700 32px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 44, after: 56 },
          { text: `Deputado Federal · Nota ${analysis.deputado ? getShareScoreBand(analysis.deputado) : 'Pendente'} · Chance ${analysis.deputado ? getShareChanceBand(analysis.deputado) : 'Pendente'}`, font: '800 32px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 46 },
          { text: `Senador 1 · Nota ${analysis.senadores[0] ? getShareScoreBand(analysis.senadores[0]) : 'Pendente'} · Chance ${analysis.senadores[0] ? getShareChanceBand(analysis.senadores[0]) : 'Pendente'}`, font: '800 32px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 46 },
          { text: `Senador 2 · Nota ${analysis.senadores[1] ? getShareScoreBand(analysis.senadores[1]) : 'Pendente'} · Chance ${analysis.senadores[1] ? getShareChanceBand(analysis.senadores[1]) : 'Pendente'}`, font: '800 32px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 46, after: 48 },
          { text: `Resultado: foco em chance ${analysis.chanceBand.toLowerCase()} e avaliação ${analysis.scoreBand.toLowerCase()}.`, font: '900 38px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 50 },
          { text: 'Candidatos ocultos.', font: '700 30px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 40 }
        ]
      : templateId === 'blindado'
        ? [
            { text: 'VOTO BLINDADO', font: '900 72px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 82 },
            { text: `${analysis.estadoNome} · ${analysis.year}`, font: '700 32px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 44, after: 70 },
            { text: 'Eu comparei candidatos antes de escolher.', font: '900 41px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 54, after: 46 },
            { text: '✓ Deputado Federal escolhido', font: '800 34px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 48 },
            { text: '✓ 2 Senadores escolhidos', font: '800 34px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 48 },
            { text: '✓ Critérios analisados', font: '800 34px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 48 },
            { text: '🔒 Nomes protegidos', font: '800 34px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 48, after: 70 },
            { text: 'Minha escolha não é palpite. É análise.', font: '900 40px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 52 }
          ]
        : [
            { text: 'MEU PERFIL POLÍTICO', font: '900 62px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 72 },
            { text: `${analysis.estadoNome} · ${analysis.year}`, font: '700 32px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 44, after: 58 },
            { text: 'Meu perfil de escolha:', font: '700 32px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 44 },
            { text: analysis.profile.title.toUpperCase(), font: '900 72px Montserrat, Arial, sans-serif', color: '#111111', lineHeight: 82 },
            { text: analysis.profile.summary, font: '700 31px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 42, after: 40 },
            { text: `↑ ${analysis.profile.priorities[0]}`, font: '800 31px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 43 },
            { text: `↑ ${analysis.profile.priorities[1]}`, font: '800 31px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 43 },
            { text: `↓ ${analysis.profile.priorities[2]}`, font: '800 31px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 43, after: 50 },
            { text: 'Deputado Federal · escolha definida · nome oculto', font: '700 28px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 38 },
            { text: 'Senado · 2 escolhas definidas · nomes ocultos', font: '700 28px Montserrat, Arial, sans-serif', color: '#69746f', lineHeight: 38 }
          ];

    drawTextBlock(context, lines, { x: 118, y: 280, maxWidth: 820, font: '700 30px Montserrat, Arial, sans-serif', color: '#4a4a4a', lineHeight: 40 });
  }

  context.fillStyle = '#111111';
  context.font = '900 34px Montserrat, Arial, sans-serif';
  context.fillText('Descubra seu perfil de escolha', 118, 1196);
  context.fillStyle = '#69746f';
  context.font = '800 28px Montserrat, Arial, sans-serif';
  context.fillText(APP_SHARE_URL.replace('https://', ''), 118, 1240);
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
  link.download = `meuvoto-${templateId}.png`;
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
  const title = 'Meu resultado no meuvoto.org';

  if (navigator.share) {
    try {
      const blob = await createShareImageBlob(templateId, shareData);
      const file = new File([blob], `meuvoto-${templateId}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return 'shared';
      }
    } catch {
      // Se o navegador nao aceitar arquivo, tenta compartilhar texto.
    }

    await navigator.share({ title, text, url: shareData?.url || APP_SHARE_URL });
    return 'shared';
  }

  await copyShareText(templateId, shareData);
  return 'copied';
};
