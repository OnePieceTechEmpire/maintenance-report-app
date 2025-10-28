// lib/image-upload.ts
import { supabase } from './supabase'
// lib/image-upload.ts
import { compressImage, shouldCompressImage } from './image-compression'
import { ImageWithCaption } from '@/Types'

export async function uploadComplaintImages(complaintId: string, images: File[], captions: string[] = []): Promise<ImageWithCaption[]> {
  const imageData: ImageWithCaption[] = []
  
  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i]
      const caption = captions[i] || ''
      
      let imageToUpload = image
      
      // Compress image if it's large
      if (shouldCompressImage(image)) {
        console.log('🔄 Compressing image:', image.name)
        imageToUpload = await compressImage(image)
      }

      // Create unique filename
      const fileExt = 'jpg'
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
      
      imageData.push({
        url: publicUrl,
        caption: caption
      })
      
    } catch (error) {
      console.error('Error processing image:', images[i].name, error)
    }
  }
  
  return imageData
}

// Add a new function for completion images
export async function uploadCompletionImages(completionId: string, images: File[], captions: string[] = []): Promise<ImageWithCaption[]> {
  const imageData: ImageWithCaption[] = []
  
  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i]
      const caption = captions[i] || ''
      
      let imageToUpload = image
      
      if (shouldCompressImage(image)) {
        console.log('🔄 Compressing completion image:', image.name)
        imageToUpload = await compressImage(image)
      }

      const fileExt = 'jpg'
      const fileName = `completions/${completionId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('complaint-images') // Using same bucket, but different folder
        .upload(fileName, imageToUpload)
      
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName)
      
      imageData.push({
        url: publicUrl,
        caption: caption
      })
      
    } catch (error) {
      console.error('Error processing completion image:', images[i].name, error)
    }
  }
  
  return imageData
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

