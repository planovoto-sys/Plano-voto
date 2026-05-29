# Matriz interna de bases legais

Última atualização: 29 de maio de 2026.

Esta matriz é um instrumento interno de governança. As hipóteses abaixo são possibilidades a revisar juridicamente antes de produção.

| Operação | Dados envolvidos | Finalidade | Hipótese legal possível | Dado sensível possível? | Risco | Mitigação | Responsável pela revisão |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login Google | Nome, email, foto, UID | Autenticar usuário | Execução do serviço / consentimento | Não | Identificação indevida | Provedor confiável e minimização | Revisão jurídica |
| Criação de perfil | UID, email, timestamps | Recuperar conta | Execução do serviço | Não | Retenção excessiva | Prazo e exclusão | Revisão jurídica |
| Seleção de estado | UF, progresso | Mostrar candidatos | Execução do serviço | Não isoladamente | Perfil regional | Salvar só o necessário | Revisão jurídica |
| Seleção de candidato | IDs e snapshots de candidatos | Montar rascunho | Execução do serviço / consentimento | Sim | Inferência de opinião política | Minimização e controles locais | Revisão reforçada |
| Salvar rascunho local | Estado e candidatos | Continuidade no navegador | Execução do serviço | Sim | Dispositivo compartilhado | Aviso e apagar local | Revisão reforçada |
| Salvar rascunho remoto | Estado e candidatos vinculados ao UID | Recuperar conta | Execução do serviço / consentimento | Sim | Acesso indevido | Regras de acesso e exclusão | Revisão reforçada |
| Gerar QR Code | Token e rascunho mínimo | Continuar no celular | Execução do serviço | Sim | Terceiro escanear | Token temporário, aviso e expiração | Revisão reforçada |
| Resgatar QR Code | Token, rascunho | Continuar fluxo | Execução do serviço | Sim | Uso indevido | Uso único quando aplicável | Revisão reforçada |
| Compartilhar imagem/texto | Conteúdo escolhido | Ação do usuário | Consentimento / ação inequívoca | Sim | Circulação externa | Aviso antes de compartilhar | Revisão reforçada |
| Analytics opcional | Eventos técnicos | Melhorar serviço | Consentimento / legítimo interesse | Não esperado | Identificação excessiva | Desligado por padrão | Revisão jurídica |
| Marketing opcional | Identificadores opcionais | Campanhas | Consentimento | Não usar escolhas | Publicidade sensível | Nunca usar escolhas individuais | Revisão reforçada |
| Uso comercial agregado | Dados agregados/anonimizados | Estudos estatísticos | Consentimento / legítimo interesse avaliado | Risco indireto | Reidentificação | Agregação, limites e revisão | Revisão reforçada |
| Excluir conta/dados | UID, rascunho, logs | Atender direito | Obrigação legal / exercício de direitos | Sim | Exclusão incompleta | Função segura e confirmação | Revisão jurídica |
| Logs de segurança | IP, eventos, timestamps | Segurança e auditoria | Legítimo interesse / obrigação legal | Não esperado | Retenção excessiva | Prazo limitado | Revisão jurídica |
| Cache offline | Snapshot mínimo | Funcionamento offline | Execução do serviço | Sim | Acesso local indevido | Não salvar perfil, botão apagar | Revisão reforçada |
