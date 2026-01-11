const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

router.use(requireAuth());

const addressBody = z.object({
  label: z.string().min(1).max(60).nullable().optional(),
  line1: z.string().min(3).max(180),
  line2: z.string().min(0).max(180).nullable().optional(),
  city: z.string().min(0).max(80).nullable().optional(),
  area: z.string().min(0).max(80).nullable().optional(),
  postcode: z.string().min(2).max(30),
  country: z.string().min(2).max(2).optional().default('SA'),
  phone: z.string().min(0).max(50).nullable().optional(),
  instructions: z.string().min(0).max(500).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
});

router.get('/', async (req, res) => {
  const list = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(list);
});

router.post(
  '/',
  validate(
    z.object({
      body: addressBody,
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const d = req.validated.body;

    const created = await prisma.$transaction(async (tx) => {
      if (d.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id, isDefault: true }, data: { isDefault: false } });
      }

      return tx.address.create({
        data: {
          userId: req.user.id,
          label: d.label ?? null,
          line1: d.line1,
          line2: d.line2 ?? null,
          city: d.city ?? null,
          area: d.area ?? null,
          postcode: d.postcode,
          country: d.country ?? 'SA',
          phone: d.phone ?? null,
          instructions: d.instructions ?? null,
          isDefault: d.isDefault ?? false,
        },
      });
    });

    res.json(created);
  },
);

router.put(
  '/:id',
  validate(
    z.object({
      body: addressBody.partial(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const d = req.validated.body;

    const exists = await prisma.address.findUnique({ where: { id } });
    if (!exists || exists.userId !== req.user.id) return res.status(404).json({ error: 'Address not found' });

    const updated = await prisma.$transaction(async (tx) => {
      if (d.isDefault === true) {
        await tx.address.updateMany({ where: { userId: req.user.id, isDefault: true }, data: { isDefault: false } });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(d.label !== undefined ? { label: d.label } : {}),
          ...(d.line1 !== undefined ? { line1: d.line1 } : {}),
          ...(d.line2 !== undefined ? { line2: d.line2 } : {}),
          ...(d.city !== undefined ? { city: d.city } : {}),
          ...(d.area !== undefined ? { area: d.area } : {}),
          ...(d.postcode !== undefined ? { postcode: d.postcode } : {}),
          ...(d.country !== undefined ? { country: d.country } : {}),
          ...(d.phone !== undefined ? { phone: d.phone } : {}),
          ...(d.instructions !== undefined ? { instructions: d.instructions } : {}),
          ...(d.isDefault !== undefined ? { isDefault: d.isDefault } : {}),
        },
      });
    });

    res.json(updated);
  },
);

router.post(
  '/:id/default',
  validate(
    z.object({
      body: z.any(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;

    const exists = await prisma.address.findUnique({ where: { id } });
    if (!exists || exists.userId !== req.user.id) return res.status(404).json({ error: 'Address not found' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId: req.user.id, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });

    res.json(updated);
  },
);

router.delete(
  '/:id',
  validate(
    z.object({
      body: z.any(),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;

    const exists = await prisma.address.findUnique({ where: { id } });
    if (!exists || exists.userId !== req.user.id) return res.status(404).json({ error: 'Address not found' });

    await prisma.address.delete({ where: { id } });
    res.json({ ok: true });
  },
);

module.exports = router;
