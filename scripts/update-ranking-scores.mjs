import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const DEFAULT_CANDIDATE_COLLECTION = 'candidatos';
const DEFAULT_PARTY_COLLECTION = 'partidos_politicos';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_UPDATES = 2_000;
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const CANDIDATE_SCORE_FIELDS = [
  'classificacao',
  'nota_2023',
  'nota_2024',
  'nota_2025',
  'nota_2026',
  'nota_candidato',
  'nota_final'
];

const parseArgs = (argv) => {
  const options = {
    apply: false,
    projectId: DEFAULT_PROJECT_ID,
    candidateCollection: DEFAULT_CANDIDATE_COLLECTION,
    partyCollection: DEFAULT_PARTY_COLLECTION,
    filePath: '',
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    accessToken: process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '',
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    maxUpdates: DEFAULT_MAX_UPDATES
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Valor ausente para ${argument}.`);
      index += 1;
      return value;
    };

    switch (argument) {
      case '--file':
        options.filePath = readValue();
        break;
      case '--project':
        options.projectId = readValue();
        break;
      case '--candidate-collection':
        options.candidateCollection = readValue();
        break;
      case '--party-collection':
        options.partyCollection = readValue();
        break;
      case '--service-account':
        options.serviceAccountPath = readValue();
        break;
      case '--api-key':
        options.apiKey = readValue();
        break;
      case '--batch-size':
        options.batchSize = Number(readValue());
        break;
      case '--delay-ms':
        options.delayMs = Number(readValue());
        break;
      case '--max-updates':
        options.maxUpdates = Number(readValue());
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Uso:
  node scripts/update-ranking-scores.mjs --file <arquivo.json> [opcoes]

Atualiza notas de politicos e partidos a partir do JSON consolidado do Ranking dos
Politicos. O comando apenas simula por padrao.

Opcoes:
  --apply                         Efetiva as atualizacoes
  --service-account <arquivo>     Service account JSON
  --project <id>                  Projeto Firebase
  --candidate-collection <nome>   Colecao de candidatos
  --party-collection <nome>       Colecao de partidos
  --batch-size <1-450>            Atualizacoes por commit
  --delay-ms <numero>             Pausa entre commits
  --max-updates <numero>          Trava de seguranca
`);
        process.exit(0);
        break;
      default:
        throw new Error(`Opcao desconhecida: ${argument}`);
    }
  }

  if (!options.filePath) throw new Error('Informe --file <arquivo.json>.');
  if (!options.accessToken && !options.serviceAccountPath && !options.apiKey) {
    throw new Error('Informe FIREBASE_WEB_API_KEY ou uma credencial administrativa.');
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 450) {
    throw new Error('--batch-size deve ser um inteiro entre 1 e 450.');
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms deve ser um inteiro maior ou igual a zero.');
  }
  if (!Number.isInteger(options.maxUpdates) || options.maxUpdates < 1) {
    throw new Error('--max-updates deve ser um inteiro positivo.');
  }

  return options;
};

const normalizeText = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

const normalizeSlug = (value) => normalizeText(value).replace(/ /g, '-').toLowerCase();
const isNumeric = (value) => value !== null && value !== undefined && value !== ''
  && Number.isFinite(Number(value));

const validateScore = (value, label) => {
  if (!isNumeric(value)) return null;
  const score = Number(value);
  if (score < 0 || score > 10) throw new Error(`Nota fora da faixa 0-10 em ${label}: ${value}.`);
  return score;
};

const readRanking = async (filePath) => {
  const parsed = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed?.politicos) || !Array.isArray(parsed?.partidos)) {
    throw new Error('JSON invalido: as listas politicos e partidos sao obrigatorias.');
  }

  const politicianGroups = new Map();
  for (const politician of parsed.politicos) {
    const slug = normalizeSlug(politician.slug);
    if (!slug) throw new Error(`Politico sem slug: ${politician.nome || politician.id || 'desconhecido'}.`);
    const normalized = {
      ...politician,
      slug,
      nota: validateScore(politician.nota, `politico ${politician.nome || slug}`)
    };
    if (!politicianGroups.has(slug)) politicianGroups.set(slug, []);
    politicianGroups.get(slug).push(normalized);
  }

  const politicians = [];
  let duplicatePoliticians = 0;
  for (const [slug, records] of politicianGroups) {
    duplicatePoliticians += records.length - 1;
    const scored = records.filter((record) => record.nota !== null);
    const distinctScores = [...new Set(scored.map((record) => record.nota))];
    if (distinctScores.length > 1) {
      throw new Error(`Notas conflitantes para o slug ${slug}: ${distinctScores.join(', ')}.`);
    }
    politicians.push(scored[0] || records[0]);
  }

  const parties = parsed.partidos.map((party) => {
    const sigla = normalizeText(party.sigla);
    if (!sigla) throw new Error(`Partido sem sigla: ${party.nome || party.id || 'desconhecido'}.`);
    const nota = validateScore(party.nota, `partido ${party.sigla}`);
    if (nota === null) throw new Error(`Partido ${party.sigla} sem nota.`);
    return { ...party, sigla, nota };
  });
  const duplicateParties = parties.length - new Set(parties.map((party) => party.sigla)).size;
  if (duplicateParties > 0) throw new Error(`${duplicateParties} siglas de partido duplicadas.`);

  const source = {
    politicians: String(parsed.fonte?.politicos || '').trim(),
    parties: String(parsed.fonte?.partidos || '').trim(),
    lastSync: String(parsed.ultima_atualizacao_site || '').trim()
  };
  if (!source.politicians || !source.parties || !source.lastSync) {
    throw new Error('JSON invalido: fonte e ultima_atualizacao_site sao obrigatorios.');
  }

  return { politicians, parties, source, duplicatePoliticians };
};

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');

