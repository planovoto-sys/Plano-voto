import { createHash, createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import process from 'node:process';

const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const DEFAULT_COLLECTION = 'candidatos';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_WRITES = 10_000;
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

const STATE_CODES = new Map([
  ['ACRE', 'ac'],
  ['ALAGOAS', 'al'],
  ['AMAPA', 'ap'],
  ['AMAZONAS', 'am'],
  ['BAHIA', 'ba'],
  ['CEARA', 'ce'],
  ['DISTRITO FEDERAL', 'df'],
  ['ESPIRITO SANTO', 'es'],
  ['GOIAS', 'go'],
  ['MARANHAO', 'ma'],
  ['MATO GROSSO', 'mt'],
  ['MATO GROSSO DO SUL', 'ms'],
  ['MINAS GERAIS', 'mg'],
  ['PARA', 'pa'],
  ['PARAIBA', 'pb'],
  ['PARANA', 'pr'],
  ['PERNAMBUCO', 'pe'],
  ['PIAUI', 'pi'],
  ['RIO DE JANEIRO', 'rj'],
  ['RIO GRANDE DO NORTE', 'rn'],
  ['RIO GRANDE DO SUL', 'rs'],
  ['RONDONIA', 'ro'],
  ['RORAIMA', 'rr'],
  ['SANTA CATARINA', 'sc'],
  ['SAO PAULO', 'sp'],
  ['SERGIPE', 'se'],
  ['TOCANTINS', 'to']
]);

const printUsage = () => {
  console.log(`
Uso:
  node scripts/import-candidates-2026.mjs --file <arquivo.json> [opcoes]

Por padrao o comando executa apenas uma simulacao.

Opcoes:
  --project <id>                 Projeto Firebase (padrao: ${DEFAULT_PROJECT_ID})
  --collection <nome>            Colecao (padrao: ${DEFAULT_COLLECTION})
  --api-key <chave>              Firebase Web API key (ou FIREBASE_WEB_API_KEY)
  --apply                        Efetiva a gravacao
  --service-account <arquivo>    Service account JSON (ou GOOGLE_APPLICATION_CREDENTIALS)
  --batch-size <1-450>           Gravacoes por commit (padrao: ${DEFAULT_BATCH_SIZE})
  --delay-ms <numero>            Pausa entre commits (padrao: ${DEFAULT_DELAY_MS})
  --max-writes <numero>          Trava de seguranca (padrao: ${DEFAULT_MAX_WRITES})
  --help                         Mostra esta ajuda

Variaveis alternativas:
  FIREBASE_WEB_API_KEY
  GOOGLE_APPLICATION_CREDENTIALS
  GOOGLE_OAUTH_ACCESS_TOKEN      Token OAuth curto, em vez de service account
`);
};

const parseArgs = (argv) => {
  const options = {
    apply: false,
    projectId: DEFAULT_PROJECT_ID,
    collection: DEFAULT_COLLECTION,
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    accessToken: process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '',
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    maxWrites: DEFAULT_MAX_WRITES,
    filePath: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Valor ausente para ${argument}.`);
      }
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
      case '--api-key':
        options.apiKey = readValue();
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
      case '--max-writes':
        options.maxWrites = Number(readValue());
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Opcao desconhecida: ${argument}`);
    }
  }

  if (!options.filePath) throw new Error('Informe --file <arquivo.json>.');
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 450) {
    throw new Error('--batch-size deve ser um inteiro entre 1 e 450.');
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms deve ser um inteiro maior ou igual a zero.');
  }
  if (!Number.isInteger(options.maxWrites) || options.maxWrites < 1) {
    throw new Error('--max-writes deve ser um inteiro positivo.');
  }
  if (!options.apiKey && !options.accessToken && !options.serviceAccountPath) {
    throw new Error('Defina FIREBASE_WEB_API_KEY ou forneca uma credencial administrativa.');
  }

  return options;
};

const normalizeText = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

export const normalizeCandidateName = (value) => normalizeText(value)
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

export const candidateIdentityKey = (candidate) => [
  normalizeCandidateName(candidate?.nome),
  normalizeCandidateName(candidate?.nome_civil),
  normalizeText(candidate?.estado)
].join('|');

const slugify = (value) => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const hashSuffix = (value) => createHash('sha256').update(value).digest('hex').slice(0, 10);

const readIncomingCandidates = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const records = Array.isArray(parsed) ? parsed : parsed?.candidatos;

  if (!Array.isArray(records)) {
    throw new Error('O JSON deve conter um array ou um objeto com a propriedade candidatos.');
  }

  return records;
};

