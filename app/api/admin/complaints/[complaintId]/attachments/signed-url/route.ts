import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"

const BUCKET = "admin-attachments"

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { storage_path } = await req.json()

  if (!storage_path) {
    return NextResponse.json({ error: "storage_path required" }, { status: 400 })
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storage_path, 60 * 10) // 10 min

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
