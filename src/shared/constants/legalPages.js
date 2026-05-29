export const LEGAL_LAST_UPDATED = '29 de maio de 2026';

export const LEGAL_NAV_LINKS = [
  { label: 'Central de Privacidade', path: '/central-de-privacidade' },
  { label: 'Política de Privacidade', path: '/politica-de-privacidade' },
  { label: 'Cookies', path: '/cookies' },
  { label: 'Preferências de cookies', path: '/cookies#permissoes' },
  { label: 'LGPD', path: '/lgpd' },
  { label: 'Termos de Uso', path: '/termos-de-uso' },
  { label: 'Aviso Eleitoral', path: '/aviso-eleitoral' },
  { label: 'Dados no dispositivo', path: '/dados-no-dispositivo' },
  { label: 'Excluir dados', path: '/excluir-dados' },
  { label: 'Fornecedores', path: '/fornecedores' }
];

export const COOKIE_CATEGORY_ROWS = [
  {
    categoria: 'Necessários',
    finalidade: 'Mantêm login, segurança, rascunho, aceite de privacidade, cache técnico e funcionamento básico.',
    obrigatorio: 'Sim',
    controle: 'Não pela tela do app',
    exemplos: 'Sessão, autenticação, consentimento, PWA e rascunho local'
  },
  {
    categoria: 'Análise de uso',
    finalidade: 'Mede erros, desempenho e uso agregado para melhorar estabilidade.',
    obrigatorio: 'Não',
    controle: 'Sim',
    exemplos: 'Eventos técnicos, falhas e métricas agregadas'
  },
  {
    categoria: 'Personalização',
    finalidade: 'Guarda preferências opcionais de interface, filtros e experiência.',
    obrigatorio: 'Não',
    controle: 'Sim',
    exemplos: 'Filtros, preferências visuais e ajustes não essenciais'
  },
  {
    categoria: 'Marketing e parceiros',
    finalidade: 'Permite campanhas, mensuração e integrações futuras, quando autorizadas.',
    obrigatorio: 'Não',
    controle: 'Sim',
    exemplos: 'Tags opcionais e integrações declaradas'
  },
  {
    categoria: 'Uso comercial agregado',
    finalidade: 'Autoriza estudos estatísticos com dados agregados ou anonimizados. Não autoriza venda, cessão ou publicidade baseada em escolhas individuais de voto.',
    obrigatorio: 'Não',
    controle: 'Sim',
    exemplos: 'Relatórios agregados e estatísticas sem perfil individual identificável'
  }
];

export const PRIVACY_DATA_ROWS = [
  {
    dado: 'Nome, email, imagem e identificador do login',
    finalidade: 'Autenticação, recuperação da conta e suporte.',
    base: 'Base ou hipótese possível, conforme a operação e revisão aplicável.',
    local: 'Provedor de login e conta remota.',
    retencao: 'Enquanto a conta existir ou pelo prazo necessário.',
    controle: 'Login, suporte e solicitação de exclusão.'
  },
  {
    dado: 'Estado escolhido e progresso do fluxo',
    finalidade: 'Mostrar candidatos compatíveis e retomar etapas.',
    base: 'Execução do serviço solicitado e consentimento quando aplicável.',
    local: 'Navegador, rascunho local e conta, se o usuário salvar.',
    retencao: 'Até exclusão local, limpeza do navegador ou exclusão da conta.',
    controle: 'Trocar estado, apagar rascunho local ou excluir dados.'
  },
  {
    dado: 'Candidatos escolhidos e rascunho local',
    finalidade: 'Organizar o plano, revisar escolhas, gerar resumo e continuidade.',
    base: 'Execução do serviço e possível dado sensível com revisão reforçada.',
    local: 'Navegador, conta e token temporário quando houver QR Code.',
    retencao: 'Enquanto necessário ao rascunho ou até o usuário apagar.',
    controle: 'Editar escolhas, apagar dispositivo ou excluir dados da conta.'
  },
  {
    dado: 'Snapshot offline e cache de candidatos',
    finalidade: 'Carregar a experiência com pouca conexão e reduzir novas consultas.',
    base: 'Execução do serviço, segurança e melhoria técnica.',
    local: 'LocalStorage, IndexedDB, Cache API ou service worker.',
    retencao: 'Até expiração técnica, atualização, limpeza automática ou ação do usuário.',
    controle: 'Apagar dados offline e cache de candidatos.'
  },
  {
    dado: 'Preferências de cookies e filtros',
    finalidade: 'Respeitar permissões e manter ajustes escolhidos.',
    base: 'Consentimento para opcionais e necessidade para essenciais.',
    local: 'Navegador usado pelo usuário.',
    retencao: 'Até redefinição, limpeza do navegador ou atualização de política.',
    controle: 'Redefinir permissões e salvar novas preferências.'
  },
  {
    dado: 'Logs técnicos, IP aproximado, dispositivo, navegador e eventos de erro',
    finalidade: 'Segurança, prevenção de abuso, diagnóstico e estabilidade.',
    base: 'Segurança, legítimo interesse, obrigação legal ou exercício de direitos.',
    local: 'Infraestrutura técnica, provedores e registros de segurança.',
    retencao: 'Pelo prazo necessário à segurança, auditoria e defesa de direitos.',
    controle: 'Solicitação de acesso, oposição ou eliminação quando aplicável.'
  },
  {
    dado: 'Dados públicos de candidatos',
    finalidade: 'Exibição, busca, filtros, comparação e organização da experiência.',
    base: 'Uso de dados públicos e execução do serviço.',
    local: 'Cache público do app, navegador e infraestrutura.',
    retencao: 'Enquanto úteis ao ciclo eleitoral e atualizações do serviço.',
    controle: 'Limpar cache local; conferir fontes oficiais.'
  },
  {
    dado: 'QR/token de continuidade e conteúdo de compartilhamento',
    finalidade: 'Continuar em outro dispositivo e permitir compartilhamento iniciado pelo usuário.',
    base: 'Execução do serviço, consentimento e ação clara do usuário.',
    local: 'Token temporário, link, navegador e plataforma externa escolhida.',
    retencao: 'Token temporário ou até expirar; compartilhamento depende da plataforma.',
    controle: 'Não compartilhar, apagar rascunho, gerar novo token ou excluir dados.'
  }
];

