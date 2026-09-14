import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_ELECTION_ID = 'congresso-2026';
const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_MAX_WRITES = 10_000;

const usage = `
Uso:
  npm run supabase:candidates:import -- --file <candidatos.json> [opcoes]

Por padrao o comando apenas valida e simula a importacao.

Opcoes:
  --election <id>       Eleicao (padrao: ${DEFAULT_ELECTION_ID})
  --batch-size <1-1000> Registros por requisicao (padrao: ${DEFAULT_BATCH_SIZE})
  --max-writes <numero> Trava de seguranca (padrao: ${DEFAULT_MAX_WRITES})
  --apply               Grava os dados no Supabase
  --help                Mostra esta ajuda

Para gravar, defina SUPABASE_URL e SUPABASE_SECRET_KEY.
SUPABASE_SERVICE_ROLE_KEY continua aceito para projetos legados.
`;

const normalizeText = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const slugify = (value) => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const shortHash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 12);
const numericOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseArgs = (argv) => {
  const options = {
    apply: false,
    filePath: '',
    electionId: DEFAULT_ELECTION_ID,
    batchSize: DEFAULT_BATCH_SIZE,
    maxWrites: DEFAULT_MAX_WRITES,
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
      case '--file': options.filePath = readValue(); break;
      case '--election': options.electionId = readValue(); break;
      case '--batch-size': options.batchSize = Number(readValue()); break;
      case '--max-writes': options.maxWrites = Number(readValue()); break;
      case '--apply': options.apply = true; break;
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
        break;
      default: throw new Error(`Opcao desconhecida: ${argument}`);
    }
  }

  if (!options.filePath) throw new Error('Informe --file <candidatos.json>.');
  if (!options.electionId.trim()) throw new Error('--election nao pode ser vazio.');
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 1000) {
    throw new Error('--batch-size deve ser um inteiro entre 1 e 1000.');
  }
  if (!Number.isInteger(options.maxWrites) || options.maxWrites < 1) {
    throw new Error('--max-writes deve ser um inteiro positivo.');
  }

  return options;
};

export const readCandidateDataset = async (filePath) => {
  const parsed = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed?.politicos) || !Array.isArray(parsed?.partidos)) {
    throw new Error('O JSON deve conter os arrays politicos e partidos.');
  }
  return parsed;
};

export const transformParty = (party) => {
  const acronym = String(party?.sigla || '').trim().toUpperCase();
  const name = String(party?.nome || acronym).trim();
  if (!acronym || !name) throw new Error('Partido sem sigla ou nome.');

  return {
    id: slugify(acronym),
    acronym,
    name,
    score: numericOrNull(party.nota),
    public_visible: true,
    legacy_data: party,
  };
};

export const transformCandidate = (candidate, electionId = DEFAULT_ELECTION_ID) => {
  const name = String(candidate?.nome || '').trim();
  const office = String(candidate?.cargo || '').trim();
  const state = String(candidate?.uf || '').trim().toUpperCase();
  const partyId = slugify(candidate?.partido_sigla);
  const number = Number(candidate?.numero_candidato);

  if (!name || !office || !/^[A-Z]{2}$/.test(state) || !partyId || !Number.isInteger(number) || number <= 0) {
    throw new Error(`Candidato invalido: ${name || '<sem nome>'}.`);
  }

  const identity = [electionId, state, office, number, name, candidate?.nome_civil || ''].join('|');
  return {
    id: `${slugify(electionId)}-${state.toLowerCase()}-${slugify(office)}-${number}-${shortHash(identity)}`,
    election_id: electionId,
    name,
    office,
    state,
    party_id: partyId,
    number,
    slug: slugify(`${name}-${state}-${number}`),
    image_url: candidate?.imagem || candidate?.foto || null,
    scores: {
      candidate: numericOrNull(candidate?.nota),
      displayed: numericOrNull(candidate?.nota_exibida),
      status: candidate?.status_avaliacao || null,
    },
    public_visible: true,
    legacy_data: candidate,
  };
};

export const buildImportRows = (dataset, electionId = DEFAULT_ELECTION_ID) => {
  const parties = dataset.partidos.map(transformParty);
  const candidates = dataset.politicos.map((candidate) => transformCandidate(candidate, electionId));
  const partyIds = new Set(parties.map((party) => party.id));

  if (partyIds.size !== parties.length) throw new Error('Existem siglas de partido duplicadas.');
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) {
    throw new Error('A transformacao gerou IDs de candidato duplicados.');
  }

  const unknownParty = candidates.find((candidate) => !partyIds.has(candidate.party_id));
  if (unknownParty) throw new Error(`Partido ${unknownParty.party_id} nao existe no cadastro de partidos.`);

  return { parties, candidates };
};

const upsertBatches = async (supabase, table, rows, batchSize) => {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Falha em ${table} (${offset + 1}-${offset + batch.length}): ${error.message}`);
    console.log(`${table}: ${offset + batch.length}/${rows.length}`);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const dataset = await readCandidateDataset(options.filePath);
  const { parties, candidates } = buildImportRows(dataset, options.electionId);
  const totalWrites = 1 + parties.length + candidates.length;

  console.log(`Arquivo: ${resolve(options.filePath)}`);
  console.log(`Eleicao: ${options.electionId}`);
  console.log(`Partidos: ${parties.length}`);
  console.log(`Candidatos: ${candidates.length}`);
  console.log(`Total de upserts: ${totalWrites}`);

  if (totalWrites > options.maxWrites) {
    throw new Error(`Importacao excede --max-writes (${options.maxWrites}).`);
  }
  if (!options.apply) {
    console.log('Simulacao concluida. Use --apply somente apos revisar os totais.');
    return;
  }

  const url = process.env.SUPABASE_URL?.trim() || '';
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || ''
  );
  if (!url || !secretKey) throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY para gravar.');

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: electionError } = await supabase.from('elections').upsert({
    id: options.electionId,
    name: 'Eleições para o Congresso 2026',
    status: 'active',
    settings: {
      schema_version: 1,
      offices: { presidente: 1, senadores: 2, deputado_federal: 1 },
      source_metadata: dataset.metadata || {},
    },
  }, { onConflict: 'id' });
  if (electionError) throw new Error(`Falha ao gravar eleicao: ${electionError.message}`);

  await upsertBatches(supabase, 'parties', parties, options.batchSize);
  await upsertBatches(supabase, 'candidates', candidates, options.batchSize);
  console.log('Importacao concluida com sucesso.');
};

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exitCode = 1;
  });
}
