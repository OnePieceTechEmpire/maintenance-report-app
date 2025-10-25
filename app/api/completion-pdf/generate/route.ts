// app/api/completion-pdf/generate/route.ts - updated version
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateCompletionPDF } from '@/lib/completion-pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const { completionId } = await request.json()

    if (!completionId) {
      return NextResponse.json({ error: 'Completion ID is required' }, { status: 400 })
    }

    console.log('🔵 Generating completion PDF for:', completionId)

    // Fetch completion data
    const { data: completion, error: completionError } = await supabase
      .from('completions')
      .select('*')
      .eq('id', completionId)
      .single()

    if (completionError || !completion) {
      console.error('❌ Completion fetch error:', completionError)
      return NextResponse.json({ error: 'Completion not found' }, { status: 404 })
    }

    // Fetch user who completed it
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', completion.completed_by)
      .single()

    // Fetch related complaint for context
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('building_name, incident_description')
      .eq('id', completion.complaint_id)
      .single()

    // Combine all data
    const completionWithRelations = {
      ...completion,
      profiles: user || { full_name: 'Unknown' },
      complaints: complaint || { building_name: 'Unknown', incident_description: 'Unknown' }
    }

    console.log('✅ Data fetched, generating PDF...')

    // Generate PDF
    const pdfBytes = await generateCompletionPDF(completionWithRelations)
    const pdfBuffer = Buffer.from(pdfBytes)

    console.log('✅ PDF generated, uploading to storage...')

    // Upload to Supabase Storage
    const fileName = `completion-${completionId}-${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError)
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName)

    console.log('✅ Completion PDF uploaded:', publicUrl)

    return NextResponse.json({ 
      success: true, 
      pdfUrl: publicUrl,
      fileName 
    })

  } catch (error: any) {
    console.error('❌ Completion PDF generation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate completion PDF' 
    }, { status: 500 })
  }
}