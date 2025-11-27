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
  fontBold: any,
  completion?: any
): Promise<number> {

  const { width } = page.getSize()

  // Blue banner
  page.drawRectangle({
    x: 0,
    y: y - 90,
    width,
    height: 90,
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

  // Date
  const dateText = `Dijana pada: ${new Date().toLocaleDateString('ms-MY')}`
  const dateWidth = font.widthOfTextAtSize(dateText, 10)
  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: y - 58,
    size: 10,
    font,
    color: rgb(0.92, 0.92, 0.95),
  })

  // 🔥 NEW — COMPANY NAME
  const comp = completion?.company_name || "Tidak dinyatakan"
  const compText = `Syarikat: ${comp}`
  const compWidth = font.widthOfTextAtSize(compText, 10)

  page.drawText(compText, {
    x: (width - compWidth) / 2,
    y: y - 74,
    size: 10,
    font,
    color: rgb(0.92, 0.92, 0.95),
  })

  return y - 110
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
/** ---------- BEFORE & AFTER IMAGE LAYOUT ---------- */
async function addCompletionImages(
  pdfDoc: PDFDocument,
  completion: any,
  font: any,
  fontBold: any
): Promise<void> {

  let images = completion.completion_images;
  if (!images) return;

  if (typeof images === "string") {
    try { images = JSON.parse(images); } catch { return; }
  }

  const beforeImages = images.filter((img: any) => img.type === "before");
  const afterImages  = images.filter((img: any) => img.type === "after");

  const pages = pdfDoc.getPages();
  const { width, height } = pages[0].getSize();

  // 🔥 NEW smaller box
  const boxSize = 145;

  // 🔥 More efficient spacing
  const rowSpacing = 20;
  const captionHeight = 35;

  const startY = 720;

  const leftX  = 60;
  const rightX = width - boxSize - 60;

  const maxRows = 3;
  const totalPairs = Math.max(beforeImages.length, afterImages.length);

  for (let i = 0; i < totalPairs; i++) {
    const rowIndex = i % maxRows;
    const pageIndex = Math.floor(i / maxRows);

    if (rowIndex === 0) {
      const page = pdfDoc.addPage([width, height]);
      let y = startY;

      const title = "GAMBAR SEBELUM DAN SELEPAS KERJA";
      const tW = fontBold.widthOfTextAtSize(title, 14);

      page.drawText(title, {
        x: (width - tW) / 2,
        y,
        size: 14,
        font: fontBold,
      });

      y -= 40;

      page.drawText("Sebelum", { x: leftX, y, size: 11, font: fontBold });
      page.drawText("Selepas", { x: rightX, y, size: 11, font: fontBold });

      y -= 25;

      completion.__pageData ??= {};
      completion.__pageData[pageIndex] = { page, y };
    }

    const { page, y } = completion.__pageData[pageIndex];
    const rowY = y - rowIndex * (boxSize + captionHeight + rowSpacing);

    await drawImageBox(pdfDoc, page, beforeImages[i], leftX, rowY, boxSize, font);
    await drawImageBox(pdfDoc, page, afterImages[i], rightX, rowY, boxSize, font);
  }

  delete completion.__pageData;
}



/** Renders 1 image box with caption */
async function drawImageBox(
  pdfDoc: PDFDocument,
  page: PDFPage,
  imgData: any,
  x: number,
  y: number,
  size: number,
  font: any
) {
  const captionHeight = 40;

  if (!imgData) {
    page.drawRectangle({
      x,
      y: y - size,
      width: size,
      height: size,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    return;
  }

  try {
    const bytes = await fetchImage(imgData.url);
    let img;
    try { img = await pdfDoc.embedJpg(bytes); }
    catch { img = await pdfDoc.embedPng(bytes); }

    const scaled = img.scaleToFit(size, size);
    const xOff = (size - scaled.width) / 2;
    const yOff = (size - scaled.height) / 2;

    // Image border
    page.drawRectangle({
      x,
      y: y - size,
      width: size,
      height: size,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    // Image
    page.drawImage(img, {
      x: x + xOff,
      y: y - size + yOff,
      width: scaled.width,
      height: scaled.height,
    });

    // 🔥 CAPTION BACKGROUND BLOCK
    page.drawRectangle({
      x,
      y: y - size - captionHeight,
      width: size,
      height: captionHeight - 5,
      color: rgb(0.94, 0.94, 0.94),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.8,
    });

    // Caption text
    if (imgData.caption) {
      const lines = wrapText(imgData.caption, 32);

      lines.forEach((line, i) => {
        page.drawText(line, {
          x: x + 5,
          y: y - size - 18 - i * 10,
          size: 8,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });
    }

  } catch (err) {
    console.error("Image error", err);
  }
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
  y = await addHeader(pdfDoc, page, y, font, fontBold, completion)

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



  return await pdfDoc.save()
}
