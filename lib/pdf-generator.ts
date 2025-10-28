// lib/pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

export async function generateComplaintPDF(complaint: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  let currentPage = pdfDoc.addPage([600, 800])
  let y = 750 // Start from top
  
  // Add all content sections
  y = addHeader(currentPage, y, font, fontBold)
  y = addComplaintDetails(currentPage, y, complaint, font, fontBold)
  y = addIncidentDescription(currentPage, y, complaint, font, fontBold)
  y = addSolutionSuggestion(currentPage, y, complaint, font, fontBold)
  
// Add images with proper layout
if (complaint.image_urls && complaint.image_urls.length > 0) {
  await addComplaintImages(pdfDoc, currentPage, complaint, font, fontBold)
}
  
  addFooter(pdfDoc, font)
  
  return await pdfDoc.save()
}

function addHeader(page: PDFPage, y: number, font: any, fontBold: any): number {
  page.drawText('LAPORAN ADUAN PENYELENGGARAAN', {
    x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 30
  
  page.drawText(`Generated on: ${new Date().toLocaleDateString('ms-MY')}`, {
    x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
  })
  y -= 40
  
  page.drawLine({
    start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8),
  })
  
  return y - 30
}

function addComplaintDetails(page: PDFPage, y: number, complaint: any, font: any, fontBold: any): number {
  page.drawText('MAKLUMAT ADUAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25

  const details = [
    { label: 'No. Aduan', value: complaint.id },
    { label: 'Nama Bangunan', value: complaint.building_name },
    { label: 'Tempat Kejadian', value: complaint.incident_location },
    { label: 'Tarikh Kejadian', value: new Date(complaint.incident_date).toLocaleDateString('ms-MY') },
    { label: 'Nama Pelapor', value: complaint.reporter_name },
    { label: 'No. Telefon Pelapor', value: complaint.reporter_phone },
    { label: 'Dilaporkan Oleh', value: complaint.profiles?.full_name || 'N/A' },
    { label: 'Tarikh Laporan', value: new Date(complaint.created_at).toLocaleDateString('ms-MY') },
    { label: 'Status', value: complaint.status.toUpperCase() },
  ]
  
  details.forEach(item => {
    page.drawText(`${item.label}:`, { x: 50, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(item.value, { x: 200, y, size: 10, font, color: rgb(0, 0, 0) })
    y -= 20
  })
  
  return y - 20
}

function addIncidentDescription(page: PDFPage, y: number, complaint: any, font: any, fontBold: any): number {
  if (y < 200) {
    return y // Not enough space, will handle in image section
  }
  
  page.drawText('KETERANGAN KEJADIAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25

  const descriptionLines = wrapText(complaint.incident_description, 80)
  
  descriptionLines.forEach(line => {
    if (y < 100) return // Stop if no space
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) })
    y -= 15
  })
  
  return y - 20
}

function addSolutionSuggestion(page: PDFPage, y: number, complaint: any, font: any, fontBold: any): number {
  if (!complaint.solution_suggestion || y < 150) {
    return y
  }
  
  page.drawText('CADANGAN PENYELESAIAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25
  
  const solutionLines = wrapText(complaint.solution_suggestion, 80)
  
  solutionLines.forEach(line => {
    if (y < 100) return
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) })
    y -= 15
  })
  
  return y - 20
}

// Add this function to handle complaint images with captions
async function addComplaintImages(pdfDoc: PDFDocument, currentPage: PDFPage, complaint: any, font: any, fontBold: any): Promise<void> {
  let page = currentPage
  const { width, height } = page.getSize()
  let y = 750 // Start images on new page or current position

  // If current page has content, start images on new page
  if (page.getY() < 600) {
    page = pdfDoc.addPage([600, 800])
    y = 750
  }

  // Only add images section if there are images
  if (!complaint.image_urls || complaint.image_urls.length === 0) {
    return
  }

  page.drawText('GAMBAR KEJADIAN', {
    x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 40

  // Image grid settings - same as completion PDF
  const imagesPerRow = 2
  const imageSize = 200
  const spacing = 30
  const startX = 50
  
  for (let i = 0; i < complaint.image_urls.length; i++) {
    const imageData = complaint.image_urls[i]
    const row = Math.floor(i / imagesPerRow)
    const col = i % imagesPerRow
    
    // Check if we need a new page
    const imageY = y - (row * (imageSize + spacing + 40)) // 40 for caption
    
    if (imageY - imageSize < 50) {
      page = pdfDoc.addPage([600, 800])
      y = 750
      // Redraw header on new page
      page.drawText('GAMBAR KEJADIAN (Sambungan)', {
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
      console.error('Error processing complaint image:', imageData.url, error)
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

function addFooter(pdfDoc: PDFDocument, font: any): void {
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  
  lastPage.drawText(
    'Dokumen ini dijana secara automatik oleh Sistem Aduan Penyelenggaraan',
    { x: 50, y: 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
  )
}

function wrapText(text: string, maxLength: number): string[] {
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

async function fetchImage(url: string): Promise<Uint8Array> {
  try {
    console.log('🔄 Fetching image:', url)
    
    // Use AbortController for timeout instead
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Maintenance-App/1.0)'
      }
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    console.log('✅ Image fetched successfully, size:', arrayBuffer.byteLength)
    return new Uint8Array(arrayBuffer)
    
  } catch (error: any) {
    console.error('❌ Failed to fetch image:', url, error.message)
    throw new Error(`Failed to fetch image: ${error.message}`)
  }
}