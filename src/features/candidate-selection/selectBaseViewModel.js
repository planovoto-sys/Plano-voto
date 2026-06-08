import {
  getCandidateChance,
  getCandidateSystemScore
} from '@/shared/utils/candidateMetrics';

export const INITIAL_CANDIDATE_RENDER_LIMIT = 80;
export const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px) and (min-height: 640px)';
export const CARD_MODE_OPTIONS = [
  { id: 'detailed', label: 'Detalhado' },
  { id: 'compact', label: 'Resumido' }
];

export const getScreenCopy = ({ variant, titulo, subtitulo }) => {
  if (variant === 'home-state') {
    return {
      title: 'Estado',
      subtitle: ''
    };
  }

  if (variant === 'office-senado') {
    return {
      title: 'Senadores',
      subtitle: ''
    };
  }

  if (variant === 'office-deputado') {
    return {
      title: 'Deputado Federal',
      subtitle: ''
    };
  }

  return {
    title: titulo || '',
    subtitle: subtitulo || ''
  };
};

export const getSubNavLabel = (item) => {
  if (item.mode === 'selecionados' || item.id?.includes('selecionados')) return 'Selecionados';
  if (item.mode === 'renovar' || item.id?.includes('renovar')) return 'À renovação';
  return 'À reeleição';
};

export const haveSameSelectionIds = (currentItems = [], nextItems = []) => {
  if (currentItems.length !== nextItems.length) return false;

  const getSignature = (item) => [
    item.id,
    getCandidateChance(item),
    getCandidateSystemScore(item),
    item.isChanceFeatured ? 1 : 0
  ].join(':');

  const currentIds = currentItems.map(getSignature).sort();
  const nextIds = nextItems.map(getSignature).sort();
  return currentIds.every((id, index) => id === nextIds[index]);
};
