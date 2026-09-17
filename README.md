# 🗳️ Bom de Voto

![Status](https://img.shields.io/badge/Status-MVP%20Finalizado-success)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-ffca28?style=flat&logo=firebase&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)

> **Bom de Voto** é uma Progressive Web App (PWA) que ajuda você a organizar seus candidatos por cargo, revisar suas escolhas e salvar um rascunho antes da decisão final.

---

## 📱 Sobre o Projeto

O Bom de Voto ajuda o usuário a montar um plano pessoal de escolhas eleitorais com base no estado, nos cargos e nos candidatos disponíveis. A aplicação permite revisar o rascunho antes da decisão final, sem substituir a pesquisa individual do eleitor.

O desenvolvimento priorizou:
- Performance e funcionamento em redes instáveis
- Acessibilidade e experiência mobile-first
- Segurança, autenticação e separação entre dados públicos e pessoais

---

## ✨ Funcionalidades

- 🔐 Login social com Google
- 🔍 Busca e filtros de candidatos por nome, partido e número
- 📍 Segmentação por estado (UF)
- 📝 Rascunho de escolhas por cargo, com revisão antes da decisão final
- 📊 Avaliações, desempenho e indicadores de viabilidade dos candidatos
- 📱 PWA instalável, com experiência adaptada para celular, tablet e desktop
- 🔗 Compartilhamento de seleção por link e QR Code
- 🤝 Importação de uma seleção compartilhada sem misturar as escolhas locais

---

## 🛠️ Tecnologias

- **Frontend:** React 19
- **Build Tool:** Vite
- **Backend:** Supabase, com RPCs, RLS e migrations versionadas
- **Legado e regras:** Firebase Auth, Firestore e Storage permanecem configurados para fluxos específicos
- **Roteamento:** React Router
- **Compartilhamento:** QR Code e Web Share API
- **Estilização:** CSS organizado por feature, componente e layout

---

## 📸 Screenshots

| Login | Estado | Estratégia | Meu Plano |
|:--:|:--:|:--:|:--:|
| <img width="360" height="739" alt="Captura de tela 2026-01-19 155519" src="https://github.com/user-attachments/assets/46a17822-5895-4d22-a10c-82883caa6281" /> | <img width="361" height="738" alt="Captura de tela 2026-01-19 155536" src="https://github.com/user-attachments/assets/5b992ca7-9d23-4294-8c4c-7e2e817115fc" />| <img width="360" height="742" alt="Captura de tela 2026-01-19 155558" src="https://github.com/user-attachments/assets/e58a925e-7988-457a-8d69-c497c59d33b8" /> |<img width="361" height="740" alt="Captura de tela 2026-01-19 155652" src="https://github.com/user-attachments/assets/819f5aaa-ecb0-4fd9-b6b3-811ac7218538" />




---

## 📂 Estrutura do Projeto

```bash
src/
├── app/                         # Rotas, shell e providers
├── features/
│   ├── auth/                    # Login e sessão
│   ├── ballot/                  # Rascunho local e remoto
│   ├── candidate-selection/     # Busca, filtros e seleção
│   ├── plan-summary/            # Revisão do plano
│   ├── sharing/                 # Link, QR Code e seleção compartilhada
│   ├── state-selection/         # Escolha do estado
│   └── privacy/                 # Páginas e controles de privacidade
├── pwa/                         # Instalação e ciclo de vida da PWA
├── shared/                      # UI, hooks, serviços e constantes comuns
└── main.jsx                     # Entrada da aplicação

api/                             # Endpoints serverless
functions/                       # Funções e integrações Firebase
supabase/migrations/             # Schema e políticas versionadas
tests/                           # Testes unitários e de fluxo
```

## 🚀 Como Executar

Os controles de segurança, os segredos do backend e a rotina de auditoria estão documentados em [`docs/security.md`](docs/security.md). O ambiente local, o schema e a estratégia de migração para Supabase estão em [`docs/supabase.md`](docs/supabase.md).

Pré-requisito: Node.js v22.12+

```sh
npm ci
npm run dev
```

O Vite inicia a interface em `http://localhost:5173`. Para desenvolvimento, configure
`PLANO_VOTO_DEV_API_ORIGIN` no `.env.local`. As gravações feitas durante o desenvolvimento
alteram os dados do backend configurado.

Para testar contra produção:

```sh
PLANO_VOTO_DEV_API_ORIGIN=https://bomdevoto.com.br
```

Para usar o Supabase local, tenha o Docker Desktop em execução:

```sh
npm run supabase:start
npm run supabase:status
```

Antes de publicar, execute:

```sh
npm test
npm run lint
npm run build
npm run security:audit
```

Para encerrar o Supabase local:

```sh
npm run supabase:stop
```

👨‍💻 Autor
Alexandre Hackbardt Bolsoni
🎓 Tecnologia em Sistemas para Internet — IFES

GitHub: https://github.com/AlexandreBolsoni

LinkedIn: https://www.linkedin.com/in/alexandre-hackbardt-bolsoni/

Email: contato.bomdevoto@gmail.com

© 2026 Alexandre Hackbardt Bolsoni. Todos os direitos reservados.
