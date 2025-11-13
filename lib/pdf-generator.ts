// lib/pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'


/** ---------- COMPLAINT IMAGES (same layout style as completion) ---------- */
async function addComplaintImages(
  pdfDoc: PDFDocument,
  complaint: any,
  font: any,
  fontBold: any
): Promise<void> {

  let images = complaint.image_urls;
  if (!images || images.length === 0) return;

  // If stored as string
  if (typeof images === "string") {
    try { images = JSON.parse(images); }
    catch { console.error("Invalid complaint image JSON"); return; }
  }

  const pages = pdfDoc.getPages();
  const baseSize = pages[0].getSize();
  const pageWidth = baseSize.width;
  const pageHeight = baseSize.height;

  // Layout config
  const imagesPerRow = 2;
  const maxRowsPerPage = 3;
  const maxPerPage = 6;
  const imageBoxSize = 160;
  const horizontalSpacing = 20;
  const verticalBlockHeight = imageBoxSize + 40;
  const topStartY = 720;

  const gridWidth = imagesPerRow * imageBoxSize + (imagesPerRow - 1) * horizontalSpacing;
  const startX = (pageWidth - gridWidth) / 2;

  for (let i = 0; i < images.length; i++) {

    const pageIndex = Math.floor(i / maxPerPage);
    const indexOnPage = i % maxPerPage;
    const row = Math.floor(indexOnPage / imagesPerRow);
    const col = indexOnPage % imagesPerRow;

    // First image on the page → create new page
    if (indexOnPage === 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = topStartY;

      page.drawText(
        pageIndex === 0 ? "GAMBAR KEJADIAN" : "GAMBAR KEJADIAN (Sambungan)",
        {
          x: 55,
          y,
          size: 14,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1)
        }
      );

      y -= 40;

      complaint.__imgLayout = complaint.__imgLayout || {};
      complaint.__imgLayout[pageIndex] = { page, startY: y };
    }

    const { page, startY } = complaint.__imgLayout[pageIndex];

    const imgY = startY - row * verticalBlockHeight;
    const imgInfo = images[i];
    const xPos = startX + col * (imageBoxSize + horizontalSpacing);

    try {
      const bytes = await fetchImage(imgInfo.url);
      let obj;

      try { obj = await pdfDoc.embedJpg(bytes); }
      catch { obj = await pdfDoc.embedPng(bytes); }

      const scaled = obj.scaleToFit(imageBoxSize, imageBoxSize);
      const xOffset = (imageBoxSize - scaled.width) / 2;
      const yOffset = (imageBoxSize - scaled.height) / 2;

      // Border box
      page.drawRectangle({
        x: xPos,
        y: imgY - imageBoxSize,
        width: imageBoxSize,
        height: imageBoxSize,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1
      });

      // Image
      page.drawImage(obj, {
        x: xPos + xOffset,
        y: imgY - imageBoxSize + yOffset,
        width: scaled.width,
        height: scaled.height
      });

      // Caption
      if (imgInfo.caption) {
        const captionLines = wrapText(imgInfo.caption, 30);
        captionLines.forEach((line, idx) => {
          page.drawText(sanitizeText(line), {
            x: xPos,
            y: imgY - imageBoxSize - 15 - idx * 12,
            size: 8,
            font,
            color: rgb(0.3, 0.3, 0.3)
          });
        });
      }

    } catch (e) {
      console.error("Error loading complaint image", e);
    }
  }

  delete complaint.__imgLayout;
}


export async function generateComplaintPDF(
  complaint: any,
  logoBytes?: Uint8Array | null,
  companyName?: string
): Promise<Uint8Array> {


  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let currentPage = pdfDoc.addPage([600, 800])
  let y = 760

  // === HEADER SECTION ===
 y = await addHeader(pdfDoc, currentPage, y, font, fontBold, logoBytes, companyName)

  // === COMPLAINT DETAILS SECTION ===
  y = addSectionHeader(currentPage, y, 'MAKLUMAT ADUAN', fontBold)
  y = addComplaintDetails(currentPage, y, complaint, font, fontBold)

  // === INCIDENT DESCRIPTION ===
  y = addSectionHeader(currentPage, y, 'DETAIL ADUAN', fontBold)
  let result = addParagraphBlockWithPageBreak(pdfDoc, currentPage, y, complaint.incident_description, font)
currentPage = result.page
y = result.y

  // === SOLUTION SUGGESTION ===
  if (complaint.solution_suggestion) {
    y = addSectionHeader(currentPage, y, 'GERAKAN KERJA AWAL', fontBold)
    let result = addParagraphBlockWithPageBreak(pdfDoc, currentPage, y, complaint.solution_suggestion, font)
currentPage = result.page
y = result.y
  }

  // === IMAGES SECTION ===
  if (complaint.image_urls && complaint.image_urls.length > 0) {
    await addComplaintImages(pdfDoc, complaint, font, fontBold)
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
  logoBytes?: Uint8Array | null,
  companyName?: string
): Promise<number> {
  const { width } = page.getSize()

  // Refined banner (slightly lighter blue and taller for breathing room)
  page.drawRectangle({
    x: 0,
  y: y - 80, // shift a bit lower to fit the taller banner
  width,
  height: 80, // was 80
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

  // Company name (if provided)
if (companyName) {
  const companyWidth = fontBold.widthOfTextAtSize(companyName, 12)
  page.drawText(companyName, {
    x: (width - companyWidth) / 2,
    y: y - 75,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1),
  })
}

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


function sanitizeText(input: string) {
  if (!input) return ""
  return input
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
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
   page.drawText(sanitizeText(item.value) || '-', {
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
function addParagraphBlockWithPageBreak(
  pdfDoc: PDFDocument,
  page: PDFPage,
  y: number,
  text: string,
  font: any
): { page: PDFPage; y: number } {

  const lines = wrapText(text || "-", 85);

  const { height } = page.getSize();
  const minBottomMargin = 100;

  for (const line of lines) {
    if (y < minBottomMargin) {
      // New page
      page = pdfDoc.addPage([600, 800]);
      y = height - 70;
    }

    page.drawText(sanitizeText(line), {
      x: 55,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });

    y -= 14;
  }

  return { page, y: y - 10 };
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
  const sanitized = sanitizeText(text || "")
  const words = sanitized.split(" ")
  const lines: string[] = []
  let current = ""

  words.forEach((w) => {
    if ((current + w).length > maxLength) {
      lines.push(current.trim())
      current = w + " "
    } else current += w + " "
  })

  if (current) lines.push(current.trim())
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