# RIPD simplificado interno

Última atualização: 29 de maio de 2026.

Este documento registra riscos e mitigação para operações do nossovoto.org que podem envolver escolhas eleitorais e inferência de opinião política. Ele não substitui revisão jurídica.

## 1. Descrição do projeto

Ferramenta de organização pessoal de escolhas eleitorais com rascunho, revisão, QR Code de continuidade e compartilhamento iniciado pelo usuário.

## 2. Escopo do tratamento

Autenticação, seleção de estado, seleção de candidatos, rascunho local/remoto, cache offline, QR Code, compartilhamento, logs técnicos e preferências de cookies.

## 3. Categorias de dados

Dados de login, estado, candidatos escolhidos, progresso, preferências, logs técnicos, dados públicos de candidatos, token de continuidade e conteúdo gerado pelo usuário.

## 4. Dados sensíveis envolvidos

Escolhas eleitorais podem permitir inferência de opinião política quando vinculadas a pessoa identificada ou identificável.

## 5. Titulares

Usuários visitantes, usuários autenticados e titulares que enviam solicitações por email.

## 6. Finalidades

Entregar o fluxo do app, recuperar rascunho, salvar escolhas, continuar no celular, compartilhar por ação do usuário, manter segurança e melhorar funcionamento.

## 7. Bases legais possíveis

Execução do serviço, consentimento, segurança, legítimo interesse avaliado, obrigação legal e exercício regular de direitos. Dados sensíveis exigem revisão reforçada.

## 8. Fluxo dos dados

Usuário acessa o app, escolhe estado, seleciona candidatos, salva localmente ou na conta, pode gerar QR Code, pode compartilhar, pode apagar dados locais ou solicitar exclusão.

## 9. Armazenamento local

LocalStorage, IndexedDB, Cache API e service worker podem guardar rascunho, cache de candidatos, permissões e snapshot offline mínimo.

## 10. Armazenamento remoto

Firestore e a API serverless da Vercel podem processar rascunho da conta, token de continuidade, exclusão e logs técnicos.

## 11. Compartilhamentos

Fornecedores técnicos necessários e plataformas externas escolhidas pelo usuário ao compartilhar.

## 12. Fornecedores

Firebase / Google Cloud, hospedagem configurada, monitoramento/analytics opcionais e canal de email.

## 13. Riscos identificados

- Reidentificação de escolhas.
- Acesso indevido por dispositivo compartilhado.
- Compartilhamento acidental pelo usuário.
- QR Code escaneado por terceiro.
- Cache local contendo rascunho sensível.
- Uso indevido de dados agregados.
- Marketing baseado em escolhas individuais.
- Erro em ranking/notas interpretado como orientação oficial.

## 14. Medidas de mitigação

- Minimização de dados.
- Separação entre UID e documento público quando possível.
- Tokens temporários e uso único quando aplicável.
- Controles de exclusão local.
- Avisos de compartilhamento e QR Code.
- Consentimento para opcionais.
- Vedação a venda de escolhas individuais.
- Logs técnicos limitados.
- Revisão de fornecedores.

## 15. Retenção e exclusão

Rascunhos e caches locais podem ser apagados pelo usuário. Dados remotos devem respeitar função segura, solicitação e conservação necessária por segurança, auditoria ou obrigação legal.

## 16. Segurança

Autenticação, regras de acesso, validação de titularidade, service worker com escopo limitado, controle de tokens e monitoramento técnico.

## 17. Incidentes

Incidentes com risco relevante devem ser contidos, documentados, avaliados e comunicados conforme a legislação aplicável.

## 18. Revisões futuras

Revisar a cada nova integração, analytics, marketing, compartilhamento, mudança de QR Code, alteração de base de dados ou nova eleição.
