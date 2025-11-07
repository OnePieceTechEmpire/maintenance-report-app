// lib/pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

export async function generateComplaintPDF(complaint: any, logoBytes?: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let currentPage = pdfDoc.addPage([600, 800])
  let y = 760

  // === HEADER SECTION ===
  y = await addHeader(pdfDoc, currentPage, y, font, fontBold, logoBytes)

  // === COMPLAINT DETAILS SECTION ===
  y = addSectionHeader(currentPage, y, 'MAKLUMAT ADUAN', fontBold)
  y = addComplaintDetails(currentPage, y, complaint, font, fontBold)

  // === INCIDENT DESCRIPTION ===
  y = addSectionHeader(currentPage, y, 'DETAIL ADUAN', fontBold)
  y = addParagraphBlock(currentPage, y, complaint.incident_description, font)

  // === SOLUTION SUGGESTION ===
  if (complaint.solution_suggestion) {
    y = addSectionHeader(currentPage, y, 'CADANGAN PENYELESAIAN', fontBold)
    y = addParagraphBlock(currentPage, y, complaint.solution_suggestion, font)
  }

  // === IMAGES SECTION ===
  if (complaint.image_urls && complaint.image_urls.length > 0) {
    await addComplaintImages(pdfDoc, currentPage, complaint, font, fontBold)
  }

  // === FOOTER SECTION ===
  addFooter(pdfDoc, font, fontBold)

  return await pdfDoc.save()
}

// -----------------------------
// HEADER
// -----------------------------
async function addHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  y: number,
  font: any,
  fontBold: any,
  logoBytes?: Uint8Array
): Promise<number> {
  const { width } = page.getSize()

  // Refined banner (slightly lighter blue and taller for breathing room)
  page.drawRectangle({
    x: 0,
    y: y - 80,
    width,
    height: 80,
    color: rgb(0.16, 0.35, 0.75),
  })

  // Optional logo (if you ever want to re-enable later)
  if (logoBytes) {
    try {
      const logo = await pdfDoc.embedPng(logoBytes)
      const logoDims = logo.scaleToFit(50, 50)
      page.drawImage(logo, {
        x: 40,
        y: y - 65,
        width: logoDims.width,
        height: logoDims.height,
      })
    } catch {
      console.warn('Logo embedding failed, continuing without it.')
    }
  }

  // Title – centered horizontally in banner
  const title = 'LAPORAN ADUAN PENYELENGGARAAN'
  const titleWidth = fontBold.widthOfTextAtSize(title, 16)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: y - 40,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // Subtext – date line just below title
  const subText = `Dijana pada: ${new Date().toLocaleDateString('ms-MY')}`
  const subTextWidth = font.widthOfTextAtSize(subText, 10)
  page.drawText(subText, {
    x: (width - subTextWidth) / 2,
    y: y - 58,
    size: 10,
    font,
    color: rgb(0.92, 0.92, 0.95),
  })

  // Add a thin bottom border for separation
  page.drawLine({
    start: { x: 40, y: y - 80 },
    end: { x: width - 40, y: y - 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })

  return y - 100 // Adjusted spacing before next section
}


// -----------------------------
// SECTION HEADER DESIGN
// -----------------------------
function addSectionHeader(page: PDFPage, y: number, title: string, fontBold: any): number {
  // Light background panel for section
  page.drawRectangle({
    x: 40,
    y: y - 25,
    width: 520,
    height: 30,
    color: rgb(0.93, 0.93, 0.95),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  })

  page.drawText(title, {
    x: 55,
    y: y - 18,
    size: 12,
    font: fontBold,
    color: rgb(0.18, 0.18, 0.18),
  })

  return y - 45
}

// -----------------------------
// COMPLAINT DETAILS SECTION
// -----------------------------
function addComplaintDetails(page: PDFPage, y: number, complaint: any, font: any, fontBold: any): number {
  const details = [
    { label: 'No. Aduan', value: complaint.id },
    { label: 'Nama Bangunan', value: complaint.building_name },
    { label: 'No Lot', value: complaint.incident_location },
    { label: 'Tarikh Kejadian', value: new Date(complaint.incident_date).toLocaleDateString('ms-MY') },
    { label: 'Nama Pengadu', value: complaint.reporter_name },
    { label: 'No. Telefon Pengadu', value: complaint.reporter_phone },
    { label: 'Dilaporkan Oleh', value: complaint.profiles?.full_name || 'N/A' },
    { label: 'Tarikh Laporan', value: new Date(complaint.created_at).toLocaleDateString('ms-MY') },
    { label: 'Status', value: complaint.status.toUpperCase() },
  ]

  details.forEach((item, idx) => {
    const bgColor = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.98, 0.98)
    page.drawRectangle({
      x: 40,
      y: y - 20,
      width: 520,
      height: 20,
      color: bgColor,
    })

    page.drawText(`${item.label}:`, {
      x: 55,
      y: y - 15,
      size: 10,
      font: fontBold,
      color: rgb(0.25, 0.25, 0.25),
    })
    page.drawText(item.value || '-', {
      x: 200,
      y: y - 15,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 20
  })

  return y - 10
}

// -----------------------------
// PARAGRAPH SECTION
// -----------------------------
function addParagraphBlock(page: PDFPage, y: number, text: string, font: any): number {
  const lines = wrapText(text || '-', 85)
  lines.forEach((line) => {
    page.drawText(line, { x: 55, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
    y -= 14
  })
  return y - 10
}

// -----------------------------
// FOOTER
// -----------------------------
function addFooter(pdfDoc: PDFDocument, font: any, fontBold: any): void {
  const pages = pdfDoc.getPages()
  pages.forEach((page, i) => {
    const { width } = page.getSize()
    // Footer line
    page.drawLine({
      start: { x: 40, y: 50 },
      end: { x: width - 40, y: 50 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })

    // Footer text
    page.drawText('Dokumen ini dijana secara automatik oleh Sistem Aduan Penyelenggaraan', {
      x: 110,
      y: 35,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })

    // Page number
    page.drawText(`Halaman ${i + 1} dari ${pages.length}`, {
      x: width - 120,
      y: 35,
      size: 8,
        font: fontBold, // ✅ Correct usage
      color: rgb(0.45, 0.45, 0.45),
    })
  })
}

// -----------------------------
// UTILITIES
// -----------------------------
function wrapText(text: string, maxLength: number): string[] {
  const words = (text || '').split(' ')
  const lines: string[] = []
  let current = ''
  words.forEach((w) => {
    if ((current + w).length > maxLength) {
      lines.push(current.trim())
      current = w + ' '
    } else current += w + ' '
  })
  if (current) lines.push(current.trim())
  return lines
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