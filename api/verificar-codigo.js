// api/verificar-codigo.js
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { codigo, userId } = req.body;

  if (!codigo || !userId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const docRef = db.collection('verificacoes_pendentes').doc(codigo);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Código inválido ou expirado.' });
    }

    const data = docSnap.data();

    if (data.usado) {
      return res.status(400).json({ success: false, message: 'Este código já foi usado.' });
    }

    // Atualiza o perfil do usuário
    await db.collection('users').doc(userId).update({
      instagram_id: data.instagram_id,
      instagram_verified: true,
      verified_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Invalida o código
    await docRef.update({ usado: true });

    return res.status(200).json({ success: true, message: 'Conta verificada!' });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro interno.' });
  }
}