# Changelog

Todas as mudanças relevantes deste projeto serão documentadas aqui.

## [1.11.4] - 2026-08-27

### Corrigido

- Encaminha `/api` no Vite para o backend publicado, eliminando o `404` que bloqueava perfil, estado e candidatos em `localhost:5173`.
- Retorna indisponibilidade explícita quando a credencial Firebase Admin não está configurada na Vercel, em vez de um erro 500 genérico.
- Faz o health check profundo validar a credencial administrativa sem consumir leituras do Firestore.
- Exige que o backend usado pelo Vite seja escolhido explicitamente, evitando gravacoes acidentais em producao.
- Mapeia erros numericos do Firestore para quota, indisponibilidade e configuracao sem expor detalhes internos.
- Valida credencial e metadados do Firestore no health profundo, sem consumir leituras de documentos.

### Testes

- Adiciona regressões automatizadas para o proxy local, preservação do token de autenticação, validação da origem e configuração ausente do servidor, executadas também no CI.

## [1.11.3] - 2026-08-27

### Corrigido

- Carrega os módulos Firebase Admin somente durante requisições que realmente precisam do banco, evitando falha de inicialização da função RPC na Vercel.

## [1.11.2] - 2026-08-27

### Corrigido

- Torna a inicialização do Firebase Admin tardia para que falhas de configuração não derrubem o endpoint antes do diagnóstico.
- Adiciona endpoints de saúde da API para validação objetiva do runtime da Vercel.

## [1.11.1] - 2026-08-27

### Corrigido

- Substitui as Cloud Functions por uma API autenticada da Vercel, mantendo o projeto no plano Spark.
- Restaura sincronização de perfil, alteração de estado, salvamento do rascunho, handoff, exclusão e confirmação do voto.
- Filtra candidatos por cargo e estado no Firestore, evitando baixar milhares de documentos a cada carregamento.

### Segurança

- Valida Firebase Auth, origem, tamanho e campos do payload na API antes de acessar o Firestore.
- Mantém rate limit persistente, validação autoritativa de candidatos e criptografia AES-256-GCM no servidor.
- Remove App Check e reCAPTCHA do cliente e da política de conteúdo conforme decisão operacional do projeto.
- Mantém as credenciais Firebase Admin e a chave de criptografia somente nas variáveis sensíveis da Vercel.

## [1.11.0] - 2026-08-26

### Segurança

- Move perfil e rascunhos para mutações server-side autenticadas, protegidas por App Check e rate limit.
- Substitui escolhas individuais públicas por rascunhos privados e métricas agregadas.
- Criptografa o conteúdo dos votos com AES-256-GCM usando chave do Secret Manager.
- Restringe regras do Firestore e Storage, limita payloads e respostas e adiciona headers de segurança/HTTPS.
- Adiciona auditoria de segredos e dependências ao CI; atualiza dependências até zerar achados do `npm audit`.

## [1.7.0] - 2026-07-20

### Adicionado
- Nova paleta de cores com 3 cores de marca: `#8DC63F` (protagonista), `#0B6B3A` (contraste), `#16A34A` (interação/hover).
- Substitui cinzas frios por neutros harmonizados com o verde (`#F4F8F2`, `#E8F0E6`, `#EBF1EA`, `#E0E7DE`).
- Adiciona variáveis `--app-bg`, `--app-surface` e `--brand-green-mid` no `global.css`.

### Alterado
- Refatora `Login.css`, `candidate-card.css`, `BottomNavigation.css`, `AppHeader.css`, `selection-layout.css`, `continue-bar.css`, `MeuPlano.css`, `desktop.css` para a nova paleta.
- Atualiza `ShareChoicePanel.css`, `LegalPage.css`, `PrivacyConsent.css`, `AppFooter.css` e `tailwind.css` com as novas cores neutras.
- Ajusta contraste de textos: elementos com fundo `#8DC63F` passam a usar texto `#0B6B3A`.

### Removido
- Remove cores banidas: `#15803D`, `#084C29`, `#478F48`, `#129342`, `#F7C600`, `rgba(0, 184, 74, ...)`.
- Remove `--brand-yellow` e `--color-nossovoto-yellow`.

## [1.5.3] - 2026-06-09

### Corrigido
- Compacta o resumo do Meu Plano em telas estreitas/baixas, removendo o bloco de insight para liberar espaço útil.
- Corrige sobreposição dos cards de candidatos com o botão Compartilhar em alturas reduzidas.
- Remove o efeito flutuante do botão Compartilhar no Meu Plano.
- Ajusta o respiro das tags de viabilidade dos cards para não encostarem na borda.

