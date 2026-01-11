const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

router.use(requireAuth());

router.get('/device-tokens/my', async (req, res) => {
  const list = await prisma.deviceToken.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json(list);
});

router.post(
  '/device-tokens/register',
  validate(
    z.object({
      body: z.object({
        token: z.string().min(10),
        platform: z.enum(['android', 'ios', 'web', 'unknown']).default('unknown'),
        deviceId: z.string().min(1).max(120).optional(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { token, platform, deviceId } = req.validated.body;

    const upserted = await prisma.deviceToken.upsert({
      where: { token },
      create: {
        userId: req.user.id,
        token,
        platform,
        deviceId: deviceId ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId: req.user.id,
        platform,
        deviceId: deviceId ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    res.json(upserted);
  },
);

router.post(
  '/device-tokens/deactivate',
  validate(
    z.object({
      body: z.object({
        token: z.string().min(10),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { token } = req.validated.body;

    const updated = await prisma.deviceToken.updateMany({
      where: { token, userId: req.user.id },
      data: { isActive: false },
    });

    res.json({ ok: true, count: updated.count });
  },
);

router.get('/admin/device-tokens', requireAdmin(), async (req, res) => {
  const list = await prisma.deviceToken.findMany({
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.json(list);
});

module.exports = router;
