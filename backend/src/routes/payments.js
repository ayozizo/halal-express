const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');
const Stripe = require('stripe');

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is not set' });

    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

    const stripe = getStripe();

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed` });
    }

    const type = event.type;
    const obj = event.data?.object;

    const handleIntent = async (intent) => {
      const orderId = intent?.metadata?.orderId;
      if (!orderId) return;

      const stripeStatus = intent.status;
      let paymentStatus = null;
      if (stripeStatus === 'succeeded') paymentStatus = 'paid';
      if (stripeStatus === 'canceled') paymentStatus = 'failed';
      if (stripeStatus === 'requires_payment_method') paymentStatus = 'failed';

      if (!paymentStatus) return;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { orderId, method: 'stripe' },
          orderBy: { createdAt: 'desc' },
        });

        if (payment) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: paymentStatus,
              provider: 'stripe',
              providerRef: intent.id,
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentMethod: 'stripe',
            paymentStatus,
            paymentIntentId: intent.id,
          },
        });
      });
    };

    try {
      if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed' || type === 'payment_intent.canceled') {
        await handleIntent(obj);
      }

      return res.json({ received: true });
    } catch (e) {
      return res.status(500).json({ error: 'Webhook handler error' });
    }
  },
);

router.use(requireAuth());

router.get('/my', async (req, res) => {
  const list = await prisma.payment.findMany({
    where: { order: { userId: req.user.id } },
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { id: true, status: true, total: true, createdAt: true } } },
  });
  res.json(list);
});

router.get('/stripe/config', async (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return res.status(500).json({ error: 'Stripe not configured' });
  res.json({ publishableKey });
});

router.post(
  '/stripe/intent',
  validate(
    z.object({
      body: z.object({
        orderId: z.string().uuid(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { orderId } = req.validated.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Order is cancelled' });

    // Do not recreate intent if already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) return res.status(500).json({ error: 'Stripe not configured' });

    const stripe = getStripe();
    const amount = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid order amount' });

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'sar',
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        userId: order.userId,
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const payment = order.payments?.[0];
      if (payment && payment.method === 'stripe') {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'pending',
            provider: 'stripe',
            providerRef: intent.id,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: 'stripe',
            status: 'pending',
            amount: String(order.total),
            currency: 'SAR',
            provider: 'stripe',
            providerRef: intent.id,
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'stripe',
          paymentStatus: 'pending',
          paymentIntentId: intent.id,
        },
      });
    });

    res.json({
      orderId: updated.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      publishableKey,
    });
  },
);

router.post(
  '/stripe/confirm',
  validate(
    z.object({
      body: z.object({
        paymentIntentId: z.string().min(6),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { paymentIntentId } = req.validated.body;

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const orderId = intent?.metadata?.orderId;
    if (!orderId) return res.status(400).json({ error: 'Invalid payment intent' });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const stripeStatus = intent.status;
    let status = null;
    if (stripeStatus === 'succeeded') status = 'paid';
    if (stripeStatus === 'canceled') status = 'failed';
    if (stripeStatus === 'requires_payment_method') status = 'failed';

    if (!status) {
      return res.json({
        orderId: order.id,
        paymentIntentId,
        stripeStatus,
        ok: true,
      });
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { orderId: order.id, method: 'stripe' },
        orderBy: { createdAt: 'desc' },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status,
            provider: 'stripe',
            providerRef: paymentIntentId,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'stripe',
          paymentStatus: status,
          paymentIntentId: paymentIntentId,
        },
      });

      return tx.payment.findFirst({
        where: { orderId: order.id, method: 'stripe' },
        orderBy: { createdAt: 'desc' },
      });
    });

    res.json({
      orderId: order.id,
      paymentIntentId,
      stripeStatus,
      paymentStatus: status,
      payment: updatedPayment,
      ok: true,
    });
  },
);

router.post(
  '/cod/confirm',
  validate(
    z.object({
      body: z.object({
        orderId: z.string().uuid(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { orderId } = req.validated.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'cod',
          status: 'pending',
          amount: String(order.total),
          currency: 'SAR',
          provider: 'cod',
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'cod',
          paymentStatus: 'pending',
        },
        include: { items: true, invoice: true },
      });
    });

    res.json(updated);
  },
);

router.post(
  '/admin/:id/refund',
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        amount: z.number().positive().optional(),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const { amount } = req.validated.body;

    const payment = await prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.method !== 'stripe') return res.status(400).json({ error: 'Refunds supported for Stripe payments only' });
    if (!payment.order?.paymentIntentId && !payment.providerRef) return res.status(400).json({ error: 'Missing payment intent reference' });

    const stripe = getStripe();
    const paymentIntentId = payment.order.paymentIntentId || payment.providerRef;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = intent?.charges?.data?.[0]?.id;
    if (!chargeId) return res.status(400).json({ error: 'No charge found to refund' });

    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amount != null ? { amount: Math.round(amount * 100) } : {}),
      metadata: {
        orderId: payment.orderId,
        paymentId: payment.id,
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'refunded',
          provider: 'stripe_refund',
          providerRef: refund.id,
        },
        include: { order: true },
      });

      await tx.order.update({
        where: { id: p.orderId },
        data: { paymentStatus: 'refunded' },
      });

      return p;
    });

    res.json({ ok: true, refundId: refund.id, payment: updated });
  },
);

router.get('/admin', requireAdmin(), async (req, res) => {
  const list = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { order: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });
  res.json(list);
});

router.put(
  '/admin/:id/status',
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        status: z.enum(['unpaid', 'pending', 'paid', 'failed', 'refunded']),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const { status } = req.validated.body;

    const updated = await prisma.payment.update({
      where: { id },
      data: { status },
      include: { order: true },
    });

    // keep order.paymentStatus in sync with most recent payment status
    await prisma.order.update({
      where: { id: updated.orderId },
      data: { paymentStatus: status },
    });

    res.json(updated);
  },
);

module.exports = router;
