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

const adminConfigurationError = (diagnosticCode) => Object.assign(
  new Error('Servico temporariamente indisponivel.'),
  { code: 'unavailable', diagnosticCode }
);

const loadAdminModules = () => {
  adminModulesPromise ||= import('firebase-admin/app').then((appModule) => ({ appModule }));
  return adminModulesPromise;
};

const initializeApiAdmin = async () => {
  const { appModule } = await loadAdminModules();
  const { cert, getApps, initializeApp } = appModule;
  if (getApps().length > 0) return;

  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (!encodedServiceAccount) {
    if (process.env.VERCEL === '1') {
      throw adminConfigurationError('firebase-admin-credentials-missing');
    }
    initializeApp();
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(Buffer.from(encodedServiceAccount, 'base64').toString('utf8'));
  } catch {
    throw adminConfigurationError('firebase-admin-credentials-malformed');
  }

  if (
    serviceAccount?.type !== 'service_account'
    || serviceAccount?.project_id !== 'plano-mvp-9a0b4'
    || !serviceAccount?.private_key
    || !serviceAccount?.client_email
  ) {
    throw adminConfigurationError('firebase-admin-credentials-invalid');
  }

  try {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } catch {
    throw adminConfigurationError('firebase-admin-credentials-initialization-failed');
  }
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

const GRPC_CODE_NAMES = Object.freeze({
  1: 'cancelled',
  2: 'unknown',
  3: 'invalid-argument',
  4: 'deadline-exceeded',
  5: 'not-found',
  6: 'already-exists',
  7: 'permission-denied',
  8: 'resource-exhausted',
  9: 'failed-precondition',
  10: 'aborted',
  11: 'out-of-range',
  12: 'unimplemented',
  13: 'internal',
  14: 'unavailable',
  15: 'data-loss',
  16: 'unauthenticated',
});

const INFRASTRUCTURE_MESSAGE_BY_CODE = Object.freeze({
  'resource-exhausted': 'O limite temporario do banco foi atingido. Aguarde e tente novamente.',
  'deadline-exceeded': 'O banco demorou demais para responder. Tente novamente.',
  unavailable: 'Servico temporariamente indisponivel.',
});

const GRPC_RESPONSE_BY_CODE = Object.freeze({
  'deadline-exceeded': { code: 'deadline-exceeded', status: 504 },
  'permission-denied': { code: 'unavailable', status: 503 },
  'resource-exhausted': { code: 'resource-exhausted', status: 429 },
  'failed-precondition': { code: 'unavailable', status: 503 },
  aborted: { code: 'unavailable', status: 503 },
  internal: { code: 'internal', status: 500 },
  unavailable: { code: 'unavailable', status: 503 },
  unauthenticated: { code: 'unavailable', status: 503 },
});

export const normalizeErrorCode = (rawCode) => {
  if (typeof rawCode === 'number') return GRPC_CODE_NAMES[rawCode] || 'internal';

  const candidate = String(rawCode || 'internal')
    .replace(/^functions\//i, '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-');
  const numericPrefix = candidate.match(/^(\d+)(?:\s|$)/);
  if (numericPrefix) return GRPC_CODE_NAMES[Number(numericPrefix[1])] || 'internal';
  return candidate || 'internal';
};

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

  const firebaseApiKey = process.env.VITE_API_KEY;
  if (!firebaseApiKey) {
    throw Object.assign(new Error('Firebase Auth nao configurado no servidor.'), { code: 'failed-precondition' });
  }

  let lookupResponse;
  try {
    lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: authorization.slice(7) }),
      }
    );
  } catch {
    throw Object.assign(new Error('Token de autenticacao invalido ou expirado.'), { code: 'unauthenticated' });
  }

  const lookupPayload = await lookupResponse.json().catch(() => ({}));
  const firebaseUser = lookupPayload?.users?.[0];
  if (!lookupResponse.ok || !firebaseUser?.localId) {
    throw Object.assign(new Error('Token de autenticacao invalido ou expirado.'), { code: 'unauthenticated' });
  }

  return {
    uid: firebaseUser.localId,
    token: {
      uid: firebaseUser.localId,
      email: firebaseUser.email || '',
      email_verified: firebaseUser.emailVerified !== false,
      name: firebaseUser.displayName || '',
      picture: firebaseUser.photoUrl || '',
    },
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

export const makeErrorResponse = (error) => {
  const rawCode = error?.code;
  const normalizedCode = normalizeErrorCode(rawCode);
  const isGrpcInfrastructureError = (
    typeof rawCode === 'number'
    || /^\d+(?:\s|$)/.test(String(rawCode || '').trim())
  );
  const grpcResponse = isGrpcInfrastructureError
    ? GRPC_RESPONSE_BY_CODE[normalizedCode]
    : undefined;
  const code = grpcResponse?.code || normalizedCode;
  const status = grpcResponse?.status || STATUS_BY_CODE[code] || 500;
  if (status >= 500) {
    console.error('[api/rpc] request failed', {
      code,
      diagnosticCode: error?.diagnosticCode
        || (isGrpcInfrastructureError ? `firestore-${normalizedCode}` : 'unhandled-server-error'),
      name: error?.name || 'Error',
    });
  }
  const message = status === 500
    ? 'Falha interna ao processar a solicitacao.'
    : isGrpcInfrastructureError
      ? INFRASTRUCTURE_MESSAGE_BY_CODE[code] || 'Falha ao acessar o banco.'
      : String(error?.message || 'Falha ao processar a solicitacao.');

  return jsonResponse({ error: { code, message } }, status);
};

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      return jsonResponse({
        ok: true,
        service: 'plano-voto-api',
        version: '1.11.4',
        app_check: false,
        runtime_adapter: 'native-no-cloud-functions',
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
