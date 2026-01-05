const { prisma } = require('../lib/prisma');

function isPlaceholder(url) {
  if (!url) return true;
  const u = String(url).toLowerCase();
  return u.includes('picsum.photos') || u.includes('via.placeholder.com') || u.includes('placehold') || u.includes('dummyimage');
}

const IMG = {
  beef: 'https://images.unsplash.com/photo-1604909052743-94e546612f6c?auto=format&fit=crop&w=900&q=60',
  lamb: 'https://images.unsplash.com/photo-1603048297172-c92544798d84?auto=format&fit=crop&w=900&q=60',
  chicken: 'https://images.unsplash.com/photo-1604908176997-125f25cc500f?auto=format&fit=crop&w=900&q=60',
  fish: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  salmon: 'https://images.unsplash.com/photo-1617196034796-73c924b58750?auto=format&fit=crop&w=900&q=60',
  prawns: 'https://images.unsplash.com/photo-1604909052610-75af2f06d9a4?auto=format&fit=crop&w=900&q=60',
  rice: 'https://images.unsplash.com/photo-1604909053195-27733b2012f4?auto=format&fit=crop&w=900&q=60',
  oil: 'https://images.unsplash.com/photo-1623165425768-9b3a7be3c7ec?auto=format&fit=crop&w=900&q=60',
  spice: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=60',
  detergent: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=60',
  nuts: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=900&q=60',
  diapers: 'https://images.unsplash.com/photo-1599447307744-6b7864b1f1ff?auto=format&fit=crop&w=900&q=60',
  wipes: 'https://images.unsplash.com/photo-1582719478185-2f2c87a66d9b?auto=format&fit=crop&w=900&q=60',
  formula: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=900&q=60',
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=60',
};

function pickImage(product) {
  const name = `${product.name || ''}`.toLowerCase();

  if (name.includes('prawns') || name.includes('shrimp')) return IMG.prawns;
  if (name.includes('salmon')) return IMG.salmon;
  if (name.includes('fish') || name.includes('tilapia') || name.includes('sea')) return IMG.fish;

  if (name.includes('beef') || name.includes('steak') || name.includes('mince') || name.includes('ground')) return IMG.beef;
  if (name.includes('lamb')) return IMG.lamb;
  if (name.includes('chicken')) return IMG.chicken;

  if (name.includes('rice') || name.includes('basmati')) return IMG.rice;
  if (name.includes('oil') || name.includes('ghee') || name.includes('sunflower')) return IMG.oil;
  if (name.includes('cumin') || name.includes('spice') || name.includes('masala')) return IMG.spice;
  if (name.includes('detergent') || name.includes('laundry') || name.includes('clean')) return IMG.detergent;
  if (name.includes('nuts') || name.includes('almond') || name.includes('pistach')) return IMG.nuts;

  if (name.includes('diaper')) return IMG.diapers;
  if (name.includes('wipe')) return IMG.wipes;
  if (name.includes('formula')) return IMG.formula;

  return IMG.default;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true },
  });

  let updated = 0;

  for (const p of products) {
    if (!isPlaceholder(p.imageUrl)) continue;

    const nextUrl = pickImage(p);
    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: nextUrl },
    });
    updated++;
  }

  console.log(`Backfilled images for ${updated} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
