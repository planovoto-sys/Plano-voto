# Changelog

Todas as mudanças relevantes deste projeto serão documentadas aqui.

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

