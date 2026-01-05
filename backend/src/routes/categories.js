const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

router.get('/', async (req, res) => {
  const parentId = req.query.parentId ? String(req.query.parentId) : null;

  const items = await prisma.category.findMany({
    where: {
      parentId,
      isActive: true,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(items);
});

router.post(
  '/',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120),
        imageUrl: z.string().url().nullable().optional(),
        parentId: z.string().uuid().nullable().optional(),
        order: z.number().int().optional().default(0),
        isActive: z.boolean().optional().default(true),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { name, imageUrl, parentId, order, isActive } = req.validated.body;

    const item = await prisma.category.create({
      data: {
        name,
        imageUrl: imageUrl ?? null,
        parentId: parentId ?? null,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    res.json(item);
  },
);

router.put(
  '/:id',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        imageUrl: z.string().url().nullable().optional(),
        order: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const data = req.validated.body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
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

    const children = await prisma.category.count({ where: { parentId: id } });
    if (children > 0) return res.status(400).json({ error: 'Category has subcategories' });

    const prods1 = await prisma.product.count({ where: { categoryId: id } });
    const prods2 = await prisma.product.count({ where: { subCategoryId: id } });
    if (prods1 + prods2 > 0) return res.status(400).json({ error: 'Category has products' });

    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  },
);

module.exports = router;
