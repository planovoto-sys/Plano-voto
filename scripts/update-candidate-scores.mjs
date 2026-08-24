import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const DEFAULT_COLLECTION = 'candidatos';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_UPDATES = 2_000;
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const SOURCE_SCORE_FIELDS = [
  'classificacao',
  'nota_2023',
  'nota_2024',
  'nota_2025',
  'nota_2026',
  'nota_candidato'
];
const SCORE_UPDATE_FIELDS = [
  ...SOURCE_SCORE_FIELDS,
  'nota_final',
  'temNotaCandidato',
  'tem_nota_candidato',
  'fonte',
  'last_sync'
];

const parseArgs = (argv) => {
  const options = {
    apply: false,
    projectId: DEFAULT_PROJECT_ID,
    collection: DEFAULT_COLLECTION,
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
      case '--collection':
        options.collection = readValue();
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
  node scripts/update-candidate-scores.mjs --file <arquivo.json> [opcoes]

O comando simula por padrao. Ele atualiza apenas campos de nota e seus metadados.
Notas nulas na fonte removem notas antigas e ativam o fallback para a nota partidaria.

Opcoes:
  --apply                        Efetiva as atualizacoes
  --service-account <arquivo>    Service account JSON
  --project <id>                 Projeto Firebase
  --collection <nome>            Colecao Firestore
  --batch-size <1-450>           Atualizacoes por commit
  --delay-ms <numero>            Pausa entre commits
  --max-updates <numero>         Trava de seguranca
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

const identityKey = (candidate) => [
  normalizeText(candidate.nome),
  normalizeText(candidate.nome_civil),
  normalizeText(candidate.estado),
  normalizeText(candidate.cargo)
].join('|');

const civilIdentityKey = (candidate) => [
  normalizeText(candidate.nome_civil),
  normalizeText(candidate.estado),
  normalizeText(candidate.cargo)
].join('|');

const slugIdentityKey = (candidate) => [
  normalizeText(candidate.slug),
  normalizeText(candidate.estado),
  normalizeText(candidate.cargo)
].join('|');

const isPresentNumeric = (value) => (
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value))
);

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

const readSourceRecords = async (filePath) => {
  const parsed = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
  const records = Array.isArray(parsed) ? parsed : parsed?.candidatos;
  if (!Array.isArray(records)) throw new Error('JSON de ranking invalido.');

  const invalidIdentities = records.filter((record) => (
    !normalizeText(record.nome)
    || !normalizeText(record.nome_civil)
    || !normalizeText(record.estado)
    || !normalizeText(record.cargo)
  ));
  if (invalidIdentities.length > 0) {
    throw new Error(`${invalidIdentities.length} registros possuem identidade incompleta.`);
  }

  for (const record of records) {
    const values = SOURCE_SCORE_FIELDS.map((field) => record[field]);
    const allNull = values.every((value) => value === null || value === undefined || value === '');
    const allNumeric = values.every(isPresentNumeric);
    if (!allNull && !allNumeric) {
      throw new Error(`Notas parciais ou invalidas para ${record.nome}.`);
    }
  }
  return records;
};

const buildSourceLookup = (records) => {
  const exact = new Map();
  const byCivilIdentity = new Map();
  const bySlugIdentity = new Map();
  const duplicates = [];

  const addGrouped = (map, key, record) => {
    if (!key || key.startsWith('|')) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  };

  for (const record of records) {
    const key = identityKey(record);
    if (exact.has(key)) duplicates.push(record);
    else exact.set(key, record);
    addGrouped(byCivilIdentity, civilIdentityKey(record), record);
    addGrouped(bySlugIdentity, slugIdentityKey(record), record);
  }
  if (duplicates.length > 0) {
    throw new Error(`${duplicates.length} identidades duplicadas no JSON de ranking.`);
  }
  return { exact, byCivilIdentity, bySlugIdentity };
};

