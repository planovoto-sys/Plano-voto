import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const DEFAULT_COLLECTION = 'candidatos';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_DELETES = 500;
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const PLACEHOLDER_PREFIX = 'Candidato Novato ';
const PLACEHOLDER_PATTERN = /^Candidato Novato\s+\d+$/iu;

const parseArgs = (argv) => {
  const options = {
    apply: false,
    projectId: DEFAULT_PROJECT_ID,
    collection: DEFAULT_COLLECTION,
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    accessToken: process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '',
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    maxDeletes: DEFAULT_MAX_DELETES
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
      case '--max-deletes':
        options.maxDeletes = Number(readValue());
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Uso:
  node scripts/delete-placeholder-candidates.mjs [opcoes]

O comando simula por padrao. Ele exclui somente documentos cujo campo nome
corresponde exatamente a "Candidato Novato" seguido de um numero.

Opcoes:
  --apply                        Efetiva as exclusoes
  --service-account <arquivo>    Service account JSON
  --project <id>                 Projeto Firebase
  --collection <nome>            Colecao Firestore
  --batch-size <1-450>           Exclusoes por commit
  --delay-ms <numero>            Pausa entre commits
  --max-deletes <numero>         Trava de seguranca
`);
        process.exit(0);
        break;
      default:
        throw new Error(`Opcao desconhecida: ${argument}`);
    }
  }

  if (!options.accessToken && !options.serviceAccountPath) {
    throw new Error('Informe --service-account ou GOOGLE_OAUTH_ACCESS_TOKEN.');
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 450) {
    throw new Error('--batch-size deve ser um inteiro entre 1 e 450.');
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms deve ser um inteiro maior ou igual a zero.');
  }
  if (!Number.isInteger(options.maxDeletes) || options.maxDeletes < 1) {
    throw new Error('--max-deletes deve ser um inteiro positivo.');
  }

  return options;
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
  headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  }
  return payload;
};

const queryPlaceholderPrefix = async ({ projectId, collection, accessToken }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:runQuery';
  const field = { fieldPath: 'nome' };
  const body = {
    structuredQuery: {
      select: {
        fields: ['nome', 'nome_civil', 'cargo', 'estado', 'partido']
          .map((fieldPath) => ({ fieldPath }))
      },
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field,
                op: 'GREATER_THAN_OR_EQUAL',
                value: { stringValue: PLACEHOLDER_PREFIX }
              }
            },
            {
              fieldFilter: {
                field,
                op: 'LESS_THAN',
                value: { stringValue: `${PLACEHOLDER_PREFIX}\uf8ff` }
              }
            }
          ]
        }
      },
      orderBy: [{ field, direction: 'ASCENDING' }]
    }
  };

  const rows = await requestJson(url, {
    accessToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  return (rows || []).map((row) => row.document).filter(Boolean);
};

const getStringField = (document, fieldName) => (
  document?.fields?.[fieldName]?.stringValue || ''
);

const splitIntoBatches = (items, size) => {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const commitDeletes = async ({ projectId, documents, accessToken }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
    + '/databases/(default)/documents:commit';
  const body = {
    writes: documents.map((document) => ({
      delete: document.name,
      currentDocument: { exists: true }
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

const summarize = (targets, prefixOnly) => {
  const byOffice = new Map();
  const byState = new Map();

  for (const document of targets) {
    const office = getStringField(document, 'cargo') || '(sem cargo)';
    const state = getStringField(document, 'estado') || '(sem estado)';
    byOffice.set(office, (byOffice.get(office) || 0) + 1);
    byState.set(state, (byState.get(state) || 0) + 1);
  }

  console.log('Resumo da limpeza');
  console.log(`- documentos com o prefixo: ${targets.length + prefixOnly.length}`);
  console.log(`- correspondencias exatas a excluir: ${targets.length}`);
  console.log(`- documentos de prefixo preservados por nao corresponderem ao regex: ${prefixOnly.length}`);
  console.log(`- por cargo: ${[...byOffice].map(([key, value]) => `${key}=${value}`).join(', ')}`);
  console.log(`- estados afetados: ${byState.size}`);
  console.log('\nPrimeiros documentos selecionados:');
  targets.slice(0, 10).forEach((document) => {
    console.log(`- ${document.name.split('/').at(-1)} | ${getStringField(document, 'nome')}`);
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const accessToken = options.accessToken
    || await getServiceAccountAccessToken(options.serviceAccountPath);
  const prefixDocuments = await queryPlaceholderPrefix({ ...options, accessToken });
  const targets = prefixDocuments.filter((document) => (
    PLACEHOLDER_PATTERN.test(getStringField(document, 'nome').trim())
  ));
  const prefixOnly = prefixDocuments.filter((document) => !targets.includes(document));

  summarize(targets, prefixOnly);

  if (targets.length > options.maxDeletes) {
    throw new Error(
      `Limpeza bloqueada: ${targets.length} exclusoes excedem --max-deletes=${options.maxDeletes}.`
    );
  }
  if (!options.apply) {
    console.log('\nSimulacao concluida. Nenhum documento foi excluido.');
    return;
  }

  const batches = splitIntoBatches(targets, options.batchSize);
  let deleted = 0;

  for (let index = 0; index < batches.length; index += 1) {
    await commitDeletes({
      ...options,
      documents: batches[index],
      accessToken
    });
    deleted += batches[index].length;
    console.log(`Commit ${index + 1}/${batches.length}: ${deleted}/${targets.length} excluidos.`);
    if (index < batches.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const remaining = (await queryPlaceholderPrefix({ ...options, accessToken }))
    .filter((document) => PLACEHOLDER_PATTERN.test(getStringField(document, 'nome').trim()));
  if (remaining.length > 0) {
    throw new Error(`Verificacao falhou: ainda existem ${remaining.length} placeholders.`);
  }

  console.log(`\nLimpeza concluida e verificada: ${deleted} documentos excluidos.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
