import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const db = getFirestore();
const ACTIVE_ELECTION_ID = 'congresso-2026';
const BALLOT_SCHEMA_VERSION = 1;
const FUNCTIONS_REGION = 'southamerica-east1';
const OFFICE_MINIMUM_SELECTIONS = {
  deputado_federal: 1,
  senadores: 2,
};
const BALLOT_FLOW_STEP_IDS = ['deputado_federal', 'senadores_1', 'senadores_2'];
const PLAN_HANDOFF_TTL_MS = 10 * 60 * 1000;
const PLAN_HANDOFF_TOKEN_BYTES = 32;
const MAX_REQUEST_BYTES = 32 * 1024;
const BALLOT_ENCRYPTION_KEY = defineSecret('BALLOT_ENCRYPTION_KEY');
const firebaseProjectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://bomdevoto.org',
  'https://www.bomdevoto.org',
  'https://bomdevoto.com.br',
  'https://www.bomdevoto.com.br',
  'https://planovoto-sys.github.io',
  ...(firebaseProjectId ? [
    `https://${firebaseProjectId}.web.app`,
    `https://${firebaseProjectId}.firebaseapp.com`,
  ] : []),
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const CALLABLE_OPTIONS = {
  region: FUNCTIONS_REGION,
  cors: configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS,
  enforceAppCheck: true,
};
const RATE_LIMITS = {
  syncUserProfile: { limit: 12, windowMs: 60 * 1000 },
  saveBallotState: { limit: 60, windowMs: 60 * 1000 },
  saveBallotStepSelection: { limit: 90, windowMs: 60 * 1000 },
  deleteUserElectionData: { limit: 3, windowMs: 60 * 60 * 1000 },
  createPlanHandoffToken: { limit: 20, windowMs: 10 * 60 * 1000 },
  redeemPlanHandoffToken: { limit: 30, windowMs: 10 * 60 * 1000 },
  castAnonymousVote: { limit: 5, windowMs: 60 * 60 * 1000 },
};
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
  'TO',
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
  ['TOCANTINS', 'TO'],
]);

