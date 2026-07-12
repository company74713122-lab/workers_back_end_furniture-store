import { AppError } from '../utils/api-response.js';
import { parseProduct, generateId } from '../db/d1.js';
import {
  generateSlug,
  generateSKU,
  buildWhereClause,
  buildOrderBy,
  buildPagination,
  boolToInt,
} from '../utils/helpers.js';

// ✅ Create Product
export async function createProduct(db, dto) {
  const id = generateId();
  const slug = generateSlug(dto.name);
  const sku = dto.sku || generateSKU(dto.category);
  const now = new Date().toISOString();

  const images = JSON.stringify(dto.images || []);
  const tags = JSON.stringify(dto.tags || []);
  const isFeatured = boolToInt(dto.isFeatured);
  const isNew = boolToInt(dto.isNew);
  const primImg = dto.images?.[0]?.url || null;

  const stmt = db.prepare(`
    INSERT INTO products (
      id, name, slug, description, category, price, offer_price, stock, sku,
      material, color, size,
      dimensions_width, dimensions_height, dimensions_depth, dimensions_unit,
      weight, images, prim_img, tags, status, is_featured, is_new,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    id,
    dto.name,
    slug,
    dto.description,
    dto.category,
    Number(dto.price),
    dto.offerPrice ? Number(dto.offerPrice) : null,
    Number(dto.stock),
    sku,
    dto.material,
    dto.color,
    dto.size || null,
    dto.dimensions?.width || 0,
    dto.dimensions?.height || 0,
    dto.dimensions?.depth || 0,
    dto.dimensions?.unit || 'cm',
    dto.weight ? Number(dto.weight) : 0,
    images,
    primImg,
    tags,
    dto.status || 'active',
    isFeatured,
    isNew,
    now,
    now
  ).run();

  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  return parseProduct(product);
}

// ✅ Get Products
export async function getProducts(db, query) {
  const { clause, params } = buildWhereClause(query);
  const orderBy = buildOrderBy(query.sort);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 12, 100);
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM products WHERE ${clause}`);
  const { count } = await countStmt.bind(...params).first();

  const dataStmt = db.prepare(`SELECT * FROM products WHERE ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);
  const { results } = await dataStmt.bind(...params, limit, offset).all();

  const products = results.map(parseProduct);
  const pagination = buildPagination(page, limit, count);

  return { data: products, pagination };
}

// ✅ Get Product by ID
export async function getProductById(db, id) {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  
  return parseProduct(product);
}

// ✅ Get Product by Slug
export async function getProductBySlug(db, slug) {
  const product = await db.prepare('SELECT * FROM products WHERE slug = ?').bind(slug).first();
  
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  
  return parseProduct(product);
}

// ✅ Update Product
export async function updateProduct(db, id, dto) {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  
  if (!existing) {
    throw new AppError(404, 'Product not found');
  }

  const slug = dto.name && dto.name !== existing.name ? generateSlug(dto.name) : existing.slug;
  const now = new Date().toISOString();

  // ✅ الصور: إذا تم إرسال صور جديدة، استبدلها بالكامل
  const images = dto.images !== undefined 
    ? JSON.stringify(dto.images) 
    : existing.images;
  
  const primImg = dto.images !== undefined
    ? (dto.images?.[0]?.url || null)
    : existing.prim_img;

  const tags = dto.tags !== undefined ? JSON.stringify(dto.tags) : existing.tags;
  const isFeatured = dto.isFeatured !== undefined ? boolToInt(dto.isFeatured) : existing.is_featured;
  const isNew = dto.isNew !== undefined ? boolToInt(dto.isNew) : existing.is_new;

  const stmt = db.prepare(`
    UPDATE products SET
      name = ?, slug = ?, description = ?, category = ?, price = ?,
      offer_price = ?, stock = ?, sku = ?, material = ?, color = ?,
      size = ?, dimensions_width = ?, dimensions_height = ?, dimensions_depth = ?,
      dimensions_unit = ?, weight = ?, images = ?, prim_img = ?, tags = ?,
      status = ?, is_featured = ?, is_new = ?, updated_at = ?
    WHERE id = ?
  `);

  await stmt.bind(
    dto.name || existing.name,
    slug,
    dto.description || existing.description,
    dto.category || existing.category,
    dto.price !== undefined ? Number(dto.price) : existing.price,
    dto.offerPrice !== undefined ? Number(dto.offerPrice) : existing.offer_price,
    dto.stock !== undefined ? Number(dto.stock) : existing.stock,
    dto.sku || existing.sku,
    dto.material || existing.material,
    dto.color || existing.color,
    dto.size !== undefined ? dto.size : existing.size,
    dto.dimensions?.width !== undefined ? dto.dimensions.width : existing.dimensions_width,
    dto.dimensions?.height !== undefined ? dto.dimensions.height : existing.dimensions_height,
    dto.dimensions?.depth !== undefined ? dto.dimensions.depth : existing.dimensions_depth,
    dto.dimensions?.unit || existing.dimensions_unit,
    dto.weight !== undefined ? Number(dto.weight) : existing.weight,
    images,
    primImg,
    tags,
    dto.status || existing.status,
    isFeatured,
    isNew,
    now,
    id
  ).run();

  const updated = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  return parseProduct(updated);
}

// ✅ Delete Product
export async function deleteProduct(db, id) {
  const result = await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  
  if (result.changes === 0) {
    throw new AppError(404, 'Product not found');
  }
  
  return { message: 'Product deleted successfully' };
}

// ✅ Get Featured Products
export async function getFeaturedProducts(db, limit = 10) {
  const { results } = await db.prepare(
    'SELECT * FROM products WHERE is_featured = 1 AND status = ? ORDER BY created_at DESC LIMIT ?'
  ).bind('active', limit).all();
  
  return results.map(parseProduct);
}

// ✅ Get Latest Products
export async function getLatestProducts(db, limit = 10) {
  const { results } = await db.prepare(
    'SELECT * FROM products WHERE status = ? ORDER BY created_at DESC LIMIT ?'
  ).bind('active', limit).all();
  
  return results.map(parseProduct);
}

// ✅ Get Products by Category
export async function getProductsByCategory(db, category, query = {}) {
  const { clause, params } = buildWhereClause({ ...query, category });
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 12, 100);
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM products WHERE ${clause}`);
  const { count } = await countStmt.bind(...params).first();

  const dataStmt = db.prepare(
    `SELECT * FROM products WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  const { results } = await dataStmt.bind(...params, limit, offset).all();

  const products = results.map(parseProduct);
  const pagination = buildPagination(page, limit, count);

  return { data: products, pagination };
}

// ✅ Get Products on Offer
export async function getProductsOnOffer(db, limit = 10) {
  const { results } = await db.prepare(
    'SELECT * FROM products WHERE status = ? AND offer_price IS NOT NULL AND offer_price < price ORDER BY created_at DESC LIMIT ?'
  ).bind('active', limit).all();
  
  return results.map(parseProduct);
}

// ✅ Get Most Viewed Products
export async function getMostViewedProducts(db, limit = 10) {
  const { results } = await db.prepare(
    'SELECT * FROM products WHERE status = ? ORDER BY viewed_count DESC LIMIT ?'
  ).bind('active', limit).all();
  
  return results.map(parseProduct);
}

// ✅ Increment View Count
export async function incrementViewCount(db, id) {
  const result = await db.prepare(
    'UPDATE products SET viewed_count = viewed_count + 1 WHERE id = ?'
  ).bind(id).run();
  
  if (result.changes === 0) {
    throw new AppError(404, 'Product not found');
  }
  
  const product = await db.prepare('SELECT viewed_count FROM products WHERE id = ?').bind(id).first();
  return product.viewed_count;
}

// ✅ Get Home Page Data
export async function getHomePageData(db) {
  const [categories, featured, latest, mostViewed, offers] = await Promise.all([
    db.prepare('SELECT DISTINCT category FROM products WHERE status = ?').bind('active').all(),
    db.prepare('SELECT * FROM products WHERE is_featured = 1 AND status = ? ORDER BY created_at DESC LIMIT 8').bind('active').all(),
    db.prepare('SELECT * FROM products WHERE status = ? ORDER BY created_at DESC LIMIT 8').bind('active').all(),
    db.prepare('SELECT * FROM products WHERE status = ? ORDER BY viewed_count DESC LIMIT 8').bind('active').all(),
    db.prepare('SELECT * FROM products WHERE status = ? AND offer_price IS NOT NULL AND offer_price < price ORDER BY created_at DESC LIMIT 8').bind('active').all(),
  ]);

  return {
    categories: categories.results.map(r => r.category),
    featured: featured.results.map(parseProduct),
    latest: latest.results.map(parseProduct),
    mostViewed: mostViewed.results.map(parseProduct),
    offers: offers.results.map(parseProduct),
  };
}

// ✅ Search Products
export async function searchProducts(db, query) {
  const { clause, params } = buildWhereClause(query);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 12, 100);
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM products WHERE ${clause}`);
  const { count } = await countStmt.bind(...params).first();

  const dataStmt = db.prepare(
    `SELECT * FROM products WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  const { results } = await dataStmt.bind(...params, limit, offset).all();

  const products = results.map(parseProduct);
  const pagination = buildPagination(page, limit, count);

  return { data: products, pagination };
}