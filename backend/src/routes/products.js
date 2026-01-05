const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

router.get('/', async (req, res) => {
  const subCategoryId = req.query.subCategoryId ? String(req.query.subCategoryId) : null;
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : null;
  if (!subCategoryId && !categoryId) return res.json([]);

  const products = await prisma.product.findMany({
    where: {
      ...(subCategoryId ? { subCategoryId } : {}),
      ...(categoryId ? { categoryId } : {}),
      isAvailable: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  res.json(products);
});

router.post(
  '/',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(180),
        description: z.string().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        basePrice: z.number().nonnegative(),
        isAvailable: z.boolean().optional().default(true),
        options: z.any().optional().default([]),
        categoryId: z.string().uuid(),
        subCategoryId: z.string().uuid(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { name, description, imageUrl, basePrice, isAvailable, options, categoryId, subCategoryId } = req.validated.body;

    const prod = await prisma.product.create({
      data: {
        name,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        basePrice: basePrice.toFixed(2),
        isAvailable: isAvailable ?? true,
        optionsJson: options ?? [],
        categoryId,
        subCategoryId,
      },
    });

    res.json(prod);
  },
);

router.put(
  '/:id',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(180).optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        basePrice: z.number().nonnegative().optional(),
        isAvailable: z.boolean().optional(),
        options: z.any().optional(),
        categoryId: z.string().uuid().optional(),
        subCategoryId: z.string().uuid().optional(),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const d = req.validated.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.imageUrl !== undefined ? { imageUrl: d.imageUrl } : {}),
        ...(d.basePrice !== undefined ? { basePrice: d.basePrice.toFixed(2) } : {}),
        ...(d.isAvailable !== undefined ? { isAvailable: d.isAvailable } : {}),
        ...(d.options !== undefined ? { optionsJson: d.options } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.subCategoryId !== undefined ? { subCategoryId: d.subCategoryId } : {}),
      },
    });

    res.json(updated);
  },
);

router.delete(
  '/:id',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.any(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;

    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used > 0) return res.status(400).json({ error: 'Product has order history' });

    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  },
);

module.exports = router;
