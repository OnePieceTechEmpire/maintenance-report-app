// lib/image-compression.ts
export async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      let width = img.width
      let height = img.height

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx!.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'))
            return
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg', // Convert all to JPEG for better compression
            lastModified: Date.now(),
          })

          console.log(`✅ Image compressed: ${file.size / 1024 / 1024}MB → ${compressedFile.size / 1024 / 1024}MB`)
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      console.warn('⚠️ Image compression failed, using original file')
      resolve(file) // Fallback to original file
    }

    img.src = URL.createObjectURL(file)
  })
}

export function shouldCompressImage(file: File): boolean {
  // Only compress images larger than 1MB
  return file.type.startsWith('image/') && file.size > 1024 * 1024
}