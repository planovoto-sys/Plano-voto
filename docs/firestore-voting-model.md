# Modelo Firestore para escolhas e viabilidade

As escolhas individuais são privadas. O cliente lê seu rascunho pelo UID, mas qualquer criação ou alteração passa por um backend autenticado. O público acessa somente dados de candidatos e métricas agregadas.

## Caminhos Firestore

- `users/{uid}`: perfil mínimo, legível pelo proprietário e por administradores; mutações somente no backend.
- `candidatos/{candidateId}` e `partidos_politicos/{partyId}`: informações públicas necessárias à aplicação; mutações somente por administrador.
- `elections/{electionId}/ballot_drafts/{uid}`: rascunho privado, legível pelo proprietário e gravado somente pela API autenticada.
- `elections/{electionId}/selection_tallies/{state}__{candidateId}`: total público agregado de rascunhos que contêm o candidato naquele estado.
- `elections/{electionId}/state_choice_metrics/{state}`: total público agregado de usuários com rascunho no estado.
- `elections/{electionId}/votes/{voteId}`: voto com conteúdo criptografado em AES-256-GCM, acessível somente por administradores no backend.
- `elections/{electionId}/candidate_tallies/{candidateId}`: total agregado de votos computado no backend.
- `elections/{electionId}/eligibility/{uid}`: elegibilidade privada do eleitor.
- `elections/{electionId}/plan_handoff_tokens/{tokenHash}`: rascunho temporário; o token original nunca é persistido.
- `security_rate_limits/{principalHash}`: janela de rate limit sem UID ou IP em texto puro; sem acesso do cliente.

`publicCandidateChoices` e `users/{uid}/private/choiceConfig` são legados. As regras negam todo acesso, e a função de exclusão remove os documentos associados ao usuário quando possível.

## Fluxo

1. Firebase Auth identifica o usuário e `syncUserProfile` cria ou atualiza somente campos derivados do token verificado.
2. `saveBallotState` e `saveBallotStepSelection` validam estado, etapa, IDs, cargo e estado de cada candidato usando dados autoritativos.
3. Na mesma transação do rascunho, a API aplica os deltas aos contadores agregados. Nenhum documento público contém a lista de escolhas de uma pessoa.
4. O frontend consulta os documentos agregados para calcular viabilidade.
5. `castAnonymousVote` verifica elegibilidade e unicidade, atualiza totais e grava o conteúdo do voto criptografado.

## Regras de contagem

```txt
viabilidadePercent = min((selecoesAgregadas / mediaVotosEleitos) * 100, 100)
```

Contadores negativos são tratados como zero no cliente. Migrações administrativas devem reconciliar os contadores com os rascunhos privados antes de remover definitivamente os dados legados.

## Garantias e limites

- O proprietário pode obter apenas o próprio perfil, rascunho e elegibilidade; não pode listar a coleção.
- O cliente não possui permissão direta de escrita em perfis, rascunhos, votos, métricas ou tokens.
- A seleção aceita no máximo 1 deputado federal e 2 senadores, sem duplicatas.
- Métricas públicas revelam apenas totais agregados. Para grupos pequenos, considere limiar mínimo de publicação se houver risco de reidentificação contextual.
- A chave Web do Firebase é pública por natureza; restrições de domínio/API, Auth e Rules são obrigatórias.

## Deploy necessário

Configure `FIREBASE_SERVICE_ACCOUNT_BASE64` e `BALLOT_ENCRYPTION_KEY` na Vercel conforme `docs/security.md`, teste a API e publique as regras separadamente.

```bash
npm run deploy:firebase-rules
```