const splitIntoBatches = (items, size) => {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const queryCandidateDocuments = async ({
  projectId,
  collection,
  apiKey,
  accessToken,
  sourceRecords
}) => {
  const fieldPaths = [
    'nome', 'Nome', 'nome_civil', 'nomeCivil', 'slug', 'estado', 'Estado', 'cargo', 'Cargo',
    'partido', 'Partido', ...SOURCE_SCORE_FIELDS, 'nota_final', 'notaCandidato', 'notaFinal',
    '`Nota candidato`', 'temNotaCandidato', 'tem_nota_candidato', 'fonte', 'last_sync',
    'tipo', 'Tipo', 'status_candidatura'
  ];
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:runQuery'
  );
  if (apiKey) url.searchParams.set('key', apiKey);
  const documentsByName = new Map();
  const queryFields = [
    ['nome', (record) => record.nome],
    ['nome_civil', (record) => record.nome_civil],
    ['slug', (record) => record.slug]
  ];
  const requests = [];

  for (const [queryField, getValue] of queryFields) {
    const values = [...new Set(sourceRecords.map(getValue).map(String).map((value) => value.trim()))]
      .filter(Boolean);
    for (const batch of splitIntoBatches(values, 25)) {
      requests.push({ queryField, batch });
    }
  }

  for (const requestGroup of splitIntoBatches(requests, 4)) {
    const results = await Promise.all(requestGroup.map(async ({ queryField, batch }) => {
      const body = {
        structuredQuery: {
          select: { fields: fieldPaths.map((fieldPath) => ({ fieldPath })) },
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: queryField },
              op: 'IN',
              value: {
                arrayValue: {
                  values: batch.map((value) => ({ stringValue: value }))
                }
              }
            }
          }
        }
      };
      return requestJson(url, {
        accessToken,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    }));

    for (const rows of results) {
      for (const row of rows || []) {
        if (row.document) documentsByName.set(row.document.name, row.document);
      }
    }
  }

  return [...documentsByName.values()];
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

const documentIdentity = (document) => ({
  nome: readField(document, 'nome', 'Nome') || '',
  nome_civil: readField(document, 'nome_civil', 'nomeCivil') || '',
  estado: readField(document, 'estado', 'Estado') || '',
  cargo: readField(document, 'cargo', 'Cargo') || '',
  partido: readField(document, 'partido', 'Partido') || '',
  slug: readField(document, 'slug') || ''
});

const buildDocumentLookups = (documents) => {
  const exact = new Map();
  const byCivilIdentity = new Map();
  const bySlugIdentity = new Map();
  const add = (map, key, document) => {
    if (!key || key.startsWith('|')) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(document);
  };

  for (const document of documents) {
    const identity = documentIdentity(document);
    add(exact, identityKey(identity), document);
    add(byCivilIdentity, civilIdentityKey(identity), document);
    add(bySlugIdentity, slugIdentityKey(identity), document);
  }
  return { exact, byCivilIdentity, bySlugIdentity };
};

const resolveDocument = (source, documentLookups) => {
  let matches = documentLookups.exact.get(identityKey(source)) || [];
  if (matches.length === 0) {
    matches = documentLookups.byCivilIdentity.get(civilIdentityKey(source)) || [];
  }
  if (matches.length === 0) {
    matches = documentLookups.bySlugIdentity.get(slugIdentityKey(source)) || [];
  }
  if (matches.length <= 1) return matches;

  const sourceParty = normalizeText(source.partido);
  const partyMatches = matches.filter((document) => (
    normalizeText(documentIdentity(document).partido) === sourceParty
  ));
  return partyMatches.length > 0 ? partyMatches : matches;
};

const firestoreValue = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  throw new Error(`Tipo Firestore nao suportado: ${typeof value}`);
};

const equalValues = (left, right) => {
  if (typeof right === 'number') return Number(left) === right;
  return left === right;
};

