const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

router.use(requireAuth());
router.use(requireAdmin());

router.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, isAdmin: true, name: true, createdAt: true },
  });
  res.json(user);
});

router.get('/categories', async (req, res) => {
  const parentId = req.query.parentId ? String(req.query.parentId) : null;
  const items = await prisma.category.findMany({
    where: { parentId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(items);
});

router.get('/products', async (req, res) => {
  const subCategoryId = req.query.subCategoryId ? String(req.query.subCategoryId) : null;
  if (!subCategoryId) return res.json([]);

  const products = await prisma.product.findMany({
    where: { subCategoryId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

router.get('/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      user: { select: { id: true, email: true, name: true, phone: true, address: true, isAdmin: true, createdAt: true } },
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, phone: true, address: true, isAdmin: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.get('/invoices', async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        select: {
          id: true,
          userId: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });
  res.json(invoices);
});

router.put(
  '/orders/:id/status',
  validate(
    z.object({
      body: z.object({
        status: z.enum(['pending', 'inProgress', 'delivered', 'cancelled']),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const { status } = req.validated.body;

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, user: true, invoice: true },
    });

    res.json(updated);
  },
);

module.exports = router;
