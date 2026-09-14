# Seleção compartilhada no fluxo normal do app

## Fluxo

1. O autor publica explicitamente uma cópia da sua lista de escolhas.
2. Quem abre `/selecao/:id` sem sessão vê a mesma `LoginPage` do app. Os candidatos só são carregados depois do login.
3. O login Google preserva o link no retorno OAuth identificado como `shared_selection`, com caminho interno validado e prazo de uma hora na própria URL. A sessão mantém uma alternativa caso o provedor remova os parâmetros. O login direto por ID token mantém a rota compartilhada. Links com barra final ou UUID em maiúsculas usam a mesma entrada.
4. Após autenticar, o app consulta a publicação e o rascunho da conta. Se já houver candidatos salvos, pede confirmação antes de substituí-los; cancelar preserva as escolhas atuais. Uma conta sem candidatos recebe a lista como ponto de partida automaticamente. Se algum candidato da publicação deixou de estar disponível, a importação parcial exige confirmação, mesmo em conta vazia.
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
- Renovação de token e eventos repetidos de autenticação não reiniciam a mesclagem de visitante depois da importação.
- Se a intenção se perder durante o OAuth, o app pede para reabrir o link; não substitui escolhas silenciosamente.
- Armazenamento bloqueado impede iniciar o OAuth compartilhado ou importar a lista com uma falsa promessa de preservar a origem.
- Uma referência pendente não é tratada como importação concluída. Erros de concorrência exigem recarregar os dados antes de confirmar novamente.
- A importação verifica a revisão publicada e a versão atual do rascunho da conta no servidor.
- Os salvamentos normais das etapas também comparam `updated_at` no banco. Uma aba anterior à importação recebe conflito, em vez de apagar a seleção recebida. A versão mantém a precisão retornada pelo PostgreSQL.
- Uma leitura iniciada antes de uma gravação local não substitui o rascunho modificado durante a requisição. A validade do cache usa a data em que ele foi guardado, separada da versão do servidor.
- A edição só é liberada após restaurar o rascunho. Atualizações de contadores não disparam novas restaurações, e falhas de leitura oferecem nova tentativa sem salvar uma lista vazia.
- O link público não expõe nome, e-mail ou identificador do autor. A publicação depende de consentimento explícito e pode ser desativada.

## Dependências e verificação

Aplique `20260909000000_shared_selection_reliability.sql` depois das migrações existentes. Ela mantém a assinatura da RPC, rejeita revisão nula, adquire o bloqueio da eleição antes do bloqueio da publicação e torna `updated_at` estritamente crescente nas atualizações do rascunho. Não modifica seleções existentes nem publica listas automaticamente.

O painel apresenta três cartões: compartilhar a seleção, convidar novos eleitores e apoiar o projeto. O primeiro mostra o QR e os botões “Compartilhar” e “WhatsApp”; ambos enviam `/selecao/:id`. “Compartilhar” usa o recurso nativo quando disponível e revela os controles de cópia, download do QR, atualização e desativação. A primeira publicação exige confirmação explícita. Alterações posteriores exigem “Atualizar seleção”. O convite geral permanece separado da seleção pessoal.

A confirmação de substituição usa “Acessar seleção compartilhada?”, o aviso “Obs.: ao escolher continuar, sua seleção anterior será apagada.” e as ações “Cancelar” e “Continuar”. O aviso sobre candidatos indisponíveis aparece apenas quando necessário. Cancelar preserva as escolhas existentes.

Em produção, permita no Supabase Auth os retornos para a origem oficial com os parâmetros `auth_flow`, `selection_path` e `selection_at` (por exemplo, o padrão da origem oficial `https://bomdevoto.com.br/**`), conforme a [documentação de URLs de retorno do Supabase](https://supabase.com/docs/guides/auth/redirect-urls). Não adicione origens de terceiros. Se o provedor retornar apenas à raiz, a alternativa de sessão funciona na mesma aba; se também trocar de navegador, o link precisa ser preservado na URL de retorno. A configuração local inclui as duas origens de desenvolvimento com esses retornos.

Verificações de regressão: `npm test` inclui testes SQL com PGlite, testes do retorno OAuth e testes dos componentes reais com React/DOM simulado. Estes substituem apenas rede, autenticação e decoração do shell. Cobrem login antes da leitura, importação única em StrictMode, todos os cargos, cancelamento, conflitos, reabertura, armazenamento indisponível, leitura atrasada, edição após restauração, renovação de token e links do painel. O OAuth real e a integração de produção continuam exigindo validação com contas de teste autenticadas; os testes não alteram contas reais.
