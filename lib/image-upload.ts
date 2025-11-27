// lib/image-upload.ts
import { supabase } from './supabase'
// lib/image-upload.ts
import { compressImage, shouldCompressImage } from './image-compression'
import { ImageWithCaption } from '@/Types'


export async function uploadComplaintImages(
  complaintId: string,
  images: File[],
  captions: string[] = []
): Promise<ImageWithCaption[]> {
  const results: ImageWithCaption[] = []

  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    const caption = captions[i] || ""

    console.log("🚀 Starting upload for:", file.name, "type:", file.type)

    try {
      let fileToUpload = file

      if (file.size > 500_000) {
        console.log("🗜 Compressing:", file.name)
        fileToUpload = await compressImage(file)
      }

      const mime = fileToUpload.type || "image/jpeg"
      const ext = mime.split("/")[1] || "jpg"

      const filePath = `${complaintId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${ext}`

      console.log("📡 Uploading to path:", filePath)

      const { data, error: uploadErr } = await supabase.storage
        .from("complaint-images")
        .upload(filePath, fileToUpload, {
          contentType: mime,
          upsert: false
        })

      if (uploadErr) {
        console.error("❌ SUPABASE UPLOAD ERROR:", uploadErr)
        throw uploadErr     // <——🔥🔥🔥 important!!!
      }

      console.log("✅ Uploaded:", data)

      const { data: urlData } = supabase.storage
        .from("complaint-images")
        .getPublicUrl(filePath)

      console.log("🌍 Public URL:", urlData.publicUrl)

      results.push({
        url: urlData.publicUrl,
        caption,
        storage_path: filePath
      })

    } catch (err) {
      console.error("💥 CRITICAL UPLOAD FAILURE:", err)
      throw err    // <——🔥 DO NOT SILENT FAIL
    }
  }

  console.log("📦 Final uploaded image list:", results)
  return results
}






export type CompletionImageType = 'before' | 'after' | 'receipt'

export async function uploadCompletionImages(
  completionId: string, 
  images: File[], 
  captions: string[] = [],
  type: CompletionImageType = 'after'   // default = AFTER
): Promise<ImageWithCaption[]> {
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
      const fileName = `completions/${completionId}/${type}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, imageToUpload)
      
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName)
      
      imageData.push({
        url: publicUrl,
        caption,
        storage_path: fileName,
        type       // 🔥 store exact type: 'before' | 'after' | 'receipt'
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

