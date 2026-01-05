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

function isPlaceholder(url) {
  if (!url) return true;
  const u = String(url).toLowerCase();
  return u.includes('picsum.photos') || u.includes('via.placeholder.com') || u.includes('placehold') || u.includes('dummyimage');
}

const IMG = {
  meat: 'https://images.unsplash.com/photo-1547637205-fde0c9011f9d?auto=format&fit=crop&w=900&q=60',
  beef: 'https://images.unsplash.com/photo-1604909052743-94e546612f6c?auto=format&fit=crop&w=900&q=60',
  lamb: 'https://images.unsplash.com/photo-1603048297172-c92544798d84?auto=format&fit=crop&w=900&q=60',
  chicken: 'https://images.unsplash.com/photo-1604908176997-125f25cc500f?auto=format&fit=crop&w=900&q=60',
  fish: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  salmon: 'https://images.unsplash.com/photo-1617196034796-73c924b58750?auto=format&fit=crop&w=900&q=60',
  prawns: 'https://images.unsplash.com/photo-1604909052610-75af2f06d9a4?auto=format&fit=crop&w=900&q=60',
  rice: 'https://images.unsplash.com/photo-1604909053195-27733b2012f4?auto=format&fit=crop&w=900&q=60',
  oil: 'https://images.unsplash.com/photo-1623165425768-9b3a7be3c7ec?auto=format&fit=crop&w=900&q=60',
  spice: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=60',
  flour: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=60',
  honey: 'https://images.unsplash.com/photo-1471943038886-87c772c31367?auto=format&fit=crop&w=900&q=60',
  tea: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=60',
  canned: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&w=900&q=60',
  snacks: 'https://images.unsplash.com/photo-1604909052936-7b4957332b0e?auto=format&fit=crop&w=900&q=60',
  detergent: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=60',
  nuts: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=900&q=60',
  diapers: 'https://images.unsplash.com/photo-1599447307744-6b7864b1f1ff?auto=format&fit=crop&w=900&q=60',
  wipes: 'https://images.unsplash.com/photo-1582719478185-2f2c87a66d9b?auto=format&fit=crop&w=900&q=60',
  formula: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=900&q=60',
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=60',
};

function pickImageUrl(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('prawns') || n.includes('shrimp')) return IMG.prawns;
  if (n.includes('salmon')) return IMG.salmon;
  if (n.includes('fish') || n.includes('tilapia') || n.includes('sea')) return IMG.fish;
  if (n.includes('beef') || n.includes('steak') || n.includes('mince') || n.includes('ground')) return IMG.beef;
  if (n.includes('lamb')) return IMG.lamb;
  if (n.includes('chicken')) return IMG.chicken;
  if (n.includes('rice') || n.includes('basmati')) return IMG.rice;
  if (n.includes('oil') || n.includes('ghee') || n.includes('sunflower')) return IMG.oil;
  if (n.includes('cumin') || n.includes('spice') || n.includes('masala')) return IMG.spice;
  if (n.includes('detergent') || n.includes('laundry') || n.includes('clean')) return IMG.detergent;
  if (n.includes('nuts') || n.includes('almond') || n.includes('pistach')) return IMG.nuts;
  if (n.includes('diaper')) return IMG.diapers;
  if (n.includes('wipe')) return IMG.wipes;
  if (n.includes('formula')) return IMG.formula;
  return IMG.default;
}

function pickCategoryImageUrl(name) {
  const n = String(name || '').toLowerCase();
  if (n === 'meat') return IMG.meat;
  if (n.includes('beef')) return IMG.beef;
  if (n.includes('lamb')) return IMG.lamb;
  if (n.includes('chicken')) return IMG.chicken;
  if (n.includes('fish')) return IMG.fish;
  if (n.includes('baby')) return IMG.diapers;
  if (n.includes('rice') || n.includes('grains') || n.includes('basmati')) return IMG.rice;
  if (n.includes('sugar') || n.includes('flour') || n.includes('baking')) return IMG.flour;
  if (n.includes('oil') || n.includes('ghee')) return IMG.oil;
  if (n.includes('spice') || n.includes('herb') || n.includes('cumin')) return IMG.spice;
  if (n.includes('honey') || n.includes('natural')) return IMG.honey;
  if (n.includes('household') || n.includes('detergent')) return IMG.detergent;
  if (n.includes('snacks') || n.includes('dry') || n.includes('nuts')) return IMG.snacks;
  if (n.includes('tea') || n.includes('coffee')) return IMG.tea;
  if (n.includes('canned') || n.includes('jar')) return IMG.canned;
  return IMG.default;
}

