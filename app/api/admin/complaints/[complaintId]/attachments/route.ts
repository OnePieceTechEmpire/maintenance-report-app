import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ complaintId: string }> }
) {
  const { complaintId } = await ctx.params
  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .from("complaint_attachments")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attachments: data })
}
