// lib/completion-pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

/** ---------- UTIL: TEXT WRAP ---------- */
function wrapText(text: string, maxLength: number): string[] {
  if (!text) return []

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
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

/** ---------- HEADER (match complaint style) ---------- */
async function addHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  y: number,
  font: any,
  fontBold: any
): Promise<number> {
  const { width } = page.getSize()

  // Blue banner
  page.drawRectangle({
    x: 0,
    y: y - 80,
    width,
    height: 80,
    color: rgb(0.16, 0.35, 0.75),
  })

  // Title
  const title = 'LAPORAN PENYELESAIAN KERJA'
  const titleWidth = fontBold.widthOfTextAtSize(title, 16)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: y - 40,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // Subtext
  const subText = `Dijana pada: ${new Date().toLocaleDateString('ms-MY')}`
  const subTextWidth = font.widthOfTextAtSize(subText, 10)
  page.drawText(subText, {
    x: (width - subTextWidth) / 2,
    y: y - 58,
    size: 10,
    font,
    color: rgb(0.92, 0.92, 0.95),
  })

  // Bottom border
  page.drawLine({
    start: { x: 40, y: y - 80 },
    end: { x: width - 40, y: y - 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })

  return y - 100
}

/** ---------- SECTION HEADER (grey bar) ---------- */
function addSectionHeader(page: PDFPage, y: number, title: string, fontBold: any): number {
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

/** ---------- COMPLETION DETAILS TABLE ---------- */
function addCompletionDetails(
  page: PDFPage,
  y: number,
  completion: any,
  font: any,
  fontBold: any
): number {
  const details = [
    { label: 'No. Rujukan', value: completion.id },
    { label: 'Tajuk Kerja', value: completion.work_title },
    { label: 'Tempat / Lokasi', value: completion.work_location },
    {
      label: 'Tarikh Siap',
      value: completion.completion_date
        ? new Date(completion.completion_date).toLocaleDateString('ms-MY')
        : '-',
    },
    //{ label: 'Nama Syarikat', value: completion.company_name },
    { label: 'No. Arahan Kerja', value: completion.work_order_number || 'Tiada' },
   // { label: 'Nama Pegawai', value: completion.officer_name },
    { label: 'Nama Staff', value: completion.supervisor_name },
    {
      label: 'Bil Pekerja',
      value: completion.worker_count ? completion.worker_count.toString() : 'Tiada',
    },
    //{ label: 'Disiapkan Oleh', value: completion.profiles?.full_name || 'N/A' },
    {
      label: 'Tarikh Rekod',
      value: completion.created_at
        ? new Date(completion.created_at).toLocaleDateString('ms-MY')
        : '-',
    },
    {
      label: 'Untuk Aduan',
      value: completion.complaints?.building_name || 'N/A',
    },
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

/** ---------- PARAGRAPH BLOCK (like complaint) ---------- */
function addParagraphBlock(page: PDFPage, y: number, text: string, font: any): number {
  const lines = wrapText(text || '-', 85)
  lines.forEach((line) => {
    page.drawText(line, {
      x: 55,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 14
  })
  return y - 10
}

/** ---------- FOOTER WITH PAGE NUMBERS ---------- */
function addFooter(pdfDoc: PDFDocument, font: any, fontBold: any): void {
  const pages = pdfDoc.getPages()
  pages.forEach((page, i) => {
    const { width } = page.getSize()

    // Line
    page.drawLine({
      start: { x: 40, y: 50 },
      end: { x: width - 40, y: 50 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })

    // Footer text
    page.drawText(
      'Dokumen ini dijana secara automatik oleh Sistem Aduan Penyelenggaraan',
      {
        x: 110,
        y: 35,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.45),
      }
    )

    // Page number
    page.drawText(`Halaman ${i + 1} dari ${pages.length}`, {
      x: width - 120,
      y: 35,
      size: 8,
      font: fontBold,
      color: rgb(0.45, 0.45, 0.45),
    })
  })
}

/** ---------- FETCH IMAGE (with basic error) ---------- */
async function fetchImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/** ---------- COMPLETION IMAGES (separate pages, centered, max 6 per page) ---------- */
async function addCompletionImages(
  pdfDoc: PDFDocument,
  completion: any,
  font: any,
  fontBold: any
): Promise<void> {
  let images = completion.completion_images

  if (!images) return

  // If stored as JSON string, parse first
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images)
    } catch (e) {
      console.error('Invalid completion_images JSON:', images)
      return
    }
  }

  // Only completion photos (ignore receipts)
  const completionImages = images.filter((img: any) => img.type === 'completion')
  if (!completionImages.length) return

  const pages = pdfDoc.getPages()
  const basePageSize = pages[0].getSize()
  const pageWidth = basePageSize.width
  const pageHeight = basePageSize.height

  // Layout config
  const imagesPerRow = 2
  const maxRowsPerPage = 3
  const maxPerPage = imagesPerRow * maxRowsPerPage // 6
  const imageBoxSize = 160
  const horizontalSpacing = 20
  const verticalBlockHeight = imageBoxSize + 40 // image + caption/label
  const topStartY = 720

  // Total grid width so we can center it
  const gridWidth = imagesPerRow * imageBoxSize + (imagesPerRow - 1) * horizontalSpacing
  const startX = (pageWidth - gridWidth) / 2

  for (let i = 0; i < completionImages.length; i++) {
    const pageIndex = Math.floor(i / maxPerPage) // which images page
    const indexOnPage = i % maxPerPage
    const row = Math.floor(indexOnPage / imagesPerRow)
    const col = indexOnPage % imagesPerRow

    // If first image on this "images page", create page + header
    if (indexOnPage === 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      let y = topStartY

      page.drawText(
        pageIndex === 0 ? 'GAMBAR PENYELESAIAN' : 'GAMBAR PENYELESAIAN (Sambungan)',
        {
          x: 55,
          y,
          size: 14,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        }
      )
      y -= 40

      // Store this startY in completion object so we don't re-calc each time
      completion.__imagesLayout = completion.__imagesLayout || {}
      completion.__imagesLayout[pageIndex] = { page, startY: y }
    }

    const { page, startY } = completion.__imagesLayout[pageIndex]
    const imageData = completionImages[i]

    const xPos = startX + col * (imageBoxSize + horizontalSpacing)
    const currentY = startY - row * verticalBlockHeight

    try {
      const imageBytes = await fetchImage(imageData.url)
      let image: any

      try {
        image = await pdfDoc.embedJpg(imageBytes)
      } catch {
        image = await pdfDoc.embedPng(imageBytes)
      }

      // Scale to fit square
      const scaledDims = image.scaleToFit(imageBoxSize, imageBoxSize)
      const xOffset = (imageBoxSize - scaledDims.width) / 2
      const yOffset = (imageBoxSize - scaledDims.height) / 2

      // Border box
      page.drawRectangle({
        x: xPos,
        y: currentY - imageBoxSize,
        width: imageBoxSize,
        height: imageBoxSize,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })

      // Image
      page.drawImage(image, {
        x: xPos + xOffset,
        y: currentY - imageBoxSize + yOffset,
        width: scaledDims.width,
        height: scaledDims.height,
      })

      // Caption
      if (imageData.caption) {
        const captionLines = wrapText(imageData.caption, 30)
        captionLines.forEach((line: string, lineIndex: number) => {
          page.drawText(line, {
            x: xPos,
            y: currentY - imageBoxSize - 15 - lineIndex * 12,
            size: 8,
            font,
            color: rgb(0.3, 0.3, 0.3),
          })
        })
      }

      // Image number
    //  page.drawText(`Gambar ${i + 1}`, {
      //  x: xPos,
       // y:
      //    currentY -
        //  imageBoxSize -
        //  ((imageData.caption ? wrapText(imageData.caption, 30).length : 0) * 12) -
      //    25,
    //    size: 7,
      //  font,
     //   color: rgb(0.4, 0.4, 0.4),
     // })
    } catch (error) {
      console.error('Error processing completion image:', imageData.url, error)
      // Placeholder if fail
      page.drawRectangle({
        x: xPos,
        y: currentY - imageBoxSize,
        width: imageBoxSize,
        height: imageBoxSize,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 0.95),
      })

      page.drawText('Gagal Muat', {
        x: xPos + imageBoxSize / 2 - 20,
        y: currentY - imageBoxSize / 2 - 5,
        size: 10,
        font,
        color: rgb(0.6, 0.6, 0.6),
      })

      page.drawText(`Gambar ${i + 1}`, {
        x: xPos,
        y: currentY - imageBoxSize - 15,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
    }
  }

  // Clean temp layout
  delete completion.__imagesLayout
}

/** ---------- MAIN EXPORT ---------- */
export async function generateCompletionPDF(completion: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([600, 800])
  const { height } = page.getSize()
  let y = height - 40

  // HEADER
  y = await addHeader(pdfDoc, page, y, font, fontBold)

  // SECTION: MAKLUMAT PENYELESAIAN
  y = addSectionHeader(page, y, 'MAKLUMAT PENYELESAIAN', fontBold)
  y = addCompletionDetails(page, y, completion, font, fontBold)

  // SECTION: SKOP KERJA
  if (y < 200) {
    page = pdfDoc.addPage([600, 800])
    const size = page.getSize()
    y = size.height - 60
  }
  y = addSectionHeader(page, y, 'SKOP KERJA', fontBold)
  y = addParagraphBlock(page, y, completion.work_scope, font)

  // SECTION: MAKLUMAT TAMBAHAN
  if (completion.quantity || completion.materials_equipment) {
    if (y < 200) {
      page = pdfDoc.addPage([600, 800])
      const size = page.getSize()
      y = size.height - 60
    }

    y = addSectionHeader(page, y, 'MAKLUMAT TAMBAHAN', fontBold)

    if (completion.quantity) {
      page.drawText('Kuantiti:', {
        x: 55,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      page.drawText(completion.quantity, {
        x: 150,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
      y -= 18
    }

    if (completion.materials_equipment) {
      page.drawText('Bahan & Peralatan:', {
        x: 55,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      y -= 16
      const materialLines = wrapText(completion.materials_equipment, 80)
      materialLines.forEach((line) => {
        page.drawText(line, {
          x: 70,
          y,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        })
        y -= 14
      })
      y -= 6
    }
  }


  // IMAGES (always start on new pages, only type === "completion")
  await addCompletionImages(pdfDoc, completion, font, fontBold)

  // FOOTER on all pages
  addFooter(pdfDoc, font, fontBold)

  return await pdfDoc.save()
}
