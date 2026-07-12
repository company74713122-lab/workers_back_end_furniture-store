import { AppError } from '../utils/api-response.js';
import { generateUploadSignature, deleteImageFromCloudinary, deleteMultipleImages } from '../utils/cloudinary.js';

// ✅ توليد Presigned URL
export async function getUploadSignature(env, options = {}) {
  return await generateUploadSignature(env, options);
}

// ✅ حذف صورة
export async function deleteImage(publicId, env) {
  if (!publicId) {
    throw new AppError(400, 'public_id is required');
  }
  
  return await deleteImageFromCloudinary(publicId, env);
}

// ✅ حذف صور متعددة
export async function deleteImages(publicIds, env) {
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    throw new AppError(400, 'public_ids array is required');
  }
  
  return await deleteMultipleImages(publicIds, env);
}

// ✅ معالجة الصور المرفوعة (من FormData)
export async function processUploadedImages(formData, env) {
  const images = [];
  const imageFiles = formData.getAll('images');
  
  for (const file of imageFiles) {
    if (file instanceof File && file.size > 0) {
      // في هذا الحل، الفرونت إند يرفع الصور مباشرة إلى Cloudinary
      // ويرسل public_id و url في الـ FormData
      // لكن إذا أرسل file مباشرة، نحفظ معلوماته فقط
      
      const publicId = formData.get(`images_public_id_${images.length}`) || 
                       `products/${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = formData.get(`images_url_${images.length}`) || 
                  `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
      const filename = file.name;
      const alt = formData.get(`images_alt_${images.length}`) || '';
      
      images.push({
        public_id: publicId,
        url: url,
        filename: filename,
        alt: alt,
      });
    }
  }
  
  return images;
}

// ✅ حذف الصور القديمة (عند التحديث)
export async function deleteOldImages(oldImages, newImages, env) {
  if (!oldImages || oldImages.length === 0) return;
  if (!newImages || newImages.length === 0) {
    // حذف جميع الصور القديمة
    const publicIds = oldImages.map(img => img.public_id).filter(Boolean);
    if (publicIds.length > 0) {
      await deleteMultipleImages(publicIds, env);
    }
    return;
  }
  
  // حذف الصور التي لم تعد موجودة
  const newPublicIds = new Set(newImages.map(img => img.public_id));
  const toDelete = oldImages
    .filter(img => img.public_id && !newPublicIds.has(img.public_id))
    .map(img => img.public_id);
  
  if (toDelete.length > 0) {
    await deleteMultipleImages(toDelete, env);
  }
}