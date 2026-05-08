# 🗳️ Plano 

![Status](https://img.shields.io/badge/Status-MVP%20Finalizado-success)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-ffca28?style=flat&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)

> **Plano** é um Progressive Web App (PWA), permitindo que cidadãos criem, organizem e compartilhem suas estratégias de voto de forma simples e visual.

---

## 📱 Sobre o Projeto

Este projeto é um **MVP (Produto Mínimo Viável)** criado para validar o conceito de uma **carteira digital de voto**, onde o usuário pode estruturar sua estratégia eleitoral com base no seu estado e em candidatos previamente cadastrados.

O desenvolvimento priorizou:
- Performance (**Mobile First**)
- Segurança (**Autenticação Google**)
- Escalabilidade (**Firebase / NoSQL**)

---

## ✨ Funcionalidades

- 🔐 Login social com Google (Firebase Auth)
- ⚡ Banco de dados em tempo real (Cloud Firestore)
- 🔍 Busca com autocomplete (500+ políticos e influenciadores)
- 📍 Segmentação por estado (UF)
- 💬 Compartilhamento do plano via WhatsApp
- 👤 Edição de perfil (foto, nome e Instagram)
- 📱 Suporte completo a PWA

---

## 🛠️ Tecnologias

- **Frontend:** React.js  
- **Build Tool:** Vite  
- **Backend:** Firebase  
  - Authentication  
  - Cloud Firestore  
- **Roteamento:** React Router Dom  
- **Estilização:** CSS global organizado por componente e página  

---

## 📸 Screenshots

| Login | Estado | Estratégia | Meu Plano |
|:--:|:--:|:--:|:--:|
| <img width="360" height="739" alt="Captura de tela 2026-01-19 155519" src="https://github.com/user-attachments/assets/46a17822-5895-4d22-a10c-82883caa6281" /> | <img width="361" height="738" alt="Captura de tela 2026-01-19 155536" src="https://github.com/user-attachments/assets/5b992ca7-9d23-4294-8c4c-7e2e817115fc" />| <img width="360" height="742" alt="Captura de tela 2026-01-19 155558" src="https://github.com/user-attachments/assets/e58a925e-7988-457a-8d69-c497c59d33b8" /> |<img width="361" height="740" alt="Captura de tela 2026-01-19 155652" src="https://github.com/user-attachments/assets/819f5aaa-ecb0-4fd9-b6b3-811ac7218538" />




---

## 📂 Estrutura do Projeto

```bash
src/
├── app/
│   └── App.jsx
├── components/
│   ├── feedback/
│   ├── icons/
│   ├── layout/
│   ├── navigation/
│   ├── privacy/
│   ├── selection/
│   └── share/
├── constants/
├── contexts/
├── hooks/
├── pages/
├── providers/
├── services/
│   ├── candidates/
│   ├── firebase/
│   ├── pwa/
│   ├── share/
│   └── voting/
├── styles/
├── utils/
└── main.jsx
```

## 🚀 Como Executar

Pré-requisito: Node.js v20.19+

👨‍💻 Autor
Alexandre Hackbardt Bolsoni
🎓 Tecnologia em Sistemas para Internet — IFES

GitHub: https://github.com/AlexandreBolsoni

LinkedIn: https://www.linkedin.com/in/alexandre-hackbardt-bolsoni/

Email: plano.voto@gmail.com

© 2026 Alexandre Hackbardt Bolsoni. Todos os direitos reservados.
