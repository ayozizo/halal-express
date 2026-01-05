const { prisma } = require('../lib/prisma');

function shouldSeed() {
  const v = String(process.env.SEED_DEMO_DATA || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function ensureCategory({ name, parentId = null, imageUrl = null, order = 0 }) {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      ...(parentId ? { parentId } : { parentId: null }),
    },
  });

  if (existing) return existing;

  return prisma.category.create({
    data: {
      name,
      parentId,
      imageUrl,
      order,
      isActive: true,
    },
  });
}

async function ensureProduct({
  name,
  description = null,
  imageUrl = null,
  basePrice,
  categoryId,
  subCategoryId,
  options = [],
}) {
  const existing = await prisma.product.findFirst({
    where: {
      name,
      subCategoryId,
    },
  });

  if (existing) return existing;

  return prisma.product.create({
    data: {
      name,
      description,
      imageUrl,
      basePrice: String(basePrice),
      isAvailable: true,
      optionsJson: options,
      categoryId,
      subCategoryId,
    },
  });
}

async function seedDemoData() {
  if (!shouldSeed()) return;

  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) return;

  const meat = await ensureCategory({
    name: 'Meat',
    imageUrl: 'https://picsum.photos/seed/halal-meat/800/500',
    order: 1,
  });
  const beef = await ensureCategory({
    name: 'Beef',
    parentId: meat.id,
    imageUrl: 'https://picsum.photos/seed/halal-beef/800/500',
    order: 1,
  });
  const lamb = await ensureCategory({
    name: 'Lamb',
    parentId: meat.id,
    imageUrl: 'https://picsum.photos/seed/halal-lamb/800/500',
    order: 2,
  });

  const poultry = await ensureCategory({
    name: 'Poultry',
    imageUrl: 'https://picsum.photos/seed/halal-poultry/800/500',
    order: 2,
  });
  const chicken = await ensureCategory({
    name: 'Chicken',
    parentId: poultry.id,
    imageUrl: 'https://picsum.photos/seed/halal-chicken/800/500',
    order: 1,
  });

  const drinks = await ensureCategory({
    name: 'Drinks',
    imageUrl: 'https://picsum.photos/seed/halal-drinks/800/500',
    order: 3,
  });
  const juices = await ensureCategory({
    name: 'Juices',
    parentId: drinks.id,
    imageUrl: 'https://picsum.photos/seed/halal-juices/800/500',
    order: 1,
  });

  await ensureProduct({
    name: 'Beef Steak',
    description: 'Fresh halal beef steak',
    imageUrl: 'https://picsum.photos/seed/halal-beef-steak/900/600',
    basePrice: '75.00',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { label: 'Cut', type: 'single', values: ['Thin', 'Medium', 'Thick'] },
      { label: 'Weight', type: 'single', values: ['500g', '1kg'] },
    ],
  });

  await ensureProduct({
    name: 'Ground Beef',
    description: 'Lean minced beef',
    imageUrl: 'https://picsum.photos/seed/halal-ground-beef/900/600',
    basePrice: '55.00',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [{ label: 'Fat %', type: 'single', values: ['10%', '15%', '20%'] }],
  });

  await ensureProduct({
    name: 'Lamb Chops',
    description: 'Premium lamb chops',
    imageUrl: 'https://picsum.photos/seed/halal-lamb-chops/900/600',
    basePrice: '89.00',
    categoryId: meat.id,
    subCategoryId: lamb.id,
    options: [{ label: 'Weight', type: 'single', values: ['500g', '1kg'] }],
  });

  await ensureProduct({
    name: 'Whole Chicken',
    description: 'Cleaned whole chicken',
    imageUrl: 'https://picsum.photos/seed/halal-whole-chicken/900/600',
    basePrice: '45.00',
    categoryId: poultry.id,
    subCategoryId: chicken.id,
    options: [{ label: 'Size', type: 'single', values: ['Small', 'Medium', 'Large'] }],
  });

  await ensureProduct({
    name: 'Chicken Fillet',
    description: 'Boneless chicken fillet',
    imageUrl: 'https://picsum.photos/seed/halal-chicken-fillet/900/600',
    basePrice: '52.00',
    categoryId: poultry.id,
    subCategoryId: chicken.id,
    options: [{ label: 'Weight', type: 'single', values: ['500g', '1kg'] }],
  });

  await ensureProduct({
    name: 'Orange Juice',
    description: 'Fresh orange juice',
    imageUrl: 'https://picsum.photos/seed/halal-orange-juice/900/600',
    basePrice: '12.00',
    categoryId: drinks.id,
    subCategoryId: juices.id,
    options: [{ label: 'Size', type: 'single', values: ['250ml', '500ml'] }],
  });

  await ensureProduct({
    name: 'Mango Juice',
    description: 'Chilled mango juice',
    imageUrl: 'https://picsum.photos/seed/halal-mango-juice/900/600',
    basePrice: '14.00',
    categoryId: drinks.id,
    subCategoryId: juices.id,
    options: [{ label: 'Size', type: 'single', values: ['250ml', '500ml'] }],
  });
}

module.exports = { seedDemoData };
