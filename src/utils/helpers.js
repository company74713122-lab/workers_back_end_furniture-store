import slugify from 'slugify';

// ✅ توليد slug من الاسم
export function generateSlug(name) {
  return slugify(name, { lower: true, locale: 'ar', strict: true });
}

// ✅ توليد SKU تلقائي
export function generateSKU(category) {
  const prefix = category ? category.substring(0, 3).toUpperCase() : 'PRD';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
}

// ✅ بناء WHERE clause من filters
export function buildWhereClause(filters) {
  const conditions = ['status = ?'];
  const params = ['active'];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }

  if (filters.material) {
    conditions.push('material = ?');
    params.push(filters.material);
  }

  if (filters.color) {
    conditions.push('color = ?');
    params.push(filters.color);
  }

  if (filters.size) {
    conditions.push('size = ?');
    params.push(filters.size);
  }

  if (filters.minPrice) {
    conditions.push('price >= ?');
    params.push(Number(filters.minPrice));
  }

  if (filters.maxPrice) {
    conditions.push('price <= ?');
    params.push(Number(filters.maxPrice));
  }

  if (filters.minStock) {
    conditions.push('stock >= ?');
    params.push(Number(filters.minStock));
  }

  if (filters.maxStock) {
    conditions.push('stock <= ?');
    params.push(Number(filters.maxStock));
  }

  if (filters.isFeatured !== undefined) {
    conditions.push('is_featured = ?');
    params.push(filters.isFeatured === 'true' || filters.isFeatured === true ? 1 : 0);
  }

  if (filters.isNew !== undefined) {
    conditions.push('is_new = ?');
    params.push(filters.isNew === 'true' || filters.isNew === true ? 1 : 0);
  }

  if (filters.search) {
    conditions.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  return {
    clause: conditions.join(' AND '),
    params,
  };
}

// ✅ بناء ORDER BY clause
export function buildOrderBy(sort) {
  const sortMap = {
    '-createdAt': 'created_at DESC',
    'createdAt': 'created_at ASC',
    'price': 'price ASC',
    '-price': 'price DESC',
    'name': 'name ASC',
    '-name': 'name DESC',
    '-viewedCount': 'viewed_count DESC',
    'viewedCount': 'viewed_count ASC',
    'stock': 'stock ASC',
    '-stock': 'stock DESC',
  };

  return sortMap[sort] || 'created_at DESC';
}

// ✅ بناء pagination
export function buildPagination(page, limit, totalCount) {
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(parseInt(limit) || 12, 100);
  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    page: pageNum,
    limit: limitNum,
    totalPages,
    totalCount,
    next: pageNum < totalPages ? pageNum + 1 : null,
    prev: pageNum > 1 ? pageNum - 1 : null,
  };
}

// ✅ تحويل boolean إلى integer (SQLite)
export function boolToInt(value) {
  return value ? 1 : 0;
}

// ✅ تحويل integer إلى boolean
export function intToBool(value) {
  return value === 1;
}