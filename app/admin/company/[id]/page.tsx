'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false)
const [attachmentsLoading, setAttachmentsLoading] = useState(false)
const [attachmentsList, setAttachmentsList] = useState<any[]>([])
const [activeComplaintForAttachments, setActiveComplaintForAttachments] = useState<any>(null)
const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)



  useEffect(() => {
    fetchCompanyData();
  }, []);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".dropdown-area")) {
      setOpenDropdown(null);
    }
  };
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}, []);

  const fetchCompanyData = async () => {
    setLoading(true);

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    const { data: complaintData } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles:submitted_by (full_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    setCompany(companyData);
    setComplaints(complaintData || []);
    setFiltered(complaintData || []);
    setLoading(false);
  };

  const applyFilter = (status: string) => {
    setActiveFilter(status);

    if (status === 'all') {
      setFiltered(complaints);
    } else {
      setFiltered(complaints.filter((c) => c.status === status));
    }
  };

  const STATUS_LABELS: Record<string, string> = {
  all: "Semua",
  pending: "Pending",
  completed: "Completed",
  draft: "Complain In Progress",
  draft_in_progress: "Completion In Progress"
};


  const statusBadge = (status: string) => {
    const map: any = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-50 text-blue-500',
      draft: 'bg-gray-100 text-gray-700',
      draft_in_progress: 'bg-gray-200 text-gray-800',
      completed: 'bg-green-100 text-green-700'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${map[status]}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const viewPDF = (url: string) => {
    if (!url) return alert('PDF not available yet.');
    window.open(url, '_blank');
  };

const viewCompletionPDF = async (completionId: string) => {
  try {
    const res = await fetch('/api/completion-pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionId }),
    })

    const result = await res.json()

    if (!res.ok || !result.pdfUrl) {
      throw new Error(result.error || 'PDF generation failed')
    }

    // ✅ SAME behavior as Lihat PDF Aduan
    viewPDF(result.pdfUrl)
  } catch (err) {
    console.error(err)
    alert('Completion PDF not available')
  }
}

  const viewReceipts = async (completionId: string) => {
    if (!completionId) return alert('Completion missing.');

    const { data } = await supabase
      .from('completions')
      .select('receipt_images')
      .eq('id', completionId)
      .single();

    if (!data?.receipt_images || data.receipt_images.length === 0) {
      return alert('No receipts uploaded.');
    }

    window.open(data.receipt_images[0].url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading company data...
      </div>
    );
  }



const uploadAdminAttachment = async (complaintId: string, file: File) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
  const storagePath = `complaints/${complaintId}/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from("admin-attachments")
    .upload(storagePath, file)

  if (upErr) throw upErr

  const { data } = supabase.storage
    .from("admin-attachments")
    .getPublicUrl(storagePath)

  const publicUrl = data.publicUrl

  const { error: insErr } = await supabase
    .from("complaint_attachments")
    .insert([{
      complaint_id: complaintId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      public_url: publicUrl,
    }])

  if (insErr) throw insErr
}


const fetchAdminAttachments = async (complaintId: string) => {
  const { data, error } = await supabase
    .from("complaint_attachments")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

const openAttachmentsModal = async (complaintRow: any) => {
  try {
    setAttachmentsModalOpen(true)
    setAttachmentsLoading(true)
    setActiveComplaintForAttachments(complaintRow)

    const list = await fetchAdminAttachments(complaintRow.id)
    setAttachmentsList(list)
  } catch (err: any) {
    alert(err.message || "Failed to fetch attachments")
    setAttachmentsModalOpen(false)
  } finally {
    setAttachmentsLoading(false)
  }
}

const viewAttachment = (url: string) => {
  if (!url) return alert("File URL missing")
  window.open(url, "_blank")
}

const downloadAttachment = async (url: string, filename: string) => {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const dlUrl = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = dlUrl
    a.download = filename || "attachment"
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(dlUrl)
  } catch {
    alert("Download failed")
  }
}

const deleteAttachment = async (att: any) => {
  const ok = confirm(`Padam lampiran ini?\n\n${att.file_name}`)
  if (!ok) return

  setDeletingAttachmentId(att.id)
  try {
    // 1) Remove file from storage
    const { error: storageErr } = await supabase.storage
      .from("admin-attachments")
      .remove([att.storage_path])

    if (storageErr) throw storageErr

    // 2) Remove DB record
    const { error: dbErr } = await supabase
      .from("complaint_attachments")
      .delete()
      .eq("id", att.id)

    if (dbErr) throw dbErr

    // 3) Update modal list
    setAttachmentsList((prev) => prev.filter((x) => x.id !== att.id))
  } catch (err: any) {
    alert(err.message || "Delete failed")
  } finally {
    setDeletingAttachmentId(null)
  }
}


  
      const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }

  return (
    <div className="min-h-screen bg-gray-50">
<header className="bg-white shadow">
  <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">

    <div className="flex items-center gap-4">
      <button
        onClick={() => router.push('/admin')}
        className="px-3 py-2 rounded hover:bg-gray-100 text-gray-600 flex items-center gap-2"
      >
        ← <span>Back</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
    </div>

    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      Logout
    </button>

  </div>
</header>

       <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

      <h1 className="text-2xl font-bold mb-2">{company?.name}</h1>
      <p className="text-gray-600 mb-6">Company ID: {companyId}</p>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total" value={complaints.length} color="bg-gray-500 text-white" />
        <StatCard title="Pending" value={complaints.filter(c => c.status === 'pending').length} color="bg-yellow-500 text-white" />
        <StatCard title="In Progress" value={complaints.filter(c => c.status === 'in_progress').length} color="bg-blue-500 text-white" />
        <StatCard title="Completed" value={complaints.filter(c => c.status === 'completed').length} color="bg-green-600 text-white" />
      </div>

      {/* Filters */}
<div className="-mx-4 px-4 mb-4 flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none]">

  {Object.keys(STATUS_LABELS).map((st) => (
    <button
      key={st}
      onClick={() => applyFilter(st)}
      className={`shrink-0 px-3 py-1 rounded-full text-sm border transition ${
        activeFilter === st
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
      }`}
    >
      {STATUS_LABELS[st]}
    </button>
  ))}
</div>

      {/* Complaint Table */}
      <div className="bg-white shadow rounded-lg">
  {/* horizontal scroll container */}
  <div className="-mx-4 sm:mx-0 overflow-x-auto">
    <div className="min-w-[760px] px-4 sm:px-0">
      <table className="w-full divide-y divide-gray-200">

          <thead className="bg-gray-50">
            <tr>
              <Th>Building</Th>
              <Th>Date</Th>
              <Th>Reporter</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.map((c, index) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <Td>{c.building_name}</Td>
                <Td>
  {new Date(
    c.report_date ?? c.created_at
  ).toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
</Td>

                <Td>{c.profiles?.full_name || '-'}</Td>
                <Td>{statusBadge(c.status)}</Td>

<td className="px-6 py-4 whitespace-nowrap text-sm dropdown-area">
  <div className="relative">

    {/* Toggle button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenDropdown(openDropdown === c.id ? null : c.id);
      }}
      className="p-2 rounded-md hover:bg-gray-100 transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-5 h-5 text-gray-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zm0 6a.75.75 0 110-1.5.75.75 0 010 1.5zm0 6a.75.75 0 110-1.5.75.75 0 010 1.5z"
        />
      </svg>
    </button>

    {/* Dropdown menu */}
    {openDropdown === c.id && (
      <div
  className={`absolute right-0 w-56 sm:w-48 bg-white shadow-lg border rounded-md z-30 py-1${
    // If near bottom, open upward
    index > complaints.length - 3 ? "bottom-full mb-2" : "mt-2"
  }`}
>
        {/* View Details (Admin Read-only) */}
<button
  onClick={() => {
    window.open(`/admin/complaints/${c.id}`, '_blank')
    setOpenDropdown(null)
  }}
  className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
>
  👁 Lihat Butiran
</button>



        {/* View Complaint PDF */}
        <button
          onClick={() => {
            viewPDF(c.pdf_url);
            setOpenDropdown(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Lihat PDF Aduan
        </button>

        {/* Completion */}
        {c.completion_id && (
          <button
            onClick={() => {
              viewCompletionPDF(c.completion_id);
              setOpenDropdown(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Lihat Completion
          </button>
        )}

        {/* Receipt */}
        {c.completion_id && (
          <button
            onClick={() => {
              viewReceipts(c.completion_id);
              setOpenDropdown(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Lihat Resit
          </button>

        )}
        {/* 📎 Upload attachment */}
<label className="block w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer">
  📎 Upload BQ / Dokumen
  <input
    type="file"
    className="hidden"
    accept=".pdf,.csv,.xls,.xlsx,.doc,.docx"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        await uploadAdminAttachment(c.id, file)
        alert("Uploaded ✅")
      } catch (err: any) {
        alert(err.message || "Upload failed")
      } finally {
        e.currentTarget.value = ""
        setOpenDropdown(null)
      }
    }}
  />
</label>


{/* 📂 View attachments (open latest for now) */}
<button
  onClick={() => {
    openAttachmentsModal(c)
    setOpenDropdown(null)
  }}
  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
>
  📂 Lihat Lampiran
</button>



      </div>
    )}
  </div>
</td>


              </tr>
            ))}
          </tbody>
        </table>

        {attachmentsModalOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onClick={() => setAttachmentsModalOpen(false)}
  >
    <div
      className="w-full max-w-2xl rounded-lg bg-white shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-sm text-gray-500">Lampiran Aduan</div>
          <div className="text-lg font-semibold text-gray-800">
            {activeComplaintForAttachments?.building_name || "—"}
          </div>
          <div className="text-xs text-gray-500">
            ID: {activeComplaintForAttachments?.id || "—"}
          </div>
        </div>

        <button
          onClick={() => setAttachmentsModalOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {attachmentsLoading ? (
          <div className="text-sm text-gray-500">Loading attachments...</div>
        ) : attachmentsList.length === 0 ? (
          <div className="text-sm text-gray-500">Tiada lampiran dimuat naik.</div>
        ) : (
          <div className="space-y-2">
            {attachmentsList.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800">
                    {att.file_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(att.created_at).toLocaleString("ms-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                    })}
                    {att.file_size ? ` • ${(att.file_size / 1024).toFixed(1)} KB` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => viewAttachment(att.public_url)}
                    className="rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
                  >
                    View
                  </button>

                  <button
                    onClick={() => downloadAttachment(att.public_url, att.file_name)}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    Download
                  </button>

                  <button
                    disabled={deletingAttachmentId === att.id}
                    onClick={() => deleteAttachment(att)}
                    className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingAttachmentId === att.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <button
          onClick={() => setAttachmentsModalOpen(false)}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      </div>
        </div>
</div>
            </main>
    </div>
    
  );
}

// Table helpers
function Th({ children }: any) {
  return (
    <th className="px-3 sm:px-6 py-3 text-left text-[11px] font-bold text-gray-600 uppercase bg-gray-50 sticky top-0 z-10">
      {children}
    </th>
  );
}

function Td({ children }: any) {
  return (
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-800">
      {children}
    </td>
  );
}


// Stat card
function StatCard({ title, value, color }: any) {
  return (
    <div className={`p-4 rounded-lg shadow text-center ${color}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-sm">{title}</div>
    </div>
  );
}
