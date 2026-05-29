export const motionTokens = {
  fast: 140,
  base: 220,
  slow: 360,
  standardEase: 'cubic-bezier(.2, 0, 0, 1)',
  emphasizedEase: 'cubic-bezier(.2, 0, 0, 1.15)'
};

const routeOrder = [
  '/',
  '/login',
  '/home',
  '/escolher-deputado-federal',
  '/escolher-senadores',
  '/meu-plano',
  '/continuar-plano',
  '/c'
];

export const getRouteRank = (pathname = '') => {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const exactIndex = routeOrder.indexOf(normalizedPath);
  if (exactIndex >= 0) return exactIndex;

  if (normalizedPath.startsWith('/continuar-plano')) {
    return routeOrder.indexOf('/continuar-plano');
  }

  if (normalizedPath.startsWith('/c/')) {
    return routeOrder.indexOf('/c');
  }

  return -1;
};