async function ensureCategory({ name, parentId = null, imageUrl = null, order = 0 }) {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      ...(parentId ? { parentId } : { parentId: null }),
    },
  });

  const resolvedImageUrl =
    !imageUrl || isPlaceholder(imageUrl)
      ? pickCategoryImageUrl(name) || imageUrl || placeholderUrl(name, '900x600')
      : imageUrl;

  if (existing) {
    const needsUpdate =
      existing.parentId !== parentId ||
      existing.order !== order ||
      !existing.imageUrl ||
      isPlaceholder(existing.imageUrl);

    if (!needsUpdate) return existing;

    return prisma.category.update({
      where: { id: existing.id },
      data: {
        parentId,
        imageUrl: resolvedImageUrl,
        order,
        isActive: true,
      },
    });
  }

  return prisma.category.create({
    data: {
      name,
      parentId,
      imageUrl: resolvedImageUrl,
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

  const resolvedImageUrl =
    !imageUrl || isPlaceholder(imageUrl)
      ? pickImageUrl(name) || imageUrl || placeholderUrl(name, '900x600')
      : imageUrl;
  const basePriceStr = String(basePrice);

  if (existing) {
    const existingOptions = Array.isArray(existing.optionsJson) ? existing.optionsJson : [];
    const needsUpdate =
      existing.description !== description ||
      String(existing.basePrice) !== basePriceStr ||
      existing.categoryId !== categoryId ||
      existing.subCategoryId !== subCategoryId ||
      JSON.stringify(existingOptions) !== JSON.stringify(options) ||
      !existing.imageUrl ||
      isPlaceholder(existing.imageUrl);

    if (!needsUpdate) return existing;

    return prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        description,
        imageUrl: resolvedImageUrl,
        basePrice: basePriceStr,
        isAvailable: true,
        optionsJson: options,
        categoryId,
        subCategoryId,
      },
    });
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

  await ensureCategory({
    name: 'Sugar, Flour & Baking',
    imageUrl: placeholderUrl('Sugar, Flour & Baking', '800x500'),
    order: 4,
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

  await ensureCategory({
    name: 'Honey & Natural Products',
    imageUrl: placeholderUrl('Honey & Natural Products', '800x500'),
    order: 7,
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

  await ensureCategory({
    name: 'Tea & Coffee',
    imageUrl: placeholderUrl('Tea & Coffee', '800x500'),
    order: 10,
  });

  await ensureCategory({
    name: 'Canned & Jar Food',
    imageUrl: placeholderUrl('Canned & Jar Food', '800x500'),
    order: 11,
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
    name: 'Striploin / Sirloin',
    description: 'Halal striploin/sirloin, great for steaks and roasting.',
    imageUrl: placeholderUrl('Sirloin', '600x400'),
    basePrice: '22.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Sliced thin (for steak / stir fry)', 'Strips (for stir fry)'] },
    ],
  });

  await ensureProduct({
    name: 'Ribeye',
    description: 'Juicy halal ribeye for grilling or pan sear.',
    imageUrl: placeholderUrl('Ribeye', '600x400'),
    basePrice: '24.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Sliced thin (for steak / stir fry)'] },
    ],
  });

  await ensureProduct({
    name: 'Fillet (Tenderloin)',
    description: 'Premium halal beef tenderloin / fillet.',
    imageUrl: placeholderUrl('Tenderloin', '600x400'),
    basePrice: '29.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Sliced thin (for steak / stir fry)'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Roast',
    description: 'Halal beef roast cut, ideal for oven roasting.',
    imageUrl: placeholderUrl('Beef Roast', '600x400'),
    basePrice: '21.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece'] },
    ],
  });

  await ensureProduct({
    name: 'Topside / Silverside',
    description: 'Halal topside/silverside, good for roast or slow cook.',
    imageUrl: placeholderUrl('Topside', '600x400'),
    basePrice: '20.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Medium pieces', 'Small pieces'] },
    ],
  });

  await ensureProduct({
    name: 'Brisket',
    description: 'Halal beef brisket, ideal for slow cooking.',
    imageUrl: placeholderUrl('Brisket', '600x400'),
    basePrice: '18.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Medium pieces', 'Small pieces'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Ribs',
    description: 'Halal beef ribs, great for BBQ.',
    imageUrl: placeholderUrl('Beef Ribs', '600x400'),
    basePrice: '17.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'bones', label: 'Bones', values: ['With bone', 'Boneless'] },
    ],
  });

  await ensureProduct({
    name: 'Short ribs',
    description: 'Halal short ribs, excellent for slow cooking.',
    imageUrl: placeholderUrl('Short Ribs', '600x400'),
    basePrice: '18.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'bones', label: 'Bones', values: ['With bone', 'Boneless'] },
    ],
  });

  await ensureProduct({
    name: 'Rib rack',
    description: 'Halal rib rack, ideal for roasting or BBQ.',
    imageUrl: placeholderUrl('Rib Rack', '600x400'),
    basePrice: '19.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'bones', label: 'Bones', values: ['With bone', 'Boneless'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Shank (for soup)',
    description: 'Halal beef shank, perfect for soups and stock.',
    imageUrl: placeholderUrl('Beef Shank', '600x400'),
    basePrice: '14.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'bones', label: 'Bones', values: ['With bone', 'Boneless'] },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Medium pieces', 'Small pieces'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Bones',
    description: 'Halal beef bones for stock, soup and broth.',
    imageUrl: placeholderUrl('Beef Bones', '600x400'),
    basePrice: '9.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'boneType', label: 'Bone type', values: ['Marrow bone', 'Soup bone'], isRequired: true },
      { type: 'boneSize', label: 'Size', values: ['Whole bone', 'Cut in half', 'Cut small pieces'], isRequired: true },
    ],
  });

  await ensureProduct({
    name: 'Marrow bones',
    description: 'Halal marrow bones for rich broth.',
    imageUrl: placeholderUrl('Marrow Bones', '600x400'),
    basePrice: '10.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'boneSize', label: 'Size', values: ['Whole bone', 'Cut in half', 'Cut small pieces'], isRequired: true },
    ],
  });

  await ensureProduct({
    name: 'Soup bones',
    description: 'Halal soup bones for stock and soup.',
    imageUrl: placeholderUrl('Soup Bones', '600x400'),
    basePrice: '9.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'boneSize', label: 'Size', values: ['Whole bone', 'Cut in half', 'Cut small pieces'], isRequired: true },
    ],
  });

  await ensureProduct({
    name: 'Beef Liver',
    description: 'Fresh halal beef liver.',
    imageUrl: placeholderUrl('Beef Liver', '600x400'),
    basePrice: '11.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Sliced thin (for steak / stir fry)'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Heart',
    description: 'Fresh halal beef heart.',
    imageUrl: placeholderUrl('Beef Heart', '600x400'),
    basePrice: '12.49',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole piece', 'Medium pieces', 'Small pieces'] },
    ],
  });

  await ensureProduct({
    name: 'Beef Kidney',
    description: 'Fresh halal beef kidney.',
    imageUrl: placeholderUrl('Beef Kidney', '600x400'),
    basePrice: '9.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
    ],
  });

  await ensureProduct({
    name: 'Beef Tongue (if you want)',
    description: 'Halal beef tongue.',
    imageUrl: placeholderUrl('Beef Tongue', '600x400'),
    basePrice: '15.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
    ],
  });

  await ensureProduct({
    name: 'Beef Fat (suet / trimmings)',
    description: 'Halal beef fat / suet for cooking.',
    imageUrl: placeholderUrl('Beef Fat', '600x400'),
    basePrice: '6.99',
    categoryId: meat.id,
    subCategoryId: beef.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg', '2kg', 'Custom'], isRequired: true },
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
    name: 'Lamb Leg',
    description: 'Whole or half halal lamb leg for roast or curry.',
    imageUrl: placeholderUrl('Lamb Leg', '600x400'),
    basePrice: '24.99',
    categoryId: meat.id,
    subCategoryId: lamb.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['1kg', '1.5kg', '2kg'], isRequired: true },
      { type: 'cutStyle', label: 'Cut style', values: ['Whole', 'Medium pieces', 'Small pieces', 'Chops'] },
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
    name: 'Chicken Wings',
    description: 'Halal chicken wings, great for frying or BBQ.',
    imageUrl: placeholderUrl('Chicken Wings', '600x400'),
    basePrice: '8.99',
    categoryId: meat.id,
    subCategoryId: chicken.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg'], isRequired: true },
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
    name: 'Prawns / Shrimp',
    description: 'Halal prawns, choose with shell or peeled.',
    imageUrl: placeholderUrl('Prawns', '600x400'),
    basePrice: '18.99',
    categoryId: meat.id,
    subCategoryId: fish.id,
    options: [
      { type: 'weight', label: 'Weight', values: ['500g', '1kg', '1.5kg'], isRequired: true },
      { type: 'preparation', label: 'Preparation', values: ['With shell', 'Peeled'] },
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
  const existingProducts = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true },
  });

  for (const p of existingProducts) {
    if (p.imageUrl && !isPlaceholder(p.imageUrl)) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: pickImageUrl(p.name) || placeholderUrl(p.name, '600x400') },
    });
  }
}

module.exports = { seedDemoData };
