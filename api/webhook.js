// api/webhook.js
import * as admin from 'firebase-admin';
import axios from 'axios';

// Inicializa o Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
  // Em produção, a Vercel usará as Variáveis de Ambiente
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Corrige a formatação da chave privada (quebras de linha)
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  // --- 1. VERIFICAÇÃO DA META (GET) ---
  // O Instagram chama isso quando configuras o webhook pela primeira vez
  if (req.method === 'GET') {
    if (
      req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN
    ) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.status(403).send('Falha na verificação do token');
  }

  // --- 2. RECEBER MENSAGENS (POST) ---
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'instagram' || body.object === 'page') {
      try {
        for (const entry of body.entry) {
          const webhook_event = entry.messaging ? entry.messaging[0] : null;

          if (webhook_event && webhook_event.message && webhook_event.message.text) {
            const senderId = webhook_event.sender.id;
            const text = webhook_event.message.text.trim().toLowerCase();

            console.log(`Mensagem de ${senderId}: ${text}`);

            if (text === '/codigo') {
              // Gerar código
              const codigo = Math.floor(100000 + Math.random() * 900000).toString();

              // Salvar código pendente (Indexado pelo próprio código para busca rápida)
              await db.collection('verificacoes_pendentes').doc(codigo).set({
                instagram_id: senderId,
                codigo: codigo,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                usado: false
              });

              // Responder ao usuário
              await axios.post(
                `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                {
                  recipient: { id: senderId },
                  message: { text: `🔐 Seu código Votelist é: ${codigo}\n\nVolte ao app e insira este número.` }
                }
              );
            }
          }
        }
      } catch (error) {
        console.error('Erro no webhook:', error);
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }
}