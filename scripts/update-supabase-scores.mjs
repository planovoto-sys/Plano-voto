import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

import {
  buildImportRows,
  readCandidateDataset,
} from './import-supabase-candidates-2026.mjs';

const DEFAULT_BATCH_SIZE = 250;
const PARTY_ALIASES = new Map([
  ['PODE', 'PODEMOS'],
]);

const usage = `
Uso:
  npm run supabase:scores:update -- --file <notas.json> --base-file <candidatos.json> [--apply]

Por padrao o comando valida e simula as atualizacoes. Para gravar, use --apply e defina
SUPABASE_URL e SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY legada).
`;

export const normalizeMatchText = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

export const normalizePartyAcronym = (value) => {
  const acronym = normalizeMatchText(value);
  return PARTY_ALIASES.get(acronym) || acronym;
};

export const candidateScoreKey = (candidate) => [
  normalizeMatchText(candidate?.nome),
  normalizeMatchText(candidate?.cargo),
  normalizeMatchText(candidate?.uf),
  normalizePartyAcronym(candidate?.partido_sigla),
].join('|');

export const candidateScoreLooseKey = (candidate) => [
  normalizeMatchText(candidate?.nome),
  normalizeMatchText(candidate?.cargo),
  normalizeMatchText(candidate?.uf),
].join('|');

export const candidateScoreIdentityKey = (candidate) => [
  normalizeMatchText(candidate?.nome),
  normalizeMatchText(candidate?.uf),
  normalizePartyAcronym(candidate?.partido_sigla),
].join('|');

const numericOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const applyCandidateScore = (baseRow, scoreRecord) => ({
  ...baseRow,
  scores: {
    ...(baseRow.scores || {}),
    candidate: numericOrNull(scoreRecord.nota),
    displayed: numericOrNull(scoreRecord.nota),
    status: scoreRecord.status_avaliacao || null,
    source: numericOrNull(scoreRecord.nota) === null ? null : 'candidate',
    source_urls: scoreRecord.fonte_urls || [],
  },
  legacy_data: {
    ...(baseRow.legacy_data || {}),
    ...scoreRecord,
  },
});

export const applyPartyScore = (baseRow, scoreRecord) => ({
  ...baseRow,
  score: numericOrNull(scoreRecord.nota),
  legacy_data: {
    ...(baseRow.legacy_data || {}),
    ...scoreRecord,
    sigla: baseRow.acronym,
  },
});

export const buildScoreUpdateRows = (baseDataset, scoreDataset) => {
  if (!Array.isArray(scoreDataset?.politicos) || !Array.isArray(scoreDataset?.partidos)) {
    throw new Error('O arquivo de notas deve conter os arrays politicos e partidos.');
  }

  const baseRows = buildImportRows(baseDataset);
  const candidateIndex = new Map();
  const looseCandidateIndex = new Map();
  const identityCandidateIndex = new Map();
  const addIndexEntry = (index, key, row) => {
    const rows = index.get(key) || [];
    if (!rows.some((existing) => existing.id === row.id)) index.set(key, [...rows, row]);
  };
  baseRows.candidates.forEach((row) => {
    const nameVariants = [row.legacy_data?.nome, row.legacy_data?.nome_civil].filter(Boolean);
    nameVariants.forEach((name) => {
      const variant = { ...row.legacy_data, nome: name };
      addIndexEntry(candidateIndex, candidateScoreKey(variant), row);
      addIndexEntry(looseCandidateIndex, candidateScoreLooseKey(variant), row);
      addIndexEntry(identityCandidateIndex, candidateScoreIdentityKey(variant), row);
    });
  });

  const unmatchedCandidates = [];
  const ambiguousCandidates = [];
  const candidateUpdatesById = new Map();
  scoreDataset.politicos.forEach((scoreRecord) => {
    const key = candidateScoreKey(scoreRecord);
    const hasParty = Boolean(normalizePartyAcronym(scoreRecord.partido_sigla));
    let matches = hasParty
      ? candidateIndex.get(key) || []
      : looseCandidateIndex.get(candidateScoreLooseKey(scoreRecord)) || [];
    let matchPriority = 0;
    if (matches.length === 0 && hasParty) {
      matches = identityCandidateIndex.get(candidateScoreIdentityKey(scoreRecord)) || [];
      matchPriority = 1;
    }
    if (matches.length === 0) {
      unmatchedCandidates.push(scoreRecord);
      return;
    }
    if (matches.length > 1) {
      ambiguousCandidates.push({ scoreRecord, matches: matches.length });
      return;
    }
    const [baseRow] = matches;
    const existing = candidateUpdatesById.get(baseRow.id);
    if (existing && existing.matchPriority <= matchPriority) return;
    candidateUpdatesById.set(baseRow.id, {
      matchPriority,
      row: applyCandidateScore(baseRow, scoreRecord),
    });
  });
  const candidateUpdates = [...candidateUpdatesById.values()].map(({ row }) => row);

  const partyIndex = new Map(baseRows.parties.map((row) => [normalizePartyAcronym(row.acronym), row]));
  const partyUpdates = scoreDataset.partidos.map((scoreRecord) => {
    const key = normalizePartyAcronym(scoreRecord.sigla);
    const baseRow = partyIndex.get(key);
    if (!baseRow) throw new Error(`Partido sem correspondencia: ${key}.`);
    return applyPartyScore(baseRow, scoreRecord);
  });

  if (new Set(partyUpdates.map((row) => row.id)).size !== partyUpdates.length) {
    throw new Error('O arquivo de notas contem partidos duplicados.');
  }

  return { candidateUpdates, partyUpdates, unmatchedCandidates, ambiguousCandidates };
};

