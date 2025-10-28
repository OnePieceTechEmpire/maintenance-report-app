// lib/completion-pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

// Add this function to handle completion images
async function addCompletionImages(pdfDoc: PDFDocument, currentPage: PDFPage, completion: any, font: any, fontBold: any): Promise<void> {
  let page = currentPage
  const { width, height } = page.getSize()
  let y = 750 // Start images on new page or current position

  // If current page has content, start images on new page
  if (page.getY() < 600) {
    page = pdfDoc.addPage([600, 800])
    y = 750
  }

  // Only add images section if there are images
  if (!completion.completion_images || completion.completion_images.length === 0) {
    return
  }

  page.drawText('GAMBAR PENYELESAIAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 40

  // Image grid settings - same as complaints
  const imagesPerRow = 2
  const imageSize = 200
  const spacing = 30
  const startX = 50
  
  for (let i = 0; i < completion.completion_images.length; i++) {
    const imageData = completion.completion_images[i]
    const row = Math.floor(i / imagesPerRow)
    const col = i % imagesPerRow
    
    // Check if we need a new page
    const imageY = y - (row * (imageSize + spacing + 40)) // 40 for caption
    
    if (imageY - imageSize < 50) {
      page = pdfDoc.addPage([600, 800])
      y = 750
      // Redraw header on new page
      page.drawText('GAMBAR PENYELESAIAN (Sambungan)', {
        x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      })
      y -= 40
    }
    
    try {
      const imageBytes = await fetchImage(imageData.url)
      let image: any
      
      try {
        image = await pdfDoc.embedJpg(imageBytes)
      } catch {
        image = await pdfDoc.embedPng(imageBytes)
      }
      
      // Calculate position for this image in the grid
      const xPos = startX + (col * (imageSize + spacing))
      const currentY = y - (row * (imageSize + spacing + 40))
      
      // Scale image to fit square
      const scaledDims = image.scaleToFit(imageSize, imageSize)
      
      // Center image in the square
      const xOffset = (imageSize - scaledDims.width) / 2
      const yOffset = (imageSize - scaledDims.height) / 2
      
      // Draw image with border
      page.drawRectangle({
        x: xPos,
        y: currentY - imageSize,
        width: imageSize,
        height: imageSize,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })
      
      page.drawImage(image, {
        x: xPos + xOffset,
        y: currentY - imageSize + yOffset,
        width: scaledDims.width,
        height: scaledDims.height,
      })
      
      // Add caption below image
      if (imageData.caption) {
        const captionLines = wrapText(imageData.caption, 30) // Shorter lines for captions
        captionLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: xPos,
            y: currentY - imageSize - 15 - (lineIndex * 12),
            size: 8,
            font,
            color: rgb(0.3, 0.3, 0.3),
          })
        })
      }
      
      // Add image number
      page.drawText(`Gambar ${i + 1}`, {
        x: xPos,
        y: currentY - imageSize - ((imageData.caption ? wrapText(imageData.caption, 30).length : 0) * 12) - 25,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
    } catch (error) {
      console.error('Error processing completion image:', imageData.url, error)
      // Draw placeholder for failed images
      const xPos = startX + (col * (imageSize + spacing))
      const currentY = y - (row * (imageSize + spacing + 40))
      
      page.drawRectangle({
        x: xPos,
        y: currentY - imageSize,
        width: imageSize,
        height: imageSize,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 0.95),
      })
      
      page.drawText('Gagal Muat', {
        x: xPos + imageSize/2 - 20,
        y: currentY - imageSize/2 - 5,
        size: 10,
        font,
        color: rgb(0.6, 0.6, 0.6),
      })
      
      page.drawText(`Gambar ${i + 1}`, {
        x: xPos,
        y: currentY - imageSize - 15,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
    }
  }
}