export const PROVIDER_ROWS = [
  {
    categoria: 'Autenticação',
    finalidade: 'Login e identificação da conta.',
    dados: 'Email, nome, foto, identificador técnico e eventos de autenticação.',
    exemplo: 'Firebase Authentication / Google Cloud'
  },
  {
    categoria: 'Banco de dados',
    finalidade: 'Salvar perfil, rascunho, preferências e progresso quando o usuário usa conta.',
    dados: 'Estado, progresso, escolhas, timestamps e identificadores técnicos.',
    exemplo: 'Firestore / Google Cloud'
  },
  {
    categoria: 'Funções serverless',
    finalidade: 'Executar operações seguras, QR Code de continuidade e exclusão de dados.',
    dados: 'UID, rascunho mínimo, tokens temporários e logs técnicos.',
    exemplo: 'Firebase Cloud Functions / Google Cloud'
  },
  {
    categoria: 'Hospedagem e PWA',
    finalidade: 'Servir site, arquivos estáticos, cache técnico e atualizações.',
    dados: 'Registros técnicos de acesso, dispositivo, navegador e cache.',
    exemplo: 'Firebase Hosting, Vercel ou infraestrutura configurada'
  },
  {
    categoria: 'Monitoramento e analytics opcionais',
    finalidade: 'Diagnosticar falhas, desempenho e uso agregado quando autorizado.',
    dados: 'Eventos técnicos, erros, rotas, dispositivo e métricas agregadas.',
    exemplo: 'Serviços ativados somente conforme configuração e consentimento'
  },
  {
    categoria: 'Email e suporte',
    finalidade: 'Responder solicitações de privacidade, exclusão e atendimento.',
    dados: 'Email, conteúdo enviado pelo usuário e dados necessários para titularidade.',
    exemplo: 'Conta de email de contato: plano.voto@gmail.com'
  }
];

const reviewNote = 'Este conteúdo organiza transparência e governança do produto, mas deve passar por revisão jurídica antes de publicação definitiva em produção.';