const makeReceiptCode = (electionId, voteId) => (
  createHash('sha256')
    .update(`${electionId}:${voteId}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()
);

const makePlanHandoffToken = () => (
  randomBytes(PLAN_HANDOFF_TOKEN_BYTES)
    .toString('base64url')
);

const hashPlanHandoffToken = (electionId, token) => (
  createHash('sha256')
    .update(`${electionId}:plan-handoff:${token}`)
    .digest('hex')
);

const asString = (value) => (typeof value === 'string' ? value.trim() : '');

const asBoundedString = (value, maxLength = 160) => asString(value).slice(0, maxLength);

const assertRequestPayload = (request, allowedKeys) => {
  const payload = request.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpsError('invalid-argument', 'Payload invalido.');
  }

  let payloadSize = 0;
  try {
    payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    throw new HttpsError('invalid-argument', 'Payload invalido.');
  }

  if (payloadSize > MAX_REQUEST_BYTES) {
    throw new HttpsError('invalid-argument', 'Payload excede o limite permitido.');
  }

  const unexpectedKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new HttpsError('invalid-argument', 'Payload contem campos nao permitidos.');
  }

  return payload;
};

const assertObjectKeys = (value, allowedKeys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }

  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    throw new HttpsError('invalid-argument', `${label} contem campos nao permitidos.`);
  }

  return value;
};

const getRequestPrincipal = (request) => {
  if (request.auth?.uid) return `uid:${request.auth.uid}`;
  const ip = request.rawRequest?.ip || request.rawRequest?.socket?.remoteAddress || 'unknown';
  const appId = request.app?.appId || 'unknown-app';
  return `anonymous:${appId}:${ip}`;
};

const enforceRateLimit = async (request, action) => {
  const config = RATE_LIMITS[action];
  if (!config) throw new HttpsError('internal', 'Limite de seguranca nao configurado.');

  const principalHash = createHash('sha256')
    .update(`${action}:${getRequestPrincipal(request)}`)
    .digest('hex');
  const rateRef = db.doc(`security_rate_limits/${principalHash}`);
  const nowMs = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const current = snapshot.exists ? snapshot.data() : null;
    const windowStartedAtMs = Number(current?.window_started_at_ms || 0);
    const windowExpired = nowMs - windowStartedAtMs >= config.windowMs;
    const nextCount = windowExpired ? 1 : Number(current?.count || 0) + 1;

    if (!windowExpired && nextCount > config.limit) {
      throw new HttpsError('resource-exhausted', 'Muitas tentativas. Aguarde e tente novamente.');
    }

    transaction.set(rateRef, {
      action,
      count: nextCount,
      window_started_at_ms: windowExpired ? nowMs : windowStartedAtMs,
      expires_at_ms: (windowExpired ? nowMs : windowStartedAtMs) + config.windowMs,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
};

const getBallotEncryptionKey = () => {
  const encodedKey = BALLOT_ENCRYPTION_KEY.value();
  const key = Buffer.from(encodedKey || '', 'base64');
  if (key.length !== 32) {
    throw new HttpsError('failed-precondition', 'Criptografia de votos nao configurada.');
  }
  return key;
};

const encryptBallot = (ballot) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getBallotEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(ballot), 'utf8'),
    cipher.final(),
  ]);

  return {
    algorithm: 'A256GCM',
    key_version: 1,
    iv: iv.toString('base64'),
    authentication_tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
};

const decryptBallot = (encryptedBallot) => {
  if (encryptedBallot?.algorithm !== 'A256GCM') {
    throw new HttpsError('data-loss', 'Formato de voto criptografado invalido.');
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getBallotEncryptionKey(),
      Buffer.from(encryptedBallot.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(encryptedBallot.authentication_tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encryptedBallot.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plaintext);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('data-loss', 'Nao foi possivel descriptografar o voto.');
  }
};

const assertValidId = (value, label) => {
  const id = asString(value);
  if (!id || id.length > 160 || !/^[\p{L}\p{N}._~:-]+$/u.test(id)) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }
  return id;
};

const assertStringList = (value, { min = 1, max = 100, exact = null } = {}, label) => {
  const rawList = Array.isArray(value) ? value : asString(value) ? [value] : [];
  if (
    (exact !== null && rawList.length !== exact) ||
    rawList.length < min ||
    rawList.length > max
  ) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }

  const ids = rawList.map((item) => assertValidId(item, label));
  if (new Set(ids).size !== ids.length) {
    throw new HttpsError('invalid-argument', `${label} duplicado.`);
  }

  return ids;
};

const readNumericValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return 0;
};

const isEligibleStatus = (eligibility) => {
  if (eligibility?.eligible === false) return false;
  if (!eligibility?.status) return true;
  return ['eligible', 'active', 'approved'].includes(eligibility.status);
};

const buildCandidateSnapshot = (candidateId, data) => ({
  id: candidateId,
  nome: asBoundedString(data.Nome || data.nome, 160),
  partido: asBoundedString(data.Partido || data.partido || data.sigla_partido, 40),
  sigla_partido: asBoundedString(data.sigla_partido || data.siglaPartido || data.SiglaPartido, 20) || null,
  tipo: asBoundedString(data.tipo || data.Tipo, 40) || null,
  cargo: asBoundedString(data.Cargo || data.cargo, 80),
  numero: asBoundedString(data.Numero || data.numero, 12) || null,
  estado: getCandidateStateCode(data) || null,
  classificacao: asBoundedString(data['Classificação'] || data.Classificacao || data.classificacao, 80) || null,
  nota_candidato: readNumericValue(data.nota_candidato, data.notaCandidato, data['Nota candidato']),
  nota_partido: readNumericValue(data.nota_partido, data.notaPartido, data['Nota partido']),
  nota_final: readNumericValue(data.nota_final, data.notaFinal, data.nota_candidato, data.notaCandidato, data['Nota candidato'], data.nota_partido, data.notaPartido, data['Nota partido']),
  temNotaCandidato: data.temNotaCandidato ?? data.tem_nota_candidato ?? null,
  tem_nota_candidato: data.temNotaCandidato ?? data.tem_nota_candidato ?? null,
});

const normalizeOfficeName = (value) => (
  asString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

const makeVoteId = (electionId, userId) => (
  createHash('sha256')
    .update(`${electionId}:${userId}`)
    .digest('hex')
);

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

const getCandidateStateCode = (candidateData = {}) => {
  const directState = normalizeStateCode(
    candidateData.Estado ||
    candidateData.estado ||
    candidateData.UF ||
    candidateData.uf ||
    candidateData.Sigla ||
    candidateData.sigla
  );

  if (directState === 'TODOS' || VALID_STATES.has(directState)) return directState;

  const partyState = normalizeStateCode(candidateData.Partido || candidateData.partido);
  if (VALID_STATES.has(partyState)) return partyState;

  return '';
};

const assertCandidateOffice = (candidateData, expectedOffice) => {
  const actualOffice = candidateData.Cargo || candidateData.cargo;
  if (normalizeOfficeName(actualOffice) !== normalizeOfficeName(expectedOffice)) {
    throw new HttpsError('invalid-argument', `Candidato nao pertence ao cargo ${expectedOffice}.`);
  }
};

const assertCandidateState = (candidateData, expectedState, { requireState = false } = {}) => {
  const actualState = getCandidateStateCode(candidateData);
  if (requireState && !actualState) {
    throw new HttpsError('invalid-argument', 'Candidato nao possui estado definido.');
  }

  if (actualState && actualState !== 'TODOS' && actualState !== expectedState) {
    throw new HttpsError('invalid-argument', 'Candidato nao pertence ao estado informado.');
  }
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const emptySelections = () => ({
  deputado_federal: [],
  senadores: [],
});

const emptyCandidateGroups = () => ({
  deputado_federal: [],
  senadores_1: [],
  senadores_2: [],
});

const emptyCompletedSteps = () => ({
  deputado_federal: false,
  senadores_1: false,
  senadores_2: false,
});

const normalizeStoredCandidate = (candidate) => {
  if (!candidate?.id) return null;

  return buildCandidateSnapshot(assertValidId(candidate.id, 'Candidato'), candidate);
};

const uniqueCandidatesById = (candidates) => {
  const seenIds = new Set();
  return candidates.filter((candidate) => {
    if (!candidate?.id || seenIds.has(candidate.id)) return false;
    seenIds.add(candidate.id);
    return true;
  });
};

const createEmptyBallotDraft = (estado) => ({
  schema_version: BALLOT_SCHEMA_VERSION,
  metrics_version: 1,
  election_id: ACTIVE_ELECTION_ID,
  estado,
  selections: emptySelections(),
  candidate_groups: emptyCandidateGroups(),
  completed_steps: emptyCompletedSteps(),
  active_candidate_ids: [],
  updated_at: null,
});

const normalizeDraft = (rawDraft, userId, estado = null) => {
  const normalizedState = normalizeStateCode(rawDraft?.estado ?? estado);
  const baseDraft = createEmptyBallotDraft(normalizedState || null);
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
      ...candidateGroups.senadores_2,
    ]);
    candidateGroups.senadores_2 = [];
  } else {
    candidateGroups.deputado_federal = rawSelections.deputado_federal;
    candidateGroups.senadores_1 = rawSelections.senadores;
    candidateGroups.senadores_2 = [];
  }

  const selections = {
    deputado_federal: candidateGroups.deputado_federal,
    senadores: candidateGroups.senadores_1,
  };
  const completedSteps = {
    deputado_federal: candidateGroups.deputado_federal.length >= OFFICE_MINIMUM_SELECTIONS.deputado_federal,
    senadores_1: candidateGroups.senadores_1.length >= 1,
    senadores_2: candidateGroups.senadores_1.length >= OFFICE_MINIMUM_SELECTIONS.senadores,
  };
  const activeCandidateIds = [...new Set([
    ...selections.deputado_federal,
    ...selections.senadores,
  ].map((candidate) => candidate.id).filter(Boolean))];

  return {
    ...baseDraft,
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: normalizedState || null,
    selections,
    candidate_groups: candidateGroups,
    completed_steps: completedSteps,
    active_candidate_ids: activeCandidateIds,
  };
};

const updateDraftMetrics = (transaction, electionId, previousDraft, nextDraft, updatedAt) => {
  const previousState = normalizeStateCode(previousDraft?.estado);
  const nextState = normalizeStateCode(nextDraft?.estado);
  const previousCandidateIds = new Set(previousDraft?.active_candidate_ids || []);
  const nextCandidateIds = new Set(nextDraft?.active_candidate_ids || []);

  if (previousState && previousState !== nextState) {
    transaction.set(db.doc(`elections/${electionId}/state_choice_metrics/${previousState}`), {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      state: previousState,
      active_voters: FieldValue.increment(-1),
      updated_at: updatedAt,
    }, { merge: true });
  }

  if (nextState && previousState !== nextState) {
    transaction.set(db.doc(`elections/${electionId}/state_choice_metrics/${nextState}`), {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      state: nextState,
      active_voters: FieldValue.increment(1),
      updated_at: updatedAt,
    }, { merge: true });
  }

  previousCandidateIds.forEach((candidateId) => {
    if (previousState && (previousState !== nextState || !nextCandidateIds.has(candidateId))) {
      transaction.set(db.doc(`elections/${electionId}/selection_tallies/${previousState}__${candidateId}`), {
        schema_version: BALLOT_SCHEMA_VERSION,
        election_id: electionId,
        state: previousState,
        candidate_id: candidateId,
        active_selections: FieldValue.increment(-1),
        updated_at: updatedAt,
      }, { merge: true });
    }
  });

  nextCandidateIds.forEach((candidateId) => {
    if (nextState && (previousState !== nextState || !previousCandidateIds.has(candidateId))) {
      transaction.set(db.doc(`elections/${electionId}/selection_tallies/${nextState}__${candidateId}`), {
        schema_version: BALLOT_SCHEMA_VERSION,
        election_id: electionId,
        state: nextState,
        candidate_id: candidateId,
        active_selections: FieldValue.increment(1),
        updated_at: updatedAt,
      }, { merge: true });
    }
  });
};

const assertElectionPayload = (payload) => {
  const electionId = asString(payload.election_id) || ACTIVE_ELECTION_ID;
  if (electionId !== ACTIVE_ELECTION_ID) {
    throw new HttpsError('invalid-argument', 'Eleicao invalida.');
  }

  if (Number(payload.schema_version) !== BALLOT_SCHEMA_VERSION) {
    throw new HttpsError('invalid-argument', 'Versao do voto invalida.');
  }

  return electionId;
};

const assertStepKey = (value) => {
  const stepKey = asString(value);
  if (!BALLOT_FLOW_STEP_IDS.includes(stepKey)) {
    throw new HttpsError('invalid-argument', 'Etapa de voto invalida.');
  }

  return stepKey;
};

const getStepOffice = (stepKey) => (
  stepKey === 'deputado_federal' ? 'Deputado Federal' : 'Senador'
);

const buildAuthoritativeHandoffDraft = async (rawDraft, estado) => {
  const normalizedDraft = normalizeDraft(rawDraft, 'handoff', estado);
  const deputadoIds = normalizedDraft.candidate_groups.deputado_federal
    .map((candidate) => assertValidId(candidate.id, 'Candidato'));
  const senadorIds = normalizedDraft.candidate_groups.senadores_1
    .map((candidate) => assertValidId(candidate.id, 'Candidato'));
  const candidateIds = [...deputadoIds, ...senadorIds];

  if (deputadoIds.length > 1 || senadorIds.length > 2 || new Set(candidateIds).size !== candidateIds.length) {
    throw new HttpsError('invalid-argument', 'Selecoes do rascunho invalidas.');
  }

  const candidateRefs = candidateIds.map((candidateId) => db.doc(`candidatos/${candidateId}`));
  const candidateSnaps = candidateRefs.length > 0 ? await db.getAll(...candidateRefs) : [];
  const candidatesById = new Map();

  candidateSnaps.forEach((candidateSnap, index) => {
    if (!candidateSnap.exists) {
      throw new HttpsError('invalid-argument', 'Candidato nao encontrado.');
    }
    const candidateId = candidateIds[index];
    const candidateData = candidateSnap.data();
    assertCandidateState(candidateData, estado);
    candidatesById.set(candidateId, normalizeStoredCandidate(buildCandidateSnapshot(candidateId, candidateData)));
  });

  deputadoIds.forEach((candidateId) => {
    assertCandidateOffice(candidateSnaps[candidateIds.indexOf(candidateId)].data(), 'Deputado Federal');
  });
  senadorIds.forEach((candidateId) => {
    assertCandidateOffice(candidateSnaps[candidateIds.indexOf(candidateId)].data(), 'Senador');
  });

  return normalizeDraft({
    estado,
    candidate_groups: {
      deputado_federal: deputadoIds.map((candidateId) => candidatesById.get(candidateId)),
      senadores_1: senadorIds.map((candidateId) => candidatesById.get(candidateId)),
      senadores_2: [],
    },
  }, 'handoff', estado);
};

const buildDraftResponse = (draft) => ({
  draft: {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    estado: draft.estado || null,
    selections: draft.selections,
    candidate_groups: draft.candidate_groups,
    completed_steps: draft.completed_steps,
    updated_at: new Date().toISOString(),
  },
});

export const syncUserProfile = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  assertRequestPayload(request, []);
  await enforceRateLimit(request, 'syncUserProfile');

  const token = request.auth.token || {};
  const email = asBoundedString(token.email, 254);
  if (!email || token.email_verified === false) {
    throw new HttpsError('failed-precondition', 'Conta autenticada sem email verificado.');
  }

  const profileImage = asBoundedString(token.picture, 2048);
  if (profileImage && !/^https:\/\//i.test(profileImage)) {
    throw new HttpsError('invalid-argument', 'Imagem de perfil invalida.');
  }

  const userRef = db.doc(`users/${request.auth.uid}`);
  const snapshot = await userRef.get();
  const now = FieldValue.serverTimestamp();
  const profile = {
    name: asBoundedString(token.name, 120) || null,
    email,
    profile_image: profileImage || null,
    schema_version: 1,
    last_login_at: now,
    updated_at: now,
    candidatos_escolhidos: FieldValue.delete(),
  };

  if (!snapshot.exists) {
    profile.created_at = now;
    profile.role = 'voter';
    profile.estado = null;
  }
  await userRef.set(profile, { merge: true });
  return { ok: true };
});

export const saveBallotState = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = assertRequestPayload(request, ['election_id', 'schema_version', 'estado']);
  await enforceRateLimit(request, 'saveBallotState');
  const electionId = assertElectionPayload(payload);
  const estado = normalizeStateCode(payload.estado);
  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const userId = request.auth.uid;
  const updatedAt = FieldValue.serverTimestamp();
  const draftRef = db.doc(`elections/${electionId}/ballot_drafts/${userId}`);
  const userRef = db.doc(`users/${userId}`);
  let responseDraft = null;

  await db.runTransaction(async (transaction) => {
    const draftSnap = await transaction.get(draftRef);
    const previousDraft = normalizeDraft(draftSnap.exists ? draftSnap.data() : null, userId, estado);
    const nextDraft = previousDraft.estado === estado
      ? normalizeDraft({
        ...previousDraft,
        estado,
        updated_at: updatedAt,
      }, userId, estado)
      : {
        ...createEmptyBallotDraft(estado),
        updated_at: updatedAt,
      };

    const previousMetricsDraft = draftSnap.data()?.metrics_version === 1 ? previousDraft : null;
    updateDraftMetrics(transaction, electionId, previousMetricsDraft, nextDraft, updatedAt);
    transaction.set(draftRef, nextDraft, { merge: false });
    transaction.set(userRef, {
      estado,
      schema_version: 1,
      updated_at: updatedAt,
      candidatos_escolhidos: FieldValue.delete(),
    }, { merge: true });

    responseDraft = normalizeDraft(nextDraft, userId, estado);
  });

  return buildDraftResponse(responseDraft);
});

export const saveBallotStepSelection = onCall(CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = assertRequestPayload(request, [
    'election_id',
    'schema_version',
    'step_key',
    'estado',
    'candidate_ids',
  ]);
  await enforceRateLimit(request, 'saveBallotStepSelection');
  const electionId = assertElectionPayload(payload);
  const stepKey = assertStepKey(payload.step_key);
  const estado = normalizeStateCode(payload.estado);
  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const maximumCandidates = stepKey === 'deputado_federal' ? 1 : 2;
  const candidateIds = assertStringList(
    payload.candidate_ids,
    { min: 0, max: maximumCandidates },
    'Candidatos'
  );
  const userId = request.auth.uid;
  const updatedAt = FieldValue.serverTimestamp();
  const draftRef = db.doc(`elections/${electionId}/ballot_drafts/${userId}`);
  const candidateRefs = candidateIds.map((candidateId) => db.doc(`candidatos/${candidateId}`));
  let responseDraft = null;

  await db.runTransaction(async (transaction) => {
    const draftSnap = await transaction.get(draftRef);
    const previousDraft = normalizeDraft(draftSnap.exists ? draftSnap.data() : null, userId, estado);

    if (previousDraft.estado && previousDraft.estado !== estado) {
      throw new HttpsError('failed-precondition', 'Estado ativo diferente do estado informado.');
    }

    const candidateSnaps = [];
    for (const candidateRef of candidateRefs) {
      candidateSnaps.push(await transaction.get(candidateRef));
    }

    const candidateSnapshots = candidateSnaps.map((candidateSnap, index) => {
      if (!candidateSnap.exists) {
        throw new HttpsError('invalid-argument', 'Candidato nao encontrado.');
      }

      const data = candidateSnap.data();
      assertCandidateOffice(data, getStepOffice(stepKey));
      assertCandidateState(data, estado, { requireState: stepKey !== 'deputado_federal' });
      return normalizeStoredCandidate(buildCandidateSnapshot(candidateIds[index], data));
    });

    const nextDraft = normalizeDraft({
      ...previousDraft,
      estado,
      candidate_groups: {
        ...previousDraft.candidate_groups,
        [stepKey]: candidateSnapshots,
        ...(stepKey.startsWith('senadores') ? { senadores_2: [] } : {}),
      },
      updated_at: updatedAt,
    }, userId, estado);

    const senatorIds = nextDraft.candidate_groups.senadores_1.map((candidate) => candidate.id).filter(Boolean);
    if (new Set(senatorIds).size !== senatorIds.length) {
      throw new HttpsError('invalid-argument', 'O mesmo senador nao pode ser escolhido mais de uma vez.');
    }

    const previousMetricsDraft = draftSnap.data()?.metrics_version === 1 ? previousDraft : null;
    updateDraftMetrics(transaction, electionId, previousMetricsDraft, nextDraft, updatedAt);
    transaction.set(draftRef, {
      ...nextDraft,
      updated_at: updatedAt,
    }, { merge: false });

    responseDraft = nextDraft;
  });

  return buildDraftResponse(responseDraft);
});

export const deleteUserElectionData = onCall({
  ...CALLABLE_OPTIONS,
  secrets: [BALLOT_ENCRYPTION_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = assertRequestPayload(request, ['election_id', 'schema_version']);
  await enforceRateLimit(request, 'deleteUserElectionData');
  const electionId = assertElectionPayload(payload);
  const userId = request.auth.uid;
  const updatedAt = FieldValue.serverTimestamp();
  const draftRef = db.doc(`elections/${electionId}/ballot_drafts/${userId}`);
  const userRef = db.doc(`users/${userId}`);
  const voteRef = db.doc(`elections/${electionId}/votes/${makeVoteId(electionId, userId)}`);
  const eligibilityRef = db.doc(`elections/${electionId}/eligibility/${userId}`);
  const choiceConfigRef = db.doc(`users/${userId}/private/choiceConfig`);

  await db.runTransaction(async (transaction) => {
    const draftSnap = await transaction.get(draftRef);
    const voteSnap = await transaction.get(voteRef);
    const eligibilitySnap = await transaction.get(eligibilityRef);
    const choiceConfigSnap = await transaction.get(choiceConfigRef);
    const voteData = voteSnap.exists ? voteSnap.data() : null;
    const decryptedVote = voteData?.encrypted_ballot
      ? decryptBallot(voteData.encrypted_ballot)
      : voteData;
    const legacyVoteCandidateIds = voteSnap.exists
      ? asArray(decryptedVote?.candidate_ids).map(asString).filter(Boolean)
      : [];

    if (draftSnap.exists && draftSnap.data()?.metrics_version === 1) {
      const previousDraft = normalizeDraft(draftSnap.data(), userId, draftSnap.data()?.estado);
      updateDraftMetrics(transaction, electionId, previousDraft, null, updatedAt);
    }

    legacyVoteCandidateIds.forEach((candidateId) => {
      transaction.set(db.doc(`elections/${electionId}/candidate_tallies/${candidateId}`), {
        schema_version: BALLOT_SCHEMA_VERSION,
        election_id: electionId,
        candidate_id: candidateId,
        total_votes: FieldValue.increment(-1),
        updated_at: updatedAt,
      }, { merge: true });
    });

    transaction.delete(draftRef);
    transaction.delete(choiceConfigRef);
    const legacyChoiceDocId = asString(choiceConfigSnap.data()?.choiceDocId);
    if (legacyChoiceDocId && /^[\p{L}\p{N}._~:-]+$/u.test(legacyChoiceDocId)) {
      transaction.delete(db.doc(`publicCandidateChoices/${legacyChoiceDocId}`));
    }
    if (voteSnap.exists) transaction.delete(voteRef);
    if (eligibilitySnap.exists) {
      transaction.update(eligibilityRef, {
        has_voted: FieldValue.delete(),
        vote_id: FieldValue.delete(),
        receipt_code: FieldValue.delete(),
        voted_at: FieldValue.delete(),
        updated_at: updatedAt,
      });
    }

    transaction.set(userRef, {
      estado: FieldValue.delete(),
      candidatos_escolhidos: FieldValue.delete(),
      updated_at: updatedAt,
    }, { merge: true });
  });

  return { ok: true };
});

export const createPlanHandoffToken = onCall(CALLABLE_OPTIONS, async (request) => {
  const payload = assertRequestPayload(request, [
    'election_id',
    'schema_version',
    'estado',
    'draft',
  ]);
  await enforceRateLimit(request, 'createPlanHandoffToken');
  const electionId = assertElectionPayload(payload);
  const rawDraft = assertObjectKeys(payload.draft || {}, [
    'schema_version',
    'election_id',
    'estado',
    'selections',
    'candidate_groups',
    'completed_steps',
    'active_candidate_ids',
    'updated_at',
  ], 'Rascunho');
  const estado = normalizeStateCode(rawDraft.estado || payload.estado);

  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const token = makePlanHandoffToken();
  const tokenHash = hashPlanHandoffToken(electionId, token);
  const expiresAtMs = Date.now() + PLAN_HANDOFF_TTL_MS;
  const draft = await buildAuthoritativeHandoffDraft(rawDraft, estado);

  await db.doc(`elections/${electionId}/plan_handoff_tokens/${tokenHash}`).set({
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: electionId,
    token_hash: tokenHash,
    draft,
    created_by: request.auth?.uid || null,
    created_at: FieldValue.serverTimestamp(),
    expires_at_ms: expiresAtMs,
    used_at: null,
    redeemed_by: null,
  });

  return {
    token,
    expires_at_ms: expiresAtMs,
    expires_in_seconds: Math.floor(PLAN_HANDOFF_TTL_MS / 1000),
  };
});

export const redeemPlanHandoffToken = onCall(CALLABLE_OPTIONS, async (request) => {
  const payload = assertRequestPayload(request, ['election_id', 'schema_version', 'token']);
  await enforceRateLimit(request, 'redeemPlanHandoffToken');
  const electionId = assertElectionPayload(payload);
  const token = assertValidId(payload.token, 'Token');
  const tokenHash = hashPlanHandoffToken(electionId, token);
  const tokenRef = db.doc(`elections/${electionId}/plan_handoff_tokens/${tokenHash}`);
  let responseDraft = null;

  await db.runTransaction(async (transaction) => {
    const tokenSnap = await transaction.get(tokenRef);
    if (!tokenSnap.exists) {
      throw new HttpsError('not-found', 'Token nao encontrado.');
    }

    const tokenData = tokenSnap.data();
    if (tokenData.used_at) {
      throw new HttpsError('failed-precondition', 'Token ja utilizado.');
    }

    if (Number(tokenData.expires_at_ms || 0) <= Date.now()) {
      throw new HttpsError('deadline-exceeded', 'Token expirado.');
    }

    responseDraft = normalizeDraft(tokenData.draft, request.auth?.uid || 'handoff', tokenData.draft?.estado);
    transaction.update(tokenRef, {
      used_at: FieldValue.serverTimestamp(),
      redeemed_by: request.auth?.uid || null,
    });
  });

  return buildDraftResponse(responseDraft);
});

export const castAnonymousVote = onCall({
  ...CALLABLE_OPTIONS,
  secrets: [BALLOT_ENCRYPTION_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = assertRequestPayload(request, [
    'election_id',
    'schema_version',
    'estado',
    'offices',
    'candidate_ids',
  ]);
  await enforceRateLimit(request, 'castAnonymousVote');
  const electionId = asString(payload.election_id) || ACTIVE_ELECTION_ID;
  const estado = normalizeStateCode(payload.estado);
  const offices = assertObjectKeys(payload.offices, ['deputado_federal', 'senadores'], 'Cargos');

  if (electionId !== ACTIVE_ELECTION_ID) {
    throw new HttpsError('invalid-argument', 'Eleicao invalida.');
  }

  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  if (Number(payload.schema_version) !== BALLOT_SCHEMA_VERSION) {
    throw new HttpsError('invalid-argument', 'Versao do voto invalida.');
  }

  const deputadosFederais = assertStringList(
    offices.deputado_federal,
    { exact: OFFICE_MINIMUM_SELECTIONS.deputado_federal },
    'Deputado federal'
  );
  const senadores = assertStringList(
    offices.senadores,
    { exact: OFFICE_MINIMUM_SELECTIONS.senadores },
    'Senadores'
  );
  const candidateIds = assertStringList(
    payload.candidate_ids,
    { exact: OFFICE_MINIMUM_SELECTIONS.deputado_federal + OFFICE_MINIMUM_SELECTIONS.senadores },
    'Candidatos'
  );
  const expectedCandidateIds = [...deputadosFederais, ...senadores];

  if (
    candidateIds.some((candidateId) => !expectedCandidateIds.includes(candidateId)) ||
    expectedCandidateIds.some((candidateId) => !candidateIds.includes(candidateId))
  ) {
    throw new HttpsError('invalid-argument', 'Candidatos inconsistentes com os cargos selecionados.');
  }

  const userId = request.auth.uid;
  const submittedAt = FieldValue.serverTimestamp();
  const eligibilityRef = db.doc(`elections/${electionId}/eligibility/${userId}`);
  const voteRef = db.doc(`elections/${electionId}/votes/${makeVoteId(electionId, userId)}`);
  const auditRef = db.collection(`elections/${electionId}/audit_events`).doc();
  const candidateRefs = candidateIds.map((candidateId) => db.doc(`candidatos/${candidateId}`));
  const receiptCode = makeReceiptCode(electionId, voteRef.id);

  await db.runTransaction(async (transaction) => {
    const eligibilitySnap = await transaction.get(eligibilityRef);
    const voteSnap = await transaction.get(voteRef);

    if (!eligibilitySnap.exists) {
      throw new HttpsError('failed-precondition', 'VOTER_NOT_ENROLLED');
    }

    if (voteSnap.exists) {
      throw new HttpsError('already-exists', 'VOTE_ALREADY_CAST');
    }

    const eligibility = eligibilitySnap.data();
    if (eligibility.has_voted === true) {
      throw new HttpsError('already-exists', 'VOTE_ALREADY_CAST');
    }

    if (!isEligibleStatus(eligibility)) {
      throw new HttpsError('permission-denied', 'VOTER_NOT_ELIGIBLE');
    }

    const candidateSnaps = [];
    for (const candidateRef of candidateRefs) {
      candidateSnaps.push(await transaction.get(candidateRef));
    }

    candidateSnaps.forEach((candidateSnap) => {
      if (!candidateSnap.exists) {
        throw new HttpsError('invalid-argument', 'Candidato nao encontrado.');
      }
    });

    const candidateData = candidateSnaps.map((candidateSnap) => candidateSnap.data());
    deputadosFederais.forEach((candidateId) => {
      const index = candidateIds.indexOf(candidateId);
      assertCandidateOffice(candidateData[index], 'Deputado Federal');
    });
    senadores.forEach((candidateId) => {
      const index = candidateIds.indexOf(candidateId);
      assertCandidateOffice(candidateData[index], 'Senador');
    });
    candidateData.forEach((candidate) => {
      assertCandidateState(candidate, estado);
    });

    const encryptedBallot = encryptBallot({
      estado,
      offices: {
        deputado_federal: deputadosFederais,
        senadores,
      },
      candidate_ids: candidateIds,
      candidate_snapshots: candidateIds.map((candidateId, index) => (
        buildCandidateSnapshot(candidateId, candidateData[index])
      )),
    });

    transaction.set(voteRef, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      encrypted_ballot: encryptedBallot,
      submitted_at: submittedAt,
      source: 'cloud-function-callable',
    });

    transaction.update(eligibilityRef, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      has_voted: true,
      vote_id: voteRef.id,
      receipt_code: receiptCode,
      voted_at: submittedAt,
      updated_at: submittedAt,
    });

    candidateRefs.forEach((candidateRef, index) => {
      const candidateId = candidateIds[index];
      transaction.update(candidateRef, {
        votos_recebidos: FieldValue.increment(1),
      });

      transaction.set(db.doc(`elections/${electionId}/candidate_tallies/${candidateId}`), {
        schema_version: BALLOT_SCHEMA_VERSION,
        election_id: electionId,
        candidate_id: candidateId,
        total_votes: FieldValue.increment(1),
        updated_at: submittedAt,
      }, { merge: true });
    });

    transaction.set(auditRef, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      event_type: 'anonymous_vote_cast',
      created_at: submittedAt,
      source: 'cloud-function-callable',
    });
  });

  return {
    electionId,
    receiptCode,
  };
});