const buildDesiredUpdate = (document, source) => {
  const scored = SOURCE_SCORE_FIELDS.every((field) => isPresentNumeric(source[field]));
  const setFields = {
    fonte: String(source.fonte || '').trim(),
    last_sync: String(source.last_sync || '').trim(),
    temNotaCandidato: scored,
    tem_nota_candidato: scored
  };
  const deleteFields = ['notaCandidato', 'notaFinal'];

  if (document.fields?.['Nota candidato']) deleteFields.push('`Nota candidato`');
  if (scored) {
    SOURCE_SCORE_FIELDS.forEach((field) => {
      setFields[field] = Number(source[field]);
    });
    setFields.nota_final = Number(source.nota_candidato);
  } else {
    deleteFields.push(...SOURCE_SCORE_FIELDS, 'nota_final');
  }

  const incomingType = normalizeText(readField(document, 'tipo', 'Tipo')).includes('INGRESSANTE');
  if (incomingType) {
    if (document.fields?.tipo) deleteFields.push('tipo');
    if (document.fields?.Tipo) deleteFields.push('Tipo');
  }
  if (normalizeText(readField(document, 'status_candidatura')) === 'CANDIDATO INGRESSANTE') {
    deleteFields.push('status_candidatura');
  }

  const changedSetFields = Object.fromEntries(
    Object.entries(setFields).filter(([field, value]) => !equalValues(readField(document, field), value))
  );
  const existingDeleteFields = deleteFields.filter((fieldPath) => {
    const rawName = fieldPath.startsWith('`') ? fieldPath.slice(1, -1) : fieldPath;
    return document.fields?.[rawName] !== undefined;
  });

  return {
    scored,
    setFields: changedSetFields,
    deleteFields: [...new Set(existingDeleteFields)],
    changed: Object.keys(changedSetFields).length > 0 || existingDeleteFields.length > 0,
    clearedIncomingMarker: incomingType
  };
};

const buildPlan = (documents, sourceLookups) => {
  const updates = [];
  const documentLookups = buildDocumentLookups(documents);
  const usedDocuments = new Set();
  const unchanged = [];
  const sourceKeysWithoutDocument = [];
  const ambiguousSources = [];
  let scoredUpdates = 0;
  let unscoredUpdates = 0;
  let staleScoresCleared = 0;
  let incomingMarkersCleared = 0;

  for (const [sourceKey, source] of sourceLookups.exact) {
    const matches = resolveDocument(source, documentLookups);
    if (matches.length === 0) {
      sourceKeysWithoutDocument.push(sourceKey);
      continue;
    }
    if (matches.length !== 1 || usedDocuments.has(matches[0].name)) {
      ambiguousSources.push({
        source,
        documentIds: matches.map((document) => document.name.split('/').at(-1))
      });
      continue;
    }

    const document = matches[0];
    const identity = documentIdentity(document);
    usedDocuments.add(document.name);
    const desired = buildDesiredUpdate(document, source);
    if (!desired.changed) {
      unchanged.push(identity);
      continue;
    }

    if (desired.scored) scoredUpdates += 1;
    else {
      unscoredUpdates += 1;
      if (SOURCE_SCORE_FIELDS.some((field) => document.fields?.[field] !== undefined)) {
        staleScoresCleared += 1;
      }
    }
    if (desired.clearedIncomingMarker) incomingMarkersCleared += 1;
    updates.push({
      name: document.name,
      updateTime: document.updateTime,
      identity,
      ...desired
    });
  }

  return {
    updates,
    unchanged,
    sourceKeysWithoutDocument,
    ambiguousSources,
    scoredUpdates,
    unscoredUpdates,
    staleScoresCleared,
    incomingMarkersCleared
  };
};

