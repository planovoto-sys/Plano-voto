import {
  ACTIVE_ELECTION_ID,
  BALLOT_ROUTES,
  BALLOT_SCHEMA_VERSION,
  CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME,
  REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME
} from '@/shared/constants/ballot';
import { callBackend } from '@/shared/api/backend';
import { normalizeDraft } from './ballotDraftNormalize';
import { VotingError } from './ballotErrors';

export const LOCAL_PLAN_HANDOFF_TOKEN = 'local';
export const LOCAL_PLAN_HANDOFF_SHORT_TOKEN = 'l';
export const LOCAL_PLAN_HANDOFF_HASH_KEY = 'd';

const decodeBase64Url = (value) => {
  const base64 = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

const buildPortableDraft = (draft) => {
  const normalizedDraft = normalizeDraft(draft);

  return {
    v: 3,
    e: normalizedDraft.estado,
    p: normalizedDraft.candidate_groups.presidente.map((candidate) => candidate.id).filter(Boolean),
    d: normalizedDraft.candidate_groups.deputado_federal.map((candidate) => candidate.id).filter(Boolean),
    s: normalizedDraft.candidate_groups.senadores_1.map((candidate) => candidate.id).filter(Boolean)
  };
};

const encodePayloadPart = (value) => encodeURIComponent(String(value || ''));
const decodePayloadPart = (value) => decodeURIComponent(String(value || ''));

const encodeCandidateIds = (candidateIds = []) => candidateIds.map(encodePayloadPart).join(',');

const decodeCandidateIds = (value = '') => (
  String(value || '')
    .split(',')
    .map(decodePayloadPart)
    .filter(Boolean)
);

const encodeCompactPayload = (draft) => {
  const portableDraft = buildPortableDraft(draft);
  return [
    '3',
    encodePayloadPart(portableDraft.e),
    encodeCandidateIds(portableDraft.p),
    encodeCandidateIds(portableDraft.s),
    encodeCandidateIds(portableDraft.d),
  ].join('|');
};

const decodeCompactPayload = (payload) => {
  const parts = String(payload || '').split('|');
  const [version, estado] = parts;
  if (!['2', '3'].includes(version)) return null;
  const [presidenteIds, senadorIds, deputadoIds] = version === '3'
    ? [parts[2] || '', parts[3] || '', parts[4] || '']
    : ['', parts[3] || '', parts[2] || ''];

  return normalizeDraft({
    estado: decodePayloadPart(estado),
    candidate_groups: {
      presidente: decodeCandidateIds(presidenteIds).map((candidateId) => ({
        id: candidateId,
        cargo: 'Presidente',
        estado: 'TODOS'
      })),
      deputado_federal: decodeCandidateIds(deputadoIds).map((candidateId) => ({
        id: candidateId,
        cargo: 'Deputado Federal',
        estado: decodePayloadPart(estado)
      })),
      senadores_1: decodeCandidateIds(senadorIds).map((candidateId) => ({
        id: candidateId,
        cargo: 'Senador',
        estado: decodePayloadPart(estado)
      })),
      senadores_2: []
    },
    updated_at: new Date().toISOString()
  }, decodePayloadPart(estado));
};

const readHashParam = (rawHash, keys) => {
  const segments = String(rawHash || '').split('&');
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const prefix = `${key}=`;
    const match = segments.find((segment) => segment.startsWith(prefix));
    if (match) return match.slice(prefix.length);
  }

  return null;
};

const expandCompactCandidate = (candidate, cargo, estado) => ({
  id: candidate.i,
  nome: candidate.n || '',
  partido: candidate.p || '',
  cargo,
  numero: candidate.nu || null,
  estado: candidate.uf || estado,
  nota_final: Number(candidate.nf || 0) || 0,
  nota_candidato: Number(candidate.nc || 0) || 0,
  nota_partido: Number(candidate.np || 0) || 0,
  chance: Number(candidate.ch || 0) || 0,
  selected_by_users: Number(candidate.sb || 0) || 0,
  average_elected_votes: Number(candidate.av || 0) || 0
});

