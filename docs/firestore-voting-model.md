# Modelo Firestore para voto sem vínculo direto com o eleitor

Este projeto usa Firestore, então o modelo foi separado em coleções por responsabilidade. A regra principal é: o documento do usuário nunca armazena candidato, partido, cargo escolhido ou histórico de voto.

## Coleções

```mermaid
erDiagram
  USERS ||--o| ELIGIBILITY : "doc id = uid"
  ELECTIONS ||--o{ ELIGIBILITY : "subcollection"
  ELECTIONS ||--o{ VOTES : "subcollection"
  ELECTIONS ||--o{ CANDIDATE_TALLIES : "subcollection"
  CANDIDATES ||--o{ CANDIDATE_TALLIES : "candidate_id"

  USERS {
    string docId_uid
    string name
    string email
    string profile_image
    string estado
    string role
    timestamp created_at
    timestamp updated_at
  }

  ELIGIBILITY {
    string docId_uid
    string election_id
    boolean eligible
    string status
    boolean has_voted
    timestamp voted_at
  }

  VOTES {
    string random_doc_id
    string election_id
    string estado
    map offices
    array candidate_ids
    array candidate_snapshots
    timestamp submitted_at
  }

  CANDIDATES {
    string docId_candidate
    string Nome
    string Partido
    string Cargo
    number votos_recebidos
  }

  CANDIDATE_TALLIES {
    string docId_candidate
    string candidate_id
    number total_votes
    timestamp updated_at
  }
```

## Caminhos Firestore

- `users/{uid}`: identidade e estado do eleitor. Não recebe `candidatos_escolhidos`.
- `elections/{electionId}/eligibility/{uid}`: controla se o eleitor está habilitado e se já votou. Não contém candidato.
- `elections/{electionId}/votes/{randomVoteId}`: voto anônimo com candidatos escolhidos. Não contém `uid`, nome ou e-mail.
- `elections/{electionId}/candidate_tallies/{candidateId}`: totalização por candidato.
- `elections/{electionId}/audit_events/{eventId}`: eventos técnicos sem candidato e sem identidade direta.

## Fluxo implementado no app

1. Login com Firebase Auth identifica o eleitor.
2. `UserProvider` cria/atualiza `users/{uid}` apenas com perfil mínimo e remove `candidatos_escolhidos` se existir.
3. A escolha de candidatos durante a navegação fica em `localStorage`, vinculada apenas ao navegador local, não ao Firestore.
4. Ao finalizar a escolha dos senadores, a tela de resultado mostra uma revisão e só registra o voto após confirmação explícita.
5. `castAnonymousVote()` chama a Cloud Function Callable `castAnonymousVote`, que executa a transação pelo Admin SDK:
   - lê `elections/{electionId}/eligibility/{uid}`;
   - bloqueia se `has_voted` já for `true`;
   - bloqueia se a elegibilidade não existir ou não estiver aprovada;
   - cria `elections/{electionId}/votes/{randomVoteId}` sem `uid`;
   - marca `has_voted: true` no documento de elegibilidade;
   - incrementa a totalização dos candidatos.
6. A tela de resultado lê o rascunho/recibo local para exibir a nota. Ela não busca voto por `uid`.

## Modo de avaliação e modo produção

As regras de produção não permitem autoinscrição pelo cliente. A coleção `elections/{electionId}/eligibility/{uid}` deve ser pré-carregada por processo administrativo confiável antes do eleitor votar.

O frontend chama a função configurada por `VITE_CAST_VOTE_FUNCTION` ou, por padrão, `castAnonymousVote`. A região padrão implementada no backend é `southamerica-east1`; se usar outra região, defina `VITE_FIREBASE_FUNCTIONS_REGION`.

A função está configurada com App Check obrigatório. Em produção, cadastre o domínio no Firebase App Check e defina `VITE_RECAPTCHA_V3_SITE_KEY` no ambiente do Vercel.

## Deploy necessário

Depois de configurar as variáveis de ambiente, publique as regras e a função:

```bash
firebase deploy --only firestore:rules,functions
```

O deploy da Vercel sozinho não registra votos, porque a escrita segura agora acontece no Firebase Functions.

## Observação de segurança

Este modelo remove o vínculo direto `UserID -> CandidateID` do documento de voto no Firestore e impede que o cliente grave voto ou totalizador diretamente. Para sigilo eleitoral absoluto contra administradores com acesso a logs, o próximo passo é emitir token cego ou usar outra separação criptográfica entre autenticação e urna. Mesmo com Cloud Function, ainda pode existir correlação por horário de escrita nos logs da infraestrutura.
