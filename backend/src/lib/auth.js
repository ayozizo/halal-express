const jwt = require('jsonwebtoken');

function signToken(payload, opts) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    ...opts,
  });
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.cookies?.token || null;
}

function requireAuth() {
  return (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const secret = process.env.JWT_SECRET;
      if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

function requireAdmin() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = {
  signToken,
  getTokenFromRequest,
  requireAuth,
  requireAdmin,
};
