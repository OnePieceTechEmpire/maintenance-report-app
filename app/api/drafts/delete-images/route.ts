import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json()

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Invalid images data' },
        { status: 400 }
      )
    }

    const pathsToDelete = images.map((img: any) => img.storage_path).filter(Boolean)

    if (pathsToDelete.length > 0) {
      const { error } = await supabase.storage
        .from('draft-images')
        .remove(pathsToDelete)

      if (error) {
        console.error('Error deleting draft images:', error)
        return NextResponse.json(
          { error: 'Failed to delete images' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in delete-images API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}