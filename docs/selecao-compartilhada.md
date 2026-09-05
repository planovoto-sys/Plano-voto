# Seleção compartilhada e login no resumo

## Fluxo

1. O autor publica explicitamente uma cópia da sua lista de escolhas.
2. O visitante abre `/selecao/:id` sem autenticação e revisa os itens.
3. Ao avançar, a lista escolhida é guardada no armazenamento de sessão do navegador.
4. `/selecao/:id/resumo` exibe todos os itens mantidos pelo visitante, sem escolher nomes por ele.
5. O botão de login aparece no resumo. Após o retorno do Google, as escolhas locais são recuperadas.
6. O usuário confirma o salvamento. Se já existir uma seleção na conta, a interface avisa que ela será substituída.

Abrir o link ou alterar caixas de seleção não grava um rascunho no servidor. O fluxo de login compartilhado também impede a mesclagem automática de outro rascunho de visitante.

## Armazenamento e segurança

- O rascunho temporário contém apenas identificadores, estado e versão da publicação; expira após 24 horas e depende da mesma sessão do navegador.
- O retorno do login aceita apenas rotas internas de seleção e expira após uma hora.
- Se o armazenamento estiver bloqueado, o avanço é interrompido com uma mensagem para evitar a perda silenciosa das escolhas.
- A importação verifica a versão da publicação e o estado atual da seleção da conta, evitando substituir silenciosamente alterações concorrentes.
- O link público não expõe nome, e-mail ou identificador do autor. A publicação depende de consentimento explícito e pode ser desativada.
- O QR code aberto em outro dispositivo aponta para a revisão inicial, pois não transfere o rascunho local.

## Entrega e verificação

A migração `20260904000000_shared_selections.sql` precisa ser aplicada após suas dependências antes da publicação do frontend. As alterações não foram aplicadas em produção nesta tarefa.

Foram verificados testes automatizados, lint, build e um fluxo de navegador com dados fictícios e autenticação simulada: edição anônima, resumo, retorno após recarregamento e salvamento somente com confirmação. O OAuth real e a integração com o Supabase de produção ainda precisam de validação.
