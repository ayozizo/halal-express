const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../lib/auth');
const { validate, z } = require('../lib/validation');
const { generateInvoiceNumber, buildInvoicePdf } = require('../lib/invoice');

const router = express.Router();

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  selectedOptions: z.record(z.string()).optional().default({}),
  quantity: z.number().int().min(1),
  extraInstructions: z.string().nullable().optional(),
});

router.get('/', requireAuth(), async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: true,
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get(
  '/:id',
  requireAuth(),
  validate(
    z.object({
      body: z.any(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(order);
  },
);

router.post(
  '/',
  requireAuth(),
  validate(
    z.object({
      body: z.object({
        deliveryAddress: z.string().min(3).max(500),
        deliveryPhone: z.string().min(3).max(50),
        deliveryTime: z.string().min(5),
        deliveryFee: z.number().nonnegative().optional(),
        items: z.array(orderItemSchema).min(1),
        notes: z.string().nullable().optional(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { deliveryAddress, deliveryPhone, deliveryTime, deliveryFee, items } = req.validated.body;

    const productIds = [...new Set(items.map((it) => it.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const prodById = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = items.map((it) => {
      const p = prodById.get(it.productId);
      const unit = Number(p.basePrice);
      subtotal += unit * it.quantity;

      return {
        productId: p.id,
        productSnapshot: {
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          basePrice: String(p.basePrice),
        },
        selectedOptions: it.selectedOptions ?? {},
        quantity: it.quantity,
        price: unit.toFixed(2),
        extraInstructions: it.extraInstructions ?? null,
      };
    });

    const fee = typeof deliveryFee === 'number' ? deliveryFee : Number(process.env.DEFAULT_DELIVERY_FEE || 10);
    const total = subtotal + fee;

    const dt = new Date(deliveryTime);
    if (Number.isNaN(dt.getTime())) {
      return res.status(400).json({ error: 'Invalid deliveryTime' });
    }

    const invoiceNumber = generateInvoiceNumber();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          subtotal: subtotal.toFixed(2),
          deliveryFee: fee.toFixed(2),
          total: total.toFixed(2),
          deliveryAddress,
          deliveryPhone,
          deliveryTime: dt,
          status: 'pending',
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          number: invoiceNumber,
          currency: 'SAR',
        },
      });

      return { order, invoice };
    });

    res.json({ ...created.order, invoice: created.invoice });
  },
);

router.get(
  '/:id/invoice.pdf',
  requireAuth(),
  validate(
    z.object({
      body: z.any(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true, user: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${order.invoice.number}.pdf`);

    const doc = buildInvoicePdf({ invoice: order.invoice, order, user: order.user });
    doc.pipe(res);
  },
);

module.exports = router;
