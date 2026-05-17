import { createHash, randomBytes } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const ACTIVE_ELECTION_ID = process.env.ACTIVE_ELECTION_ID || 'congresso-2026';
const BALLOT_SCHEMA_VERSION = 1;
const PLAN_HANDOFF_TTL_MS = Number(process.env.PLAN_HANDOFF_TTL_SECONDS || 600) * 1000;
const PLAN_HANDOFF_TOKEN_BYTES = 32;
const VALID_STATES = new Set([
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO'
]);

const STATE_NAME_TO_CODE = new Map([
  ['ACRE', 'AC'],
  ['ALAGOAS', 'AL'],
  ['AMAPA', 'AP'],
  ['AMAZONAS', 'AM'],
  ['BAHIA', 'BA'],
  ['CEARA', 'CE'],
  ['DISTRITOFEDERAL', 'DF'],
  ['ESPIRITOSANTO', 'ES'],
  ['GOIAS', 'GO'],
  ['MARANHAO', 'MA'],
  ['MATOGROSSO', 'MT'],
  ['MATOGROSSODOSUL', 'MS'],
  ['MINASGERAIS', 'MG'],
  ['PARA', 'PA'],
  ['PARAIBA', 'PB'],
  ['PARANA', 'PR'],
  ['PERNAMBUCO', 'PE'],
  ['PIAUI', 'PI'],
  ['RIODEJANEIRO', 'RJ'],
  ['RIOGRANDEDONORTE', 'RN'],
  ['RIOGRANDEDOSUL', 'RS'],
  ['RONDONIA', 'RO'],
  ['RORAIMA', 'RR'],
  ['SANTACATARINA', 'SC'],
  ['SAOPAULO', 'SP'],
  ['SERGIPE', 'SE'],
  ['TOCANTINS', 'TO']
]);

