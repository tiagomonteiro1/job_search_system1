import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não configurado");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

/**
 * Cria uma sessão de checkout do Stripe para assinatura
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  userName,
  priceId,
  planName,
  origin,
}: {
  userId: number;
  userEmail: string;
  userName: string;
  priceId: string;
  planName: string;
  origin: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName,
      plan_name: planName,
    },
    success_url: `${origin}/dashboard?payment=success`,
    cancel_url: `${origin}/dashboard?payment=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        user_id: userId.toString(),
        plan_name: planName,
      },
    },
  });

  return session;
}

/**
 * Cria ou atualiza um cliente no Stripe
 */
export async function createOrUpdateCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name: string;
  userId: number;
}) {
  // Buscar cliente existente por email
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    // Atualizar cliente existente
    const customer = await stripe.customers.update(existingCustomers.data[0].id, {
      name,
      metadata: {
        user_id: userId.toString(),
      },
    });
    return customer;
  }

  // Criar novo cliente
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId.toString(),
    },
  });

  return customer;
}

/**
 * Cancela uma assinatura no Stripe
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

/**
 * Busca informações de uma assinatura
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Lista todas as assinaturas de um cliente
 */
export async function listCustomerSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  return subscriptions.data;
}
