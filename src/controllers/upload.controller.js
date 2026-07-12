import { AppError, ApiResponse } from '../utils/api-response.js';
import * as uploadService from '../services/upload.service.js';

// ✅ POST /api/v1/upload/sign
export const getUploadSignature = async (c) => {
  const { folder = 'products' } = await c.req.json();
  
  const signature = await uploadService.getUploadSignature(c.env, { folder });
  
  return c.json(new ApiResponse(200, signature, 'Upload signature generated successfully'));
};

// ✅ POST /api/v1/upload/delete
export const deleteImage = async (c) => {
  const { public_id } = await c.req.json();
  
  const result = await uploadService.deleteImage(public_id, c.env);
  
  return c.json(new ApiResponse(200, result, 'Image deleted successfully'));
};

// ✅ POST /api/v1/upload/delete-multiple
export const deleteImages = async (c) => {
  const { public_ids } = await c.req.json();
  
  const results = await uploadService.deleteImages(public_ids, c.env);
  
  return c.json(new ApiResponse(200, results, 'Images deleted successfully'));
};