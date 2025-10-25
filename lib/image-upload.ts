// lib/image-upload.ts
import { supabase } from './supabase'
// lib/image-upload.ts
import { compressImage, shouldCompressImage } from './image-compression'

export async function uploadComplaintImages(complaintId: string, images: File[]): Promise<string[]> {
  const imageUrls: string[] = []
  
  for (const image of images) {
    try {
      let imageToUpload = image
      
      // Compress image if it's large
      if (shouldCompressImage(image)) {
        console.log('🔄 Compressing image:', image.name)
        imageToUpload = await compressImage(image)
      }

      // Create unique filename
      const fileExt = 'jpg' // Always use jpg after compression
      const fileName = `${complaintId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload image
      const { data, error } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, imageToUpload)
      
      if (error) {
        console.error('Image upload error:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName)
      
      imageUrls.push(publicUrl)
      
    } catch (error) {
      console.error('Error processing image:', image.name, error)
      // Continue with next image even if one fails
    }
  }
  
  return imageUrls
}

export function validateImages(files: File[]): string | null {
  if (files.length > 5) {
    return 'Maximum 5 images allowed'
  }
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }
    
    // Increased size limit since we'll compress
    if (file.size > 20 * 1024 * 1024) { // 20MB limit (will be compressed)
      return 'Image size must be less than 20MB'
    }
  }
  
  return null
}