const parseArgs = (argv) => {
  const options = { apply: false, filePath: '', baseFilePath: '', batchSize: DEFAULT_BATCH_SIZE };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Valor ausente para ${argument}.`);
      index += 1;
      return value;
    };
    if (argument === '--file') options.filePath = readValue();
    else if (argument === '--base-file') options.baseFilePath = readValue();
    else if (argument === '--batch-size') options.batchSize = Number(readValue());
    else if (argument === '--apply') options.apply = true;
    else if (argument === '--help' || argument === '-h') {
      console.log(usage);
      process.exit(0);
    } else throw new Error(`Opcao desconhecida: ${argument}`);
  }
  if (!options.filePath || !options.baseFilePath) throw new Error('Informe --file e --base-file.');
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 1000) {
    throw new Error('--batch-size deve ser um inteiro entre 1 e 1000.');
  }
  return options;
};

const upsertBatches = async (supabase, table, rows, batchSize) => {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Falha em ${table}: ${error.message}`);
    console.log(`${table}: ${offset + batch.length}/${rows.length}`);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const baseDataset = await readCandidateDataset(options.baseFilePath);
  const scoreDataset = JSON.parse(await readFile(options.filePath, 'utf8'));
  const {
    candidateUpdates,
    partyUpdates,
    unmatchedCandidates,
    ambiguousCandidates,
  } = buildScoreUpdateRows(baseDataset, scoreDataset);
  const candidatesWithScore = candidateUpdates.filter((row) => row.scores.candidate !== null).length;

  console.log(`Partidos a atualizar: ${partyUpdates.length}`);
  console.log(`Politicos a atualizar: ${candidateUpdates.length}`);
  console.log(`Politicos com nota numerica: ${candidatesWithScore}`);
  console.log(`Politicos sem avaliacao numerica: ${candidateUpdates.length - candidatesWithScore}`);
  console.log(`Politicos sem correspondencia ignorados: ${unmatchedCandidates.length}`);
  console.log(`Politicos ambiguos ignorados: ${ambiguousCandidates.length}`);
  if (!options.apply) {
    console.log('Simulacao concluida. Acrescente --apply para gravar.');
    return;
  }

  const url = process.env.SUPABASE_URL?.trim() || '';
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || '';
  if (!url || !secret) throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY.');

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await upsertBatches(supabase, 'parties', partyUpdates, options.batchSize);
  await upsertBatches(supabase, 'candidates', candidateUpdates, options.batchSize);
  console.log('Atualizacao de notas concluida.');
};

if (process.argv[1]?.endsWith('update-supabase-scores.mjs')) {
  main().catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exitCode = 1;
  });
}
