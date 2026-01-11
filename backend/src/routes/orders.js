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
      payments: true,
      statusLogs: true,
      courier: true,
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
      include: { items: true, invoice: true, payments: true, statusLogs: true, courier: true },
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
        // Backward compatible fields
        deliveryAddress: z.string().min(3).max(500).optional(),
        deliveryPhone: z.string().min(3).max(50).optional(),
        deliveryTime: z.string().min(5),
        deliveryFee: z.number().nonnegative().optional(),
        items: z.array(orderItemSchema).optional(),
        notes: z.string().nullable().optional(),

        // New delivery fields
        addressId: z.string().uuid().optional(),
        postcode: z.string().min(2).max(30).optional(),
        area: z.string().min(0).max(80).nullable().optional(),
        instructions: z.string().min(0).max(500).nullable().optional(),

        // Payment
        paymentMethod: z.enum(['cod', 'stripe']).optional().default('cod'),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const {
      deliveryAddress,
      deliveryPhone,
      deliveryTime,
      deliveryFee,
      items,
      notes,
      addressId,
      postcode,
      area,
      instructions,
      paymentMethod,
    } = req.validated.body;

    const dt = new Date(deliveryTime);
    if (Number.isNaN(dt.getTime())) {
      return res.status(400).json({ error: 'Invalid deliveryTime' });
    }

    // Resolve delivery address from saved address (preferred)
    let resolvedAddress = deliveryAddress;
    let resolvedPhone = deliveryPhone;
    let resolvedPostcode = postcode;
    let resolvedArea = area ?? null;
    let resolvedInstructions = instructions ?? notes ?? null;

    if (addressId) {
      const addr = await prisma.address.findUnique({ where: { id: addressId } });
      if (!addr || addr.userId !== req.user.id) {
        return res.status(400).json({ error: 'Invalid addressId' });
      }

      resolvedAddress = [
        addr.label,
        addr.line1,
        addr.line2,
        addr.area,
        addr.city,
        addr.postcode,
        addr.country,
      ]
        .filter((x) => x && String(x).trim())
        .join(', ');

      resolvedPhone = addr.phone ?? resolvedPhone;
      resolvedPostcode = addr.postcode;
      resolvedArea = addr.area ?? resolvedArea;
      resolvedInstructions = addr.instructions ?? resolvedInstructions;
    }

    if (!resolvedAddress || !resolvedPhone) {
      return res.status(400).json({ error: 'Delivery address and phone are required' });
    }

    // Use items from request or fallback to DB cart
    let effectiveItems = Array.isArray(items) ? items : null;
    if (!effectiveItems || effectiveItems.length === 0) {
      const cart = await prisma.cart.findUnique({
        where: { userId: req.user.id },
        include: { items: true },
      });
      effectiveItems = (cart?.items ?? []).map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        selectedOptions: it.selectedOptions,
        extraInstructions: it.extraInstructions,
      }));
    }

    if (!effectiveItems || effectiveItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const productIds = [...new Set(effectiveItems.map((it) => it.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const prodById = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = effectiveItems.map((it) => {
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
          categoryId: p.categoryId,
          subCategoryId: p.subCategoryId,
          isAvailable: p.isAvailable,
          createdAt: p.createdAt,
        },
        selectedOptions: it.selectedOptions ?? {},
        quantity: it.quantity,
        price: unit.toFixed(2),
        extraInstructions: it.extraInstructions ?? null,
      };
    });

    let zoneFee = null;
    let etaMinutes = null;

    const activeZonesCount = await prisma.deliveryZone.count({ where: { isActive: true } });
    if (activeZonesCount > 0 && !resolvedPostcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }

    if (resolvedPostcode && activeZonesCount > 0) {
      const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
      const normalized = String(resolvedPostcode).trim().toLowerCase();
      const match = zones
        .map((z) => ({ z, prefix: String(z.postcodePrefix || '').trim().toLowerCase() }))
        .filter((x) => x.prefix && normalized.startsWith(x.prefix))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];

      if (!match) {
        return res.status(400).json({ error: 'Delivery not available for this postcode' });
      }

      zoneFee = Number(match.z.fee);
      etaMinutes = match.z.etaMinutes;
    }

    const fee = typeof zoneFee === 'number' ? zoneFee : typeof deliveryFee === 'number' ? deliveryFee : Number(process.env.DEFAULT_DELIVERY_FEE || 10);

    const vatRate = Number(process.env.VAT_RATE || 0);
    const vatAmount = (subtotal + fee) * vatRate;
    const total = subtotal + fee + vatAmount;

    const invoiceNumber = generateInvoiceNumber();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          subtotal: subtotal.toFixed(2),
          deliveryFee: fee.toFixed(2),
          total: total.toFixed(2),
          deliveryAddress: resolvedAddress,
          deliveryPostcode: resolvedPostcode ?? null,
          deliveryArea: resolvedArea ?? null,
          deliveryPhone: resolvedPhone,
          deliveryTime: dt,
          deliveryInstructions: resolvedInstructions,
          estimatedDeliveryMinutes: etaMinutes,
          status: 'pending',
          statusUpdatedAt: new Date(),
          paymentMethod,
          paymentStatus: paymentMethod === 'cod' ? 'pending' : 'unpaid',
          items: {
            create: orderItemsData,
          },
          statusLogs: {
            create: {
              status: 'pending',
              changedByUserId: req.user.id,
            },
          },
        },
        include: { items: true, payments: true, statusLogs: true },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod,
          status: paymentMethod === 'cod' ? 'pending' : 'unpaid',
          amount: String(order.total),
          currency: 'SAR',
          provider: paymentMethod,
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          number: invoiceNumber,
          currency: 'SAR',
          vatRate: vatRate.toFixed(4),
          vatAmount: vatAmount.toFixed(2),
        },
      });

      // Clear cart after successful order
      await tx.cartItem.deleteMany({ where: { cart: { userId: req.user.id } } });

      return { order, invoice };
    });

    const full = await prisma.order.findUnique({
      where: { id: created.order.id },
      include: { items: true, invoice: true, payments: true, statusLogs: true, courier: true },
    });

    res.json(full);
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
