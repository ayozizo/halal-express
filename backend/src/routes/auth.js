const express = require('express');
const { prisma } = require('../lib/prisma');
const { validate, z } = require('../lib/validation');
const { hashPassword, verifyPassword } = require('../lib/password');
const { signToken, requireAuth } = require('../lib/auth');

const router = express.Router();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

router.post(
  '/register',
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).max(120).optional(),
        phone: z.string().min(1).max(50).optional(),
        address: z.string().min(1).max(500).optional(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { email, password, name, phone, address } = req.validated.body;
    const normalized = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        name: name ?? null,
        phone: phone ?? null,
        address: address ?? null,
      },
      select: { id: true, email: true, isAdmin: true, name: true, phone: true, address: true, createdAt: true },
    });

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    res.cookie('token', token, cookieOptions());
    res.json({ ...user, token });
  },
);

router.post(
  '/login',
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { email, password } = req.validated.body;
    const normalized = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    res.cookie('token', token, cookieOptions());

    res.json({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      token,
    });
  },
);

router.post(
  '/reset-password',
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
      }),
      query: z.any(),
      params: z.any(),
    }),
  ),
  async (req, res) => {
    const { email } = req.validated.body;
    const normalized = email.trim().toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (!exists) return res.json({ ok: true });

    return res.json({ ok: true });
  },
);

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, isAdmin: true, name: true, phone: true, address: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
