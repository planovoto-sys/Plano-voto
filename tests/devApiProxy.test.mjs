import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_DEV_API_ORIGIN,
  createDevApiProxy,
  normalizeDevApiOrigin,
} from '../config/devApiProxy.js';
import viteConfigFactory from '../vite.config.js';

let backendServer;
let viteServer;
let backendOrigin;
let viteOrigin;

before(async () => {
  backendServer = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({
      method: request.method,
      url: request.url,
      host: request.headers.host,
      origin: request.headers.origin,
      authorization: request.headers.authorization,
      body: Buffer.concat(chunks).toString('utf8'),
    }));
  });

  await new Promise((resolve, reject) => {
    backendServer.once('error', reject);
    backendServer.listen(0, '127.0.0.1', resolve);
  });

  const backendAddress = backendServer.address();
  backendOrigin = `http://127.0.0.1:${backendAddress.port}`;

  viteServer = await createViteServer({
    appType: 'spa',
    configFile: false,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      proxy: {
        '^/api/': createDevApiProxy(backendOrigin),
      },
    },
  });
  await viteServer.listen();

  const viteAddress = viteServer.httpServer.address();
  viteOrigin = `http://127.0.0.1:${viteAddress.port}`;
});

after(async () => {
  await viteServer?.close();
  if (backendServer) {
    await new Promise((resolve, reject) => {
      backendServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('encaminha /api/rpc sem perder autenticacao ou payload', async () => {
  const requestBody = JSON.stringify({ action: 'saveBallotState', data: { estado: 'AC' } });
  const response = await fetch(`${viteOrigin}/api/rpc`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token-de-teste',
      'Content-Type': 'application/json',
      Origin: viteOrigin,
    },
    body: requestBody,
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.method, 'POST');
  assert.equal(payload.url, '/api/rpc');
  assert.equal(payload.host, new URL(backendOrigin).host);
  assert.equal(payload.origin, backendOrigin);
  assert.equal(payload.authorization, 'Bearer token-de-teste');
  assert.equal(payload.body, requestBody);
});

test('aceita HTTPS remoto e HTTP apenas em loopback', () => {
  assert.equal(normalizeDevApiOrigin('https://bomdevoto.com.br'), 'https://bomdevoto.com.br');
  assert.equal(normalizeDevApiOrigin('http://localhost:8787'), 'http://localhost:8787');
  assert.equal(normalizeDevApiOrigin('http://[::1]:8787'), 'http://[::1]:8787');
  assert.throws(() => normalizeDevApiOrigin('http://example.com'), /HTTPS/);
  assert.throws(() => normalizeDevApiOrigin('https://user:pass@example.com'), /somente a origem/);
  assert.throws(() => normalizeDevApiOrigin('https://example.com/api'), /somente a origem/);
  assert.throws(() => normalizeDevApiOrigin(), /Defina PLANO_VOTO_DEV_API_ORIGIN/);
});

test('vite.config registra o proxy no caminho real da API', () => {
  const originalOrigin = process.env.PLANO_VOTO_DEV_API_ORIGIN;
  process.env.PLANO_VOTO_DEV_API_ORIGIN = DEFAULT_DEV_API_ORIGIN;

  try {
    const config = viteConfigFactory({
      command: 'serve',
      isPreview: false,
      isSsrBuild: false,
      mode: 'development',
    });
    const proxy = config.server?.proxy?.['^/api/'];

    assert.ok(proxy);
    assert.equal(proxy.target, DEFAULT_DEV_API_ORIGIN);
    assert.equal(proxy.changeOrigin, true);
    assert.equal(typeof proxy.configure, 'function');
  } finally {
    if (originalOrigin === undefined) delete process.env.PLANO_VOTO_DEV_API_ORIGIN;
    else process.env.PLANO_VOTO_DEV_API_ORIGIN = originalOrigin;
  }
});

test('build nao depende da configuracao de proxy de desenvolvimento', () => {
  const originalOrigin = process.env.PLANO_VOTO_DEV_API_ORIGIN;
  delete process.env.PLANO_VOTO_DEV_API_ORIGIN;

  try {
    const config = viteConfigFactory({
      command: 'build',
      isPreview: false,
      isSsrBuild: false,
      mode: 'production',
    });

    assert.equal(config.server, undefined);
  } finally {
    if (originalOrigin !== undefined) process.env.PLANO_VOTO_DEV_API_ORIGIN = originalOrigin;
  }
});
