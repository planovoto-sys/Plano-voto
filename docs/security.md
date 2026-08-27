# Segurança operacional

Este projeto usa Firebase Auth, Firestore, mutações autenticadas no backend e regras de negação por padrão. A chave Web do Firebase (`VITE_API_KEY`) é um identificador público necessário no bundle do navegador; ela não concede acesso administrativo. A proteção real é feita com restrições da chave no Google Cloud, Auth, IAM, validação no servidor, rate limit e regras do Firestore.

## Configuração obrigatória antes do deploy

1. No Google Cloud Console, restrinja a chave Web por `HTTP referrers` aos domínios oficiais e limite as APIs às usadas pelo Firebase. Remova chaves sem uso e rotacione qualquer credencial privada que já tenha sido publicada.
2. Gere 32 bytes aleatórios em base64 e grave-os somente no ambiente protegido da Vercel como `BALLOT_ENCRYPTION_KEY`. Cadastre também `FIREBASE_SERVICE_ACCOUNT_BASE64` como variável sensível do servidor.

   Os valores nunca devem usar o prefixo `VITE_`, entrar em `.env.local`, ser enviados ao navegador ou ser versionados. Documente e teste um procedimento de rotação com versão de chave antes de trocar o segredo.
3. A API aceita somente solicitações de mesma origem e tokens válidos do Firebase Auth.
4. Publique o frontend e a API pela Vercel e publique somente regras/índices no Firebase:

   ```sh
   npm run deploy:firebase-rules
   ```

5. Exclua administrativamente os documentos legados de `publicCandidateChoices` depois de confirmar o backup e a migração. As regras atuais já bloqueiam toda leitura e escrita nessa coleção.

## Controles implementados

| # | Controle | Implementação |
|---:|---|---|
| 1 | API keys | Apenas configuração Web pública usa `VITE_`; segredos de servidor ficam nas variáveis sensíveis da Vercel. `.env*` e arquivos de credenciais são ignorados. |
| 2 | Segredos no Git | `npm run security:secrets` verifica arquivos rastreados e histórico para credenciais de alta confiança; CI executa o teste. |
| 3 | Chave pública/DB | A chave Web é tratada como pública e deve ser restrita no Google Cloud. O banco depende de Rules, Auth e IAM. |
| 4 | RLS | Firestore Rules cumprem o papel de RLS: negação por padrão, proprietário por UID e administrador por custom claim. |
| 5 | Criptografia | TLS/HSTS em trânsito, criptografia gerenciada do Firebase em repouso e AES-256-GCM adicional no conteúdo de cada voto. Tokens de handoff são armazenados apenas como SHA-256. |
| 6 | Auth server-side | Perfil, rascunhos, exclusão e voto passam pela API da Vercel, que verifica o ID token do Firebase Auth; clientes não gravam diretamente. |
| 7 | Acessos | Coleções pessoais são `get` somente pelo proprietário; listas e mutações ficam restritas. Métricas públicas são somente agregadas. |
| 8 | Mass assignment | Payloads e objetos aninhados usam allowlists; rascunhos são reconstruídos sem espalhar campos enviados pelo cliente. |
| 9 | Cookies/sessão | A aplicação não cria cookies próprios. Firebase Auth, rascunhos e recibos usam persistência de sessão; valores legados são migrados e removidos do `localStorage`. Cookies futuros devem usar `Secure`, `HttpOnly` e `SameSite=Strict/Lax`. |
| 10 | Senhas | O app aceita Google OAuth e não recebe nem armazena senhas. Hash e política de credenciais são responsabilidade do Firebase Auth/Google. |
| 11 | Rate limit | Cada ação da API aplica limite transacional persistente por usuário ou origem anonimizada. |
| 12 | Bots | Sessões autenticadas, limites persistentes e validação estrita reduzem automação abusiva; endpoints anônimos devem ter limites mais agressivos. |
| 13 | Queries | Todas as consultas usam a API parametrizada do SDK Firestore; não há SQL ou concatenação de query textual. |
| 14 | Inputs | IDs, estados, versão, campos, tamanhos, cardinalidade, cargo e vínculo estadual são validados no servidor. |
| 15 | Vazamento de conteúdo | Escolhas individuais saíram da coleção pública; somente contadores agregados podem ser lidos sem autenticação. Respostas removem UID e campos não necessários. |
| 16 | Uploads | Não há funcionalidade de upload e `storage.rules` nega toda leitura/escrita. Abra caminhos específicos somente com validação de tipo, tamanho e autorização. |
| 17 | Respostas de API | A API retorna apenas status, recibo, token temporário ou rascunho normalizado com campos permitidos. |
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
