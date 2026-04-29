import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const ACTIVE_ELECTION_ID = 'congresso-2026';
const BALLOT_SCHEMA_VERSION = 1;
const OFFICE_LIMITS = {
  deputado_federal: 1,
  senadores: 2,
};

const makeReceiptCode = (electionId, voteId) => (
  createHash('sha256')
    .update(`${electionId}:${voteId}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()
);

const asString = (value) => (typeof value === 'string' ? value.trim() : '');

const assertValidId = (value, label) => {
  const id = asString(value);
  if (!id || id.includes('/') || id.length > 160) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }
  return id;
};

const assertStringList = (value, size, label) => {
  if (!Array.isArray(value) || value.length !== size) {
    throw new HttpsError('invalid-argument', `${label} invalido.`);
  }

  const ids = value.map((item) => assertValidId(item, label));
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

const assertCandidateOffice = (candidateId, candidateData, expectedOffice) => {
  if (candidateData.Cargo !== expectedOffice) {
    throw new HttpsError('invalid-argument', `Candidato ${candidateId} nao pertence ao cargo ${expectedOffice}.`);
  }
};

export const castAnonymousVote = onCall({
  region: 'southamerica-east1',
  enforceAppCheck: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  }

  const payload = request.data || {};
  const electionId = asString(payload.election_id) || ACTIVE_ELECTION_ID;
  const estado = asString(payload.estado);

  if (electionId !== ACTIVE_ELECTION_ID) {
    throw new HttpsError('invalid-argument', 'Eleicao invalida.');
  }

  if (!estado || estado.length !== 2) {
    throw new HttpsError('invalid-argument', 'Estado invalido.');
  }

  const deputadoFederal = assertValidId(payload.offices?.deputado_federal, 'Deputado federal');
  const senadores = assertStringList(payload.offices?.senadores, OFFICE_LIMITS.senadores, 'Senadores');
  const candidateIds = assertStringList(payload.candidate_ids, 3, 'Candidatos');
  const expectedCandidateIds = [deputadoFederal, ...senadores];

  if (candidateIds.some((candidateId) => !expectedCandidateIds.includes(candidateId))) {
    throw new HttpsError('invalid-argument', 'Candidatos inconsistentes com os cargos selecionados.');
  }

  const userId = request.auth.uid;
  const submittedAt = FieldValue.serverTimestamp();
  const eligibilityRef = db.doc(`elections/${electionId}/eligibility/${userId}`);
  const voteRef = db.collection(`elections/${electionId}/votes`).doc();
  const auditRef = db.collection(`elections/${electionId}/audit_events`).doc();
  const candidateRefs = candidateIds.map((candidateId) => db.doc(`candidatos/${candidateId}`));
  const receiptCode = makeReceiptCode(electionId, voteRef.id);

  await db.runTransaction(async (transaction) => {
    const eligibilitySnap = await transaction.get(eligibilityRef);

    if (!eligibilitySnap.exists) {
      throw new HttpsError('failed-precondition', 'VOTER_NOT_ENROLLED');
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
    assertCandidateOffice(deputadoFederal, candidateData[0], 'Deputado Federal');
    assertCandidateOffice(senadores[0], candidateData[1], 'Senador');
    assertCandidateOffice(senadores[1], candidateData[2], 'Senador');

    transaction.set(voteRef, {
      schema_version: BALLOT_SCHEMA_VERSION,
      election_id: electionId,
      estado,
      offices: {
        deputado_federal: deputadoFederal,
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
