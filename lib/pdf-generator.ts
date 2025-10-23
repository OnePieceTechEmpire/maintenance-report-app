// lib/pdf-generator.ts
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

export async function generateComplaintPDF(complaint: any): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  
  // Add a page
  const page = pdfDoc.addPage([600, 800])
  const { width, height } = page.getSize()
  
  // Get fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Set initial y position (starting from top)
  let y = height - 50
  
  // Header
  page.drawText('LAPORAN ADUAN PENYELENGGARAAN', {
    x: 50,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 30
  
  // Generation date
  page.drawText(`Generated on: ${new Date().toLocaleDateString('ms-MY')}`, {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 40
  
  // Line separator
  page.drawLine({
    start: { x: 50, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 30
  
  // Complaint Details Header
  page.drawText('MAKLUMAT ADUAN', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25
  
  // Complaint Details
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
    if (y < 100) {
      // Add new page if running out of space
      const newPage = pdfDoc.addPage([600, 800])
      y = height - 50
    }
    
    page.drawText(`${item.label}:`, {
      x: 50,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    
    page.drawText(item.value, {
      x: 200,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    
    y -= 20
  })
  
  y -= 20
  
  // Incident Description
  if (y < 150) {
    const newPage = pdfDoc.addPage([600, 800])
    y = height - 50
  }
  
  page.drawText('KETERANGAN KEJADIAN', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 25
  
  // Wrap text for description
  const description = complaint.incident_description
  const descriptionLines = wrapText(description, 80)
  
  descriptionLines.forEach(line => {
    if (y < 100) {
      const newPage = pdfDoc.addPage([600, 800])
      y = height - 50
    }
    
    page.drawText(line, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    y -= 15
  })
  
  y -= 20
  
  // Solution Suggestion
  if (complaint.solution_suggestion) {
    if (y < 150) {
      const newPage = pdfDoc.addPage([600, 800])
      y = height - 50
    }
    
    page.drawText('CADANGAN PENYELESAIAN', {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 25
    
    const solutionLines = wrapText(complaint.solution_suggestion, 80)
    
    solutionLines.forEach(line => {
      if (y < 100) {
        const newPage = pdfDoc.addPage([600, 800])
        y = height - 50
      }
      
      page.drawText(line, {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
      y -= 15
    })
  }
  
  // Footer on last page
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  
  lastPage.drawText(
    'Dokumen ini dijana secara automatik oleh Sistem Aduan Penyelenggaraan',
    {
      x: 50,
      y: 30,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  )
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

// Helper function to wrap text
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
  
  if (currentLine) {
    lines.push(currentLine.trim())
  }
  
  return lines
}