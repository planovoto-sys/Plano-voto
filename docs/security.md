# Segurança operacional

Este projeto usa Firebase Auth, Firestore, Cloud Functions callable, App Check e regras de negação por padrão. A chave Web do Firebase (`VITE_API_KEY`) é um identificador público necessário no bundle do navegador; ela não concede acesso administrativo. A proteção real é feita com restrições da chave no Google Cloud, App Check, Auth, IAM e regras do Firestore.

## Configuração obrigatória antes do deploy

1. No Google Cloud Console, restrinja a chave Web por `HTTP referrers` aos domínios oficiais e limite as APIs às usadas pelo Firebase. Remova chaves sem uso e rotacione qualquer credencial privada que já tenha sido publicada.
2. No Firebase App Check, registre o app Web com reCAPTCHA v3, preencha `VITE_RECAPTCHA_V3_SITE_KEY` e, após validar métricas, ative a imposição para Firestore, Authentication e Cloud Functions.
3. Gere 32 bytes aleatórios em base64 e grave-os no Secret Manager:

   ```sh
   firebase functions:secrets:set BALLOT_ENCRYPTION_KEY
   ```

   O valor nunca deve usar o prefixo `VITE_`, entrar em `.env.local`, ser enviado ao navegador ou ser versionado. Documente e teste um procedimento de rotação com versão de chave antes de trocar o segredo.
4. Se os domínios forem diferentes dos padrões do código, configure `ALLOWED_ORIGINS` no ambiente das Functions como uma lista separada por vírgulas.
5. Publique em conjunto para evitar incompatibilidade entre cliente, funções e regras:

   ```sh
   firebase deploy --only functions,firestore:rules,firestore:indexes,storage,hosting
   ```

6. Exclua administrativamente os documentos legados de `publicCandidateChoices` depois de confirmar o backup e a migração. As regras atuais já bloqueiam toda leitura e escrita nessa coleção.

## Controles implementados

| # | Controle | Implementação |
|---:|---|---|
| 1 | API keys | Apenas configuração Web pública usa `VITE_`; segredos de servidor ficam no Secret Manager. `.env*` e arquivos de credenciais são ignorados. |
| 2 | Segredos no Git | `npm run security:secrets` verifica arquivos rastreados e histórico para credenciais de alta confiança; CI executa o teste. |
| 3 | Chave pública/DB | A chave Web é tratada como pública e deve ser restrita no Google Cloud. O banco depende de Rules, Auth, IAM e App Check. |
| 4 | RLS | Firestore Rules cumprem o papel de RLS: negação por padrão, proprietário por UID e administrador por custom claim. |
| 5 | Criptografia | TLS/HSTS em trânsito, criptografia gerenciada do Firebase em repouso e AES-256-GCM adicional no conteúdo de cada voto. Tokens de handoff são armazenados apenas como SHA-256. |
| 6 | Auth server-side | Perfil, rascunhos, exclusão e voto são mutados por Cloud Functions que verificam `request.auth`; clientes não gravam diretamente. |
| 7 | Acessos | Coleções pessoais são `get` somente pelo proprietário; listas e mutações ficam restritas. Métricas públicas são somente agregadas. |
| 8 | Mass assignment | Payloads e objetos aninhados usam allowlists; rascunhos são reconstruídos sem espalhar campos enviados pelo cliente. |
| 9 | Cookies/sessão | A aplicação não cria cookies próprios. Firebase Auth, rascunhos e recibos usam persistência de sessão; valores legados são migrados e removidos do `localStorage`. Cookies futuros devem usar `Secure`, `HttpOnly` e `SameSite=Strict/Lax`. |
| 10 | Senhas | O app aceita Google OAuth e não recebe nem armazena senhas. Hash e política de credenciais são responsabilidade do Firebase Auth/Google. |
| 11 | Rate limit | Cada callable aplica limite transacional persistente por usuário ou origem anonimizada. |
| 12 | Bots | App Check com reCAPTCHA v3 é inicializado no cliente e exigido por todas as callables. |
| 13 | Queries | Todas as consultas usam a API parametrizada do SDK Firestore; não há SQL ou concatenação de query textual. |
| 14 | Inputs | IDs, estados, versão, campos, tamanhos, cardinalidade, cargo e vínculo estadual são validados no servidor. |
| 15 | Vazamento de conteúdo | Escolhas individuais saíram da coleção pública; somente contadores agregados podem ser lidos sem autenticação. Respostas removem UID e campos não necessários. |
| 16 | Uploads | Não há funcionalidade de upload e `storage.rules` nega toda leitura/escrita. Abra caminhos específicos somente com validação de tipo, tamanho e autorização. |
| 17 | Respostas de API | Callables retornam apenas status, recibo, token temporário ou rascunho normalizado com campos permitidos. |
| 18 | Headers | CSP, HSTS, `nosniff`, anti-frame, Referrer Policy, Permissions Policy, COOP e CORP estão configurados para Firebase Hosting e Vercel. |
| 19 | HTTPS | HSTS e `upgrade-insecure-requests` forçam transporte seguro em produção; provedores gerenciados redirecionam HTTP para HTTPS. |
| 20 | Dependências | `npm run security:dependencies` audita raiz e Functions; o workflow semanal também executa lint, build e auditorias. |

## Rotina de verificação

```sh
npm ci
npm ci --prefix functions
npm run lint
npm run build
npm run security:audit
```

Achados de vulnerabilidade alta ou crítica bloqueiam a rotina. Mudanças em regras devem ser testadas no Emulator Suite antes do deploy, incluindo leitura de proprietário, tentativa entre usuários, listagem não autorizada e acesso público apenas às métricas agregadas.
