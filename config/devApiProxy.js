const DEFAULT_DEV_API_ORIGIN = 'https://bomdevoto.com.br';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const normalizeDevApiOrigin = (value) => {
  const candidate = String(value || '').trim();
  if (!candidate) {
    throw new Error(
      'Defina PLANO_VOTO_DEV_API_ORIGIN explicitamente antes de iniciar o Vite; gravacoes usam o backend indicado.'
    );
  }
  let url;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error('PLANO_VOTO_DEV_API_ORIGIN precisa ser uma URL valida.');
  }

  const isSecure = url.protocol === 'https:';
  const isLoopbackHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
  if (!isSecure && !isLoopbackHttp) {
    throw new Error('A API de desenvolvimento precisa usar HTTPS, exceto em loopback local.');
  }

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PLANO_VOTO_DEV_API_ORIGIN deve conter somente a origem, sem credenciais, caminho, query ou hash.');
  }

  return url.origin;
};

export const createDevApiProxy = (originValue) => {
  const targetOrigin = normalizeDevApiOrigin(originValue);

  return {
    target: targetOrigin,
    changeOrigin: true,
    secure: targetOrigin.startsWith('https://'),
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest) => {
        // A chamada continua same-origin no navegador. O proxy de desenvolvimento
        // apresenta a origem do backend para a validacao anti-CSRF do endpoint.
        proxyRequest.setHeader('Origin', targetOrigin);
      });
    },
  };
};

export const devApiProxyNotice = (targetOrigin) => ({
  name: 'plano-voto-dev-api-proxy-notice',
  apply: 'serve',
  configureServer(server) {
    server.config.logger.info(
      `[plano-voto] /api encaminhada para ${targetOrigin} (ambiente remoto; gravacoes usam dados reais).`
    );
  },
});

export { DEFAULT_DEV_API_ORIGIN };
