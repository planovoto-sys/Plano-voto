import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const DEFAULT_COLLECTION = 'candidatos';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_UPDATES = 10_000;
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

const parseArgs = (argv) => {
  const options = {
    apply: false,
    projectId: DEFAULT_PROJECT_ID,
    collection: DEFAULT_COLLECTION,
    filePath: '',
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
  node scripts/update-candidate-numbers.mjs --file <arquivo.json> [opcoes]

O comando simula por padrao. Ele preenche somente o campo Firestore "numero"
quando ele ainda nao existe e nunca altera os demais campos do documento.

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
  if (!options.accessToken && !options.serviceAccountPath) {
    throw new Error('Informe --service-account ou GOOGLE_OAUTH_ACCESS_TOKEN.');
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

const baseIdentityKey = (candidate) => [
  normalizeText(candidate.nome),
  normalizeText(candidate.nome_civil),
  normalizeText(candidate.estado),
  normalizeText(candidate.cargo)
].join('|');

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
  headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
};

const readSourceRecords = async (filePath) => {
  const parsed = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
  const records = Array.isArray(parsed) ? parsed : parsed?.candidatos;
  if (!Array.isArray(records)) throw new Error('JSON de candidatos invalido.');

  const invalid = records.filter((record) => (
    !normalizeText(record.nome)
    || !normalizeText(record.nome_civil)
    || !normalizeText(record.estado)
    || !normalizeText(record.cargo)
    || !/^\d+$/.test(String(record.numero_candidato ?? '').trim())
  ));
  if (invalid.length > 0) {
    throw new Error(`${invalid.length} registros possuem identidade ou numero_candidato invalido.`);
  }
  return records;
};

const buildSourceLookup = (records) => {
  const lookup = new Map();
  for (const record of records) {
    const key = baseIdentityKey(record);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push({
      ...record,
      numero_candidato: String(record.numero_candidato).trim()
    });
  }
  return lookup;
};

const listCandidateDocuments = async ({ projectId, collection, accessToken }) => {
  const fieldPaths = [
    'nome', 'Nome',
    'nome_civil', 'nomeCivil',
    'estado', 'Estado',
    'cargo', 'Cargo',
    'partido', 'Partido',
    'numero', 'Numero'
  ];
  const documents = [];
  let pageToken = '';

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
      + `/databases/(default)/documents/${encodeURIComponent(collection)}`
    );
    url.searchParams.set('pageSize', '300');
    fieldPaths.forEach((fieldPath) => url.searchParams.append('mask.fieldPaths', fieldPath));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const payload = await requestJson(url, { accessToken });
    documents.push(...(payload?.documents || []));
    pageToken = payload?.nextPageToken || '';
  } while (pageToken);

  return documents;
};

const getStringField = (document, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    const field = document?.fields?.[fieldName];
    if (field?.stringValue !== undefined) return field.stringValue;
    if (field?.integerValue !== undefined) return String(field.integerValue);
  }
  return '';
};

const documentIdentity = (document) => ({
  nome: getStringField(document, 'nome', 'Nome'),
  nome_civil: getStringField(document, 'nome_civil', 'nomeCivil'),
  estado: getStringField(document, 'estado', 'Estado'),
  cargo: getStringField(document, 'cargo', 'Cargo'),
  partido: getStringField(document, 'partido', 'Partido')
});

const resolveNumber = (document, candidates) => {
  if (!candidates?.length) return { status: 'unmatched' };
  const documentParty = normalizeText(documentIdentity(document).partido);
  const partyMatches = candidates.filter((candidate) => (
    normalizeText(candidate.partido) === documentParty
  ));
  const narrowed = partyMatches.length > 0 ? partyMatches : candidates;
  const numbers = [...new Set(narrowed.map((candidate) => candidate.numero_candidato))];

  if (numbers.length !== 1) {
    return {
      status: 'ambiguous',
      candidates: narrowed.map((candidate) => ({
        nome: candidate.nome,
        nome_civil: candidate.nome_civil,
        estado: candidate.estado,
        cargo: candidate.cargo,
        partido: candidate.partido,
        numero: candidate.numero_candidato
      }))
    };
  }
  return { status: 'resolved', number: numbers[0] };
};

