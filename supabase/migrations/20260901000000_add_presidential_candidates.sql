-- Presidenciáveis fornecidos no arquivo presidentes.json.
insert into public.parties (id, acronym, name, score, public_visible, legacy_data)
values
  ('missao', 'MISSÃO', 'PARTIDO MISSÃO', 8.68, true, '{"source":"presidentes.json"}'::jsonb),
  ('novo', 'NOVO', 'PARTIDO NOVO', 8.55, true, '{"source":"presidentes.json"}'::jsonb),
  ('pl', 'PL', 'PARTIDO LIBERAL', 7.30, true, '{"source":"presidentes.json"}'::jsonb),
  ('psd', 'PSD', 'PARTIDO SOCIAL DEMOCRÁTICO', 6.26, true, '{"source":"presidentes.json"}'::jsonb),
  ('avante', 'AVANTE', 'AVANTE', 5.97, true, '{"source":"presidentes.json"}'::jsonb),
  ('pt', 'PT', 'PARTIDO DOS TRABALHADORES', 4.11, true, '{"source":"presidentes.json"}'::jsonb),
  ('pcdob', 'PCDOB', 'PARTIDO COMUNISTA DO BRASIL', 3.97, true, '{"source":"presidentes.json"}'::jsonb),
  ('dc', 'DC', 'DEMOCRACIA CRISTÃ', null, true, '{"source":"presidentes.json"}'::jsonb),
  ('pstu', 'PSTU', 'PARTIDO SOCIALISTA DOS TRABALHADORES UNIFICADO', null, true, '{"source":"presidentes.json"}'::jsonb),
  ('prtb', 'PRTB', 'PARTIDO RENOVADOR TRABALHISTA BRASILEIRO', null, true, '{"source":"presidentes.json"}'::jsonb),
  ('pco', 'PCO', 'PARTIDO DA CAUSA OPERÁRIA', null, true, '{"source":"presidentes.json"}'::jsonb),
  ('up', 'UP', 'UNIDADE POPULAR', null, true, '{"source":"presidentes.json"}'::jsonb),
  ('dem', 'DEM', 'DEMOCRATA', null, true, '{"source":"presidentes.json"}'::jsonb)
on conflict (id) do update set
  acronym = excluded.acronym,
  name = excluded.name,
  score = coalesce(public.parties.score, excluded.score),
  public_visible = true,
  updated_at = timezone('utc', now());

