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
  folder: string = 'completion' // Add folder parameter with default
): Promise<DraftImageInfo[]> {
  const uploadedImages: DraftImageInfo[] = []

  for (const image of images) {
    try {
      // Generate unique file path WITH folder
      const fileExt = image.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${folder}/${fileName}` // Include folder in path

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('draft-images')
        .upload(filePath, image)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('draft-images')
        .getPublicUrl(filePath)

      // Create preview (for immediate display)
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(image)
      })

      uploadedImages.push({
        file_name: image.name,
        storage_path: filePath,
        caption: '',
        preview,
        size: image.size,
        type: image.type
      })

    } catch (error) {
      console.error('Error uploading draft image:', error)
      throw error
    }
  }

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