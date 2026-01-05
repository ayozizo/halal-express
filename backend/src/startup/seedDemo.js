const { prisma } = require('../lib/prisma');

function shouldSeed() {
  const v = String(process.env.SEED_DEMO_DATA || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function placeholderUrl(text, size) {
  const safe = String(text || 'Item').trim() || 'Item';
  const encoded = encodeURIComponent(safe).replace(/%20/g, '+');
  return `https://via.placeholder.com/${size}?text=${encoded}`;
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

  const resolvedImageUrl = imageUrl || placeholderUrl(name, '900x600');

  if (existing) {
    if (!existing.imageUrl) {
      return prisma.product.update({
        where: { id: existing.id },
        data: {
          imageUrl: resolvedImageUrl,
        },
      });
    }
    return existing;
  }

  return prisma.product.create({
    data: {
      name,
      description,
      imageUrl: resolvedImageUrl,
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

  // Categories aligned with Flutter MockDataService (simplified but larger set)
  const meat = await ensureCategory({
    name: 'Meat',
    imageUrl: placeholderUrl('Meat', '800x500'),
    order: 1,
  });
  const beef = await ensureCategory({
    name: 'Beef',
    parentId: meat.id,
    imageUrl: placeholderUrl('Beef', '800x500'),
    order: 1,
  });
  const lamb = await ensureCategory({
    name: 'Lamb',
    parentId: meat.id,
    imageUrl: placeholderUrl('Lamb', '800x500'),
    order: 2,
  });
  const chicken = await ensureCategory({
    name: 'Chicken',
    parentId: meat.id,
    imageUrl: placeholderUrl('Chicken', '800x500'),
    order: 3,
  });
  const fish = await ensureCategory({
    name: 'Fish',
    parentId: meat.id,
    imageUrl: placeholderUrl('Fish', '800x500'),
    order: 4,
  });

  const babyItems = await ensureCategory({
    name: 'Baby Items',
    imageUrl: placeholderUrl('Baby Items', '800x500'),
    order: 2,
  });
  const babyDiapers = await ensureCategory({
    name: 'Diapers',
    parentId: babyItems.id,
    imageUrl: placeholderUrl('Diapers', '800x500'),
    order: 1,
  });
  const babyWipes = await ensureCategory({
    name: 'Wipes',
    parentId: babyItems.id,
    imageUrl: placeholderUrl('Wipes', '800x500'),
    order: 2,
  });
  const babyFormula = await ensureCategory({
    name: 'Baby Formula',
    parentId: babyItems.id,
    imageUrl: placeholderUrl('Baby Formula', '800x500'),
    order: 3,
  });

  const riceGrains = await ensureCategory({
    name: 'Rice & Grains',
    imageUrl: placeholderUrl('Rice & Grains', '800x500'),
    order: 3,
  });
  const basmati = await ensureCategory({
    name: 'Basmati Rice',
    parentId: riceGrains.id,
    imageUrl: placeholderUrl('Basmati Rice', '800x500'),
    order: 1,
  });

  const oilsGhee = await ensureCategory({
    name: 'Oils & Ghee',
    imageUrl: placeholderUrl('Oils & Ghee', '800x500'),
    order: 5,
  });
  const sunflowerOil = await ensureCategory({
    name: 'Sunflower Oil',
    parentId: oilsGhee.id,
    imageUrl: placeholderUrl('Sunflower Oil', '800x500'),
    order: 1,
  });

  const spicesHerbs = await ensureCategory({
    name: 'Spices & Herbs',
    imageUrl: placeholderUrl('Spices & Herbs', '800x500'),
    order: 6,
  });
  const cumin = await ensureCategory({
    name: 'Cumin',
    parentId: spicesHerbs.id,
    imageUrl: placeholderUrl('Cumin', '800x500'),
    order: 1,
  });

  const household = await ensureCategory({
    name: 'Household Essentials',
    imageUrl: placeholderUrl('Household', '800x500'),
    order: 8,
  });
  const detergents = await ensureCategory({
    name: 'Detergents',
    parentId: household.id,
    imageUrl: placeholderUrl('Detergents', '800x500'),
    order: 1,
  });

  const snacksDry = await ensureCategory({
    name: 'Snacks & Dry Foods',
    imageUrl: placeholderUrl('Snacks', '800x500'),
    order: 9,
  });
  const nuts = await ensureCategory({
    name: 'Nuts',
    parentId: snacksDry.id,
    imageUrl: placeholderUrl('Nuts', '800x500'),
    order: 1,
  });

  await ensureProduct({
    name: 'Beef Steak',
    description: 'Halal beef steak, perfect for grill or pan sear.',
    imageUrl: placeholderUrl('Beef Steak', '600x400'),
    basePrice: '19.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Sliced thin (for steak / stir fry)', 'Strips (for stir fry)'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Mince (Ground Beef)',
    description: 'Fresh halal beef mince, ideal for curry, kofta or burgers.',
    imageUrl: placeholderUrl('Beef Mince', '600x400'),
    basePrice: '12.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'fatLevel', label: 'Fat level', values: ['Low fat', 'Medium fat', 'High fat'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Stew Pieces (Cubes)',
    description: 'Halal beef cubes, ideal for stew or curry.',
    imageUrl: placeholderUrl('Beef Stew Pieces', '600x400'),
    basePrice: '16.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Medium pieces', 'Small pieces', 'Cubes (for stew / curry)'] },
    ],
  });

  await ensureProduct({
    name: 'Lamb Chops',
    description: 'Tender halal lamb chops, great for BBQ or grill.',
    imageUrl: placeholderUrl('Lamb Chops', '600x400'),
    basePrice: '17.49',
    categoryId: meat.id,
    subCategoryId: lamb.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg'], isRequired: true },
      { type: 'bones', label: 'Bones', values: ['With bone', 'Boneless'] },
    ],
  });

  await ensureProduct({
    name: 'Whole Chicken',
    description: 'Whole halal chicken, cleaned and ready to cook.',
    imageUrl: placeholderUrl('Whole Chicken', '600x400'),
    basePrice: '9.99',
    categoryId: meat.id,
    subCategoryId: chicken.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole', 'Medium pieces', 'Small pieces'] },
      { type: 'skin', label: 'Skin', values: ['With skin', 'Skin removed'] },
    ],
  });

  await ensureProduct({
    name: 'Chicken Breast',
    description: 'Boneless chicken breast for grills, curry or stir fry.',
    imageUrl: placeholderUrl('Chicken Breast', '600x400'),
    basePrice: '11.49',
    categoryId: meat.id,
    subCategoryId: chicken.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole', 'Sliced', 'Cubes'] },
      { type: 'skin', label: 'Skin', values: ['With skin', 'Skin removed'] },
    ],
  });

  await ensureProduct({
    name: 'Salmon Fillet',
    description: 'Fresh salmon fillet, perfect for oven or pan.',
    imageUrl: placeholderUrl('Salmon Fillet', '600x400'),
    basePrice: '21.99',
    categoryId: meat.id,
    subCategoryId: fish.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg'], isRequired: true },
      { type: 'preparation', label: 'Preparation', values: ['Whole, not cleaned', 'Cleaned', 'Fillet', 'Steaks'] },
      { type: 'bones', label: 'Bones', values: ['With bones', 'Boneless'] },
    ],
  });

  await ensureProduct({
    name: 'Baby Diapers Size 3',
    description: 'Soft baby diapers, size 3 (4–9kg).',
    imageUrl: placeholderUrl('Baby Diapers', '600x400'),
    basePrice: '13.99',
    categoryId: babyItems.id,
    subCategoryId: babyDiapers.id,
    options: [],
  });

  await ensureProduct({
    name: 'Baby Wipes 72pcs',
    description: 'Gentle baby wipes, 72 pieces pack.',
    imageUrl: placeholderUrl('Baby Wipes', '600x400'),
    basePrice: '4.99',
    categoryId: babyItems.id,
    subCategoryId: babyWipes.id,
    options: [],
  });

  await ensureProduct({
    name: 'Baby Formula 800g',
    description: 'Infant baby formula, 800g tin.',
    imageUrl: placeholderUrl('Baby Formula', '600x400'),
    basePrice: '18.49',
    categoryId: babyItems.id,
    subCategoryId: babyFormula.id,
    options: [],
  });

  await ensureProduct({
    name: 'Basmati Rice 5kg',
    description: 'Long grain basmati rice, 5kg bag.',
    imageUrl: placeholderUrl('Basmati Rice 5kg', '600x400'),
    basePrice: '14.50',
    categoryId: riceGrains.id,
    subCategoryId: basmati.id,
    options: [],
  });

  await ensureProduct({
    name: 'Sunflower Oil 2L',
    description: 'Pure sunflower cooking oil, 2L bottle.',
    imageUrl: placeholderUrl('Sunflower Oil 2L', '600x400'),
    basePrice: '7.99',
    categoryId: oilsGhee.id,
    subCategoryId: sunflowerOil.id,
    options: [],
  });

  await ensureProduct({
    name: 'Cumin Powder 250g',
    description: 'Ground cumin spice, 250g pack.',
    imageUrl: placeholderUrl('Cumin Powder 250g', '600x400'),
    basePrice: '3.50',
    categoryId: spicesHerbs.id,
    subCategoryId: cumin.id,
    options: [],
  });

  await ensureProduct({
    name: 'Laundry Detergent',
    description: 'Household laundry detergent, 2kg.',
    imageUrl: placeholderUrl('Laundry Detergent', '600x400'),
    basePrice: '6.99',
    categoryId: household.id,
    subCategoryId: detergents.id,
    options: [],
  });

  await ensureProduct({
    name: 'Mixed Nuts 500g',
    description: 'Roasted mixed nuts, 500g pack.',
    imageUrl: placeholderUrl('Mixed Nuts 500g', '600x400'),
    basePrice: '5.99',
    categoryId: snacksDry.id,
    subCategoryId: nuts.id,
    options: [],
  });

  // Backfill images for any existing products without imageUrl
  const missing = await prisma.product.findMany({
    where: { imageUrl: null },
    select: { id: true, name: true },
  });

  for (const p of missing) {
    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: placeholderUrl(p.name, '600x400') },
    });
  }
}

module.exports = { seedDemoData };