const BALLOT_FLOW_STEP_IDS = ['deputado_federal', 'senadores_1', 'senadores_2'];
const OFFICE_MINIMUM_SELECTIONS = {
  deputado_federal: 1,
  senadores: 2
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://plano-voto.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const asString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizePrivateKey = (value) => asString(value).replace(/\\n/g, '\n');

const getServiceAccount = () => {
  const rawJson = asString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const rawBase64 = asString(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  if (rawJson || rawBase64) {
    const json = rawJson || Buffer.from(rawBase64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return {
      projectId: parsed.project_id || parsed.projectId,
      clientEmail: parsed.client_email || parsed.clientEmail,
      privateKey: normalizePrivateKey(parsed.private_key || parsed.privateKey)
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  };
};

const getAdminServices = () => {
  const existingApp = getApps()[0];
  const app = existingApp || initializeApp({
    credential: cert(getServiceAccount())
  });

  return {
    auth: getAuth(app),
    db: getFirestore(app)
  };
};

const getAllowedOrigins = () => {
  const configuredOrigins = asString(process.env.HANDOFF_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
};

export const applyCors = (request, response) => {
  const origin = asString(request.headers.origin);
  const allowedOrigins = getAllowedOrigins();

  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Max-Age', '86400');

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (request.method === 'OPTIONS') {
    response.statusCode = origin && !allowedOrigins.has(origin) ? 403 : 204;
    response.end();
    return true;
  }

  return false;
};

export const readJsonBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
};

export const sendJson = (response, status, data) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
};

export const sendError = (response, error) => {
  if (error instanceof ApiError) {
    sendJson(response, error.status, { code: error.code, message: error.message });
    return;
  }

  sendJson(response, 500, { code: 'INTERNAL', message: 'Nao foi possivel processar o QR Code.' });
};

export const assertPost = (request) => {
  if (request.method !== 'POST') {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
  }
};

export const getBearerToken = (request) => {
  const authorization = asString(request.headers.authorization);
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

const assertElectionPayload = (payload) => {
  const electionId = asString(payload.election_id) || ACTIVE_ELECTION_ID;
  if (electionId !== ACTIVE_ELECTION_ID) {
    throw new ApiError(400, 'INVALID_ELECTION', 'Eleicao invalida.');
  }

  if (Number(payload.schema_version) !== BALLOT_SCHEMA_VERSION) {
    throw new ApiError(400, 'INVALID_SCHEMA', 'Versao do voto invalida.');
  }

  return electionId;
};

const assertValidId = (value, label) => {
  const id = asString(value);
  if (!id || id.includes('/') || id.length > 180) {
    throw new ApiError(400, 'INVALID_ID', `${label} invalido.`);
  }
  return id;
};

const normalizeState = (value) => (
  asString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\u00A0]+/g, '')
    .toUpperCase()
);

const normalizeStateCode = (value) => {
  const normalizedState = normalizeState(value);
  if (!normalizedState || normalizedState === 'TODOS' || VALID_STATES.has(normalizedState)) {
    return normalizedState;
  }

  return STATE_NAME_TO_CODE.get(normalizedState) || normalizedState;
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const emptySelections = () => ({
  deputado_federal: [],
  senadores: []
});

const emptyCandidateGroups = () => ({
  deputado_federal: [],
  senadores_1: [],
  senadores_2: []
});

const emptyCompletedSteps = () => ({
  deputado_federal: false,
  senadores_1: false,
  senadores_2: false
});

const normalizeStoredCandidate = (candidate) => {
  if (!candidate?.id) return null;

  return {
    id: assertValidId(candidate.id, 'Candidato'),
    nome: candidate.nome || candidate.Nome || '',
    partido: candidate.partido || candidate.Partido || '',
    cargo: candidate.cargo || candidate.Cargo || '',
    numero: candidate.numero || candidate.Numero || null,
    estado: normalizeStateCode(candidate.estado || candidate.Estado || candidate.UF || candidate.uf || '') || null,
    classificacao: candidate.classificacao || candidate.ClassificacaoOficial || candidate['Classificação'] || candidate.Classificacao || null,
    nota_final: Number(candidate.nota_final ?? candidate.notaFinal ?? candidate['Nota candidato'] ?? candidate['Nota partido'] ?? 0) || 0,
    chance: Number(candidate.chance ?? candidate.Chance ?? 0) || 0,
    selected_by_users: Number(candidate.selected_by_users ?? candidate.selectedByUsers ?? 0) || 0,
    average_elected_votes: Number(candidate.average_elected_votes ?? candidate.averageElectedVotes ?? 0) || 0,
    ranking_total: Number(candidate.ranking_total ?? candidate.rankingTotal ?? 0) || 0
  };
};

const uniqueCandidatesById = (candidates) => {
  const seenIds = new Set();
  return candidates.filter((candidate) => {
    if (!candidate?.id || seenIds.has(candidate.id)) return false;
    seenIds.add(candidate.id);
    return true;
  });
};

const createEmptyBallotDraft = (userId, estado) => ({
  schema_version: BALLOT_SCHEMA_VERSION,
  election_id: ACTIVE_ELECTION_ID,
  user_id: userId,
  estado,
  selections: emptySelections(),
  candidate_groups: emptyCandidateGroups(),
  completed_steps: emptyCompletedSteps(),
  active_candidate_ids: [],
  updated_at: null
});

const normalizeDraft = (rawDraft, userId, estado = null) => {
  const normalizedState = normalizeStateCode(rawDraft?.estado ?? estado);
  const baseDraft = createEmptyBallotDraft(userId, normalizedState || null);
  if (!rawDraft || typeof rawDraft !== 'object') return baseDraft;

  const rawSelections = emptySelections();
  Object.keys(rawSelections).forEach((officeKey) => {
    rawSelections[officeKey] = asArray(rawDraft.selections?.[officeKey])
      .map(normalizeStoredCandidate)
      .filter(Boolean);
  });

  const candidateGroups = emptyCandidateGroups();
  BALLOT_FLOW_STEP_IDS.forEach((stepId) => {
    candidateGroups[stepId] = asArray(rawDraft.candidate_groups?.[stepId])
      .map(normalizeStoredCandidate)
      .filter(Boolean);
  });

  const hasCandidateGroupsObject = rawDraft?.candidate_groups &&
    typeof rawDraft.candidate_groups === 'object' &&
    Object.keys(rawDraft.candidate_groups).length > 0;
  const hasGroupedCandidates = Object.values(candidateGroups).some((items) => items.length > 0);

  if (hasCandidateGroupsObject || hasGroupedCandidates) {
    candidateGroups.deputado_federal = uniqueCandidatesById(candidateGroups.deputado_federal);
    candidateGroups.senadores_1 = uniqueCandidatesById([
      ...candidateGroups.senadores_1,
      ...candidateGroups.senadores_2
    ]);
    candidateGroups.senadores_2 = [];
  } else {
    candidateGroups.deputado_federal = rawSelections.deputado_federal;
    candidateGroups.senadores_1 = rawSelections.senadores;
    candidateGroups.senadores_2 = [];
  }

  const selections = {
    deputado_federal: candidateGroups.deputado_federal,
    senadores: candidateGroups.senadores_1
  };
  const completedSteps = {
    deputado_federal: candidateGroups.deputado_federal.length >= OFFICE_MINIMUM_SELECTIONS.deputado_federal,
    senadores_1: candidateGroups.senadores_1.length >= 1,
    senadores_2: candidateGroups.senadores_1.length >= OFFICE_MINIMUM_SELECTIONS.senadores
  };
  const activeCandidateIds = [
    ...selections.deputado_federal,
    ...selections.senadores
  ].map((candidate) => candidate.id);

  return {
    ...baseDraft,
    ...rawDraft,
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    user_id: userId,
    estado: normalizedState || null,
    selections,
    candidate_groups: candidateGroups,
    completed_steps: completedSteps,
    active_candidate_ids: activeCandidateIds
  };
};

const makePlanHandoffToken = () => (
  randomBytes(PLAN_HANDOFF_TOKEN_BYTES)
    .toString('base64url')
);

const hashPlanHandoffToken = (electionId, token) => (
  createHash('sha256')
    .update(`${electionId}:plan-handoff:${token}`)
    .digest('hex')
);

const buildDraftResponse = (draft) => ({
  draft: {
    ...draft,
    updated_at: new Date().toISOString()
  }
});

export const createPlanHandoffToken = async ({ idToken, payload }) => {
  if (!idToken) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Login obrigatorio para gerar o QR Code.');
  }

  const { auth, db } = getAdminServices();
  const decodedToken = await auth.verifyIdToken(idToken);
  const userId = decodedToken.uid;
  const electionId = assertElectionPayload(payload);
  const rawDraft = payload.draft || {};
  const estado = normalizeStateCode(rawDraft.estado || payload.estado);

  if (!VALID_STATES.has(estado)) {
    throw new ApiError(400, 'INVALID_STATE', 'Estado invalido.');
  }

  const token = makePlanHandoffToken();
  const tokenHash = hashPlanHandoffToken(electionId, token);
  const replaceToken = asString(payload.replace_token);
  const replaceTokenHash = replaceToken ? hashPlanHandoffToken(electionId, assertValidId(replaceToken, 'Token anterior')) : '';
  const expiresAtMs = Date.now() + PLAN_HANDOFF_TTL_MS;
  const draft = normalizeDraft(rawDraft, userId, estado);

  const newTokenRef = db.doc(`elections/${electionId}/plan_handoff_tokens/${tokenHash}`);
  const batch = db.batch();

  if (replaceTokenHash && replaceTokenHash !== tokenHash) {
    const replacedTokenRef = db.doc(`elections/${electionId}/plan_handoff_tokens/${replaceTokenHash}`);
    const replacedTokenSnap = await replacedTokenRef.get();

    if (replacedTokenSnap.exists) {
      const replacedTokenData = replacedTokenSnap.data();
      if (replacedTokenData.created_by === userId && !replacedTokenData.used_at) {
        batch.update(replacedTokenRef, {
          used_at: FieldValue.serverTimestamp(),
          revoked_at: FieldValue.serverTimestamp(),
          revoked_by: userId,
          replaced_by_token_hash: tokenHash
        });
      }
    }
  }

  batch.set(newTokenRef, {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: electionId,
    token_hash: tokenHash,
    draft,
    created_by: userId,
    created_at: FieldValue.serverTimestamp(),
    expires_at_ms: expiresAtMs,
    used_at: null,
    revoked_at: null,
    revoked_by: null,
    replaced_by_token_hash: null,
    redeemed_by: null
  });

  await batch.commit();

  return {
    token,
    expires_at_ms: expiresAtMs,
    expires_in_seconds: Math.floor(PLAN_HANDOFF_TTL_MS / 1000)
  };
};

export const redeemPlanHandoffToken = async ({ payload }) => {
  const { auth, db } = getAdminServices();
  const electionId = assertElectionPayload(payload);
  const token = assertValidId(payload.token, 'Token');
  const tokenHash = hashPlanHandoffToken(electionId, token);
  const tokenRef = db.doc(`elections/${electionId}/plan_handoff_tokens/${tokenHash}`);
  let responseDraft = null;
  let handoffUserId = null;

  await db.runTransaction(async (transaction) => {
    const tokenSnap = await transaction.get(tokenRef);
    if (!tokenSnap.exists) {
      throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token nao encontrado.');
    }

    const tokenData = tokenSnap.data();
    if (tokenData.used_at || tokenData.revoked_at) {
      throw new ApiError(409, 'TOKEN_USED', 'Token ja utilizado.');
    }

    if (Number(tokenData.expires_at_ms || 0) <= Date.now()) {
      throw new ApiError(410, 'TOKEN_EXPIRED', 'Token expirado.');
    }

    handoffUserId = asString(tokenData.created_by);
    if (!handoffUserId) {
      throw new ApiError(409, 'TOKEN_WITHOUT_USER', 'Token sem usuario vinculado.');
    }

    responseDraft = normalizeDraft(tokenData.draft, handoffUserId, tokenData.draft?.estado);
    transaction.update(tokenRef, {
      used_at: FieldValue.serverTimestamp(),
      redeemed_by: handoffUserId
    });
  });

  const authToken = await auth.createCustomToken(handoffUserId, {
    election_id: electionId,
    handoff: true
  });

  return {
    ...buildDraftResponse(responseDraft),
    auth_token: authToken,
    user_id: handoffUserId
  };
};