export const createLocalPlanHandoffPayload = (draft) => encodeCompactPayload(draft);

export const createLocalPlanHandoffUrl = (draft, origin = '') => {
  const normalizedDraft = normalizeDraft(draft);
  if (!normalizedDraft.estado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de gerar o QR Code.');
  }

  const baseUrl = `${origin}${BALLOT_ROUTES.continuarPlanoCurto}/${LOCAL_PLAN_HANDOFF_SHORT_TOKEN}`;
  return `${baseUrl}#${LOCAL_PLAN_HANDOFF_HASH_KEY}=${createLocalPlanHandoffPayload(normalizedDraft)}`;
};

export const readLocalPlanHandoffDraft = (hash = '') => {
  const rawHash = String(hash || '').replace(/^#/, '');
  if (!rawHash) return null;

  const payload = readHashParam(rawHash, [LOCAL_PLAN_HANDOFF_HASH_KEY, 'draft']);
  if (!payload) return null;

  const compactDraft = decodeCompactPayload(payload);
  if (compactDraft?.estado) return compactDraft;

  const parsedDraft = JSON.parse(decodeBase64Url(decodeURIComponent(payload)));
  if (parsedDraft?.v === 3) {
    return normalizeDraft({
      estado: parsedDraft.e,
      candidate_groups: {
        presidente: (parsedDraft.p || []).map((candidateId) => ({
          id: candidateId,
          cargo: 'Presidente',
          estado: 'TODOS'
        })),
        deputado_federal: (parsedDraft.d || []).map((candidateId) => ({
          id: candidateId,
          cargo: 'Deputado Federal',
          estado: parsedDraft.e
        })),
        senadores_1: (parsedDraft.s || []).map((candidateId) => ({
          id: candidateId,
          cargo: 'Senador',
          estado: parsedDraft.e
        })),
        senadores_2: []
      },
      updated_at: parsedDraft.u || null
    }, parsedDraft.e);
  }

  if (parsedDraft?.v === 2) {
    return normalizeDraft({
      estado: parsedDraft.e,
      candidate_groups: {
        deputado_federal: (parsedDraft.d || []).map((candidateId) => ({
          id: candidateId,
          cargo: 'Deputado Federal',
          estado: parsedDraft.e
        })),
        senadores_1: (parsedDraft.s || []).map((candidateId) => ({
          id: candidateId,
          cargo: 'Senador',
          estado: parsedDraft.e
        })),
        senadores_2: []
      },
      updated_at: parsedDraft.u || null
    }, parsedDraft.e);
  }

  if (parsedDraft?.v === 1) {
    return normalizeDraft({
      estado: parsedDraft.e,
      candidate_groups: {
        deputado_federal: (parsedDraft.d || []).map((candidate) => (
          expandCompactCandidate(candidate, 'Deputado Federal', parsedDraft.e)
        )),
        senadores_1: (parsedDraft.s || []).map((candidate) => (
          expandCompactCandidate(candidate, 'Senador', parsedDraft.e)
        )),
        senadores_2: []
      },
      updated_at: parsedDraft.u || null
    }, parsedDraft.e);
  }

  return normalizeDraft(parsedDraft);
};

export const createPlanHandoffToken = async (draft) => {
  const normalizedDraft = normalizeDraft(draft);
  if (!normalizedDraft.estado) {
    throw new VotingError('STATE_REQUIRED', 'Escolha um estado antes de gerar o QR Code.');
  }

  const response = await callBackend(CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME, {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    draft: normalizedDraft
  });

  return response.data || {};
};

export const redeemPlanHandoffToken = async (token) => {
  const response = await callBackend(REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME, {
    schema_version: BALLOT_SCHEMA_VERSION,
    election_id: ACTIVE_ELECTION_ID,
    token
  });

  return normalizeDraft(response.data?.draft || null);
};
