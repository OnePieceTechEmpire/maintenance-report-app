// app/api/pdf/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, getSupabaseServer } from '@/lib/supabase'
import { generateComplaintPDF } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const { complaintId } = await request.json()

    if (!complaintId) {
      return NextResponse.json({ error: 'Complaint ID is required' }, { status: 400 })
    }

    // Fetch complaint + reporter profile + company name
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles:submitted_by (
          full_name,
          company_id
        ),
        companies:company_id (
          name
        )
      `)
      .eq('id', complaintId)
      .single()

    if (error || !complaint) {
      console.error('Complaint fetch error:', error)
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Extract company name safely
    const companyName = complaint.companies?.name || 'TANPA SYARIKAT'

    // Pass company name into PDF generator
    const pdfBytes = await generateComplaintPDF(complaint, null, companyName)
    const pdfBuffer = Buffer.from(pdfBytes)

    const fileName = `complaint-${complaintId}-${Date.now()}.pdf`

    // Upload PDF
    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName)

    // Update DB
    const { error: updateError } = await getSupabaseServer()
      .from('complaints')
      .update({ pdf_url: publicUrl })
      .eq('id', complaintId)

    if (updateError) {
      console.error('Update complaint error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      fileName
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
