require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');

const { prisma } = require('./lib/prisma');
const { ensureAdminUser } = require('./startup/ensureAdmin');

const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const addressesRoutes = require('./routes/addresses');
const deliveryRoutes = require('./routes/delivery');
const paymentsRoutes = require('./routes/payments');
const notificationsRoutes = require('./routes/notifications');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
}));

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
  });
  app.use(Sentry.Handlers.requestHandler());
}

const corsOrigin = process.env.CORS_ORIGIN || process.env.APP_BASE_URL || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').filter(Boolean).map((s) => s.trim()),
    credentials: true,
  }),
);

app.use(cookieParser());
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/payments/stripe/webhook')) return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
app.use(morgan('combined'));

app.get('/health', (req, res) => res.json({ ok: true }));

// API
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Admin panel (static)
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Root redirect
app.get('/', (req, res) => res.redirect('/admin'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
// eslint-disable-next-line no-unused-vars
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 8080);

async function start() {
  await prisma.$connect();
  await ensureAdminUser();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on :${port}`);
  });
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