const firestoreValue = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Numero invalido: ${value}`);
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  throw new Error(`Tipo de campo nao suportado: ${typeof value}`);
};

const toFirestoreFields = (record) => Object.fromEntries(
  Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, firestoreValue(value)])
);

const getStringField = (document, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    const value = document?.fields?.[fieldName]?.stringValue;
    if (value) return value;
  }
  return '';
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

  if (!response.ok) {
    throw new Error(`Falha ao obter token administrativo (${response.status}).`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error('Resposta OAuth sem access_token.');
  return payload.access_token;
};

const requestJson = async (url, { accessToken = '', ...options } = {}) => {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const listExistingCandidates = async ({ projectId, collection, apiKey, accessToken }) => {
  const documents = [];
  let pageToken = '';

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
      + `/databases/(default)/documents/${encodeURIComponent(collection)}`
    );
    url.searchParams.set('pageSize', '300');
    url.searchParams.append('mask.fieldPaths', 'nome');
    url.searchParams.append('mask.fieldPaths', 'Nome');
    url.searchParams.append('mask.fieldPaths', 'nome_civil');
    url.searchParams.append('mask.fieldPaths', 'nomeCivil');
    url.searchParams.append('mask.fieldPaths', 'estado');
    url.searchParams.append('mask.fieldPaths', 'Estado');
    if (apiKey) url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const payload = await requestJson(url, { accessToken });
    documents.push(...(payload?.documents || []));
    pageToken = payload?.nextPageToken || '';
  } while (pageToken);

  return documents;
};

const getStateCode = (stateName) => STATE_CODES.get(normalizeText(stateName)) || '';

const candidateDocumentId = (candidate) => {
  const office = slugify(candidate.cargo);
  const state = getStateCode(candidate.estado);
  const name = slugify(candidate.nome);
  const party = slugify(candidate.partido);
  return `${office}__${state}__${name}__${party}`;
};

const validateCandidate = (candidate, index) => {
  const missingFields = ['nome', 'cargo', 'estado', 'partido']
    .filter((field) => !String(candidate?.[field] ?? '').trim());

  if (missingFields.length > 0) {
    return `Registro ${index + 1}: campos obrigatorios ausentes (${missingFields.join(', ')}).`;
  }
  if (!getStateCode(candidate.estado)) {
    return `Registro ${index + 1}: estado desconhecido (${candidate.estado}).`;
  }
  if (!['Deputado Federal', 'Senador'].includes(candidate.cargo)) {
    return `Registro ${index + 1}: cargo invalido (${candidate.cargo}).`;
  }
  return '';
};

const buildIncomingDocument = (candidate, sourceName) => {
  const document = {
    cargo: candidate.cargo.trim(),
    estado: candidate.estado.trim(),
    nome: candidate.nome.trim(),
    nome_civil: String(candidate.nome_civil || '').trim(),
    partido: candidate.partido.trim(),
    slug: String(candidate.slug || slugify(candidate.nome_civil || candidate.nome)).trim(),
    classificacao: candidate.classificacao,
    nota_2023: candidate.nota_2023,
    nota_2024: candidate.nota_2024,
    nota_2025: candidate.nota_2025,
    nota_2026: candidate.nota_2026,
    nota_candidato: candidate.nota_candidato,
    fonte: String(candidate.fonte || `importacao/${sourceName}`).trim(),
    last_sync: String(candidate.last_sync || new Date().toISOString()).trim(),
    tipo: 'ingressante',
    status_candidatura: 'Candidato Ingressante'
  };

  return Object.fromEntries(
    Object.entries(document).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );
};

export const buildImportPlan = ({ incoming, existingDocuments, sourceName }) => {
  const existingIdentities = new Set();
  const existingDocumentIds = new Set();

  for (const document of existingDocuments) {
    const name = getStringField(document, 'nome', 'Nome');
    const civilName = getStringField(document, 'nome_civil', 'nomeCivil');
    const state = getStringField(document, 'estado', 'Estado');
    if (name && civilName && state) {
      existingIdentities.add(candidateIdentityKey({
        nome: name,
        nome_civil: civilName,
        estado: state
      }));
    }
    existingDocumentIds.add(document.name.split('/').at(-1));
  }

  const plannedIdentities = new Set();
  const firstCandidateByName = new Map();
  const plannedDocumentIds = new Set();
  const writes = [];
  const invalid = [];
  const skippedExisting = [];
  const skippedInputDuplicates = [];
  const preservedHomonyms = [];

  incoming.forEach((candidate, index) => {
    const validationError = validateCandidate(candidate, index);
    if (validationError) {
      invalid.push(validationError);
      return;
    }

    const identityKey = candidateIdentityKey(candidate);
    if (existingIdentities.has(identityKey)) {
      skippedExisting.push(candidate.nome);
      return;
    }

    if (plannedIdentities.has(identityKey)) {
      skippedInputDuplicates.push(candidate.nome);
      return;
    }

    const nameKey = normalizeCandidateName(candidate.nome);
    const firstCandidate = firstCandidateByName.get(nameKey);
    if (firstCandidate && candidateIdentityKey(firstCandidate) !== identityKey) {
      preservedHomonyms.push({
        nome: candidate.nome,
        primeiro: `${firstCandidate.nome_civil} | ${firstCandidate.estado} | ${firstCandidate.partido}`,
        adicional: `${candidate.nome_civil} | ${candidate.estado} | ${candidate.partido}`
      });
    } else if (!firstCandidate) {
      firstCandidateByName.set(nameKey, candidate);
    }

    plannedIdentities.add(identityKey);
    let documentId = candidateDocumentId(candidate);

    if (existingDocumentIds.has(documentId) || plannedDocumentIds.has(documentId)) {
      documentId += `__${hashSuffix([
        candidate.nome_civil,
        candidate.estado,
        candidate.partido
      ].join('|'))}`;
    }

    plannedDocumentIds.add(documentId);
    writes.push({
      documentId,
      data: buildIncomingDocument(candidate, sourceName)
    });
  });

  return {
    existingCount: existingDocuments.length,
    inputCount: incoming.length,
    writes,
    invalid,
    skippedExisting,
    skippedInputDuplicates,
    preservedHomonyms
  };
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const commitBatch = async ({ projectId, collection, writes, accessToken }) => {
  const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:commit';
  const body = {
    writes: writes.map(({ documentId, data }) => ({
      update: {
        name: `${databaseRoot}/${collection}/${documentId}`,
        fields: toFirestoreFields(data)
      },
      currentDocument: { exists: false }
    }))
  };

  return requestJson(url, {
    accessToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
};

const summarizePlan = (plan, options) => {
  const serializedBytes = Buffer.byteLength(JSON.stringify(plan.writes), 'utf8');
  const batches = Math.ceil(plan.writes.length / options.batchSize);

  console.log('Resumo da carga');
  console.log(`- documentos atuais: ${plan.existingCount}`);
  console.log(`- registros recebidos: ${plan.inputCount}`);
  console.log(`- existentes ignorados pela identidade composta: ${plan.skippedExisting.length}`);
  console.log(`- identidades repetidas no JSON ignoradas: ${plan.skippedInputDuplicates.length}`);
  console.log(`- homonimos distintos preservados: ${plan.preservedHomonyms.length}`);
  console.log(`- registros invalidos: ${plan.invalid.length}`);
  console.log(`- novos documentos planejados: ${plan.writes.length}`);
  console.log(`- commits planejados: ${batches} (ate ${options.batchSize} escritas cada)`);
  console.log(`- payload local aproximado: ${(serializedBytes / 1024 / 1024).toFixed(2)} MiB`);

  if (plan.invalid.length > 0) {
    console.log('\nPrimeiros registros invalidos:');
    plan.invalid.slice(0, 10).forEach((message) => console.log(`- ${message}`));
  }
  if (plan.preservedHomonyms.length > 0) {
    console.log('\nPrimeiros homonimos preservados:');
    plan.preservedHomonyms.slice(0, 10).forEach((collision) => {
      console.log(`- ${collision.nome}`);
      console.log(`  primeiro: ${collision.primeiro}`);
      console.log(`  adicional: ${collision.adicional}`);
    });
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  let accessToken = options.accessToken;

  if (!accessToken && options.serviceAccountPath) {
    accessToken = await getServiceAccountAccessToken(options.serviceAccountPath);
  }

  const incoming = await readIncomingCandidates(options.filePath);
  const existingDocuments = await listExistingCandidates({
    ...options,
    accessToken
  });
  const plan = buildImportPlan({
    incoming,
    existingDocuments,
    sourceName: basename(options.filePath)
  });

  summarizePlan(plan, options);

  if (plan.invalid.length > 0) {
    throw new Error('Carga bloqueada: existem registros invalidos.');
  }
  if (plan.writes.length > options.maxWrites) {
    throw new Error(
      `Carga bloqueada: ${plan.writes.length} escritas excedem --max-writes=${options.maxWrites}.`
    );
  }
  if (!options.apply) {
    console.log('\nSimulacao concluida. Nenhum documento foi gravado.');
    return;
  }
  if (!accessToken) {
    throw new Error(
      'Carga bloqueada: --apply requer GOOGLE_APPLICATION_CREDENTIALS, --service-account '
      + 'ou GOOGLE_OAUTH_ACCESS_TOKEN.'
    );
  }

  const batches = chunk(plan.writes, options.batchSize);
  let committed = 0;

  for (let index = 0; index < batches.length; index += 1) {
    await commitBatch({
      ...options,
      writes: batches[index],
      accessToken
    });
    committed += batches[index].length;
    console.log(`Commit ${index + 1}/${batches.length}: ${committed}/${plan.writes.length} gravados.`);
    if (index < batches.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  console.log(`\nCarga concluida: ${committed} novos candidatos gravados; existentes preservados.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