const commitUpdates = async ({ projectId, updates, accessToken }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:commit';
  const body = {
    writes: updates.map((update) => ({
      update: {
        name: update.name,
        fields: Object.fromEntries(
          Object.entries(update.setFields).map(([field, value]) => [field, firestoreValue(value)])
        )
      },
      updateMask: {
        fieldPaths: [...Object.keys(update.setFields), ...update.deleteFields]
      },
      currentDocument: { updateTime: update.updateTime }
    }))
  };
  return requestJson(url, {
    accessToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const summarize = ({ documents, sourceRecords, sourceLookups, plan, options }) => {
  const scoredSource = sourceRecords.filter((record) => isPresentNumeric(record.nota_candidato)).length;
  console.log('Resumo da atualizacao de notas');
  console.log(`- documentos candidatos consultados: ${documents.length}`);
  console.log(`- registros no ranking: ${sourceRecords.length}`);
  console.log(`- fonte com nota propria: ${scoredSource}`);
  console.log(`- fonte sem nota propria: ${sourceRecords.length - scoredSource}`);
  console.log(`- correspondencias unicas: ${sourceLookups.exact.size - plan.sourceKeysWithoutDocument.length - plan.ambiguousSources.length}`);
  console.log(`- registros da fonte sem documento: ${plan.sourceKeysWithoutDocument.length}`);
  console.log(`- correspondencias ambiguas bloqueadas: ${plan.ambiguousSources.length}`);
  console.log(`- documentos a atualizar: ${plan.updates.length}`);
  console.log(`- atualizacoes com nota propria: ${plan.scoredUpdates}`);
  console.log(`- atualizacoes sem nota propria/fallback partidario: ${plan.unscoredUpdates}`);
  console.log(`- notas antigas a remover: ${plan.staleScoresCleared}`);
  console.log(`- marcadores de ingressante a remover: ${plan.incomingMarkersCleared}`);
  console.log(`- documentos ja sincronizados: ${plan.unchanged.length}`);
  console.log(`- commits planejados: ${Math.ceil(plan.updates.length / options.batchSize)}`);

  if (plan.sourceKeysWithoutDocument.length > 0) {
    console.log('\nPrimeiras identidades da fonte sem documento correspondente:');
    plan.sourceKeysWithoutDocument.slice(0, 10).forEach((key) => console.log(`- ${key}`));
  }
  if (plan.ambiguousSources.length > 0) {
    console.log('\nPrimeiras correspondencias ambiguas:');
    plan.ambiguousSources.slice(0, 10).forEach((item) => {
      console.log(`- ${item.source.nome} | ${item.source.estado} | ${item.source.cargo}`);
      console.log(`  documentos: ${item.documentIds.join(', ')}`);
    });
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const accessToken = options.accessToken
    || (options.serviceAccountPath
      ? await getServiceAccountAccessToken(options.serviceAccountPath)
      : '');
  const sourceRecords = await readSourceRecords(options.filePath);
  const sourceLookups = buildSourceLookup(sourceRecords);
  const documents = await queryCandidateDocuments({
    ...options,
    accessToken,
    sourceRecords
  });
  const plan = buildPlan(documents, sourceLookups);
  summarize({ documents, sourceRecords, sourceLookups, plan, options });

  if (plan.updates.length > options.maxUpdates) {
    throw new Error(
      `Atualizacao bloqueada: ${plan.updates.length} escritas excedem --max-updates=${options.maxUpdates}.`
    );
  }
  if (!options.apply) {
    console.log('\nSimulacao concluida. Nenhum documento foi alterado.');
    return;
  }
  if (!accessToken) {
    throw new Error('A escrita requer --service-account ou GOOGLE_OAUTH_ACCESS_TOKEN.');
  }

  const batches = splitIntoBatches(plan.updates, options.batchSize);
  let updated = 0;
  for (let index = 0; index < batches.length; index += 1) {
    await commitUpdates({ projectId: options.projectId, updates: batches[index], accessToken });
    updated += batches[index].length;
    console.log(`Commit ${index + 1}/${batches.length}: ${updated}/${plan.updates.length} atualizados.`);
    if (index < batches.length - 1 && options.delayMs > 0) await sleep(options.delayMs);
  }
  console.log(`\nAtualizacao concluida: ${updated} candidatos sincronizados com o ranking.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
