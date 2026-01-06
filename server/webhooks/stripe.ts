import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../stripe";
import * as db from "../db";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn("⚠️  STRIPE_WEBHOOK_SECRET não configurado. Webhooks não funcionarão.");
}

/**
 * Handler para webhooks do Stripe
 * Deve ser registrado ANTES do express.json() middleware
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig || !WEBHOOK_SECRET) {
    console.error("Webhook signature ou secret ausente");
    return res.status(400).send("Webhook Error: Missing signature or secret");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("⚠️  Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Processa checkout completado
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Processing checkout.session.completed");

  const userId = session.metadata?.user_id;
  const planName = session.metadata?.plan_name;

  if (!userId) {
    console.error("User ID not found in session metadata");
    return;
  }

  const userIdNum = parseInt(userId);

  // Get customer and subscription info
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log(`[Webhook] User ${userId} completed checkout for ${planName}`);
  console.log(`[Webhook] Customer: ${customerId}, Subscription: ${subscriptionId}`);

  // Find matching plan in database
  const plans = await db.getAllSubscriptionPlans();
  const matchingPlan = plans.find(p => p.name === planName);

  if (!matchingPlan) {
    console.error(`Plan not found: ${planName}`);
    return;
  }

  // Update user with Stripe IDs and subscription
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    console.error("Database not available");
    return;
  }

  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await dbInstance
    .update(users)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionPlanId: matchingPlan.id,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date(),
    })
    .where(eq(users.id, userIdNum));

  console.log(`[Webhook] User ${userId} subscription activated`);
}

/**
 * Processa atualização de assinatura
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing subscription updated");

  const customerId = subscription.customer as string;
  const status = subscription.status;

  // Find user by customer ID
  const dbInstance = await db.getDb();
  if (!dbInstance) return;

  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const userList = await dbInstance
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (userList.length === 0) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const user = userList[0];

  // Map Stripe status to our status
  let subscriptionStatus: "active" | "inactive" | "cancelled" = "inactive";
  if (status === "active" || status === "trialing") {
    subscriptionStatus = "active";
  } else if (status === "canceled" || status === "unpaid") {
    subscriptionStatus = "cancelled";
  }

  await dbInstance
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus,
    })
    .where(eq(users.id, user.id));

  console.log(`[Webhook] User ${user.id} subscription status: ${subscriptionStatus}`);
}

/**
 * Processa cancelamento de assinatura
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing subscription deleted");

  const customerId = subscription.customer as string;

  const dbInstance = await db.getDb();
  if (!dbInstance) return;

  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const userList = await dbInstance
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (userList.length === 0) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const user = userList[0];

  await dbInstance
    .update(users)
    .set({
      subscriptionStatus: "cancelled",
      subscriptionEndDate: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[Webhook] User ${user.id} subscription cancelled`);
}

/**
 * Processa pagamento de fatura bem-sucedido
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Webhook] Processing invoice.paid");

  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string | undefined;

  if (!subscriptionId) {
    console.log("[Webhook] Invoice not related to subscription, skipping");
    return;
  }

  // Ensure subscription is active
  const dbInstance = await db.getDb();
  if (!dbInstance) return;

  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await dbInstance
    .update(users)
    .set({
      subscriptionStatus: "active",
    })
    .where(eq(users.stripeCustomerId, customerId));

  console.log(`[Webhook] Invoice paid for customer ${customerId}`);
}

/**
 * Processa falha no pagamento de fatura
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Webhook] Processing invoice.payment_failed");

  const customerId = invoice.customer as string;

  const dbInstance = await db.getDb();
  if (!dbInstance) return;

  const { users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Mark subscription as inactive due to payment failure
  await dbInstance
    .update(users)
    .set({
      subscriptionStatus: "inactive",
    })
    .where(eq(users.stripeCustomerId, customerId));

  console.log(`[Webhook] Payment failed for customer ${customerId}`);
}
