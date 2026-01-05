const { PrismaClient } = require('@prisma/client');

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  const publicUrl = process.env.DATABASE_PUBLIC_URL;

  if (
    publicUrl &&
    url &&
    (url.includes('.railway.internal') || url.includes('postgres.railway.internal'))
  ) {
    return publicUrl;
  }

  return url;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveDatabaseUrl(),
    },
  },
});

module.exports = { prisma };
