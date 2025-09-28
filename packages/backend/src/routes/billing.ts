import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import logger from '../utils/logger';
import type { ApiResponse, Subscription } from '@gaming-proxy/shared';

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

// Pricing plans
const PRICING_PLANS = {
  trial: {
    name: 'Trial',
    duration: 7,
    price: 0,
    stripePriceId: null,
  },
  monthly: {
    name: 'Mensal',
    duration: 30,
    price: 1999, // R$ 19.99 in cents
    stripePriceId: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
  },
  quarterly: {
    name: 'Trimestral',
    duration: 90,
    price: 5499, // R$ 54.99 in cents (3 months)
    stripePriceId: process.env.STRIPE_QUARTERLY_PRICE_ID || 'price_quarterly',
  },
  annual: {
    name: 'Anual',
    duration: 365,
    price: 19999, // R$ 199.99 in cents (12 months)
    stripePriceId: process.env.STRIPE_ANNUAL_PRICE_ID || 'price_annual',
  },
};

// GET /api/v1/billing/plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.entries(PRICING_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      priceFormatted: plan.price > 0 ? `R$ ${(plan.price / 100).toFixed(2)}` : 'Grátis',
    }));

    const response: ApiResponse = {
      success: true,
      data: plans,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /api/v1/billing/subscription
router.get('/subscription', authenticate, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const response: ApiResponse<Subscription> = {
      success: true,
      data: subscription,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /api/v1/billing/create-checkout-session
router.post('/create-checkout-session', authenticate, async (req: AuthRequest, res) => {
  try {
    const { planId } = req.body;

    if (!planId || !PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected',
      });
    }

    const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];

    if (plan.price === 0) {
      // Handle trial activation directly
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duration);

      const subscription = await prisma.subscription.create({
        data: {
          userId: req.user!.id,
          plan: planId,
          status: 'active',
          stripeId: `trial_${req.user!.id}_${Date.now()}`,
          expiresAt,
        },
      });

      return res.json({
        success: true,
        data: { subscription },
      });
    }

    // Create Stripe customer if doesn't exist
    let stripeCustomerId: string;
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id },
    });

    if (existingSubscription && existingSubscription.stripeId.startsWith('cus_')) {
      stripeCustomerId = existingSubscription.stripeId;
    } else {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        metadata: {
          userId: req.user!.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.app.clientUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.clientUrl}/billing/cancel`,
      metadata: {
        userId: req.user!.id,
        planId,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
    });
  }
});

// POST /api/v1/billing/portal
router.post('/portal', authenticate, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (!subscription || !subscription.stripeId.startsWith('cus_')) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeId,
      return_url: `${config.app.clientUrl}/billing`,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        portalUrl: session.url,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session',
    });
  }
});

// POST /api/v1/billing/cancel
router.post('/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active',
      },
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    // If it's a Stripe subscription, cancel it
    if (subscription.stripeId.startsWith('sub_')) {
      await stripe.subscriptions.update(subscription.stripeId, {
        cancel_at_period_end: true,
      });
    }

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    logger.info(`Subscription cancelled for user: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
    });
  }
});

// POST /api/v1/billing/webhook (Stripe webhooks)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('Checkout session completed:', session.id);

  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    logger.error('Missing metadata in checkout session');
    return;
  }

  const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
  if (!plan) {
    logger.error('Invalid plan ID in checkout session');
    return;
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.duration);

  // Create or update subscription
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: planId,
      status: 'active',
      stripeId: session.subscription as string,
      expiresAt,
    },
    create: {
      userId,
      plan: planId,
      status: 'active',
      stripeId: session.subscription as string,
      expiresAt,
    },
  });

  logger.info(`Subscription activated for user: ${userId}, plan: ${planId}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  logger.info('Subscription created:', subscription.id);
  // Additional logic if needed
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info('Subscription updated:', subscription.id);

  const localSubscription = await prisma.subscription.findFirst({
    where: { stripeId: subscription.id },
  });

  if (localSubscription) {
    await prisma.subscription.update({
      where: { id: localSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'active' : 'inactive',
      },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Subscription deleted:', subscription.id);

  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: { status: 'cancelled' },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('Payment succeeded:', invoice.id);

  if (invoice.subscription) {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeId: invoice.subscription as string },
    });

    if (subscription) {
      // Extend subscription period
      const plan = PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS];
      if (plan) {
        const newExpiresAt = new Date(subscription.expiresAt);
        newExpiresAt.setDate(newExpiresAt.getDate() + plan.duration);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            expiresAt: newExpiresAt,
          },
        });

        logger.info(`Subscription renewed for user: ${subscription.userId}`);
      }
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  logger.warn('Payment failed:', invoice.id);

  if (invoice.subscription) {
    await prisma.subscription.updateMany({
      where: { stripeId: invoice.subscription as string },
      data: { status: 'past_due' },
    });
  }
}

export default router;