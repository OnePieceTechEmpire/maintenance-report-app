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

    // Fetch complaint data with user info
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles:submitted_by (
          full_name
        )
      `)
      .eq('id', complaintId)
      .single()

    if (error || !complaint) {
      console.error('Complaint fetch error:', error)
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Generate PDF using the new function
    const pdfBytes = await generateComplaintPDF(complaint)
    const pdfBuffer = Buffer.from(pdfBytes)

    // Upload to Supabase Storage
    const fileName = `complaint-${complaintId}-${Date.now()}.pdf`
    
    console.log('Uploading PDF to storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 })
    }

    console.log('PDF uploaded successfully, getting public URL...')
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName)

    console.log('Public URL:', publicUrl)
    console.log('Updating complaint with PDF URL...')

    // Update complaint with PDF URL using service role
const { error: updateError } = await getSupabaseServer()
  .from('complaints')
  .update({ pdf_url: publicUrl })
  .eq('id', complaintId)

    if (updateError) {
      console.error('Update complaint error:', updateError)
      return NextResponse.json({ 
        error: `Failed to update complaint: ${updateError.message}` 
      }, { status: 500 })
    }

    console.log('Complaint updated successfully with PDF URL')

    return NextResponse.json({ 
      success: true, 
      pdfUrl: publicUrl,
      fileName 
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate PDF' 
    }, { status: 500 })
  }
}