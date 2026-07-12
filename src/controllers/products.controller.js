import { AppError, ApiResponse } from '../utils/api-response.js';
import * as productService from '../services/products.service.js';
import { uploadMultipleToCloudinary, syncCloudinaryImages, deleteMultipleFromCloudinary } from '../utils/cloudinary.js';

// ✅ استخراج الصور من FormData
async function extractImagesFromForm(formData, env) {
  const imageFiles = formData.getAll('images').filter(f => f instanceof File && f.size > 0);
  
  if (imageFiles.length === 0) return [];
  if (imageFiles.length > 5) {
    throw new AppError(400, 'Maximum 5 images allowed');
  }
  
  return await uploadMultipleToCloudinary(imageFiles, env, 'products');
}

// ✅ بناء DTO من FormData
function buildProductDTO(formData, images = []) {
  const dto = {
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    material: formData.get('material'),
    color: formData.get('color'),
  };

  // Optional fields
  if (formData.has('offerPrice')) dto.offerPrice = formData.get('offerPrice');
  if (formData.has('sku')) dto.sku = formData.get('sku');
  if (formData.has('size')) dto.size = formData.get('size');
  if (formData.has('weight')) dto.weight = formData.get('weight');
  if (formData.has('status')) dto.status = formData.get('status');
  if (formData.has('tags')) dto.tags = formData.get('tags');
  if (formData.has('isFeatured')) dto.isFeatured = formData.get('isFeatured') === 'true';
  if (formData.has('isNew')) dto.isNew = formData.get('isNew') === 'true';

  // Parse dimensions (JSON string)
  if (formData.has('dimensions')) {
    const dimensionsStr = formData.get('dimensions');
    try {
      dto.dimensions = JSON.parse(dimensionsStr);
    } catch (e) {
      throw new AppError(400, 'Invalid dimensions format');
    }
  }

  // Parse tags (comma-separated)
  if (dto.tags && typeof dto.tags === 'string') {
    dto.tags = dto.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  // Add images
  if (images.length > 0) {
    dto.images = images;
  }

  return dto;
}

// ✅ GET /api/v1/products
export const getProducts = async (c) => {
  const { data, pagination } = await productService.getProducts(c.env.DB, c.req.query());
  return c.json(new ApiResponse(200, { data, pagination }, 'Products fetched successfully'));
};

// ✅ GET /api/v1/products/home
export const getHomePageData = async (c) => {
  const data = await productService.getHomePageData(c.env.DB);
  return c.json(new ApiResponse(200, data, 'Home page data fetched successfully'));
};

// ✅ GET /api/v1/products/featured
export const getFeaturedProducts = async (c) => {
  const limit = parseInt(c.req.query('limit')) || 10;
  const products = await productService.getFeaturedProducts(c.env.DB, limit);
  return c.json(new ApiResponse(200, products, 'Featured products fetched successfully'));
};

// ✅ GET /api/v1/products/latest
export const getLatestProducts = async (c) => {
  const limit = parseInt(c.req.query('limit')) || 10;
  const products = await productService.getLatestProducts(c.env.DB, limit);
  return c.json(new ApiResponse(200, products, 'Latest products fetched successfully'));
};

// ✅ GET /api/v1/products/offers
export const getProductsOnOffer = async (c) => {
  const limit = parseInt(c.req.query('limit')) || 10;
  const products = await productService.getProductsOnOffer(c.env.DB, limit);
  return c.json(new ApiResponse(200, products, 'Products on offer fetched successfully'));
};

// ✅ GET /api/v1/products/most-viewed
export const getMostViewedProducts = async (c) => {
  const limit = parseInt(c.req.query('limit')) || 10;
  const products = await productService.getMostViewedProducts(c.env.DB, limit);
  return c.json(new ApiResponse(200, products, 'Most viewed products fetched successfully'));
};

// ✅ GET /api/v1/products/category/:category
export const getProductsByCategory = async (c) => {
  const category = c.req.param('category');
  const { data, pagination } = await productService.getProductsByCategory(c.env.DB, category, c.req.query());
  return c.json(new ApiResponse(200, { data, pagination }, 'Products by category fetched successfully'));
};

// ✅ GET /api/v1/products/slug/:slug
export const getProductBySlug = async (c) => {
  const slug = c.req.param('slug');
  const product = await productService.getProductBySlug(c.env.DB, slug);
  return c.json(new ApiResponse(200, product, 'Product fetched successfully'));
};

// ✅ GET /api/v1/products/search
export const searchProducts = async (c) => {
  const { data, pagination } = await productService.searchProducts(c.env.DB, c.req.query());
  return c.json(new ApiResponse(200, { data, pagination }, 'Search results fetched successfully'));
};

// ✅ GET /api/v1/products/:id
export const getProductById = async (c) => {
  const id = c.req.param('id');
  const product = await productService.getProductById(c.env.DB, id);
  return c.json(new ApiResponse(200, product, 'Product fetched successfully'));
};

// ✅ POST /api/v1/products/:id/view
export const incrementViewCount = async (c) => {
  const id = c.req.param('id');
  const count = await productService.incrementViewCount(c.env.DB, id);
  return c.json(new ApiResponse(200, { viewCount: count }, 'View count incremented successfully'));
};

// ✅ POST /api/v1/products (Multipart Form Data + Images)
export const createProduct = async (c) => {
  try {
    const formData = await c.req.formData();
    
    // 1️⃣ رفع الصور إلى Cloudinary
    const images = await extractImagesFromForm(formData, c.env);
    
    // 2️⃣ بناء DTO
    const dto = buildProductDTO(formData, images);
    
    // 3️⃣ إنشاء المنتج
    const product = await productService.createProduct(c.env.DB, dto);
    
    return c.json(new ApiResponse(201, product, 'Product created successfully'));
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json(new ApiResponse(error.statusCode || 500, null, error.message), error.statusCode || 500);
  }
};

// ✅ PUT /api/v1/products/:id (Multipart Form Data + Smart Image Sync)
export const updateProduct = async (c) => {
  try {
    const id = c.req.param('id');
    const formData = await c.req.formData();
    
    // 1️⃣ جلب المنتج الحالي
    const existingProduct = await productService.getProductById(c.env.DB, id);
    
    // 2️⃣ رفع الصور الجديدة (إن وجدت)
    const newImages = await extractImagesFromForm(formData, c.env);
    
    // 3️⃣ بناء DTO
    const dto = buildProductDTO(formData, newImages.length > 0 ? newImages : undefined);
    
    // 4️⃣ إذا تم إرسال صور جديدة، نستبدل القديمة تماماً
    if (newImages.length > 0) {
      // حذف الصور القديمة من Cloudinary (مع الاحتفاظ بالمشتركة)
      await syncCloudinaryImages(existingProduct.images, newImages, c.env);
    }
    
    // 5️⃣ تحديث المنتج
    const product = await productService.updateProduct(c.env.DB, id, dto);
    
    return c.json(new ApiResponse(200, product, 'Product updated successfully'));
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json(new ApiResponse(error.statusCode || 500, null, error.message), error.statusCode || 500);
  }
};

// ✅ DELETE /api/v1/products/:id
export const deleteProduct = async (c) => {
  try {
    const id = c.req.param('id');
    
    // 1️⃣ جلب المنتج للحصول على الصور
    const product = await productService.getProductById(c.env.DB, id);
    
    // 2️⃣ حذف جميع الصور من Cloudinary
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(img => img.public_id).filter(Boolean);
      if (publicIds.length > 0) {
        console.log(`🗑️ Deleting ${publicIds.length} images from Cloudinary`);
        await deleteMultipleFromCloudinary(publicIds, c.env);
      }
    }
    
    // 3️⃣ حذف المنتج من قاعدة البيانات
    await productService.deleteProduct(c.env.DB, id);
    
    return c.json(new ApiResponse(200, null, 'Product deleted successfully'));
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json(new ApiResponse(error.statusCode || 500, null, error.message), error.statusCode || 500);
  }
};