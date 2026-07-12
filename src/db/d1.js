import { AppError } from '../utils/api-response.js';

export function getDb(env) {
  if (!env.DB) {
    throw new AppError(500, 'Database not initialized');
  }
  return env.DB;
}

export function generateId() {
  return crypto.randomUUID();
}

// ✅ تحويل من D1 إلى Product Schema
export function parseProduct(row) {
  if (!row) return null;
  
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: row.price,
    offerPrice: row.offer_price,
    stock: row.stock,
    sku: row.sku,
    dimensions: {
      width: row.dimensions_width,
      height: row.dimensions_height,
      depth: row.dimensions_depth,
      unit: row.dimensions_unit,
    },
    weight: row.weight,
    material: row.material,
    color: row.color,
    size: row.size,
    images: row.images ? JSON.parse(row.images) : [],
    primImg: row.prim_img,
    tags: row.tags ? JSON.parse(row.tags) : [],
    status: row.status,
    isFeatured: row.is_featured === 1,
    isNew: row.is_new === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0,
  };
}

export function boolToInt(value) {
  return value ? 1 : 0;
}