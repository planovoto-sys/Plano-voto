-- Dados minimos e idempotentes para desenvolvimento local.
insert into public.elections (id, name, status, settings)
values (
  'congresso-2026',
  'Eleicoes para o Congresso 2026',
  'active',
  jsonb_build_object(
    'schema_version', 1,
    'offices', jsonb_build_object(
      'presidente', 1,
      'deputado_federal', 1,
      'senadores', 2
    )
  )
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  settings = excluded.settings;
