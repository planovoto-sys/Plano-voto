# Ambiente Supabase

O Supabase atende o login Google, perfis, candidatos e rascunhos de escolha. O Firebase
permanece temporariamente apenas nos fluxos transacionais ainda nao migrados, como a
confirmacao final do voto e handoff.

## O que esta configurado

- SDK `@supabase/supabase-js` para navegador e backend.
- CLI local em dependencia de desenvolvimento.
- Stack local versionada em `supabase/config.toml`.
- Migracao SQL inicial com perfis, eleicoes, candidatos, partidos, rascunhos,
  elegibilidade, votos criptografados, metricas, handoff e rate limit.
- RLS habilitada em todas as tabelas do schema `public`.
- Escritas sensiveis reservadas ao backend com `service_role`.
- Realtime habilitado para perfil, rascunho, elegibilidade e metricas.
- Seed idempotente da eleicao `congresso-2026`.
- Importador idempotente do JSON consolidado de candidatos.

## Pre-requisitos

- Node.js 22.12 ou superior.
- Docker Desktop (ou outro runtime compativel com Docker) em execucao.
- Dependencias instaladas com `npm ci`.

## Primeira execucao local

```sh
npm run supabase:start
npm run supabase:status
```

O primeiro comando baixa e inicia os containers locais, aplica as migracoes e executa
`supabase/seed.sql`. O segundo mostra a API URL, a chave publica/anon local, o Studio e
a conexao PostgreSQL.

Copie apenas os valores publicos para `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key-ou-anon-key-local>
VITE_AUTH_PROVIDER=supabase
VITE_CANDIDATE_PROVIDER=supabase
VITE_GOOGLE_CLIENT_ID=<client-id-web.apps.googleusercontent.com>
```

Se a CLI local exibir apenas `anon key`, ela tambem pode ser informada como
`VITE_SUPABASE_ANON_KEY`. A aplicacao prioriza `VITE_SUPABASE_PUBLISHABLE_KEY`.

Para uso administrativo local em processos de backend, use variaveis sem `VITE_`:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=<sb_secret_local-ou-remota>
```

Nunca envie `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, a senha do banco ou
tokens da CLI ao navegador.

## Comandos

| Comando | Uso |
|---|---|
| `npm run supabase:start` | Inicia o stack local e aplica o estado pendente. |
| `npm run supabase:status` | Exibe URLs e chaves do ambiente local. |
| `npm run supabase:db:reset` | Recria somente o banco local, reaplicando migracoes e seed. |
| `npm run supabase:db:lint` | Analisa o schema PostgreSQL local. |
| `npm run supabase:types` | Gera tipos TypeScript do schema local. |
| `npm run supabase:stop` | Para o stack preservando os dados locais. |
| `npm run supabase:db:push` | Aplica migracoes pendentes ao projeto remoto vinculado. |
| `npm run supabase:candidates:import -- --file <json>` | Valida a carga sem gravar. Adicione `--apply` somente apos revisar. |
| `npm run supabase:scores:update -- --file <notas.json> --base-file <candidatos.json>` | Valida notas por identidade; `--apply` atualiza somente correspondencias seguras. |

`supabase:db:reset` e destrutivo para o banco local. Nao use `--linked` contra producao.

## Cliente da aplicacao

O cliente do navegador esta em `src/shared/supabase/client.js` e exporta:

- `supabaseReady`: informa se URL e chave publica foram configuradas;
- `supabase`: cliente ou `null` quando o ambiente ainda nao foi configurado;
- `getSupabaseClient()`: retorna o cliente ou falha com uma mensagem explicita.

O cliente administrativo esta em `api/_lib/supabaseAdmin.js`. Ele e criado sob demanda,
sem persistir sessao, e exige `SUPABASE_URL` e `SUPABASE_SECRET_KEY`. A variavel legada
`SUPABASE_SERVICE_ROLE_KEY` continua aceita.

## Carga de candidatos

Primeiro execute a simulacao, que nao precisa de credencial:

```sh
npm run supabase:candidates:import -- --file candidatos_2026_completo.json
```

O arquivo esperado contem `partidos` e `politicos`. A carga atual resulta em 30 partidos,
7.932 candidatos e 7.963 upserts contando a eleicao. Para efetivar, disponibilize as
variaveis administrativas apenas ao processo e acrescente `--apply`. A carga usa IDs
deterministicos e `upsert`, nao remove registros e pode ser repetida com seguranca.

## Login Google

No Google Auth Platform, configure uma aplicacao Web com:

- origem local: `http://localhost:5173`;
- origens remotas: `https://bomdevoto.com.br` e `https://www.bomdevoto.com.br`;
- callback local: `http://127.0.0.1:54321/auth/v1/callback`;
- callback remoto: `https://<project-ref>.supabase.co/auth/v1/callback`.

Quando `VITE_GOOGLE_CLIENT_ID` esta definido, a tela de login usa o Google Identity
Services e envia o ID token diretamente a `supabase.auth.signInWithIdToken`. Assim, o
seletor de contas nao apresenta o dominio tecnico do Supabase como destino. O callback
OAuth permanece configurado apenas como compatibilidade para ambientes sem essa variavel.

Para habilitar o provedor no stack local:

1. crie `supabase/.env.local` (o arquivo ja e ignorado pelo Git);
2. defina `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`;
3. altere `enabled = false` para `enabled = true` em
   `[auth.external.google]` no `supabase/config.toml`;
4. reinicie o stack local.

No projeto hospedado, habilite Google em Authentication > Providers e inclua as URLs
oficiais em Authentication > URL Configuration.

## Projeto remoto

Depois de criar o projeto de desenvolvimento no Supabase:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npm run supabase:db:push
```

Configure na Vercel:

- navegador: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e
  `VITE_GOOGLE_CLIENT_ID`;
- backend: `SUPABASE_URL` e `SUPABASE_SECRET_KEY`;
- automacao/CLI: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_URL` e
  `SUPABASE_ACCESS_TOKEN` somente onde forem realmente necessarios.

## Estrategia de migracao

1. Aplicar o schema, habilitar Google Auth e importar partidos/candidatos.
2. Validar login, criacao automatica do perfil, estado e rascunho em todos os dominios.
3. Comparar metricas publicas nos dois backends durante a transicao.
4. Migrar confirmacao de voto, elegibilidade e handoff para RPCs/Edge Functions.
5. Migrar elegibilidade, voto criptografado, rate limit e exclusao de conta.
6. Executar periodo de leitura comparativa, congelar escritas Firebase e remover o legado.

Cada etapa deve ter reconciliacao de contagem, rollback e teste de RLS antes do corte.
