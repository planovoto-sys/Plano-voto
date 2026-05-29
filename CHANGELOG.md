# Changelog

Todas as mudanças relevantes deste projeto serão documentadas aqui.

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