const buildUpdatePlan = (documents, sourceLookup) => {
  const updates = [];
  const alreadyCorrect = [];
  const existingConflicts = [];
  const ambiguous = [];
  const unmatched = [];
  const matchedSourceKeys = new Set();

  for (const document of documents) {
    const identity = documentIdentity(document);
    const key = baseIdentityKey(identity);
    const sourceCandidates = sourceLookup.get(key);
    const resolution = resolveNumber(document, sourceCandidates);

    if (resolution.status === 'unmatched') {
      unmatched.push(identity);
      continue;
    }
    matchedSourceKeys.add(key);
    if (resolution.status === 'ambiguous') {
      ambiguous.push({ identity, options: resolution.candidates });
      continue;
    }

    const existingNumber = getStringField(document, 'numero', 'Numero').trim();
    if (existingNumber) {
      if (existingNumber === resolution.number) {
        alreadyCorrect.push(identity);
      } else {
        existingConflicts.push({
          identity,
          existingNumber,
          sourceNumber: resolution.number
        });
      }
      continue;
    }

    updates.push({
      name: document.name,
      updateTime: document.updateTime,
      number: resolution.number,
      identity
    });
  }

  const sourceKeysWithoutDocument = [...sourceLookup.keys()]
    .filter((key) => !matchedSourceKeys.has(key));

  return {
    updates,
    alreadyCorrect,
    existingConflicts,
    ambiguous,
    unmatched,
    sourceKeysWithoutDocument
  };
};

const splitIntoBatches = (items, size) => {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const commitUpdates = async ({ projectId, updates, accessToken }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:commit';
  const body = {
    writes: updates.map((update) => ({
      update: {
        name: update.name,
        fields: { numero: { stringValue: update.number } }
      },
      updateMask: { fieldPaths: ['numero'] },
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

const summarize = ({ documents, sourceRecords, sourceLookup, plan, options }) => {
  const batches = Math.ceil(plan.updates.length / options.batchSize);
  console.log('Resumo da atualizacao de numeros');
  console.log(`- documentos no Firestore: ${documents.length}`);
  console.log(`- registros no JSON: ${sourceRecords.length}`);
  console.log(`- identidades fonte por nome + nome civil + estado + cargo: ${sourceLookup.size}`);
  console.log(`- numeros a preencher: ${plan.updates.length}`);
  console.log(`- numeros ja corretos: ${plan.alreadyCorrect.length}`);
  console.log(`- conflitos com numero ja existente preservados: ${plan.existingConflicts.length}`);
  console.log(`- ambiguidades no JSON preservadas sem atualizacao: ${plan.ambiguous.length}`);
  console.log(`- documentos sem correspondencia no JSON: ${plan.unmatched.length}`);
  console.log(`- identidades do JSON sem documento correspondente: ${plan.sourceKeysWithoutDocument.length}`);
  console.log(`- commits planejados: ${batches} (ate ${options.batchSize} atualizacoes cada)`);

  if (plan.ambiguous.length > 0) {
    console.log('\nAmbiguidades que nao serao atualizadas:');
    plan.ambiguous.slice(0, 10).forEach((item) => {
      console.log(`- ${item.identity.nome} | ${item.identity.estado} | ${item.identity.cargo}`);
      console.log(`  opcoes: ${item.options.map((option) => option.numero).join(', ')}`);
    });
  }
  if (plan.existingConflicts.length > 0) {
    console.log('\nConflitos com o Firestore que nao serao sobrescritos:');
    plan.existingConflicts.slice(0, 10).forEach((item) => {
      console.log(`- ${item.identity.nome}: atual=${item.existingNumber}, fonte=${item.sourceNumber}`);
    });
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const accessToken = options.accessToken
    || await getServiceAccountAccessToken(options.serviceAccountPath);
  const sourceRecords = await readSourceRecords(options.filePath);
  const sourceLookup = buildSourceLookup(sourceRecords);
  const documents = await listCandidateDocuments({ ...options, accessToken });
  const plan = buildUpdatePlan(documents, sourceLookup);

  summarize({ documents, sourceRecords, sourceLookup, plan, options });

  if (plan.updates.length > options.maxUpdates) {
    throw new Error(
      `Atualizacao bloqueada: ${plan.updates.length} escritas excedem --max-updates=${options.maxUpdates}.`
    );
  }
  if (!options.apply) {
    console.log('\nSimulacao concluida. Nenhum documento foi alterado.');
    return;
  }

  const batches = splitIntoBatches(plan.updates, options.batchSize);
  let updated = 0;

  for (let index = 0; index < batches.length; index += 1) {
    await commitUpdates({ projectId: options.projectId, updates: batches[index], accessToken });
    updated += batches[index].length;
    console.log(`Commit ${index + 1}/${batches.length}: ${updated}/${plan.updates.length} atualizados.`);
    if (index < batches.length - 1 && options.delayMs > 0) await sleep(options.delayMs);
  }

  console.log(`\nAtualizacao concluida: ${updated} numeros preenchidos; demais campos preservados.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