insert into public.candidates (
  id, election_id, name, office, state, party_id, number, slug,
  image_url, scores, public_visible, legacy_data
)
values
  ('congresso-2026-presidente-14-renan-santos', 'congresso-2026', 'RENAN SANTOS', 'Presidente', null, 'missao', 14, 'renan-santos-14', null, '{"candidate":8.68,"displayed":8.68,"status":"avaliado"}'::jsonb, true, '{"candidato":"RENAN SANTOS","nome":"RENAN SANTOS","partido":"PARTIDO MISSÃO","partido_nome":"PARTIDO MISSÃO","partido_sigla":"MISSÃO","cargo":"Presidente","nota":8.68,"numero":14,"numero_candidato":14,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-30-zema', 'congresso-2026', 'ZEMA', 'Presidente', null, 'novo', 30, 'zema-30', null, '{"candidate":8.55,"displayed":8.55,"status":"avaliado"}'::jsonb, true, '{"candidato":"ZEMA","nome":"ZEMA","partido":"PARTIDO NOVO","partido_nome":"PARTIDO NOVO","partido_sigla":"NOVO","cargo":"Presidente","nota":8.55,"numero":30,"numero_candidato":30,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-22-flavio-bolsonaro', 'congresso-2026', 'FLAVIO BOLSONARO', 'Presidente', null, 'pl', 22, 'flavio-bolsonaro-22', null, '{"candidate":7.3,"displayed":7.3,"status":"avaliado"}'::jsonb, true, '{"candidato":"FLAVIO BOLSONARO","nome":"FLAVIO BOLSONARO","partido":"PARTIDO LIBERAL","partido_nome":"PARTIDO LIBERAL","partido_sigla":"PL","cargo":"Presidente","nota":7.3,"numero":22,"numero_candidato":22,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-55-ronaldo-caiado', 'congresso-2026', 'RONALDO CAIADO', 'Presidente', null, 'psd', 55, 'ronaldo-caiado-55', null, '{"candidate":6.26,"displayed":6.26,"status":"avaliado"}'::jsonb, true, '{"candidato":"RONALDO CAIADO","nome":"RONALDO CAIADO","partido":"PARTIDO SOCIAL DEMOCRATA","partido_nome":"PARTIDO SOCIAL DEMOCRATA","partido_sigla":"PSD","cargo":"Presidente","nota":6.26,"numero":55,"numero_candidato":55,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-70-augusto-cury', 'congresso-2026', 'ESCRITOR AUGUSTO CURY', 'Presidente', null, 'avante', 70, 'escritor-augusto-cury-70', null, '{"candidate":5.97,"displayed":5.97,"status":"avaliado"}'::jsonb, true, '{"candidato":"ESCRITOR AUGUSTO CURY","nome":"ESCRITOR AUGUSTO CURY","partido":"PARTIDO AVANTE","partido_nome":"PARTIDO AVANTE","partido_sigla":"AVANTE","cargo":"Presidente","nota":5.97,"numero":70,"numero_candidato":70,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-13-lula', 'congresso-2026', 'LULA', 'Presidente', null, 'pt', 13, 'lula-13', null, '{"candidate":4.11,"displayed":4.11,"status":"avaliado"}'::jsonb, true, '{"candidato":"LULA","nome":"LULA","partido":"PARTIDO DOS TRABALHADORES","partido_nome":"PARTIDO DOS TRABALHADORES","partido_sigla":"PT","cargo":"Presidente","nota":4.11,"numero":13,"numero_candidato":13,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-21-edmilson-costa', 'congresso-2026', 'EDMILSON COSTA', 'Presidente', null, 'pcdob', 21, 'edmilson-costa-21', null, '{"candidate":3.97,"displayed":3.97,"status":"avaliado"}'::jsonb, true, '{"candidato":"EDMILSON COSTA","nome":"EDMILSON COSTA","partido":"PARTIDO COMUNISTA DO BRASIL","partido_nome":"PARTIDO COMUNISTA DO BRASIL","partido_sigla":"PCDOB","cargo":"Presidente","nota":3.97,"numero":21,"numero_candidato":21,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-27-clariana-barao', 'congresso-2026', 'CLARIANA BARAO', 'Presidente', null, 'dc', 27, 'clariana-barao-27', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"CLARIANA BARAO","nome":"CLARIANA BARAO","partido":"DEMOCRACIA CRISTÃ","partido_nome":"DEMOCRACIA CRISTÃ","partido_sigla":"DC","cargo":"Presidente","nota":null,"numero":27,"numero_candidato":27,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-16-hertz-dias', 'congresso-2026', 'HERTZ DIAS', 'Presidente', null, 'pstu', 16, 'hertz-dias-16', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"HERTZ DIAS","nome":"HERTZ DIAS","partido":"PARTIDO SOCIALISTA DOS TRABALHADORES UNIFICADO","partido_nome":"PARTIDO SOCIALISTA DOS TRABALHADORES UNIFICADO","partido_sigla":"PSTU","cargo":"Presidente","nota":null,"numero":16,"numero_candidato":16,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-28-pablo-marcal', 'congresso-2026', 'PABLO MARÇAL', 'Presidente', null, 'prtb', 28, 'pablo-marcal-28', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"PABLO MARÇAL","nome":"PABLO MARÇAL","partido":"PARTIDO RENOVADOR TRABALHISTA BRASILEIRO","partido_nome":"PARTIDO RENOVADOR TRABALHISTA BRASILEIRO","partido_sigla":"PRTB","cargo":"Presidente","nota":null,"numero":28,"numero_candidato":28,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-29-rui-costa-pimenta', 'congresso-2026', 'RUI COSTA PIMENTA', 'Presidente', null, 'pco', 29, 'rui-costa-pimenta-29', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"RUI COSTA PIMENTA","nome":"RUI COSTA PIMENTA","partido":"PARTIDO DA CAUSA OPERÁRIA","partido_nome":"PARTIDO DA CAUSA OPERÁRIA","partido_sigla":"PCO","cargo":"Presidente","nota":null,"numero":29,"numero_candidato":29,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-80-samara', 'congresso-2026', 'SAMARA', 'Presidente', null, 'up', 80, 'samara-80', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"SAMARA","nome":"SAMARA","partido":"UNIDADE POPULAR","partido_nome":"UNIDADE POPULAR","partido_sigla":"UP","cargo":"Presidente","nota":null,"numero":80,"numero_candidato":80,"source":"presidentes.json"}'::jsonb),
  ('congresso-2026-presidente-35-wilson-grassi', 'congresso-2026', 'VETERINÁRIO WILSON GRASSI', 'Presidente', null, 'dem', 35, 'veterinario-wilson-grassi-35', null, '{"candidate":null,"displayed":null,"status":"nao_avaliado"}'::jsonb, true, '{"candidato":"VETERINÁRIO WILSON GRASSI","nome":"VETERINÁRIO WILSON GRASSI","partido":"DEMOCRATA","partido_nome":"DEMOCRATA","partido_sigla":"DEM","cargo":"Presidente","nota":null,"numero":35,"numero_candidato":35,"source":"presidentes.json"}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  office = excluded.office,
  state = excluded.state,
  party_id = excluded.party_id,
  number = excluded.number,
  slug = excluded.slug,
  image_url = excluded.image_url,
  scores = excluded.scores,
  public_visible = true,
  legacy_data = excluded.legacy_data,
  updated_at = timezone('utc', now());

update public.elections
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{offices}',
  coalesce(settings->'offices', '{}'::jsonb) || '{"presidente":1,"senadores":2,"deputado_federal":1}'::jsonb,
  true
), updated_at = timezone('utc', now())
where id = 'congresso-2026';
