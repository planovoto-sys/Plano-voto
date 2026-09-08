# Seleção compartilhada no fluxo normal do app

## Fluxo

1. O autor publica explicitamente uma cópia da sua lista de escolhas.
2. Quem abre `/selecao/:id` sem sessão vê a mesma `LoginPage` do app. Os candidatos só são carregados depois do login.
3. O login Google preserva o link no retorno OAuth identificado como `shared_selection`. O login direto por ID token mantém a rota compartilhada.
4. Após autenticar, o app consulta a publicação e o rascunho da conta. Se já houver candidatos salvos, pede confirmação antes de substituí-los; cancelar preserva as escolhas atuais. Uma conta sem candidatos recebe a lista como ponto de partida automaticamente.
5. A importação inicial usa os IDs publicados, a revisão da publicação e o `updated_at` do rascunho como controle de concorrência.
6. O usuário segue pelas próprias rotas do app: Estado → Presidente → Senadores → Deputado → Resumo. Não existem mais telas paralelas de candidatos ou resumo compartilhado; header, busca, cards, navegação e salvamentos por etapa são os mesmos. Não há botão extra para salvar no resumo.
7. A tag **Seleção compartilhada** fica na borda superior dos cards dos candidatos recebidos, tanto nas listas quanto no resumo; não aparece no corpo das telas nem nos candidatos adicionados pelo destinatário. Os nomes recebidos aparecem antes dos demais nas listas, preservando a ordenação normal dentro de cada grupo. Isso não modifica a política de indicações do resumo.
8. Reabrir o mesmo link/revisão na mesma sessão retoma as escolhas editadas, sem reimportar a lista. Uma revisão nova passa novamente pela confirmação caso a conta tenha escolhas.

A rota antiga `/selecao/:id/resumo` também passa pela entrada autenticada; não mantém uma segunda tela de resumo.

## Armazenamento e segurança

- A referência original contém ID do link, revisão, estado, IDs dos candidatos, conta destinatária e eleição. Fica separada do rascunho editável no armazenamento de sessão, com validade de 24 horas. Desmarcar candidatos, adicionar outros ou trocar o estado não a modifica.
- Essa referência local não é sincronizada entre dispositivos nem permanece após encerrar a sessão do navegador. As escolhas pessoais continuam salvas no banco pelo mecanismo normal do aplicativo.
- O retorno do login aceita apenas o link interno validado e expira após uma hora. Não exige um rascunho anônimo.
- O login comum limpa a intenção antiga de QR e o contexto de compartilhamento. O retorno OAuth compartilhado não mescla um rascunho de visitante, mesmo se o link local tiver expirado.
- Se a intenção se perder durante o OAuth, o app pede para reabrir o link; não substitui escolhas silenciosamente.
- Armazenamento bloqueado impede iniciar o OAuth compartilhado ou importar a lista com uma falsa promessa de preservar a origem.
- Uma referência pendente não é tratada como importação concluída. Erros de concorrência exigem recarregar os dados antes de confirmar novamente.
- A importação verifica a revisão publicada e a versão atual do rascunho da conta no servidor.
- O link público não expõe nome, e-mail ou identificador do autor. A publicação depende de consentimento explícito e pode ser desativada.

## Dependências e verificação

A entrada reutiliza a RPC `import_shared_selection` da migração `20260904000000_shared_selections.sql`. Como a importação inicial só contém nomes publicados, este redesenho não depende de permitir candidatos adicionais nessa RPC: as adições posteriores usam o salvamento normal por etapa. Não há nova migração neste ajuste.

Verificações: testes automatizados, lint, build e navegação local com dados fictícios e autenticação simulada. Foram conferidos login antes da leitura, cancelamento sem importação, confirmação, reabertura sem duplicar importação, edição preservando a referência, pesquisa e avanço até o resumo normal. O OAuth real e a integração de produção continuam exigindo validação com uma conta de teste autenticada.