// Add this helper function for fetching images
async function fetchImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function generateCompletionPDF(completion: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const page = pdfDoc.addPage([600, 800])
  const { width, height } = page.getSize()
  
  let y = height - 50

  // Header
  page.drawText('BORANG PENYELESAIAN KERJA', {
    x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 30

  page.drawText(`Dijana pada: ${new Date().toLocaleDateString('ms-MY')}`, {
    x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
  })
  y -= 40

  // After the header, you could add:
page.drawText(`Untuk Aduan: ${completion.complaints?.building_name || 'N/A'}`, {
  x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
})
y -= 20

  // Line separator
  page.drawLine({
    start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8),
  })
  y -= 30

  // Completion Details Header
  page.drawText('MAKLUMAT PENYELESAIAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25

  // Completion Details
  const details = [
    { label: 'No. Rujukan', value: completion.id },
    { label: 'Tajuk Kerja', value: completion.work_title },
    { label: 'Tempat/Lokasi', value: completion.work_location },
    { label: 'Tarikh Siap', value: new Date(completion.completion_date).toLocaleDateString('ms-MY') },
    { label: 'Nama Syarikat', value: completion.company_name },
    { label: 'No. Arahan Kerja', value: completion.work_order_number || 'Tiada' },
    { label: 'Nama Pegawai', value: completion.officer_name },
    { label: 'Nama Penyelia', value: completion.supervisor_name },
    { label: 'Bil Pekerja', value: completion.worker_count ? completion.worker_count.toString() : 'Tiada' },
    { label: 'Disiapkan Oleh', value: completion.profiles?.full_name || 'N/A' },
    { label: 'Tarikh Rekod', value: new Date(completion.created_at).toLocaleDateString('ms-MY') },
  ]
  
  details.forEach(item => {
    page.drawText(`${item.label}:`, { x: 50, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(item.value, { x: 200, y, size: 10, font, color: rgb(0, 0, 0) })
    y -= 20
  })
  
  y -= 20

  // Work Scope
  if (y < 200) {
    // Add new page if needed
    y = height - 50
  }
  
  page.drawText('SKOP KERJA', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25

  const workScopeLines = wrapText(completion.work_scope, 80)
  workScopeLines.forEach(line => {
    if (y < 100) return
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) })
    y -= 15
  })
  
  y -= 20

  // Quantity and Materials
  if (completion.quantity || completion.materials_equipment) {
    if (y < 150) {
      y = height - 50
    }
    
    page.drawText('MAKLUMAT TAMBAHAN', {
      x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    })
    y -= 25

    if (completion.quantity) {
      page.drawText('Kuantiti:', { x: 50, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
      page.drawText(completion.quantity, { x: 120, y, size: 10, font, color: rgb(0, 0, 0) })
      y -= 20
    }

    if (completion.materials_equipment) {
      page.drawText('Bahan & Peralatan:', { x: 50, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
      
      const materialLines = wrapText(completion.materials_equipment, 70)
      materialLines.forEach(line => {
        if (y < 100) return
        page.drawText(line, { x: 170, y, size: 10, font, color: rgb(0, 0, 0) })
        y -= 15
      })
      y -= 10
    }
  }

  // Signature Section
  if (y < 200) {
    y = height - 50
  } else {
    y -= 30
  }

  page.drawText('PENGESAHAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 40

  // Signature line
  page.drawLine({
    start: { x: 50, y }, end: { x: 300, y }, thickness: 1, color: rgb(0, 0, 0),
  })
  
// Draw the signature (a bit above the line)
if (completion.pic_signature_url) {
  page.drawText(completion.pic_signature_url, {
    x: 50,
    y: y + 5, // move it *up* a bit instead of down
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
}

// Label below the line
page.drawText('Tandatangan PIC', {
  x: 50,
  y: y - 15,
  size: 10,
  font,
  color: rgb(0.4, 0.4, 0.4),
})

  // ✅ ADD THIS LINE - Call the image function after signature
  await addCompletionImages(pdfDoc, page, completion, font, fontBold)

  // Footer
  page.drawText(
    'Dokumen ini dijana secara automatik oleh Sistem Aduan Penyelenggaraan',
    { x: 50, y: 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
  )

  return await pdfDoc.save()
}

function wrapText(text: string, maxLength: number): string[] {
  if (!text) return []
  
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  words.forEach(word => {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  })
  
  if (currentLine) lines.push(currentLine.trim())
  return lines
}