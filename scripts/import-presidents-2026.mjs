import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import {
  getPartyIdentityKeys,
  getPartyNumberKey
} from '../src/shared/utils/partyIdentity.js';

const DEFAULT_FILE = 'data/presidentes.json';
const DEFAULT_PROJECT_ID = 'plano-mvp-9a0b4';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

const parseArgs = (argv) => {
  const options = {
    file: DEFAULT_FILE,
    projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
    serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    accessToken: process.env.GOOGLE_OAUTH_ACCESS_TOKEN || '',
    apply: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`Valor ausente para ${argument}.`);
      index += 1;
      return next;
    };

    if (argument === '--file') options.file = value();
    else if (argument === '--project') options.projectId = value();
    else if (argument === '--service-account') options.serviceAccount = value();
    else if (argument === '--apply') options.apply = true;
    else if (argument === '--help' || argument === '-h') {
      console.log('Uso: npm run presidents:import -- [--file arquivo.json] [--project id] [--service-account conta.json] [--apply]');
      process.exit(0);
    } else throw new Error(`Opção desconhecida: ${argument}`);
  }

  return options;
};

const normalizeText = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

const slugify = (value) => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const firestoreValue = (value) => {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
};

const toFirestoreFields = (record) => Object.fromEntries(
  Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, firestoreValue(value)])
);

const readEnvApiKey = async () => {
  if (process.env.FIREBASE_WEB_API_KEY) return process.env.FIREBASE_WEB_API_KEY;
  try {
    const env = await readFile('.env.local', 'utf8');
    return env.match(/^VITE_API_KEY=(.+)$/m)?.[1]?.trim() || '';
  } catch {
    return '';
  }
};

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');

const getServiceAccountAccessToken = async (serviceAccountPath) => {
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
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
  if (!response.ok) throw new Error(`Falha ao obter token administrativo (${response.status}).`);
  return (await response.json()).access_token;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
};

const readPresidents = async (file) => {
  const parsed = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed)) throw new Error('O JSON de presidentes deve conter um array.');
  const seen = new Set();
  return parsed.map((record, index) => {
    const nome = String(record.candidato || '').trim();
    const partido = String(record.partido || '').trim();
    const numero = Number(record.numero);
    const nota = record.nota === null || record.nota === '' ? null : Number(record.nota);
    if (!nome || !partido || !Number.isInteger(numero) || numero <= 0 || (nota !== null && !Number.isFinite(nota))) {
      throw new Error(`Registro ${index + 1} inválido.`);
    }
    const id = `presidente__todos__${slugify(nome)}__${slugify(partido)}`;
    if (seen.has(id)) throw new Error(`Presidente duplicado: ${nome}.`);
    seen.add(id);
    return { id, nome, partido, numero, nota };
  });
};

const buildDocument = (president) => {
  const hasScore = president.nota !== null;
  const hasPartyScore = Number.isFinite(president.notaPartido);
  return {
    cargo: 'Presidente',
    estado: 'TODOS',
    nome: president.nome,
    partido: president.partido,
    numero: president.numero,
    slug: slugify(president.nome),
    fonte: 'importacao/presidentes.json',
    last_sync: new Date().toISOString(),
    tipo: hasScore ? 'avaliado' : 'ingressante',
    status_candidatura: 'Candidato',
    temNotaCandidato: hasScore,
    tem_nota_candidato: hasScore,
    ...(hasPartyScore ? {
      nota_partido: president.notaPartido,
      party_score_source: 'partidos_politicos'
    } : {}),
    ...(hasScore ? {
      nota_candidato: president.nota,
      nota_final: president.nota
    } : hasPartyScore ? {
      nota_final: president.notaPartido
    } : {})
  };
};

const fetchExistingPresidents = async ({ projectId, apiKey }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
  const rows = await requestJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'candidatos' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'cargo' },
            op: 'EQUAL',
            value: { stringValue: 'Presidente' }
          }
        }
      }
    })
  });
  return new Set(rows.map((row) => row.document?.name?.split('/').at(-1)).filter(Boolean));
};

