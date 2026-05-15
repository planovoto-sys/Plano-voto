import { createHash, randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

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

const assertValidId = (value, label) => {
  const id = asString(value);
  if (!id || id.includes('/') || id.length > 160) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }
  return id;
};

const assertStringList = (value, { min = 1, exact = null } = {}, label) => {
  const rawList = Array.isArray(value) ? value : asString(value) ? [value] : [];
  if ((exact !== null && rawList.length !== exact) || rawList.length < min) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }

  const ids = rawList.map((item) => assertValidId(item, label));
  if (new Set(ids).size !== ids.length) {
    throw new HttpsError('invalid-argument', `${label} duplicado.`);
  }

  return ids;
};

const isEligibleStatus = (eligibility) => {
  if (eligibility?.eligible === false) return false;
  if (!eligibility?.status) return true;
  return ['eligible', 'active', 'approved'].includes(eligibility.status);
};

const buildCandidateSnapshot = (candidateId, data) => ({
  id: candidateId,
  nome: data.Nome || data.nome || '',
  partido: data.Partido || data.partido || '',
  cargo: data.Cargo || data.cargo || '',
  numero: data.Numero || data.numero || null,
  estado: data.Estado || data.estado || null,
  classificacao: data['Classificação'] || data.Classificacao || data.classificacao || null,
  nota_final: Number(data['Nota candidato'] || data['Nota partido'] || data.nota_final || 0) || 0,
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

const assertCandidateOffice = (candidateId, candidateData, expectedOffice) => {
  const actualOffice = candidateData.Cargo || candidateData.cargo;
  if (normalizeOfficeName(actualOffice) !== normalizeOfficeName(expectedOffice)) {
    throw new HttpsError('invalid-argument', `Candidato ${candidateId} nao pertence ao cargo ${expectedOffice}.`);
  }
};

const assertCandidateState = (candidateId, candidateData, expectedState, { requireState = false } = {}) => {
  const actualState = getCandidateStateCode(candidateData);
  if (requireState && !actualState) {
    throw new HttpsError('invalid-argument', `Candidato ${candidateId} nao possui estado definido.`);
  }

  if (actualState && actualState !== 'TODOS' && actualState !== expectedState) {
    throw new HttpsError('invalid-argument', `Candidato ${candidateId} nao pertence ao estado informado.`);
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

  return {
    id: candidate.id,
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
    ranking_total: Number(candidate.ranking_total ?? candidate.rankingTotal ?? 0) || 0,
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
  updated_at: null,
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

  const hasGroupedCandidates = Object.values(candidateGroups).some((items) => items.length > 0);
  if (hasGroupedCandidates) {
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
  const activeCandidateIds = [
    ...selections.deputado_federal,
    ...selections.senadores,
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
    active_candidate_ids: activeCandidateIds,
  };
};

const getActiveCandidateIdCounts = (draft) => {
  const counts = new Map();
  const normalizedDraft = normalizeDraft(draft, draft?.user_id || '');
  normalizedDraft.active_candidate_ids.forEach((candidateId) => {
    counts.set(candidateId, (counts.get(candidateId) || 0) + 1);
  });
  return counts;
};

const updateActiveTallies = async (transaction, electionId, oldDraft, newDraft, updatedAt) => {
  const oldCounts = getActiveCandidateIdCounts(oldDraft);
  const newCounts = getActiveCandidateIdCounts(newDraft);
  const candidateIds = new Set([...oldCounts.keys(), ...newCounts.keys()]);
  const changes = [];

  candidateIds.forEach((candidateId) => {
    const delta = (newCounts.get(candidateId) || 0) - (oldCounts.get(candidateId) || 0);
    if (delta === 0) return;
    changes.push({
      candidateId,
      delta,
      ref: db.doc(`elections/${electionId}/candidate_tallies/${candidateId}`),
    });
  });

  const tallySnaps = [];
  for (const change of changes) {
    tallySnaps.push(await transaction.get(change.ref));
  }

  changes.forEach((change, index) => {
    const currentActiveSelections = Number(tallySnaps[index].data()?.active_selections || 0) || 0;
    transaction.set(change.ref, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      candidate_id: change.candidateId,
      active_selections: Math.max(0, currentActiveSelections + change.delta),
      updated_at: updatedAt,
    }, { merge: true });
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

const buildDraftResponse = (draft) => ({
  draft: {
    ...draft,
    updated_at: new Date().toISOString(),
  },
});

export const saveBallotState = onCall({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = request.data || {};
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
        ...createEmptyBallotDraft(userId, estado),
        updated_at: updatedAt,
      };

    await updateActiveTallies(transaction, electionId, previousDraft, nextDraft, updatedAt);
    transaction.set(draftRef, nextDraft, { merge: false });
    transaction.set(userRef, {
      estado,
      role: 'voter',
      schema_version: 1,
      updated_at: updatedAt,
      candidatos_escolhidos: FieldValue.delete(),
    }, { merge: true });

    responseDraft = normalizeDraft(nextDraft, userId, estado);
  });

  return buildDraftResponse(responseDraft);
});

export const saveBallotStepSelection = onCall({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = request.data || {};
  const electionId = assertElectionPayload(payload);
  const stepKey = assertStepKey(payload.step_key);
  const estado = normalizeStateCode(payload.estado);
  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const candidateIds = asArray(payload.candidate_ids)
    .map((candidateId) => assertValidId(candidateId, 'Candidato'))
    .filter(Boolean);
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
        throw new HttpsError('invalid-argument', `Candidato ${candidateIds[index]} nao encontrado.`);
      }

      const data = candidateSnap.data();
      assertCandidateOffice(candidateIds[index], data, getStepOffice(stepKey));
      assertCandidateState(candidateIds[index], data, estado, { requireState: stepKey !== 'deputado_federal' });
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

    await updateActiveTallies(transaction, electionId, previousDraft, nextDraft, updatedAt);
    transaction.set(draftRef, {
      ...nextDraft,
      updated_at: updatedAt,
    }, { merge: false });

    responseDraft = nextDraft;
  });

  return buildDraftResponse(responseDraft);
});

export const deleteUserElectionData = onCall({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = request.data || {};
  const electionId = assertElectionPayload(payload);
  const userId = request.auth.uid;
  const updatedAt = FieldValue.serverTimestamp();
  const draftRef = db.doc(`elections/${electionId}/ballot_drafts/${userId}`);
  const userRef = db.doc(`users/${userId}`);
  const voteRef = db.doc(`elections/${electionId}/votes/${makeVoteId(electionId, userId)}`);
  const eligibilityRef = db.doc(`elections/${electionId}/eligibility/${userId}`);

  await db.runTransaction(async (transaction) => {
    const draftSnap = await transaction.get(draftRef);
    const voteSnap = await transaction.get(voteRef);
    const eligibilitySnap = await transaction.get(eligibilityRef);
    const previousDraft = normalizeDraft(draftSnap.exists ? draftSnap.data() : null, userId);
    const emptyDraft = createEmptyBallotDraft(userId, null);
    const legacyVoteCandidateIds = voteSnap.exists
      ? asArray(voteSnap.data().candidate_ids).map(asString).filter(Boolean)
      : [];

    await updateActiveTallies(transaction, electionId, previousDraft, emptyDraft, updatedAt);
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

export const createPlanHandoffToken = onCall({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  const payload = request.data || {};
  const electionId = assertElectionPayload(payload);
  const rawDraft = payload.draft || {};
  const estado = normalizeStateCode(rawDraft.estado || payload.estado);

  if (!VALID_STATES.has(estado)) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const token = makePlanHandoffToken();
  const tokenHash = hashPlanHandoffToken(electionId, token);
  const expiresAtMs = Date.now() + PLAN_HANDOFF_TTL_MS;
  const draft = normalizeDraft(rawDraft, request.auth?.uid || 'handoff', estado);

  draft.active_candidate_ids.forEach((candidateId) => {
    assertValidId(candidateId, 'Candidato');
  });

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

export const redeemPlanHandoffToken = onCall({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  const payload = request.data || {};
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
  region: FUNCTIONS_REGION,
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = request.data || {};
  const electionId = asString(payload.election_id) || ACTIVE_ELECTION_ID;
  const estado = normalizeStateCode(payload.estado);

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
    payload.offices?.deputado_federal,
    { min: OFFICE_MINIMUM_SELECTIONS.deputado_federal },
    'Deputado federal'
  );
  const senadores = assertStringList(
    payload.offices?.senadores,
    { min: OFFICE_MINIMUM_SELECTIONS.senadores },
    'Senadores'
  );
  const candidateIds = assertStringList(
    payload.candidate_ids,
    { min: OFFICE_MINIMUM_SELECTIONS.deputado_federal + OFFICE_MINIMUM_SELECTIONS.senadores },
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

    candidateSnaps.forEach((candidateSnap, index) => {
      if (!candidateSnap.exists) {
        throw new HttpsError('invalid-argument', `Candidato ${candidateIds[index]} nao encontrado.`);
      }
    });

    const candidateData = candidateSnaps.map((candidateSnap) => candidateSnap.data());
    deputadosFederais.forEach((candidateId) => {
      const index = candidateIds.indexOf(candidateId);
      assertCandidateOffice(candidateId, candidateData[index], 'Deputado Federal');
    });
    senadores.forEach((candidateId) => {
      const index = candidateIds.indexOf(candidateId);
      assertCandidateOffice(candidateId, candidateData[index], 'Senador');
    });
    candidateData.forEach((candidate, index) => {
      assertCandidateState(candidateIds[index], candidate, estado);
    });

    transaction.set(voteRef, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      estado,
      offices: {
        deputado_federal: deputadosFederais,
        senadores,
      },
      candidate_ids: candidateIds,
      candidate_snapshots: candidateIds.map((candidateId, index) => (
        buildCandidateSnapshot(candidateId, candidateData[index])
      )),
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
