import { Buffer } from 'node:buffer';
import process from 'node:process';

const MAX_BODY_BYTES = 36 * 1024;
const ACTION_NAMES = new Set([
  'castAnonymousVote',
  'createPlanHandoffToken',
  'deleteUserElectionData',
  'redeemPlanHandoffToken',
  'saveBallotState',
  'saveBallotStepSelection',
  'syncUserProfile',
]);
let actionsPromise;
let adminModulesPromise;

const loadAdminModules = () => {
  adminModulesPromise ||= Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]).then(([appModule, authModule]) => ({ appModule, authModule }));
  return adminModulesPromise;
};

const initializeApiAdmin = async () => {
  const { appModule } = await loadAdminModules();
  const { cert, getApps, initializeApp } = appModule;
  if (getApps().length > 0) return;

  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encodedServiceAccount) {
    initializeApp();
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(Buffer.from(encodedServiceAccount, 'base64').toString('utf8'));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 invalida.');
  }

  if (
    serviceAccount?.type !== 'service_account'
    || serviceAccount?.project_id !== 'plano-mvp-9a0b4'
    || !serviceAccount?.private_key
    || !serviceAccount?.client_email
  ) {
    throw new Error('Credencial Firebase Admin invalida ou de outro projeto.');
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
};

const loadActions = async () => {
  await initializeApiAdmin();
  actionsPromise ||= import('../functions/index.js').then((module) => Object.freeze({
    castAnonymousVote: module.castAnonymousVote,
    createPlanHandoffToken: module.createPlanHandoffToken,
    deleteUserElectionData: module.deleteUserElectionData,
    redeemPlanHandoffToken: module.redeemPlanHandoffToken,
    saveBallotState: module.saveBallotState,
    saveBallotStepSelection: module.saveBallotStepSelection,
    syncUserProfile: module.syncUserProfile,
  }));
  return actionsPromise;
};

const STATUS_BY_CODE = Object.freeze({
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'already-exists': 409,
  'failed-precondition': 412,
  'resource-exhausted': 429,
  'deadline-exceeded': 408,
  unavailable: 503,
});

const readHeader = (request, name) => {
  return String(request.headers.get(name) || '');
};

const getRequestHost = (request) => new URL(request.url).host.toLowerCase();

const assertSameOrigin = (request) => {
  const origin = readHeader(request, 'origin');
  if (!origin) return;

  let originHost;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw Object.assign(new Error('Origem invalida.'), { code: 'permission-denied' });
  }

  if (originHost !== getRequestHost(request)) {
    throw Object.assign(new Error('Origem nao autorizada.'), { code: 'permission-denied' });
  }
};

const parseBody = async (request) => {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Payload excede o limite permitido.'), { code: 'invalid-argument' });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Payload invalido.'), { code: 'invalid-argument' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Payload invalido.'), { code: 'invalid-argument' });
  }

  if (Object.keys(body).some((key) => !['action', 'data'].includes(key))) {
    throw Object.assign(new Error('Payload contem campos nao permitidos.'), { code: 'invalid-argument' });
  }

  return body;
};

const readAuthContext = async (request) => {
  const authorization = readHeader(request, 'authorization');
  if (!authorization) return undefined;
  if (!authorization.startsWith('Bearer ')) {
    throw Object.assign(new Error('Token de autenticacao invalido.'), { code: 'unauthenticated' });
  }

  await initializeApiAdmin();
  const { authModule } = await loadAdminModules();
  const decodedToken = await authModule.getAuth().verifyIdToken(authorization.slice(7), true);
  return {
    uid: decodedToken.uid,
    token: decodedToken,
  };
};

const getClientIp = (request) => (
  readHeader(request, 'x-vercel-forwarded-for')
  || readHeader(request, 'x-forwarded-for').split(',')[0].trim()
  || 'unknown'
);

const jsonResponse = (payload, status = 200, extraHeaders = {}) => new Response(
  JSON.stringify(payload),
  {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  }
);

const makeErrorResponse = (error) => {
  const code = String(error?.code || 'internal').replace(/^functions\//, '');
  const status = STATUS_BY_CODE[code] || 500;
  const message = status === 500
    ? 'Falha interna ao processar a solicitacao.'
    : String(error?.message || 'Falha ao processar a solicitacao.');

  return jsonResponse({ error: { code, message } }, status);
};

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      return jsonResponse({
        ok: true,
        service: 'plano-voto-api',
        version: '1.11.3',
        app_check: false,
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse(
        { error: { code: 'method-not-allowed', message: 'Metodo nao permitido.' } },
        405,
        { Allow: 'POST, OPTIONS' }
      );
    }

    try {
      assertSameOrigin(request);
      const body = await parseBody(request);
      const action = typeof body.action === 'string' ? body.action : '';
      if (!ACTION_NAMES.has(action)) {
        throw Object.assign(new Error('Acao invalida.'), { code: 'invalid-argument' });
      }

      const actions = await loadActions();
      const callable = actions[action];
      if (!callable || typeof callable.run !== 'function') {
        throw Object.assign(new Error('Acao invalida.'), { code: 'invalid-argument' });
      }

      const auth = await readAuthContext(request);
      const result = await callable.run({
        auth,
        data: body.data,
        rawRequest: {
          headers: Object.fromEntries(request.headers.entries()),
          ip: getClientIp(request),
        },
      });

      return jsonResponse({ data: result ?? null });
    } catch (error) {
      return makeErrorResponse(error);
    }
  },
};
