const { prisma } = require('../lib/prisma');
const crypto = require('crypto');

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

function sigFor(product) {
  const seed = `${product.id || ''}:${product.name || ''}`;
  const hex = crypto.createHash('md5').update(seed).digest('hex').slice(0, 8);
  return parseInt(hex, 16) % 1000;
}

function unsplashSource(tags, sig) {
  const safeTags = (tags || []).filter(Boolean).slice(0, 6).map((t) => encodeURIComponent(String(t).trim().toLowerCase()));
  const q = safeTags.join(',') || 'food';
  return `https://source.unsplash.com/featured/900x600/?${q}&sig=${sig}`;
}

function pickImage(product) {
  const name = `${product.name || ''}`.toLowerCase();

  const tags = ['food'];

  if (name.includes('prawns') || name.includes('shrimp')) tags.push('prawns', 'shrimp', 'seafood');
  else if (name.includes('salmon')) tags.push('salmon', 'fish', 'seafood');
  else if (name.includes('fish') || name.includes('tilapia') || name.includes('sea')) tags.push('fish', 'seafood');

  else if (name.includes('beef') || name.includes('steak') || name.includes('mince') || name.includes('ground')) tags.push('beef', 'meat');
  else if (name.includes('lamb')) tags.push('lamb', 'meat');
  else if (name.includes('chicken')) tags.push('chicken', 'poultry');

  else if (name.includes('rice') || name.includes('basmati')) tags.push('rice');
  else if (name.includes('oil') || name.includes('ghee') || name.includes('sunflower')) tags.push('cooking', 'oil');
  else if (name.includes('cumin') || name.includes('spice') || name.includes('masala')) tags.push('spices');
  else if (name.includes('detergent') || name.includes('laundry') || name.includes('clean')) tags.push('laundry', 'detergent');
  else if (name.includes('nuts') || name.includes('almond') || name.includes('pistach')) tags.push('nuts');

  else if (name.includes('diaper')) tags.push('baby', 'diapers');
  else if (name.includes('wipe')) tags.push('baby', 'wipes');
  else if (name.includes('formula')) tags.push('baby', 'formula');

  const sig = sigFor(product);
  return unsplashSource(tags, sig);
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true },
  });

  const freq = new Map();
  for (const p of products) {
    const k = p.imageUrl || '';
    freq.set(k, (freq.get(k) || 0) + 1);
  }

  const mostCommon = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostCommonUrl = mostCommon ? mostCommon[0] : '';
  const mostCommonCount = mostCommon ? mostCommon[1] : 0;

  let updated = 0;

  for (const p of products) {
    const nextUrl = pickImage(p);
    const shouldUpdate = true;

    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: nextUrl },
    });
    updated++;
  }

  console.log(
    `Re-imaged ${updated} products. (mostCommonCount=${mostCommonCount}, mostCommonUrl=${mostCommonUrl || 'N/A'})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