## [1.5.2] - 2026-06-08

### Ajustado
- Refina a experiência mobile de NossoVoto com novo resumo visual, cards compactos e número de candidato com fallback `000000`.
- Ajusta responsividade para celulares, tablets e telas em paisagem, reduzindo cortes, exageros de escala e rolagens indesejadas.
- Remove efeitos de reordenação e animações da lista de candidatos para deixar a rolagem mais estável.
- Corrige espaçamentos dos chips de nota, comportamento do botão de continuar/compartilhar e proporção do ícone na navegação inferior.

## [1.6.1] - 2026-05-29

### Adicionado
- Implementa OS 05 com Central de Privacidade, Termos de Uso, Aviso Eleitoral, Dados no dispositivo, Exclusão de dados e Fornecedores.
- Adiciona controles reais para apagar rascunho local, dados offline, cache de candidatos, permissões de cookies e tudo deste navegador.
- Adiciona tabela objetiva de dados tratados, tabela de cookies e tabela de fornecedores nas páginas legais.
- Cria documentação interna em `docs/legal/` com matriz de bases legais, RIPD simplificado, plano de incidentes e checklist de revisão jurídica.

### Alterado
- Revisa Cookies, Política de Privacidade e LGPD para dados sensíveis, QR Code, cache offline, compartilhamento e controles do usuário.
- Atualiza o banner de privacidade para aceitar necessários, personalizar ou aceitar opcionais.
- Adiciona aviso de QR Code e aviso de compartilhamento antes de enviar conteúdo para plataformas externas.
- Amplia o footer com links de legal e privacidade.

## [1.6.0] - 2026-05-29

### Adicionado
- Cria a camada `src/features/desktop/` para a experiência desktop OS 04, com shell, header, navegação por etapas, intro, QR Code, painel de continuidade mobile, lista de recursos bloqueados e action bar.
- Adiciona handoff desktop com QR/link de rascunho, tratamento de login necessário, plano incompleto e cópia de link.
- Adiciona fallback local para QR Code de rascunho quando a Cloud Function de handoff não estiver disponível.

### Alterado
- Redesenha Estado no desktop como wizard com busca refinada, grid compacto e painel lateral para continuar no celular.
- Redesenha Candidatos no desktop em três áreas: resumo do plano, lista compacta de candidatos e painel sticky de celular.
- Redesenha NossoVoto no desktop como revisão de plano com tiles, ações de edição/voltar e QR Code como CTA principal.
- Refina a tela Sobre Nós mantendo a composição aprovada e ajustando CTAs para a prévia desktop.

## [1.4.0] - 2026-05-05

### Adicionado
- Adiciona arquivo `.env.example` com as variáveis necessárias para configurar o Firebase.
- Inclui geração de imagem compartilhável para o resultado.
- Inclui política de cookies, páginas de privacidade, LGPD e Sobre nós acessíveis pelo footer.
- Adiciona consentimento de privacidade e cache de candidatos para melhorar a experiência em redes instáveis.

### Alterado
- Redesenha o fluxo de votação com nova navegação inferior e experiência responsiva modernizada.
- Refatora componentes e estilos das telas de login, seleção de candidatos e resultado.
- Simplifica o fluxo desktop com avanço automático após seleção e confirmação apenas em Meu Voto.
- Reformula header, progresso visual, filtros, busca, cards de candidatos e resumo final para desktop e tablet.
- Melhora PWA, service worker, cache estático e cabeçalhos de segurança.

### Ajustado
- Refina listas e espaçamentos em telas mobile.
- Ajusta configurações de ambiente e integração com Firebase.
- Corrige a tela Meu Voto para lidar com candidatos ausentes sem quebrar a renderização.
- Ajusta a lógica de destaque para ignorar candidatos com chance de eleição em 100%.
- Bloqueia duplicidade visual entre Senador 1 e Senador 2 e adiciona comparação com candidatos recomendados.

## [1.3.2] - 2026-04-24

### Ajustado
- Refina a responsividade entre 384px e 412px para manter topo, cards, listas e rodapés alinhados.
- Equaliza os espaçamentos em telas de login, seleção e resultado nessa faixa de largura.

## [1.3.1] - 2026-04-24

### Ajustado
- Padroniza os tons de verde e vermelho/rosa dos cards também na tela azul de renovar.
- Reequilibra os espaçamentos das telas inicial, seleção de estado e seleção de candidatos.
- Afasta os botões de menu e informação do campo de pesquisa no topo mobile.
- Corrige a navegação de avanço para seguir o fluxo natural antes do resumo.