const getServiceAccountAccessToken = async (serviceAccountPath) => {
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Service account invalida: client_email/private_key ausentes.');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: FIRESTORE_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600
    }))
  ].join('.');
  const signature = createSign('RSA-SHA256')
    .update(unsignedToken)
    .end()
    .sign(serviceAccount.private_key)
    .toString('base64url');
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || `Falha OAuth (${response.status}).`);
  }
  return payload.access_token;
};

const requestJson = async (url, { accessToken, ...options } = {}) => {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
};

const splitIntoBatches = (items, size) => {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const runQuery = async ({ projectId, apiKey, accessToken, structuredQuery }) => {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:runQuery'
  );
  if (apiKey) url.searchParams.set('key', apiKey);
  return requestJson(url, {
    accessToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
};

const candidateFieldPaths = [
  'nome', 'nome_civil', 'slug', 'estado', 'cargo', 'partido', 'tipo', 'Tipo',
  'status_candidatura', ...CANDIDATE_SCORE_FIELDS, 'notaCandidato', 'notaFinal',
  '`Nota candidato`', 'temNotaCandidato', 'tem_nota_candidato', 'fonte', 'last_sync'
];

const queryCandidateDocuments = async ({
  projectId,
  collection,
  apiKey,
  accessToken,
  politicians
}) => {
  const documents = new Map();
  const batches = splitIntoBatches(politicians.map((politician) => politician.slug), 25);

  for (const group of splitIntoBatches(batches, 4)) {
    const responses = await Promise.all(group.map((batch) => runQuery({
      projectId,
      apiKey,
      accessToken,
      structuredQuery: {
        select: { fields: candidateFieldPaths.map((fieldPath) => ({ fieldPath })) },
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'slug' },
            op: 'IN',
            value: { arrayValue: { values: batch.map((value) => ({ stringValue: value })) } }
          }
        }
      }
    })));
    for (const rows of responses) {
      for (const row of rows || []) {
        if (row.document) documents.set(row.document.name, row.document);
      }
    }
  }

  return [...documents.values()];
};

const partyFieldPaths = [
  'id', 'nome', 'Nome', 'sigla', 'Sigla', 'partido', 'Partido', 'nota',
  'nota_partido', 'notaPartido', '`Nota partido`', 'nota_final', 'notaFinal',
  'score', 'fonte', 'last_sync'
];

const queryPartyDocuments = async ({ projectId, collection, apiKey, accessToken }) => {
  const rows = await runQuery({
    projectId,
    apiKey,
    accessToken,
    structuredQuery: {
      select: { fields: partyFieldPaths.map((fieldPath) => ({ fieldPath })) },
      from: [{ collectionId: collection }]
    }
  });
  return (rows || []).map((row) => row.document).filter(Boolean);
};

const decodeField = (field) => {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  return undefined;
};

