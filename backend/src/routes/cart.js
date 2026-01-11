const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  selectedOptions: z.record(z.string()).optional().default({}),
  extraInstructions: z.string().nullable().optional(),
});

router.use(requireAuth());

router.get('/', async (req, res) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart) return res.json({ items: [], updatedAt: null });

  res.json({
    updatedAt: cart.updatedAt,
    items: cart.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productSnapshot: {
        id: it.product.id,
        name: it.product.name,
        description: it.product.description,
        imageUrl: it.product.imageUrl,
        basePrice: String(it.product.basePrice),
        categoryId: it.product.categoryId,
        subCategoryId: it.product.subCategoryId,
        isAvailable: it.product.isAvailable,
        createdAt: it.product.createdAt,
      },
      selectedOptions: it.selectedOptions,
      quantity: it.quantity,
      extraInstructions: it.extraInstructions,
    })),
  });
});

router.put(
  '/',
  validate(
    z.object({
      body: z.object({
        items: z.array(cartItemSchema).default([]),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { items } = req.validated.body;

    const productIds = [...new Set(items.map((it) => it.productId))];
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
      if (products.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more products not found' });
      }
    }

    const cart = await prisma.$transaction(async (tx) => {
      const upserted = await tx.cart.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id },
        update: {},
      });

      await tx.cartItem.deleteMany({ where: { cartId: upserted.id } });

      if (items.length > 0) {
        await tx.cartItem.createMany({
          data: items.map((it) => ({
            cartId: upserted.id,
            productId: it.productId,
            quantity: it.quantity,
            selectedOptions: it.selectedOptions ?? {},
            extraInstructions: it.extraInstructions ?? null,
          })),
        });
      }

      return tx.cart.findUnique({ where: { id: upserted.id }, include: { items: { include: { product: true } } } });
    });

    res.json({
      updatedAt: cart.updatedAt,
      items: cart.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productSnapshot: {
          id: it.product.id,
          name: it.product.name,
          description: it.product.description,
          imageUrl: it.product.imageUrl,
          basePrice: String(it.product.basePrice),
          categoryId: it.product.categoryId,
          subCategoryId: it.product.subCategoryId,
          isAvailable: it.product.isAvailable,
          createdAt: it.product.createdAt,
        },
        selectedOptions: it.selectedOptions,
        quantity: it.quantity,
        extraInstructions: it.extraInstructions,
      })),
    });
  },
);

router.delete('/', async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: req.user.id } } });
  res.json({ ok: true });
});

module.exports = router;
