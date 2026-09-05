import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { VIABILITY_TARGETS } from '../src/shared/constants/viabilityTargets.js';
import { compareCandidatesByScorePriority } from '../src/shared/utils/candidateMetrics.js';
import { RECOMMENDATION_POLICY_VERSION } from '../src/features/plan-summary/recommendationPolicy.js';

const db = new PGlite();
const election = 'congresso-2026';
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const file = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema extensions;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
    grant usage on schema auth to authenticated, anon;
  `);
  // gen_random_uuid é nativa no Postgres usado pelo PGlite. A extensão pgcrypto
  // não é usada pelo mecanismo em teste; o restante das migrações é executado.
  await db.exec((await file('supabase/migrations/20260831000000_initial_schema.sql'))
    .replace('create extension if not exists pgcrypto with schema extensions;', ''));
  await db.exec(await file('supabase/seed.sql'));
  for (const name of [
    '20260901000000_add_presidential_candidates.sql',
    '20260901010000_sync_selection_tallies.sql',
    '20260901020000_ignore_legacy_tally_ids.sql',
    '20260901030000_fix_candidate_score_sources.sql',
  ]) await db.exec(await file(`supabase/migrations/${name}`));
  // Um rascunho pré-existente também deve ser migrado sem perder seleções.
  await db.query('insert into auth.users(id) values ($1)', [uuid(999)]);
  await db.query(`insert into public.ballot_drafts(election_id,user_id,state,selections)
    values ($1,$2,'SP',$3)`, [election, uuid(999), JSON.stringify({ selections: { presidente: [
    { id: 'congresso-2026-presidente-22-flavio-bolsonaro' },
  ] } })]);
  await db.exec(await file('supabase/migrations/20260903000000_limited_recommendations.sql'));
  await db.exec(await file('supabase/migrations/20260904000000_shared_selections.sql'));
});
after(() => db.close());

const isolated = (name, fn) => test(name, async () => {
  await db.exec('begin');
  try { await fn(); } finally { await db.exec('rollback'); }
});
const candidate = async (id, score, office = 'Deputado Federal', state = 'SP', party = null) => {
  await db.query(`insert into public.candidates (id,election_id,name,office,state,party_id,scores)
    values ($1,$2,$1,$3,$4,$5,$6)`, [id, election, office, state, party, JSON.stringify({ candidate: score })]);
};
const save = async (user, ids, state = 'SP') => {
  await db.query('insert into auth.users(id) values ($1) on conflict do nothing', [uuid(user)]);
  const selections = JSON.stringify({ candidate_groups: { any: ids.map((id) => ({ id, nota_candidato: 9999 })) } });
  await db.query(`insert into public.ballot_drafts (election_id,user_id,state,selections)
    values ($1,$2,$3,$4) on conflict(election_id,user_id) do update set
    state=excluded.state,selections=excluded.selections`, [election, uuid(user), state, selections]);
};
const recommendations = async (user) => (await db.query(`select office,candidate_id,slot,assigned_at
  from public.ballot_recommendations where user_id=$1 order by office,slot`, [uuid(user)])).rows;
const idsFor = async (user) => (await recommendations(user)).map((row) => row.candidate_id);
const counts = async () => Object.fromEntries((await db.query(`select candidate_id,indication_count
  from public.recommendation_tallies where candidate_id in ('Joao','Jose','Maria') order by candidate_id`)).rows
  .map((r) => [r.candidate_id, Number(r.indication_count)]));

const actAs = (user) => db.query("select set_config('request.jwt.claim.sub', $1, true)", [uuid(user)]);
const publish = async (user) => {
  await actAs(user);
  return (await db.query('select public.publish_shared_selection($1) as publication', [election])).rows[0].publication;
};
const readShare = async (id) => (await db.query('select public.read_shared_selection($1) as selection', [id])).rows[0].selection;
const importShare = (share, ids, state = 'SP', expected = null) => db.query(
  'select public.import_shared_selection($1,$2,$3,$4,$5) as draft', [share.id, share.revision, state, ids, expected]);

isolated('publicação copia todos os selecionados, não só as indicações; ler não contabiliza', async () => {
  await candidate('public-A', 9); await candidate('public-B', 8); await candidate('public-C', 7);
  await save(101, ['public-A','public-B','public-C']);
  const share = await publish(101);
  assert.equal(share.count, 3); assert.equal((await idsFor(101)).length, 1);
  const beforeCounts = (await db.query('select * from public.selection_tallies order by candidate_id')).rows;
  const beforeDrafts = (await db.query('select count(*) as total from public.ballot_drafts')).rows;
  await db.exec('set local role anon');
  const publicData = await readShare(share.id);
  assert.equal(publicData.candidates.length, 3);
  assert.deepEqual(Object.keys(publicData).sort(), ['id','election_id','state','revision','published_at','published_count','candidates'].sort());
  await readShare(share.id); // Link reutilizável, sem consumo ou contagem de visita.
  await db.exec('savepoint private_denied');
  await assert.rejects(db.query('select * from private.shared_selections'), /permission denied/);
  await db.exec('rollback to savepoint private_denied; reset role');
  assert.deepEqual((await db.query('select * from public.selection_tallies order by candidate_id')).rows, beforeCounts);
  assert.deepEqual((await db.query('select count(*) as total from public.ballot_drafts')).rows, beforeDrafts);
});

isolated('mesmo QR permite múltiplas contas, cada importação tem seleção e indicação próprias', async () => {
  await candidate('shared-A', 9); await candidate('shared-B', 8);
  await db.exec(`update public.recommendation_limits set indication_limit=2 where office='DEPUTADO_FEDERAL' and scope='SP'`);
  await save(102, ['shared-A','shared-B']);
  const share = await publish(102);
  await db.query('insert into auth.users(id) values ($1),($2)', [uuid(103),uuid(104)]);
  await actAs(103); await importShare(share, ['shared-A','shared-B']);
  await actAs(104); await importShare(share, ['shared-A','shared-B']);
  assert.deepEqual(await idsFor(103), ['shared-A']);
  assert.deepEqual(await idsFor(104), ['shared-B']);
  assert.equal((await readShare(share.id)).candidates.length, 2);
  const result = await db.query(`select selection_count from public.selection_tallies where candidate_id='shared-A'`);
  assert.equal(Number(result.rows[0].selection_count), 3);
  await db.exec('savepoint duplicate');
  await assert.rejects(importShare(share, ['shared-A']), /DRAFT_CHANGED/);
  await db.exec('rollback to savepoint duplicate');
  assert.deepEqual(await idsFor(104), ['shared-B']);
});

isolated('publicação fica estável até atualizar; atualização preserva URL e desativação bloqueia leitura', async () => {
  await candidate('snapshot-A', 9); await candidate('snapshot-B', 8);
  await save(105, ['snapshot-A']);
  const first = await publish(105);
  await save(105, ['snapshot-B']);
  assert.equal((await readShare(first.id)).candidates[0].id, 'snapshot-A');
  const second = await publish(105);
  assert.equal(second.id, first.id); assert.equal(second.revision, first.revision + 1);
  await db.query('insert into auth.users(id) values ($1)', [uuid(106)]);
  await actAs(106); await db.exec('savepoint stale');
  await assert.rejects(importShare(first, ['snapshot-A']), /SHARE_CHANGED/);
  await db.exec('rollback to savepoint stale');
  await importShare(second, ['snapshot-B']);
  await actAs(105); await db.query('select public.disable_shared_selection($1)', [election]);
  assert.equal(await readShare(first.id), null);
  assert.deepEqual(await idsFor(106), ['snapshot-B']);
});

isolated('importação só aceita candidatos publicados e da UF escolhida, sem sobrescrita silenciosa', async () => {
  await candidate('shared-P', 9, 'Presidente', null); await candidate('shared-SP', 9);
  await candidate('outsider', 10);
  await save(107, ['shared-P','shared-SP']); const shared = await publish(107);
  await save(108, ['outsider']); await actAs(108);
  const original = await idsFor(108);
  for (const [ids, state, expectedError] of [
    [['outsider'], 'SP', /INVALID_CANDIDATE/],
    [['shared-SP'], 'RJ', /CANDIDATES_CHANGED/],
    [['shared-P'], 'XX', /INVALID_STATE/],
    [['shared-P'], 'SP', /DRAFT_CHANGED/],
  ]) {
    await db.exec('savepoint invalid_import');
    await assert.rejects(importShare(shared, ids, state), expectedError);
    await db.exec('rollback to savepoint invalid_import');
    assert.deepEqual(await idsFor(108), original);
  }
  const context = (await db.query('select updated_at::text as updated_at from public.ballot_drafts where user_id=$1', [uuid(108)])).rows[0];
  await importShare(shared, ['shared-P'], 'RJ', context.updated_at);
  assert.deepEqual(await idsFor(108), ['shared-P']);
});

isolated('outra conta não gerencia publicação do autor; anonimato não permite publicar/importar', async () => {
  await candidate('owner-A', 9); await save(109, ['owner-A']);
  const shared = await publish(109);
  await db.query('insert into auth.users(id) values ($1)', [uuid(110)]);
  await actAs(110); await db.exec('set local role authenticated');
  assert.equal((await db.query('select public.my_shared_selection($1) as own', [election])).rows[0].own, null);
  await db.query('select public.disable_shared_selection($1)', [election]);
  assert.ok(await readShare(shared.id));
  await db.exec('set local role anon; savepoint anon_write');
  await assert.rejects(db.query('select public.publish_shared_selection($1)', [election]), /permission denied/);
  await db.exec('rollback to savepoint anon_write; savepoint anon_import');
  await assert.rejects(importShare(shared, ['owner-A']), /permission denied/);
  await db.exec('rollback to savepoint anon_import');
});

isolated('excluir os dados eleitorais do autor também remove seu link público', async () => {
  await candidate('deleted-owner', 8); await save(111, ['deleted-owner']);
  const shared = await publish(111);
  await db.query('delete from public.ballot_drafts where user_id=$1', [uuid(111)]);
  assert.equal(await readShare(shared.id), null);
});

test('os 81 limites no PostgreSQL são exatamente os fornecidos', async () => {
  const expected = Object.entries(VIABILITY_TARGETS).flatMap(([office, states]) =>
    Object.entries(states).map(([scope, indication_limit]) => ({ office, scope, indication_limit })));
  const actual = (await db.query('select office,scope,indication_limit from public.recommendation_limits')).rows;
  assert.deepEqual(actual.map((row) => ({ ...row, indication_limit: Number(row.indication_limit) }))
    .sort((a,b) => `${a.office}${a.scope}`.localeCompare(`${b.office}${b.scope}`)),
  expected.sort((a,b) => `${a.office}${a.scope}`.localeCompare(`${b.office}${b.scope}`)));
});

test('migração reserva indicação para rascunhos existentes sem modificar seleção', async () => {
  assert.deepEqual(await idsFor(999), ['congresso-2026-presidente-22-flavio-bolsonaro']);
  const result = await db.query('select selections from public.ballot_drafts where user_id=$1', [uuid(999)]);
  assert.equal(result.rows[0].selections.selections.presidente.length, 1);
});

test('a versão da prévia corresponde à política ativa no banco', async () => {
  const result = await db.query('select policy_version from private.recommendation_policies where election_id=$1', [election]);
  assert.equal(result.rows[0].policy_version, RECOMMENDATION_POLICY_VERSION);
});

isolated('mais seleções têm prioridade sobre maior nota; limites continuam valendo', async () => {
  await candidate('popular', 5); await candidate('melhor-nota', 10);
  await db.exec(`update public.recommendation_limits set indication_limit=2 where office='DEPUTADO_FEDERAL' and scope='SP'`);
  await save(91, ['popular']);
  await save(92, ['popular','melhor-nota']);
  assert.deepEqual(await idsFor(92), ['popular']);
  await save(93, ['popular','melhor-nota']);
  assert.deepEqual(await idsFor(93), ['melhor-nota']);
  assert.equal(Number((await db.query(`select selection_count from public.selection_tallies where candidate_id='popular'`)).rows[0].selection_count), 3);
});

isolated('popularidade presidencial soma seleções de todas as UFs e aparece nas métricas', async () => {
  await candidate('popular-br', 5, 'Presidente', null); await candidate('nota-br', 10, 'Presidente', null);
  await save(94, ['popular-br'], 'SP'); await save(95, ['popular-br'], 'RJ');
  await save(96, ['popular-br','nota-br'], 'AC');
  assert.deepEqual(await idsFor(96), ['popular-br']);
  const result = await db.query(`select active_selections,scope from public.candidate_recommendation_metrics where candidate_id='popular-br'`);
  assert.equal(Number(result.rows[0].active_selections), 3);
  assert.equal(result.rows[0].scope, 'BR');
});

isolated('exemplo A/B/C/D: Maria 4 seleções e 3 indicações; José 1; João 0', async () => {
  await candidate('Joao', 8); await candidate('Jose', 7); await candidate('Maria', 9);
  await db.exec(`update public.recommendation_limits set indication_limit=3 where office='DEPUTADO_FEDERAL' and scope='SP'`);
  await save(1, ['Joao','Maria']); await save(2, ['Joao','Maria']);
  await save(3, ['Jose','Maria']); await save(4, ['Jose','Maria']);
  assert.deepEqual(await idsFor(1), ['Maria']); assert.deepEqual(await idsFor(2), ['Maria']);
  assert.deepEqual(await idsFor(3), ['Maria']); assert.deepEqual(await idsFor(4), ['Jose']);
  assert.deepEqual(await counts(), { Jose: 1, Maria: 3 });
  const selected = (await db.query(`select candidate_id,selection_count from public.selection_tallies
    where candidate_id in ('Joao','Jose','Maria') order by candidate_id`)).rows;
  assert.deepEqual(selected.map((r) => [r.candidate_id, Number(r.selection_count)]), [['Joao',2],['Jose',2],['Maria',4]]);
  const original = await recommendations(1);
  await save(1, ['Maria','Joao','Joao']); // Ordem/duplicata não criam outra indicação.
  assert.deepEqual(await recommendations(1), original);
  assert.deepEqual(await counts(), { Jose: 1, Maria: 3 });
  await save(1, ['Joao']); // Libera Maria e reserva João, sem remover as escolhas dos outros.
  assert.deepEqual(await counts(), { Joao: 1, Jose: 1, Maria: 2 });
  await save(5, ['Jose','Maria']);
  assert.deepEqual(await idsFor(5), ['Maria']);
  await db.query('delete from public.ballot_drafts where user_id=$1', [uuid(5)]);
  assert.equal((await counts()).Maria, 2);
});

isolated('nota própria prevalece; empate prefere própria; JSON do usuário não controla a nota', async () => {
  await db.exec(`insert into public.parties(id,name,score) values ('test-party','Teste',8)`);
  await candidate('A-partido', null, 'Senador', 'SP', 'test-party');
  await candidate('Z-propria', 8, 'Senador', 'SP');
  await candidate('Y-menor', 7, 'Senador', 'SP', 'test-party');
  await save(10, ['Y-menor','A-partido','Z-propria']);
  assert.deepEqual(await idsFor(10), ['Z-propria','A-partido']);
});

isolated('um presidente nacional, dois senadores distintos e um deputado por usuário', async () => {
  await candidate('P1', 10, 'Presidente', null); await candidate('P2', 9, 'Presidente', null);
  await candidate('S1', 10, 'Senador'); await candidate('S2', 9, 'Senador'); await candidate('S3', 8, 'Senador');
  await candidate('D1', 10); await candidate('D2', 9);
  await db.exec(`update public.recommendation_limits set indication_limit=1 where office='PRESIDENTE'`);
  await save(11, ['P1','P2','S1','S2','S3','D1','D2']);
  assert.deepEqual(await idsFor(11), ['D1','P1','S1','S2']);
  await save(12, ['P1','P2'], 'RJ');
  assert.deepEqual(await idsFor(12), ['P2']); // Mesma cota BR apesar de outra UF.
  await save(13, ['P1','P2'], 'AC');
  assert.deepEqual(await idsFor(13), []); // Esgotado: nunca inventa alternativa não selecionada.
});

isolated('candidatos de outra UF, ocultos, desconhecidos ou outra eleição não recebem reserva', async () => {
  await candidate('deputado-rj', 10, 'Deputado Federal', 'RJ'); await candidate('oculto', 10);
  await db.exec(`update public.candidates set public_visible=false where id='oculto';
    insert into public.elections(id,name,status) values ('outra','Outra','active');
    insert into public.candidates(id,election_id,name,office,state,scores)
      values ('outra-candidatura','outra','Outro','Deputado Federal','SP','{"candidate":10}');`);
  await save(20, ['deputado-rj','oculto','inexistente','outra-candidatura']);
  assert.deepEqual(await idsFor(20), []);
});

isolated('mudança de UF libera reservas estaduais e mantém a presidencial', async () => {
  await candidate('P', 9, 'Presidente', null); await candidate('SP', 8); await candidate('RJ', 8, 'Deputado Federal', 'RJ');
  await save(21, ['P','SP']);
  const beforePresident = (await recommendations(21)).find((r) => r.office === 'PRESIDENTE');
  await save(21, ['P','SP','RJ'], 'RJ');
  assert.deepEqual(await idsFor(21), ['RJ','P']);
  assert.deepEqual((await recommendations(21)).find((r) => r.office === 'PRESIDENTE'), beforePresident);
  assert.equal(Number((await db.query(`select indication_count from public.recommendation_tallies where candidate_id='SP'`)).rows[0].indication_count), 0);
  await db.query('delete from auth.users where id=$1', [uuid(21)]);
  assert.deepEqual(await idsFor(21), []);
  assert.equal(Number((await db.query(`select indication_count from public.recommendation_tallies where candidate_id='P'`)).rows[0].indication_count), 0);
});

isolated('limite ausente ou política desconhecida falha atomicamente', async () => {
  await candidate('candidato', 9);
  await db.exec(`delete from public.recommendation_limits where office='DEPUTADO_FEDERAL' and scope='SP'; savepoint check_limit`);
  await assert.rejects(save(31, ['candidato']), /limit missing/);
  await db.exec('rollback to savepoint check_limit');
  assert.deepEqual(await idsFor(31), []);
  await db.exec(`insert into public.recommendation_limits values ('congresso-2026','DEPUTADO_FEDERAL','SP',3);
    update private.recommendation_policies set policy_version='unknown'; savepoint check_policy`);
  await assert.rejects(save(32, ['candidato']), /Unsupported recommendation policy/);
  await db.exec('rollback to savepoint check_policy');
  assert.deepEqual(await idsFor(32), []);
});

isolated('RLS: cliente só lê suas reservas e não escreve limites/contadores/indicações', async () => {
  await candidate('candidato', 9); await save(41, ['candidato']); await save(42, ['candidato']);
  await db.exec(`set local role authenticated; set local request.jwt.claim.sub='${uuid(41)}'`);
  const rows = (await db.query('select user_id from public.ballot_recommendations')).rows;
  assert.deepEqual(rows, [{ user_id: uuid(41) }]);
  assert.equal((await db.query('select count(*) from public.candidate_recommendation_metrics')).rows.length, 1);
  for (const sql of [
    `update public.recommendation_tallies set indication_count=0`,
    `delete from public.ballot_recommendations`,
    `update public.recommendation_limits set indication_limit=999`,
    `select * from private.recommendation_requests`,
    `select private.allocate_ballot_recommendations('congresso-2026','${uuid(41)}','SP','{}')`,
  ]) {
    await db.exec('savepoint denied');
    await assert.rejects(db.exec(sql), /permission denied/);
    await db.exec('rollback to savepoint denied');
  }
});

isolated('desempate por nome/ID é o mesmo na lista e na indicação do banco', async () => {
  const names = ['Zélia', 'Álvaro', 'ALVARO', 'ana'];
  const candidates = names.map((nome, index) => ({ id: `tie-${index}`, nome, nota_candidato: 8 }));
  for (const c of candidates) {
    await candidate(c.id, 8);
    await db.query('update public.candidates set name=$1 where id=$2', [c.nome, c.id]);
  }
  const result = await db.query(`select * from private.rank_recommendation_candidates($1,'DEPUTADO_FEDERAL','SP',$2,'score_v1')`,
    [election, candidates.map((c) => c.id)]);
  assert.deepEqual(result.rows.map((r) => r.candidate_id), candidates.sort(compareCandidatesByScorePriority).map((c) => c.id));
});

isolated('gravação autenticada dispara reserva sem permissão direta nas tabelas internas', async () => {
  await candidate('authenticated-candidate', 9);
  await db.query('insert into auth.users(id) values ($1)', [uuid(50)]);
  await db.exec(`set local role authenticated; set local request.jwt.claim.sub='${uuid(50)}'`);
  await db.query(`insert into public.ballot_drafts(election_id,user_id,state,selections)
    values ($1,$2,'SP',$3)`, [election, uuid(50), JSON.stringify({ selections: { deputado_federal: [{ id: 'authenticated-candidate' }] } })]);
  assert.deepEqual(await idsFor(50), ['authenticated-candidate']);
  await db.exec('savepoint other_account');
  await assert.rejects(db.query('delete from public.ballot_recommendations where user_id=$1', [uuid(50)]), /permission denied/);
  await db.exec('rollback to savepoint other_account');
  await db.query('delete from public.ballot_drafts where user_id=$1', [uuid(50)]);
  assert.deepEqual(await idsFor(50), []);
});

isolated('erro em outro cargo reverte também a primeira reserva da transação', async () => {
  await candidate('atomic-president', 9, 'Presidente', null);
  await candidate('atomic-deputy', 8);
  await db.exec(`delete from public.recommendation_limits where office='DEPUTADO_FEDERAL' and scope='SP'; savepoint atomic`);
  await assert.rejects(save(51, ['atomic-president', 'atomic-deputy']), /limit missing/);
  await db.exec('rollback to savepoint atomic');
  assert.deepEqual(await idsFor(51), []);
  assert.equal((await db.query(`select * from public.recommendation_tallies where candidate_id='atomic-president'`)).rows.length, 0);
});

isolated('muitas gravações esgotam a cota sem excedê-la; nenhum teste usa votos reais', async () => {
  await candidate('batch', 9);
  await db.exec(`update public.recommendation_limits set indication_limit=3 where office='DEPUTADO_FEDERAL' and scope='SP'`);
  // PGlite serializa numa conexão: testa saturação, NÃO concorrência multi-sessão.
  for (let user = 60; user < 80; user++) await save(user, ['batch']);
  const result = await db.query(`select count(*) as count from public.ballot_recommendations where candidate_id='batch'`);
  assert.equal(Number(result.rows[0].count), 3);
  assert.deepEqual(await idsFor(63), []);
});