export const LEGAL_PAGE_CONTENT = {
  cookies: {
    title: 'Cookies',
    subtitle: 'Entenda como usamos cookies, armazenamento local e recursos do navegador.',
    meta: {
      title: 'Cookies | nossovoto.org',
      description: 'Política de cookies, permissões opcionais e controles de privacidade do nossovoto.org.',
      path: '/cookies'
    },
    sections: [
      {
        heading: 'Resumo',
        body: [
          'Usamos cookies, armazenamento local, cache da PWA e tecnologias semelhantes para manter o app funcionando, preservar login, guardar permissões, salvar preferências e recuperar rascunhos do fluxo.',
          'Recursos opcionais, como análise de uso, personalização, marketing, parceiros ou uso comercial agregado, dependem de permissão salva pelo usuário e podem ser alterados nesta página.'
        ]
      },
      {
        heading: 'Cookies necessários',
        body: 'São essenciais para autenticação, segurança, funcionamento da PWA, cache técnico, aceite de privacidade, rascunho de escolhas, prevenção de abuso e preferências mínimas do fluxo. Esses recursos ficam sempre ativos porque o app depende deles para funcionar.'
      },
      {
        heading: 'Cookies opcionais',
        body: 'Categorias opcionais, como análise de uso, personalização, marketing, parceiros ou uso comercial agregado, só devem ser ativadas quando houver permissão salva pelo usuário. Se uma integração futura exigir novo tipo de dado, nova finalidade ou novo parceiro, a descrição deverá ser atualizada antes da coleta.'
      },
      {
        heading: 'Armazenamento local e cache',
        body: [
          'Algumas informações ficam salvas no próprio navegador, como aceite de privacidade, preferências de filtro, estado selecionado, rascunho do fluxo, permissões de cookies e cache de dados públicos de candidatos.',
          'Limpar cookies, cache ou dados do navegador pode apagar essas preferências e encerrar sessões locais. Em alguns dispositivos, o sistema operacional ou o navegador também pode remover dados automaticamente para liberar espaço.'
        ]
      },
      {
        heading: 'Medição e melhoria do serviço',
        body: 'Quando houver permissão, cookies de análise podem ajudar a medir desempenho, falhas, rotas mais acessadas e uso agregado do sistema. Essas medições devem reduzir identificação desnecessária e não devem expor escolhas individuais de voto para publicidade comportamental.'
      },
      {
        heading: 'Marketing, parceiros e uso comercial',
        body: 'Cookies ou identificadores para marketing, parceiros, campanhas ou estudos comerciais somente devem ser usados com transparência e permissão específica. O uso comercial agregado autoriza estudos estatísticos com dados agregados ou anonimizados. Não autoriza venda, cessão ou publicidade baseada em escolhas individuais de voto.'
      },
      {
        heading: 'Retenção das permissões',
        body: 'As preferências de cookies ficam salvas neste dispositivo para que o app respeite sua escolha em acessos futuros. A revogação vale para usos futuros e pode não apagar automaticamente registros técnicos já gerados quando houver obrigação legal, segurança, auditoria ou necessidade de defesa de direitos.'
      },
      {
        heading: 'Alteração e revogação',
        body: 'Você pode alterar suas permissões nesta página, redefinir o consentimento salvo ou limpar os dados diretamente nas configurações do navegador. Bloqueios feitos no navegador podem afetar login, cache, preferências e partes essenciais da experiência.'
      },
      {
        heading: 'Última atualização',
        body: `Esta página foi revisada em ${LEGAL_LAST_UPDATED}, considerando a estrutura atual do nossovoto.org e orientações públicas da Autoridade Nacional de Proteção de Dados sobre cookies e proteção de dados pessoais. ${reviewNote}`
      }
    ]
  },
  privacidade: {
    title: 'Política de Privacidade',
    subtitle: 'Como protegemos informações e mantemos transparência no uso dos dados.',
    meta: {
      title: 'Política de Privacidade | nossovoto.org',
      description: 'Informações sobre dados tratados, finalidades, bases possíveis, dados sensíveis, QR Code, compartilhamento e direitos do usuário.',
      path: '/politica-de-privacidade'
    },
    sections: [
      {
        heading: 'Quem somos e escopo',
        body: [
          'O nossovoto.org é uma ferramenta de organização pessoal de escolhas eleitorais. O app não realiza votação oficial, não substitui a urna eletrônica, não representa tribunal eleitoral, partido, candidato, coligação, campanha ou órgão público.',
          'Esta política se aplica ao uso do site, da PWA, das páginas legais, das telas de compartilhamento e dos recursos de autenticação, seleção, revisão, QR Code e armazenamento de preferências. Solicitações sobre privacidade podem ser enviadas para plano.voto@gmail.com.'
        ]
      },
      {
        heading: 'Dados que podemos tratar',
        body: [
          'Podemos tratar dados básicos de autenticação, como nome, email, identificador do provedor de login e imagem de perfil fornecida pelo provedor; estado selecionado; progresso do fluxo; candidatos escolhidos dentro da aplicação; favoritos, filtros, permissões e preferências salvas no navegador.',
          'Também podemos tratar registros técnicos de acesso, segurança e funcionamento, como data e hora, identificadores técnicos, endereço IP aproximado, tipo de dispositivo, navegador, erros, eventos de autenticação, logs de proteção contra abuso e cache técnico. Dados públicos de candidatos são usados para exibição, busca, comparação e organização da experiência.'
        ]
      },
      {
        heading: 'Dados sensíveis',
        body: [
          'Escolhas eleitorais, preferências de candidatos e interações que permitam inferir orientação política podem revelar opinião política, considerada dado pessoal sensível pela LGPD quando vinculada a pessoa identificada ou identificável.',
          'Por isso, o projeto deve tratar essas informações com maior cuidado, finalidade clara, controle de acesso, limitação de uso, separação entre dados técnicos e escolhas do usuário sempre que possível, e preferência por agregação ou anonimização quando a identificação individual não for necessária.'
        ]
      },
      {
        heading: 'Finalidades do tratamento',
        body: [
          'Usamos dados para autenticar o usuário, manter a sessão, recuperar fluxo em andamento, exibir candidatos compatíveis com o estado, registrar escolhas feitas pelo usuário, impedir duplicidades, calcular ou exibir indicadores de viabilidade, gerar telas de revisão, QR Code de continuidade e compartilhamentos iniciados pelo próprio usuário.',
          'Também usamos dados para manter estabilidade, corrigir erros, proteger contra fraude e acessos indevidos, atender solicitações de suporte, cumprir obrigações legais, responder a autoridades competentes e defender direitos do projeto, dos usuários ou de terceiros.'
        ]
      },
      {
        heading: 'Bases legais',
        body: [
          'Dependendo da operação, o tratamento pode se apoiar em execução do serviço solicitado pelo usuário, consentimento, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, prevenção à fraude, proteção da segurança do titular ou de terceiros, e legítimo interesse com avaliação de necessidade, proporcionalidade e impacto.',
          'Quando a operação envolver dados sensíveis, como possíveis inferências de opinião política, a base legal deverá ser avaliada com maior rigor, priorizando finalidade específica, transparência reforçada, limitação de acesso e uso estritamente necessário para a experiência escolhida pelo usuário.'
        ]
      },
      {
        heading: 'Consentimento e preferências',
        body: 'Quando uma finalidade depender de consentimento, a autorização deve ser livre, informada, específica e revogável. Cookies opcionais, marketing, parceiros, estudos comerciais, comunicações promocionais e integrações futuras devem respeitar as permissões salvas pelo usuário e permitir recusa sem impedir o uso essencial do app.'
      },
      {
        heading: 'Dados salvos neste dispositivo',
        body: [
          'Para permitir continuidade do fluxo, funcionamento com pouca conexão e recuperação do rascunho, o app pode salvar neste dispositivo informações como estado selecionado, progresso do fluxo, candidatos escolhidos, preferências, permissões de cookies e cache técnico.',
          'Esses dados ficam no navegador usado. Pessoas com acesso ao mesmo dispositivo ou perfil do navegador podem eventualmente visualizar informações salvas. O usuário pode apagar dados locais nas configurações do app, nas páginas legais ou diretamente no navegador.'
        ]
      },
      {
        heading: 'QR Code e continuidade entre dispositivos',
        body: 'Quando disponível, o QR Code de continuidade pode conter um token temporário ou um rascunho local mínimo para carregar o plano em outro dispositivo. Esse acesso não realiza login automático, não registra voto oficial, pode expirar e não deve ser compartilhado com pessoas que o usuário não deseja que acessem o resumo do plano.'
      },
      {
        heading: 'Fontes públicas e dados de candidatos',
        body: 'Dados públicos de candidatos podem ser usados para exibição, busca, filtros, comparação e organização da experiência. O usuário deve conferir informações relevantes em fontes oficiais antes de tomar decisões eleitorais.'
      },
      {
        heading: 'Compartilhamento e operadores',
        body: [
          'Dados podem ser compartilhados com provedores técnicos necessários ao funcionamento, como serviços de autenticação, banco de dados, hospedagem, armazenamento, segurança, monitoramento, envio de mensagens transacionais e infraestrutura de nuvem. Esses fornecedores devem tratar dados conforme instruções, finalidade contratada e medidas adequadas de segurança.',
          'Não compartilhamos escolhas individuais de voto para publicidade comportamental. Qualquer compartilhamento com parceiros, patrocinadores, pesquisas, campanhas ou uso comercial deverá ser analisado previamente, informado ao usuário e, quando aplicável, baseado em consentimento específico ou em dados agregados ou anonimizados.'
        ]
      },
      {
        heading: 'Compartilhamento pelo usuário',
        body: 'O app pode gerar imagens, resumos ou telas de compartilhamento quando o próprio usuário aciona esse recurso. Antes de compartilhar em redes sociais, mensagens ou outros ambientes externos, o usuário deve conferir o conteúdo exibido, pois o controle sobre a circulação passa a depender da plataforma escolhida.'
      },
      {
        heading: 'Retenção e eliminação',
        body: [
          'Mantemos dados pelo tempo necessário para entregar o serviço, preservar segurança, permitir auditoria, prevenir abuso, cumprir obrigações legais, atender solicitações do usuário e exercer direitos em processos administrativos, judiciais ou extrajudiciais.',
          'Rascunhos, permissões e preferências locais podem ser apagados pelo próprio usuário. Dados de conta e escolhas salvas podem ser excluídos mediante solicitação ou função disponível, respeitadas hipóteses legais de conservação, backups técnicos, logs de segurança e prazos necessários para prevenção de fraude ou defesa de direitos.'
        ]
      },
      {
        heading: 'Segurança da informação',
        body: 'Adotamos medidas técnicas e administrativas compatíveis com a natureza dos dados tratados, incluindo autenticação, regras de acesso, validações de etapa, controle de estado, segregação de permissões, registros técnicos, revisão de fluxos e limitação de exposição desnecessária. Nenhum sistema é imune a riscos, mas a operação deve buscar prevenção, detecção e resposta a acessos indevidos.'
      },
      {
        heading: 'Direitos do usuário',
        body: 'O usuário pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade quando aplicável, informação sobre compartilhamento, informação sobre a possibilidade de negar consentimento, revogação de consentimento, revisão de decisões automatizadas quando existirem e oposição a tratamentos irregulares, observadas as exceções legais.'
      },
      {
        heading: 'Decisões automatizadas e viabilidade',
        body: 'Indicadores, notas, percentuais, ranking, destaque de candidato ou viabilidade são recursos de apoio à organização do voto e não representam decisão obrigatória, orientação oficial, garantia de resultado eleitoral ou decisão automatizada com efeito jurídico. O usuário mantém autonomia para pesquisar, comparar e decidir.'
      },
      {
        heading: 'Transferência internacional',
        body: 'Como parte da infraestrutura técnica pode ser prestada por fornecedores de nuvem, autenticação, hospedagem ou segurança, dados podem ser processados em servidores localizados fora do Brasil. Quando isso ocorrer, devem ser observadas medidas compatíveis com a LGPD, contratos, salvaguardas e limitações de finalidade.'
      },
      {
        heading: 'Crianças e adolescentes',
        body: 'O app não é direcionado a crianças. Considerando que o voto no Brasil pode envolver adolescentes a partir de 16 anos, qualquer uso por público menor de 18 anos deve observar proteção especial, linguagem adequada, minimização de dados e o melhor interesse do adolescente quando aplicável.'
      },
      {
        heading: 'Incidentes de segurança',
        body: 'Em caso de incidente que possa gerar risco ou dano relevante aos titulares, o projeto deverá avaliar o ocorrido, adotar medidas de contenção, preservar evidências, revisar controles internos e realizar comunicações exigidas pela legislação e pela Autoridade Nacional de Proteção de Dados quando aplicável.'
      },
      {
        heading: 'Canal de atendimento',
        body: 'Solicitações relacionadas a privacidade, proteção de dados, exclusão de conta, revogação de consentimento ou exercício de direitos podem ser enviadas para plano.voto@gmail.com. Recomenda-se informar o email usado no login e descrever o pedido de forma objetiva para facilitar a validação da titularidade.'
      },
      {
        heading: 'Atualizações',
        body: `Esta política pode ser atualizada para refletir novas funcionalidades, integrações, categorias de cookies, modelos de negócio, orientação da ANPD ou exigências legais. Última revisão: ${LEGAL_LAST_UPDATED}. ${reviewNote}`
      }
    ]
  },
  lgpd: {
    title: 'LGPD',
    subtitle: 'Direitos do usuário e princípios de tratamento de dados pessoais.',
    meta: {
      title: 'LGPD | nossovoto.org',
      description: 'Direitos dos titulares, dados sensíveis, bases possíveis e governança de proteção de dados.',
      path: '/lgpd'
    },
    sections: [
      {
        heading: 'O que é a LGPD',
        body: [
          'A Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018, disciplina o tratamento de dados pessoais em meios físicos e digitais por pessoas naturais ou jurídicas, públicas ou privadas.',
          'Seu objetivo é proteger direitos fundamentais de liberdade, privacidade, autodeterminação informativa e livre desenvolvimento da personalidade, exigindo transparência, segurança, finalidade legítima e responsabilidade de quem trata dados.'
        ]
      },
      {
        heading: 'Conceitos principais',
        body: 'Dado pessoal é informação relacionada a pessoa identificada ou identificável. Dado pessoal sensível inclui, entre outros, dado sobre opinião política. Tratamento é qualquer operação com dados, como coleta, acesso, armazenamento, uso, compartilhamento, classificação, eliminação ou anonimização.'
      },
      {
        heading: 'Princípios adotados',
        body: 'O nossovoto.org deve seguir princípios como finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência, segurança, prevenção, não discriminação e responsabilização. Na prática, isso significa tratar somente o necessário, explicar finalidades, proteger acessos, evitar usos incompatíveis e manter evidências de conformidade.'
      },
      {
        heading: 'Papel do controlador e dos operadores',
        body: 'O controlador define as finalidades e os meios essenciais do tratamento. Operadores prestam serviços técnicos em nome do controlador, como autenticação, hospedagem, banco de dados, segurança e monitoramento. A relação com operadores deve limitar o tratamento à finalidade contratada e exigir medidas de segurança compatíveis.'
      },
      {
        heading: 'Bases legais aplicáveis',
        body: [
          'A execução do serviço pode justificar dados necessários para login, recuperação do plano, seleção de estado, lista de candidatos e revisão das escolhas. O consentimento pode ser usado para cookies opcionais, comunicações promocionais, marketing, parceiros, personalização não essencial e uso comercial agregado.',
          'Legítimo interesse pode ser usado para segurança, prevenção de abuso, melhoria do serviço e métricas internas, desde que respeite expectativa do usuário, necessidade e proporcionalidade. Obrigação legal, exercício regular de direitos e prevenção à fraude podem justificar conservação ou uso pontual de registros técnicos.'
        ]
      },
      {
        heading: 'Consentimento',
        body: 'Quando uma operação depender de consentimento, ele deve ser livre, informado, inequívoco, destacado e revogável. A recusa a cookies opcionais, publicidade, parceiros ou uso comercial não deve impedir o acesso às funções essenciais do app.'
      },
      {
        heading: 'Dados pessoais sensíveis',
        body: 'Dados que revelem ou permitam inferir opinião política exigem atenção especial. O tratamento deve ser limitado ao necessário para o funcionamento do app, com controles de acesso, minimização, transparência reforçada e vedação a discriminação, manipulação política, publicidade abusiva ou venda de perfis individuais identificáveis.'
      },
      {
        heading: 'Anonimização e agregação',
        body: 'Sempre que a identificação do usuário não for necessária, o projeto deve priorizar dados agregados ou anonimizados. Dados anonimizados deixam de ser pessoais quando não permitirem identificação por meios técnicos razoáveis disponíveis, mas relatórios e métricas devem ser revisados para evitar reidentificação indireta.'
      },
      {
        heading: 'Direitos dos titulares',
        body: 'O titular pode pedir confirmação da existência de tratamento, acesso, correção de dados incompletos ou desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados irregularmente, portabilidade quando aplicável, informação sobre compartilhamento, informação sobre consequências de negar consentimento, revogação de consentimento, oposição e revisão de decisões automatizadas quando existirem.'
      },
      {
        heading: 'Como exercer seus direitos no nossovoto.org',
        body: [
          '1. Envie um email para plano.voto@gmail.com.',
          '2. Informe o email usado no login, se houver.',
          '3. Descreva o pedido: acesso, correção, exclusão, revogação, oposição ou outro direito.',
          '4. O app poderá solicitar informações adicionais para confirmar titularidade.'
        ]
      },
      {
        heading: 'Atendimento aos direitos',
        body: 'As solicitações devem ser respondidas de forma clara, segura e sem custo ao titular, observados prazos legais, validação de identidade, limitações técnicas, segredos comerciais e hipóteses legais de conservação. Quando não for possível atender imediatamente, o motivo deverá ser explicado.'
      },
      {
        heading: 'Segurança e prevenção',
        body: 'A LGPD exige medidas técnicas e administrativas aptas a proteger dados contra acessos não autorizados, perda, alteração, comunicação indevida ou tratamento inadequado. O app deve manter controles de autenticação, regras de permissão, validações, monitoramento, revisão de fornecedores e práticas de prevenção proporcionais ao risco.'
      },
      {
        heading: 'Incidentes e comunicação',
        body: 'Em caso de incidente com risco ou dano relevante aos titulares, o projeto deverá avaliar impactos, conter a falha, registrar evidências, mitigar danos e observar as comunicações exigidas pela LGPD e pela Autoridade Nacional de Proteção de Dados.'
      },
      {
        heading: 'Relatório de impacto e governança',
        body: 'Operações com maior risco, especialmente as que envolvam inferência de opinião política, compartilhamento com parceiros, uso comercial ou tratamento em larga escala, devem passar por avaliação de impacto, registro de finalidade, análise de necessidade, revisão de segurança e documentação de salvaguardas.'
      },
      {
        heading: 'Transferência internacional',
        body: 'Quando dados forem processados por fornecedores fora do Brasil, o tratamento deverá observar os requisitos da LGPD para transferência internacional, incluindo finalidade legítima, transparência, medidas contratuais e salvaguardas compatíveis com a proteção dos titulares.'
      },
      {
        heading: 'Canal de atendimento e ANPD',
        body: 'Solicitações relacionadas à privacidade e proteção de dados podem ser enviadas para plano.voto@gmail.com. O titular também pode buscar orientação ou peticionar perante a Autoridade Nacional de Proteção de Dados quando entender que seus direitos não foram atendidos.'
      },
      {
        heading: 'Última atualização',
        body: `Esta página foi revisada em ${LEGAL_LAST_UPDATED} para aprofundar transparência, direitos dos titulares, dados sensíveis, cookies, segurança e governança de privacidade. ${reviewNote}`
      }
    ]
  },
  termos: {
    title: 'Termos de Uso',
    subtitle: 'Regras de uso do serviço, limites dos indicadores e responsabilidade do usuário.',
    meta: {
      title: 'Termos de Uso | nossovoto.org',
      description: 'Termos de uso do nossovoto.org e avisos sobre organização pessoal de escolhas eleitorais.',
      path: '/termos-de-uso'
    },
    sections: [
      {
        heading: 'Aceitação dos termos',
        body: 'Ao acessar ou usar o nossovoto.org, você declara que leu e concorda com estes termos, com a Política de Privacidade, com a Política de Cookies e com o Aviso Eleitoral. Se não concordar, não utilize o serviço.'
      },
      {
        heading: 'O que é o nossovoto.org',
        body: 'O nossovoto.org é uma ferramenta de organização pessoal de escolhas eleitorais. O app ajuda a selecionar estado, revisar candidatos, montar rascunho, continuar em outro dispositivo e compartilhar conteúdos quando o próprio usuário desejar.'
      },
      {
        heading: 'O que o nossovoto.org não é',
        body: 'O app não realiza votação oficial, não substitui a urna eletrônica, não representa tribunal eleitoral, partido, candidato, coligação, campanha ou órgão público. O voto oficial deve ser realizado pelos meios determinados pela Justiça Eleitoral.'
      },
      {
        heading: 'Uso permitido',
        body: 'Você pode usar o serviço para conhecer o produto, pesquisar candidatos exibidos, montar rascunhos pessoais, revisar escolhas, salvar plano quando houver login e compartilhar materiais gerados por você, respeitando a lei, estes termos e direitos de terceiros.'
      },
      {
        heading: 'Uso proibido',
        body: 'É proibido usar o serviço para fraudar sistemas, manipular usuários, coletar dados de terceiros sem autorização, atacar a infraestrutura, disseminar conteúdo ilegal, violar direitos de candidatos ou usuários, tentar acessar contas de outras pessoas ou sugerir que o app realiza votação oficial.'
      },
      {
        heading: 'Conta e autenticação',
        body: 'Alguns recursos podem exigir login. O usuário deve manter segurança do próprio acesso e usar o mesmo login para recuperar, excluir ou solicitar informações sobre dados salvos na conta.'
      },
      {
        heading: 'Rascunho e escolhas do usuário',
        body: 'O rascunho é uma ferramenta privada de organização. Ele pode ficar salvo no navegador, na conta ou em token temporário de continuidade, conforme o recurso usado. O usuário é responsável por revisar suas escolhas antes de salvar, compartilhar ou votar oficialmente fora do app.'
      },
      {
        heading: 'Indicadores, notas e viabilidade',
        body: 'Notas, rankings, destaques, percentuais de viabilidade e qualquer indicador exibido pelo app são recursos de apoio à organização e revisão do plano. Eles não representam garantia de resultado eleitoral, recomendação obrigatória, decisão automatizada com efeito jurídico ou orientação oficial de voto.'
      },
      {
        heading: 'Dados de candidatos e fontes públicas',
        body: 'Dados públicos de candidatos podem ser exibidos para busca, comparação e organização da experiência. Informações podem mudar, ficar incompletas ou depender de atualização. O usuário deve consultar fontes oficiais quando a informação for relevante para sua decisão.'
      },
      {
        heading: 'QR Code e continuidade',
        body: 'O QR Code cria um acesso temporário para continuar o rascunho em outro dispositivo. Ele não realiza login automático, não registra voto oficial e pode expirar. Não compartilhe o QR Code com pessoas que você não deseja que acessem o resumo do seu plano.'
      },
      {
        heading: 'Compartilhamento pelo usuário',
        body: 'Quando o usuário compartilha imagem, texto, link ou resumo em redes sociais e aplicativos de mensagem, o controle sobre a circulação passa a depender da plataforma escolhida e das pessoas que receberem o conteúdo.'
      },
      {
        heading: 'Disponibilidade do serviço',
        body: 'O serviço pode passar por manutenção, indisponibilidade, falha de rede, atualização de dados, ajustes de segurança ou mudanças de funcionalidade. O app pode limitar recursos em desktop e priorizar a experiência no celular.'
      },
      {
        heading: 'Limitação de responsabilidade',
        body: 'O usuário decide de forma autônoma. O nossovoto.org não garante eleição de candidato, resultado eleitoral, completude de dados públicos, funcionamento sem interrupções ou permanência de qualquer funcionalidade. Nada no app substitui pesquisa própria ou consulta a fontes oficiais.'
      },
      {
        heading: 'Alterações no app',
        body: 'Funcionalidades, textos, indicadores, rotas, controles de privacidade e integrações podem ser alterados para melhorar segurança, clareza, conformidade, usabilidade ou manutenção do serviço.'
      },
      {
        heading: 'Privacidade e proteção de dados',
        body: 'O tratamento de dados segue as páginas legais e de transparência publicadas no app. Cookies opcionais, marketing, parceiros e uso comercial agregado dependem de permissões específicas quando aplicável.'
      },
      {
        heading: 'Contato',
        body: 'Dúvidas, solicitações ou pedidos relacionados a privacidade, dados e uso do serviço podem ser enviados para plano.voto@gmail.com.'
      },
      {
        heading: 'Última atualização',
        body: `Estes termos foram revisados em ${LEGAL_LAST_UPDATED}. ${reviewNote}`
      }
    ]
  },
  avisoEleitoral: {
    title: 'Aviso Eleitoral',
    subtitle: 'O app organiza um plano pessoal, mas não realiza votação oficial.',
    meta: {
      title: 'Aviso Eleitoral | nossovoto.org',
      description: 'Aviso de que o nossovoto.org não é órgão eleitoral, votação oficial ou substituto da urna eletrônica.',
      path: '/aviso-eleitoral'
    },
    sections: [
      {
        heading: 'Não somos órgão eleitoral',
        body: 'O nossovoto.org não representa tribunal eleitoral, Justiça Eleitoral, partido, candidato, coligação, campanha, governo ou órgão público.'
      },
      {
        heading: 'Não realizamos votação oficial',
        body: 'O nossovoto.org não é um sistema oficial de votação. A ferramenta serve para organizar um plano pessoal de escolhas, revisar candidatos e facilitar a continuidade do rascunho.'
      },
      {
        heading: 'Não substituímos a urna eletrônica',
        body: 'O voto oficial deve ser realizado pelos meios determinados pela Justiça Eleitoral. Nenhuma escolha feita no app equivale a voto oficial.'
      },
      {
        heading: 'Não garantimos eleição de candidato',
        body: 'Indicadores, percentuais, notas, destaques ou viabilidade não garantem resultado eleitoral, não são pesquisa oficial e não substituem a decisão do eleitor.'
      },
      {
        heading: 'Não substituímos fontes oficiais',
        body: 'Dados e informações podem ser atualizados, corrigidos ou ficar incompletos. Confira informações relevantes em fontes oficiais antes de decidir.'
      },
      {
        heading: 'O usuário decide de forma autônoma',
        body: 'O app organiza informações para revisão pessoal. A decisão final é sempre do usuário, sem obrigação de seguir qualquer indicador exibido.'
      },
      {
        heading: 'Compartilhamento é responsabilidade do usuário',
        body: 'Ao compartilhar imagem, texto, link ou QR Code, revise o conteúdo. Depois do envio, a circulação depende da plataforma e das pessoas que receberem.'
      },
      {
        heading: 'Última atualização',
        body: `Este aviso foi revisado em ${LEGAL_LAST_UPDATED}. ${reviewNote}`
      }
    ]
  },
  dadosNoDispositivo: {
    title: 'Dados salvos neste dispositivo',
    subtitle: 'Entenda localStorage, cache PWA, dados offline e como apagar informações deste navegador.',
    meta: {
      title: 'Dados no dispositivo | nossovoto.org',
      description: 'Explicação e controles para rascunho local, cache offline, cache de candidatos e permissões de cookies.',
      path: '/dados-no-dispositivo',
      noindex: true
    },
    sections: [
      {
        heading: 'O que pode ser salvo no dispositivo',
        body: 'O app pode salvar estado escolhido, progresso do fluxo, candidatos escolhidos, preferências de filtros, permissões de cookies, cache técnico da PWA, dados públicos de candidatos e snapshots mínimos para funcionamento offline.'
      },
      {
        heading: 'Por que salvamos dados localmente',
        body: 'Esses dados ajudam a manter o rascunho, carregar telas com pouca conexão, reduzir consultas repetidas e permitir continuidade sem perder o progresso quando o navegador permanece no mesmo perfil.'
      },
      {
        heading: 'Que dados podem ficar offline',
        body: 'O snapshot offline deve ser limitado ao necessário para exibição: estado, candidatos escolhidos, partido, número, notas necessárias, updatedAt e electionId. Não deve salvar email, nome ou foto de perfil dentro do snapshot offline.'
      },
      {
        heading: 'Quem pode ver esses dados',
        body: 'Pessoas com acesso ao mesmo dispositivo, navegador ou perfil do navegador podem eventualmente visualizar informações salvas. Em dispositivo compartilhado, recomendamos apagar o rascunho local e os dados offline ao final do uso.'
      },
      {
        heading: 'Como apagar dados locais',
        body: 'Use os botões desta página para apagar rascunho local, dados offline, cache de candidatos, permissões de cookies ou tudo deste dispositivo. Também é possível limpar dados diretamente nas configurações do navegador.'
      },
      {
        heading: 'O que acontece ao limpar navegador/cache',
        body: 'Limpar dados do navegador pode apagar login local, permissões, filtros, rascunhos e cache. Dados salvos na conta podem continuar existindo até exclusão específica ou solicitação atendida.'
      },
      {
        heading: 'Dados desatualizados offline',
        body: 'Candidatos, indicadores e textos podem ficar desatualizados se você estiver offline. Ao voltar a conexão, o app deve buscar dados atualizados quando possível.'
      },
      {
        heading: 'Sincronização quando a internet voltar',
        body: 'Quando houver conta e conexão, o app pode tentar sincronizar escolhas ou recuperar o rascunho remoto conforme as regras do fluxo. Em caso de conflito, o usuário deve revisar antes de continuar.'
      },
      {
        heading: 'Dispositivo compartilhado',
        body: 'Se você usa um dispositivo compartilhado, recomendamos apagar o rascunho local e os dados offline ao final do uso.'
      },
      {
        heading: 'Última atualização',
        body: `Esta página foi revisada em ${LEGAL_LAST_UPDATED}. ${reviewNote}`
      }
    ]
  },
  excluirDados: {
    title: 'Exclusão de conta e dados',
    subtitle: 'Caminhos para apagar dados locais, solicitar exclusão e remover dados eleitorais da conta.',
    meta: {
      title: 'Excluir dados | nossovoto.org',
      description: 'Página para exclusão de dados locais e dados eleitorais vinculados à conta.',
      path: '/excluir-dados',
      noindex: true
    },
    sections: [
      {
        heading: 'O que pode ser excluído',
        body: 'Você pode apagar rascunhos locais, dados offline, cache de candidatos e permissões deste navegador. Usuários logados podem solicitar a exclusão dos dados eleitorais vinculados à conta pela ação segura disponível nesta página.'
      },
      {
        heading: 'O que pode permanecer temporariamente',
        body: 'Logs técnicos, registros necessários para segurança, prevenção de abuso, auditoria, cumprimento de obrigação legal, backups e defesa de direitos podem permanecer pelo prazo necessário e conforme avaliação aplicável.'
      },
      {
        heading: 'Dados locais vs dados da conta',
        body: 'Dados locais ficam no navegador usado e podem ser apagados sem login. Dados da conta dependem do mesmo login usado no app ou de solicitação por email com confirmação de titularidade.'
      },
      {
        heading: 'Como solicitar exclusão',
        body: 'Entre com o mesmo login usado no app e use o painel abaixo, ou envie solicitação para plano.voto@gmail.com informando o email usado no login e descrevendo o pedido.'
      },
      {
        heading: 'Prazo estimado e titularidade',
        body: 'O atendimento deve ocorrer em prazo razoável conforme a legislação aplicável. O app poderá solicitar informações adicionais para confirmar titularidade antes de excluir dados remotos.'
      },
      {
        heading: 'Última atualização',
        body: `Esta página foi revisada em ${LEGAL_LAST_UPDATED}. ${reviewNote}`
      }
    ]
  },
  centralPrivacidade: {
    title: 'Central de Privacidade',
    subtitle: 'Um lugar para revisar permissões, dados locais, exclusão e documentos legais.',
    meta: {
      title: 'Central de Privacidade | nossovoto.org',
      description: 'Central de controles de privacidade, cookies, dados do dispositivo e documentos legais do nossovoto.org.',
      path: '/central-de-privacidade',
      noindex: true
    },
    sections: [
      {
        heading: 'Transparência e controle',
        body: 'Esta central reúne as páginas legais, preferências de cookies, controles de dados locais e caminhos para exclusão de dados da conta.'
      },
      {
        heading: 'Prioridades',
        body: 'O usuário deve conseguir entender o que o app faz, que dados salva e como controlar ou apagar esses dados.'
      },
      {
        heading: 'Contato',
        body: 'Solicitações relacionadas a privacidade e proteção de dados podem ser enviadas para plano.voto@gmail.com.'
      }
    ]
  },
  fornecedores: {
    title: 'Fornecedores e operadores',
    subtitle: 'Categorias de serviços técnicos que podem tratar dados para manter o app funcionando.',
    meta: {
      title: 'Fornecedores | nossovoto.org',
      description: 'Categorias de operadores, finalidades e dados possíveis no nossovoto.org.',
      path: '/fornecedores'
    },
    sections: [
      {
        heading: 'Transparência sobre operadores',
        body: 'O app depende de fornecedores técnicos para autenticação, banco de dados, hospedagem, funções serverless, segurança, monitoramento, analytics opcional e suporte. A lista abaixo descreve categorias e exemplos, podendo mudar conforme a infraestrutura configurada.'
      },
      {
        heading: 'Limitação de finalidade',
        body: 'Operadores devem tratar dados conforme instruções, finalidade contratada, medidas de segurança e limites necessários ao funcionamento do serviço.'
      },
      {
        heading: 'Revisão de fornecedores',
        body: `Novos fornecedores, integrações de marketing, analytics ou parceiros devem passar por revisão de privacidade antes da ativação. Última atualização: ${LEGAL_LAST_UPDATED}.`
      }
    ]
  },
  sobre: {
    title: 'Sobre nós',
    subtitle: 'Conheça o propósito do projeto Nosso Voto e experimente o plano antes de criar uma conta.',
    sections: [
      {
        heading: 'Objetivo do projeto',
        body: 'O nossovoto nasceu para ajudar pessoas a organizar escolhas eleitorais de forma simples, consciente e acessível. A ferramenta não substitui sua pesquisa: ela cria um espaço claro para comparar nomes, montar um plano e revisar a combinação antes da decisão final.'
      },
      {
        heading: 'Como funciona o plano',
        body: 'O fluxo começa pelo estado em que você vota. Depois, você escolhe candidatos para deputado federal e senadores, acompanha o progresso do rascunho e chega a uma revisão com os nomes separados por cargo.'
      },
      {
        heading: 'Escolha de candidatos',
        body: 'A lista pode ser filtrada e pesquisada por nome, partido ou número. O candidato continua visível mesmo quando informações extras estão bloqueadas para visitantes, para que você consiga explorar a lista sem perder contexto.'
      },
      {
        heading: 'Rascunho visitante',
        body: 'No desktop e no tablet, você pode começar sem login. As escolhas ficam como rascunho local do navegador até que você decida entrar na conta para salvar de forma definitiva.'
      },
      {
        heading: 'Continuar pelo celular',
        body: 'Na revisão final, o desktop exibe um QR Code de continuidade. Esse QR Code usa um token temporário, expira em poucos minutos e só pode ser usado uma vez quando gerado pelo servidor. Ele não faz login automático.'
      },
      {
        heading: 'Quando o login é necessário',
        body: 'Login é necessário para salvar o rascunho na sua conta, recuperar escolhas em outro dispositivo e acessar recursos personalizados, como campo de viabilidade, destaque especial e análise individual.'
      },
      {
        heading: 'Canal oficial',
        body: 'O único canal de contato exibido pelo sistema é o email plano.voto@gmail.com.'
      }
    ]
  }
};