const readFirestoreScalar = (field) => {
  if (field === null || field === undefined || field === '') return null;
  if (typeof field !== 'object') return field;
  const key = Object.keys(field)[0];
  const value = field[key];
  if (key === 'integerValue' || key === 'doubleValue') return Number(value);
  return value;
};

const fetchPartyScores = async ({ projectId, apiKey }) => {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/partidos_politicos`);
  url.searchParams.set('pageSize', '300');
  url.searchParams.set('key', apiKey);
  const payload = await requestJson(url);
  const scores = new Map();

  (payload.documents || []).forEach((document) => {
    const fields = document.fields || {};
    const score = [fields.nota, fields.nota_partido, fields.notaFinal, fields.nota_final, fields.score]
      .map(readFirestoreScalar)
      .find((value) => Number.isFinite(value));
    if (!Number.isFinite(score)) return;
    const identityValues = [
      document.name?.split('/').at(-1),
      fields.nome,
      fields.Nome,
      fields.partido,
      fields.Partido,
      fields.sigla,
      fields.Sigla
    ];
    identityValues
      .map(readFirestoreScalar)
      .filter(Boolean)
      .flatMap(getPartyIdentityKeys)
      .forEach((key) => scores.set(key, score));

    [
      document.name?.split('/').at(-1),
      fields.numero,
      fields.Numero,
      fields.numero_partido,
      fields.numeroPartido,
      fields['Numero partido'],
      fields['Número partido']
    ]
      .map(readFirestoreScalar)
      .map(getPartyNumberKey)
      .filter(Boolean)
      .forEach((key) => scores.set(key, score));
  });

  return scores;
};

const getPresidentPartyScore = (president, partyScores) => {
  for (const key of getPartyIdentityKeys(president.partido)) {
    const score = partyScores.get(key);
    if (Number.isFinite(score)) return score;
  }

  const scoreByNumber = partyScores.get(getPartyNumberKey(president.numero));
  return Number.isFinite(scoreByNumber) ? scoreByNumber : null;
};

const commit = async ({ projectId, presidents, accessToken }) => {
  const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
  const writes = presidents.map((president) => ({
    update: {
      name: `${databaseRoot}/candidatos/${president.id}`,
      fields: toFirestoreFields(buildDocument(president))
    }
  }));
  await requestJson(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ writes })
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = await readEnvApiKey();
  if (!apiKey) throw new Error('Firebase Web API key não encontrada.');
  const presidents = await readPresidents(options.file);
  const [existing, partyScores] = await Promise.all([
    fetchExistingPresidents({ ...options, apiKey }),
    fetchPartyScores({ ...options, apiKey })
  ]);
  const presidentsWithPartyScores = presidents.map((president) => ({
    ...president,
    notaPartido: getPresidentPartyScore(president, partyScores)
  }));
  const newCount = presidentsWithPartyScores.filter((president) => !existing.has(president.id)).length;
  const missingPartyFallbacks = presidentsWithPartyScores
    .filter((president) => president.nota === null && !Number.isFinite(president.notaPartido))
    .map((president) => president.partido);
  console.log(`Presidentes no JSON: ${presidents.length}`);
  console.log(`Documentos de Presidente já existentes: ${existing.size}`);
  console.log(`Novos documentos planejados: ${newCount}`);
  console.log(`Documentos atualizados de forma idempotente: ${presidents.length - newCount}`);
  console.log(`Notas partidárias ausentes para candidatos sem nota: ${missingPartyFallbacks.length}`);
  missingPartyFallbacks.forEach((party) => console.log(`- ${party}`));

  if (!options.apply) {
    console.log('Simulação concluída. Nenhum documento foi gravado.');
    return;
  }

  let accessToken = options.accessToken;
  if (!accessToken && options.serviceAccount) {
    accessToken = await getServiceAccountAccessToken(options.serviceAccount);
  }
  if (!accessToken) throw new Error('A gravação exige --service-account ou GOOGLE_OAUTH_ACCESS_TOKEN.');
  await commit({ ...options, presidents: presidentsWithPartyScores, accessToken });
  console.log(`Carga concluída: ${presidentsWithPartyScores.length} presidentes cadastrados/atualizados.`);
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
