const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { validate, z } = require('../lib/validation');

const router = express.Router();

// Public: list active zones (for client-side validation/display)
router.get('/zones', async (req, res) => {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: [{ postcodePrefix: 'asc' }],
  });
  res.json(zones);
});

// Admin: list all zones
router.get('/zones/admin', requireAuth(), requireAdmin(), async (req, res) => {
  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ isActive: 'desc' }, { postcodePrefix: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(zones);
});

// Admin: manage zones
router.post(
  '/zones',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120),
        postcodePrefix: z.string().min(1).max(30),
        fee: z.number().nonnegative(),
        etaMinutes: z.number().int().min(1).max(24 * 60).optional().default(60),
        isActive: z.boolean().optional().default(true),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const d = req.validated.body;
    const created = await prisma.deliveryZone.create({
      data: {
        name: d.name,
        postcodePrefix: d.postcodePrefix,
        fee: d.fee.toFixed(2),
        etaMinutes: d.etaMinutes,
        isActive: d.isActive,
      },
    });
    res.json(created);
  },
);

router.post(
  '/couriers/:id/location',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const { lat, lng } = req.validated.body;

    const updated = await prisma.courier.update({
      where: { id },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocationAt: new Date(),
      },
    });
    res.json(updated);
  },
);

router.put(
  '/zones/:id',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        postcodePrefix: z.string().min(1).max(30).optional(),
        fee: z.number().nonnegative().optional(),
        etaMinutes: z.number().int().min(1).max(24 * 60).optional(),
        isActive: z.boolean().optional(),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const d = req.validated.body;

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.postcodePrefix !== undefined ? { postcodePrefix: d.postcodePrefix } : {}),
        ...(d.fee !== undefined ? { fee: d.fee.toFixed(2) } : {}),
        ...(d.etaMinutes !== undefined ? { etaMinutes: d.etaMinutes } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });

    res.json(updated);
  },
);

router.delete(
  '/zones/:id',
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
    await prisma.deliveryZone.delete({ where: { id } });
    res.json({ ok: true });
  },
);

// Admin: couriers
router.get('/couriers', requireAuth(), requireAdmin(), async (req, res) => {
  const list = await prisma.courier.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] });
  res.json(list);
});

router.post(
  '/couriers',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120),
        phone: z.string().min(0).max(50).nullable().optional(),
        isActive: z.boolean().optional().default(true),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const d = req.validated.body;
    const created = await prisma.courier.create({
      data: { name: d.name, phone: d.phone ?? null, isActive: d.isActive ?? true },
    });
    res.json(created);
  },
);

router.put(
  '/couriers/:id',
  requireAuth(),
  requireAdmin(),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        phone: z.string().min(0).max(50).nullable().optional(),
        isActive: z.boolean().optional(),
      }),
      query: z.any(),
      params: z.object({ id: z.string().uuid() }),
    }),
  ),
  async (req, res) => {
    const { id } = req.validated.params;
    const d = req.validated.body;

    const updated = await prisma.courier.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.phone !== undefined ? { phone: d.phone } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });

    res.json(updated);
  },
);

router.post(
  '/quote',
  validate(
    z.object({
      body: z.object({
        postcode: z.string().min(2).max(30),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { postcode } = req.validated.body;
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });

    if (zones.length === 0) {
      const fee = Number(process.env.DEFAULT_DELIVERY_FEE || 10);
      const etaMinutes = Number(process.env.DEFAULT_DELIVERY_ETA_MINUTES || 60);
      return res.json({
        zoneId: 'default',
        fee: fee.toFixed(2),
        etaMinutes,
        zoneName: 'Default',
      });
    }

    const normalized = postcode.trim().toLowerCase();
    const match = zones
      .map((z) => ({ z, prefix: String(z.postcodePrefix || '').trim().toLowerCase() }))
      .filter((x) => x.prefix && normalized.startsWith(x.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];

    if (!match) return res.status(400).json({ error: 'Delivery not available for this postcode' });

    res.json({
      zoneId: match.z.id,
      fee: String(match.z.fee),
      etaMinutes: match.z.etaMinutes,
      zoneName: match.z.name,
    });
  },
);

module.exports = router;
