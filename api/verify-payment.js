import Stripe from 'stripe';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔥 TEU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAK0g8KJ9j9xe4_ym20TtuzotzLLG4w7Vg",
  authDomain: "pixel-paint-pro.firebaseapp.com",
  projectId: "pixel-paint-pro",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID missing' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {

      const type = session.metadata?.type;
      const userId = session.metadata?.userId;

      if (!userId) {
        return res.status(400).json({ error: "User ID missing" });
      }

      const userRef = doc(db, "users", userId);

      if (type === "premium") {
        // 👑 ATIVA PREMIUM
        await updateDoc(userRef, {
          isPremium: true
        });
      } else if (type === "10") {
        // 💰 ADICIONA CRÉDITOS
        await updateDoc(userRef, {
          credits: increment(10)
        });
      }

      return res.status(200).json({
        success: true
      });
    }

    return res.status(400).json({
      success: false
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao validar pagamento' });
  }
}