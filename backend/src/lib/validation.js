const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      const data = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.validated = data;
      return next();
    } catch (e) {
      return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid request' });
    }
  };
}

module.exports = { z, validate };
