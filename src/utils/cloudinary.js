import { AppError } from './api-response.js';

// ✅ رفع ملف واحد إلى Cloudinary
export async function uploadToCloudinary(file, env, folder = 'products') {
  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'Invalid file');
  }

  // التحقق من نوع الملف
  if (!file.type.startsWith('image/')) {
    throw new AppError(400, 'Only image files are allowed');
  }

  // التحقق من الحجم (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new AppError(400, 'File size must be less than 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AppError(500, `Cloudinary upload failed: ${error.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();

  return {
    public_id: result.public_id,
    url: result.secure_url,
    filename: file.name,
    alt: file.name,
  };
}

// ✅ رفع ملفات متعددة
export async function uploadMultipleToCloudinary(files, env, folder = 'products') {
  if (!files || files.length === 0) return [];
  if (files.length > 5) {
    throw new AppError(400, 'Maximum 5 images allowed');
  }

  const results = [];
  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      const result = await uploadToCloudinary(file, env, folder);
      results.push(result);
    }
  }

  return results;
}

// ✅ حذف صورة واحدة من Cloudinary
export async function deleteFromCloudinary(publicId, env) {
  if (!publicId) return null;

  const timestamp = Math.round(Date.now() / 1000);
  
  // بناء الـ signature
  const paramsString = `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(paramsString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', env.CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      console.error('Failed to delete from Cloudinary:', publicId);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error.message);
    return null;
  }
}

// ✅ حذف صور متعددة
export async function deleteMultipleFromCloudinary(publicIds, env) {
  if (!publicIds || publicIds.length === 0) return [];
  
  const results = await Promise.allSettled(
    publicIds.map(id => deleteFromCloudinary(id, env))
  );
  
  return results;
}

// ✅ ذكي: حذف الصور القديمة مع الاحتفاظ بالصور المشتركة
export async function syncCloudinaryImages(oldImages, newImages, env) {
  if (!oldImages || oldImages.length === 0) return;
  
  // استخراج public_ids من الصور الجديدة
  const newPublicIds = new Set(
    (newImages || [])
      .map(img => img.public_id)
      .filter(Boolean)
  );
  
  // الصور التي يجب حذفها (قديمة وليست في الجديدة)
  const toDelete = oldImages
    .filter(img => img.public_id && !newPublicIds.has(img.public_id))
    .map(img => img.public_id);
  
  if (toDelete.length > 0) {
    console.log(`🗑️ Deleting ${toDelete.length} old images from Cloudinary`);
    await deleteMultipleFromCloudinary(toDelete, env);
  }
}