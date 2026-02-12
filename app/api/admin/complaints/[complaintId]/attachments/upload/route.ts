import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"

const BUCKET = "admin-attachments"

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await ctx.params // ✅ IMPORTANT (params is Promise)
    const supabase = getSupabaseServer()

    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 })

    // super_admin check
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profErr) return NextResponse.json({ error: "Profile error" }, { status: 500 })
    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // validate
    const allowedExt = ["pdf", "csv", "xls", "xlsx", "doc", "docx"]
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!allowedExt.includes(ext)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
    const storagePath = `complaints/${complaintId}/${Date.now()}-${safeName}`

    const bytes = await file.arrayBuffer()

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: row, error: insErr } = await supabase
      .from("complaint_attachments")
      .insert([{
        complaint_id: complaintId,
        uploaded_by: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      }])
      .select()
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ success: true, attachment: row })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