const readField = (document, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    const value = decodeField(document?.fields?.[fieldName]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const equalValues = (left, right) => {
  if (typeof right === 'number') return Number(left) === right;
  return left === right;
};

const buildUpdate = (document, setFields, deleteFields = []) => {
  const changedSetFields = Object.fromEntries(
    Object.entries(setFields).filter(([field, value]) => !equalValues(readField(document, field), value))
  );
  const existingDeleteFields = deleteFields.filter((fieldPath) => {
    const rawName = fieldPath.startsWith('`') ? fieldPath.slice(1, -1) : fieldPath;
    return document.fields?.[rawName] !== undefined;
  });
  return {
    name: document.name,
    updateTime: document.updateTime,
    setFields: changedSetFields,
    deleteFields: [...new Set(existingDeleteFields)],
    changed: Object.keys(changedSetFields).length > 0 || existingDeleteFields.length > 0
  };
};

const buildCandidatePlan = (documents, ranking) => {
  const sourceBySlug = new Map(ranking.politicians.map((politician) => [politician.slug, politician]));
  const documentsBySlug = new Map();
  for (const document of documents) {
    const slug = normalizeSlug(readField(document, 'slug'));
    if (!documentsBySlug.has(slug)) documentsBySlug.set(slug, []);
    documentsBySlug.get(slug).push(document);
  }
  const duplicateDocumentSlugs = [...documentsBySlug]
    .filter(([, slugDocuments]) => slugDocuments.length > 1)
    .map(([slug, slugDocuments]) => ({
      slug,
      candidates: slugDocuments.map((document) => ({
        id: document.name.split('/').at(-1),
        nome: readField(document, 'nome'),
        cargo: readField(document, 'cargo'),
        estado: readField(document, 'estado'),
        partido: readField(document, 'partido')
      }))
    }));
  const matchedSlugs = new Set();
  const updates = [];
  let scored = 0;
  let cleared = 0;

  for (const document of documents) {
    const slug = normalizeSlug(readField(document, 'slug'));
    const source = sourceBySlug.get(slug);
    if (!source) continue;
    matchedSlugs.add(slug);

    const hasScore = source.nota !== null;
    const setFields = {
      fonte: ranking.source.politicians,
      last_sync: ranking.source.lastSync,
      temNotaCandidato: hasScore,
      tem_nota_candidato: hasScore
    };
    const deleteFields = ['notaCandidato', 'notaFinal', '`Nota candidato`'];

    if (hasScore) {
      setFields.nota_candidato = source.nota;
      setFields.nota_final = source.nota;
      deleteFields.push('classificacao', 'nota_2023', 'nota_2024', 'nota_2025', 'nota_2026');
      scored += 1;
    } else {
      deleteFields.push(...CANDIDATE_SCORE_FIELDS);
      cleared += 1;
    }

    const type = normalizeText(readField(document, 'tipo', 'Tipo'));
    if (type.includes('INGRESSANTE')) deleteFields.push('tipo', 'Tipo');
    if (normalizeText(readField(document, 'status_candidatura')) === 'CANDIDATO INGRESSANTE') {
      deleteFields.push('status_candidatura');
    }

    const update = buildUpdate(document, setFields, deleteFields);
    if (update.changed) {
      updates.push({
        ...update,
        label: `${readField(document, 'nome') || source.nome} (${readField(document, 'cargo') || '-'}/${readField(document, 'estado') || '-'})`
      });
    }
  }

  return {
    updates,
    scored,
    cleared,
    matchedSlugs,
    duplicateDocumentSlugs,
    unmatchedSources: ranking.politicians.filter((politician) => !matchedSlugs.has(politician.slug))
  };
};

const partyIdentityValues = (document) => [
  readField(document, 'sigla', 'Sigla'),
  readField(document, 'nome', 'Nome'),
  readField(document, 'partido', 'Partido'),
  readField(document, 'id'),
  document.name.split('/').at(-1)
].map(normalizeText).filter(Boolean);

const buildPartyPlan = (documents, ranking) => {
  const sourceByIdentity = new Map();
  for (const party of ranking.parties) {
    [party.sigla, party.nome, party.id].map(normalizeText).filter(Boolean).forEach((identity) => {
      sourceByIdentity.set(identity, party);
    });
  }

  const matchedParties = new Set();
  const updates = [];
  for (const document of documents) {
    const source = partyIdentityValues(document)
      .map((identity) => sourceByIdentity.get(identity))
      .find(Boolean);
    if (!source) continue;
    matchedParties.add(source.sigla);
    const update = buildUpdate(document, {
      nota: source.nota,
      fonte: ranking.source.parties,
      last_sync: ranking.source.lastSync
    });
    if (update.changed) updates.push({ ...update, label: source.sigla });
  }

  return {
    updates,
    matchedParties,
    unmatchedSources: ranking.parties.filter((party) => !matchedParties.has(party.sigla))
  };
};

const firestoreValue = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  throw new Error(`Tipo Firestore nao suportado: ${typeof value}`);
};

const commitUpdates = async ({ projectId, updates, accessToken }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:commit';
  return requestJson(url, {
    accessToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      writes: updates.map((update) => ({
        update: {
          name: update.name,
          fields: Object.fromEntries(
            Object.entries(update.setFields).map(([field, value]) => [field, firestoreValue(value)])
          )
        },
        updateMask: { fieldPaths: [...Object.keys(update.setFields), ...update.deleteFields] },
        currentDocument: { updateTime: update.updateTime }
      }))
    })
  });
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const printSummary = ({ ranking, candidateDocuments, partyDocuments, candidatePlan, partyPlan }) => {
  console.log('Resumo da atualizacao do Ranking dos Politicos');
  console.log(`- data da fonte: ${ranking.source.lastSync}`);
  console.log(`- politicos no JSON: ${ranking.politicians.length} (${ranking.duplicatePoliticians} duplicatas consolidadas)`);
  console.log(`- politicos com nota no JSON: ${ranking.politicians.filter((item) => item.nota !== null).length}`);
  console.log(`- documentos de candidatos encontrados: ${candidateDocuments.length}`);
  console.log(`- slugs pareados: ${candidatePlan.matchedSlugs.size}`);
  console.log(`- slugs com mais de um documento: ${candidatePlan.duplicateDocumentSlugs.length}`);
  console.log(`- candidatos pareados com nota: ${candidatePlan.scored}`);
  console.log(`- candidatos pareados sem nota: ${candidatePlan.cleared}`);
  console.log(`- candidatos a atualizar: ${candidatePlan.updates.length}`);
  console.log(`- partidos no JSON: ${ranking.parties.length}`);
  console.log(`- documentos de partidos consultados: ${partyDocuments.length}`);
  console.log(`- partidos pareados: ${partyPlan.matchedParties.size}`);
  console.log(`- partidos a atualizar: ${partyPlan.updates.length}`);
  console.log(`- total de documentos a atualizar: ${candidatePlan.updates.length + partyPlan.updates.length}`);

  if (candidatePlan.unmatchedSources.length > 0) {
    console.log('\nPrimeiros politicos da fonte sem candidatura correspondente:');
    candidatePlan.unmatchedSources.slice(0, 10).forEach((item) => {
      console.log(`- ${item.nome} | ${item.slug} | nota=${item.nota ?? 'null'}`);
    });
  }
  if (candidatePlan.duplicateDocumentSlugs.length > 0) {
    console.log('\nPrimeiros slugs associados a mais de um documento:');
    candidatePlan.duplicateDocumentSlugs.slice(0, 15).forEach((item) => {
      console.log(`- ${item.slug}`);
      item.candidates.forEach((candidate) => {
        console.log(`  ${candidate.id} | ${candidate.nome} | ${candidate.cargo}/${candidate.estado} | ${candidate.partido}`);
      });
    });
  }
  if (partyPlan.unmatchedSources.length > 0) {
    console.log('\nPartidos da fonte sem documento correspondente:');
    partyPlan.unmatchedSources.forEach((item) => console.log(`- ${item.sigla} | ${item.nome}`));
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const accessToken = options.accessToken || (options.serviceAccountPath
    ? await getServiceAccountAccessToken(options.serviceAccountPath)
    : '');
  const ranking = await readRanking(options.filePath);
  const [candidateDocuments, partyDocuments] = await Promise.all([
    queryCandidateDocuments({
      ...options,
      collection: options.candidateCollection,
      politicians: ranking.politicians,
      accessToken
    }),
    queryPartyDocuments({
      ...options,
      collection: options.partyCollection,
      accessToken
    })
  ]);
  const candidatePlan = buildCandidatePlan(candidateDocuments, ranking);
  const partyPlan = buildPartyPlan(partyDocuments, ranking);
  const updates = [...candidatePlan.updates, ...partyPlan.updates];

  printSummary({ ranking, candidateDocuments, partyDocuments, candidatePlan, partyPlan });
  if (updates.length > options.maxUpdates) {
    throw new Error(`Atualizacao bloqueada: ${updates.length} escritas excedem --max-updates=${options.maxUpdates}.`);
  }
  if (!options.apply) {
    console.log('\nSimulacao concluida. Nenhum documento foi alterado.');
    return;
  }
  if (!accessToken) {
    throw new Error('A escrita requer --service-account ou GOOGLE_OAUTH_ACCESS_TOKEN.');
  }

  const batches = splitIntoBatches(updates, options.batchSize);
  let updated = 0;
  for (let index = 0; index < batches.length; index += 1) {
    await commitUpdates({ projectId: options.projectId, updates: batches[index], accessToken });
    updated += batches[index].length;
    console.log(`Commit ${index + 1}/${batches.length}: ${updated}/${updates.length} atualizados.`);
    if (index < batches.length - 1 && options.delayMs > 0) await sleep(options.delayMs);
  }
  console.log(`\nAtualizacao concluida: ${candidatePlan.updates.length} candidatos e ${partyPlan.updates.length} partidos sincronizados.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
