import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    const { type, email, userId } = req.body;

    let lineItem;

    // 💰 PACK 10 CRÉDITOS
    if (type === '10') {
      lineItem = {
        price: 'price_1TLs26RvRf7tubBM42HyRIW4',
        quantity: 1,
      };
    }

    // 👑 PREMIUM
    if (type === 'premium') {
      lineItem = {
        price: 'price_1TLs6pRvRf7tubBMIKoi98Yg',
        quantity: 1,
      };
    }

    if (!lineItem) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'payment',

      // 🔥 ENVIA USER ID + TYPE
      metadata: {
        type: type,
        userId: userId,
      },

      success_url: `${req.headers.origin}?success=true&type=${type}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}`,

      customer_email: email,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar checkout' });
  }
}