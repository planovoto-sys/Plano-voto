# Indicações limitadas — Bom de Voto

## Regra vigente: selections_v1

Entre os candidatos aceitos pelo usuário, a indicação usa **mais seleções** salvas
entre todas as contas (não mais indicações). Para Presidente, soma todas as UFs;
nos demais cargos, considera a UF da candidatura. As seleções da própria gravação
já estão contabilizadas antes da decisão. Em empate de seleções, usa maior nota
efetiva; em empate de nota, nota própria vem antes de nota do partido. Depois,
nome sem acentos/em minúsculas e ID estável. Só na ausência de nota própria positiva
usa a nota do partido. Notas e cargo são lidos de `candidates`/`parties`, nunca do
JSON do navegador. As listas de seleção continuam ordenadas por nota; esta mudança
afeta apenas a indicação/prévia do resumo.

Cada conta pode ter 1 indicação de Presidente, 2 de Senadores distintos e 1 de
Deputado Federal. Um candidato que atingiu sua cota continua selecionável, mas não
recebe outra indicação. O próximo candidato precisa estar entre os aceitos pelo
próprio usuário. Se todas as opções estiverem esgotadas, o resumo fica incompleto
e explica o motivo; não completa com candidato não selecionado.

Os 81 limites fornecidos estão em `recommendation_limits` e no espelho
`src/shared/constants/viabilityTargets.js` (testado contra o SQL). Presidente usa
uma cota nacional BR, somando contas de qualquer UF. Os demais cargos têm cota por
UF. Os limites de Deputado Estadual também foram cadastrados, mas não foi criada
uma nova etapa: o fluxo atual continua Presidente, Senadores e Deputado Federal.
Não há limite estadual para DF na lista fornecida; não se inventa um valor.

## Seleção não é indicação, nem voto real

- `selection_tallies`: todas as aceitações salvas, sem alteração da regra anterior.
- `ballot_recommendations`: reservas individuais, legíveis apenas pela própria conta.
- `recommendation_tallies`: totais públicos de indicações, sem identidade dos usuários.
- `candidate_recommendation_metrics`: totais e limites autorizados por RLS.
- Percentual interno: indicações / limite × 100, arredondado e limitado a 100.

A viabilidade continua oculta e não ordena as listas. O limite apenas define a
disponibilidade para uma nova indicação. Estas referências foram fornecidas pelo
responsável pelo produto: não constituem garantia de eleição nem medem votos reais.
A deduplicação é por conta autenticada, não verifica identidade de pessoa física.

Visitantes veem uma prévia por número de seleções, sem consumir cota. A reserva é confirmada ao
salvar na conta. Compartilhamento de contas Supabase usa apenas reservas lidas do
banco. Falha ao consultá-las mostra erro/repetição, nunca um ranking local como
se fosse uma indicação confirmada. O adaptador legado Firebase não aloca cotas.

## Ordem, edição e concorrência

O banco processa as gravações de rascunho numa fila transacional por eleição.
Um advisory lock transacional é adquirido antes dos gatilhos de contagem.
Reserva e incremento/decremento ocorrem na mesma transação; erro reverte tudo.
Consultar ou regravar o mesmo conjunto de IDs não muda reservas nem timestamps.

Uma alteração efetiva das escolhas de um cargo libera suas reservas e o processa
novamente, sem retirar vagas já reservadas por outras contas. Alterar outro cargo
não muda a indicação anterior. Excluir rascunho/conta libera suas cotas. Trocar UF
substitui indicações estaduais; se a seleção presidencial permanecer, sua reserva
nacional é preservada. O fluxo existente pode limpar todas as escolhas ao trocar UF.

Reservas não são redistribuídas retroativamente quando outra pessoa libera vaga
ou quando a popularidade muda.
Quem já recebeu uma indicação a mantém até alterar suas escolhas; uma conta sem
vaga precisa alterar o conjunto salvo para reentrar na fila. Não há timer ou job
silencioso mudando resumos existentes.

A ordem é a da gravação confirmada no servidor, não o horário manipulável do
dispositivo. `private.recommendation_requests.sequence` registra a ordem de
processamento atual por conta/cargo. Não é um histórico permanente de cliques.
Rascunhos anteriores não tinham timestamps por seleção: o backfill usa `updated_at`,
`created_at` e `user_id` como desempate, usando os totais atuais de seleções, pois
não é possível reconstruir a popularidade histórica por clique. As seleções
originais não são apagadas.

## Mudança futura da prioridade

A política de indicação está isolada em
`private.rank_recommendation_candidates`, com versão em
`private.recommendation_policies`. A regra anterior `score_v1` continua disponível
para uma mudança explícita; a versão ativa é `selections_v1`. Uma nova regra deve
ganhar nova versão e testes.
Versões desconhecidas falham, não aplicam uma regra diferente silenciosamente.
A versão usada fica em cada reserva. Não alterar cota/política diretamente para
reordenar todos os usuários: uma redistribuição retroativa requer migração explícita
e aprovação do responsável. A prévia deve acompanhar o servidor; a ordem das listas
de seleção é independente da prioridade de indicação.

## Verificação e publicação

`npm test` executa as migrações e os testes de banco em PostgreSQL embarcado (PGlite),
sem acessar produção. Verifica limites, exemplo A/B/C/D, reserva nacional, dois
senadores, idempotência, alterações, exclusão, RLS e rollback. PGlite tem uma única
conexão: não substitui ensaio de concorrência multi-conexão em staging. O lock por
eleição prioriza consistência; é necessário teste de carga antes de grande escala.

Ordem de publicação:

1. Revisar/aplicar `20260903000000_limited_recommendations.sql` no Supabase correto,
   com backup e atenção à janela de backfill dos rascunhos existentes.
2. Conferir cotas e reservas em staging, inclusive duas sessões disputando a última vaga.
3. Publicar o frontend desta branch. Não publicar antes da migração: a consulta de
   reservas ausente bloqueia a confirmação do resumo por segurança.

Não usar `supabase db reset` em produção. Esta migração não foi aplicada
automaticamente pelo teste e o build não realiza deploy.

Referências técnicas: [locks transacionais do PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
e [ambiente de testes PGlite](https://pglite.dev/docs/).
