import { supabase } from '@/lib/supabase'

export interface DraftImageInfo {
  file_name: string
  storage_path: string
  caption: string
  preview: string
  size: number
  type: string
}

export async function uploadDraftImages(
  userId: string, 
  images: File[], 
  folder: string = 'completion'
): Promise<DraftImageInfo[]> {
  const uploadedImages: DraftImageInfo[] = []

  // ✅ UPLOAD IN PARALLEL INSTEAD OF SEQUENTIAL
  const uploadPromises = images.map(async (image) => {
    try {
      console.log(`📸 Original size: ${(image.size / 1024 / 1024).toFixed(2)}MB`)
      
      // ✅ COMPRESS IMAGE FIRST FOR MOBILE
      let imageToUpload = image
      if (image.size > 500000) { // Compress if > 500KB
        imageToUpload = await compressImage(image, 0.7) // 70% quality
        console.log(`📦 Compressed to: ${(imageToUpload.size / 1024 / 1024).toFixed(2)}MB`)
      }

      // Generate unique file path WITH folder
      const fileExt = 'jpg' // ✅ FORCE JPG FOR SMALLER SIZE
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${folder}/${fileName}`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('draft-images')
        .upload(filePath, imageToUpload)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('draft-images')
        .getPublicUrl(filePath)

      // Create preview (for immediate display)
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(imageToUpload) // ✅ USE COMPRESSED IMAGE FOR PREVIEW
      })

      return {
        file_name: image.name,
        storage_path: filePath,
        caption: '',
        preview,
        size: imageToUpload.size, // ✅ STORE COMPRESSED SIZE
        type: 'image/jpeg' // ✅ FORCE JPEG TYPE
      }

    } catch (error) {
      console.error('Error uploading draft image:', error)
      throw error
    }
  })

  // ✅ WAIT FOR ALL UPLOADS TO COMPLETE IN PARALLEL
  const results = await Promise.allSettled(uploadPromises)
  
  // ✅ COLLECT SUCCESSFUL UPLOADS
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      uploadedImages.push(result.value)
    }
    // ❌ Failed uploads are already logged above
  })

  console.log(`✅ Uploaded ${uploadedImages.length}/${images.length} images`)
  return uploadedImages
}




export async function downloadDraftImages(imageInfos: DraftImageInfo[]): Promise<File[]> {
  const files: File[] = []

  for (const imageInfo of imageInfos) {
    try {
      // Download from Supabase storage
      const { data, error } = await supabase.storage
        .from('draft-images')
        .download(imageInfo.storage_path)

      if (error) throw error

      // Convert blob back to File object
      const file = new File([data], imageInfo.file_name, {
        type: imageInfo.type,
        lastModified: Date.now()
      })

      files.push(file)

    } catch (error) {
      console.error('Error downloading draft image:', error)
      throw error
    }
  }

  return files
}


export async function compressImage(file: File, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 1200px width for mobile)
      const maxWidth = 1200;
      const maxHeight = 1200;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx!.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          
          // Create new compressed file
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log(`📦 Compressed: ${file.size} → ${compressedFile.size} bytes (${Math.round((compressedFile.size / file.size) * 100)}%)`);
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function deleteDraftImages(imageInfos: DraftImageInfo[]): Promise<void> {
  const pathsToDelete = imageInfos.map(img => img.storage_path)

  if (pathsToDelete.length > 0) {
    const { error } = await supabase.storage
      .from('draft-images')
      .remove(pathsToDelete)

    if (error) {
      console.error('Error deleting draft images:', error)
    }
  }
}

