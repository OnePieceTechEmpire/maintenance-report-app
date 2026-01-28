// app/pm/[companyId]/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ComplaintStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'in_progress'
  | string

type PMComplaint = {
  id: string
  building_name: string
  incident_location: string
  incident_description: string
  incident_date: string
  status: ComplaintStatus
  created_at: string

  pdf_url?: string | null            // ✅ ADD THIS
  image_urls?: any[] | null          // ✅ ADD THIS
  completion_id?: string | null

  submitted_by?: string | null
  submitted_by_username?: string | null

  hasCompletionDraft?: boolean
  completionDraftOwnerId?: string | null
  completionDraftOwnerName?: string | null
  draftId?: string | null
}



type PMCompletionDraft = {
  id: string
  complaint_id: string
  user_id: string
  profiles?: {
    full_name?: string | null
  } | null
}

export default function PMCompanyDashboard() {
  const router = useRouter()
  const params = useParams() as { companyId: string }
  const companyId = params.companyId

  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [complaints, setComplaints] = useState<PMComplaint[]>([])
  const [completionDrafts, setCompletionDrafts] = useState<PMCompletionDraft[]>([])
  const [drafts, setDrafts] = useState<any[]>([])
const [activeTab, setActiveTab] = useState<'complaints' | 'drafts'>('complaints')

const [openDropdown, setOpenDropdown] = useState<string | null>(null)
const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
const [receiptViewerImages, setReceiptViewerImages] = useState<string[]>([])
const [zoomedReceipt, setZoomedReceipt] = useState<string | null>(null)



  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<
    'all' | ComplaintStatus
  >('all')

  // 🔐 Check PM / Super Admin & load data
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        router.push('/login')
        return
      }

      if (profile.role !== 'project_manager' && profile.role !== 'super_admin') {
        alert('Access denied. Project Manager / HQ only.')
        router.push('/dashboard')
        return
      }

      setUserRole(profile.role)

      // Get company name (for header)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()

      if (companyError || !company) {
        alert('Syarikat tidak dijumpai')
        router.push('/pm')
        return
      }

      setCompanyName(company.name)

      await fetchComplaintsForCompany(user.id, companyId)
      await fetchPMDrafts(user.id, companyId)
      setLoading(false)
    }

    if (companyId) {
      init()
    }
  }, [companyId, router])

  // 🔄 Fetch complaints + drafts for this company
  const fetchComplaintsForCompany = async (
    currentUserId: string,
    targetCompanyId: string
  ) => {
    try {
      setLoading(true)

      // 1) Complaints for this company
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select(
          `
          *,
          profiles:submitted_by (
            full_name,
            username
          )
        `
        )
        .eq('company_id', targetCompanyId)
        .order('created_at', { ascending: false })

      if (complaintsError) throw complaintsError

      const complaintIds = (complaintsData || []).map((c) => c.id)
      if (complaintIds.length === 0) {
        setComplaints([])
        setCompletionDrafts([])
        return
      }
      
      

      // 2) Completion drafts for complaints in this company (any user)
      const { data: draftsData, error: draftsError } = await supabase
        .from('completion_drafts')
        .select(
          `
          id,
          complaint_id,
          user_id,
          profiles:user_id (
            full_name
          )
        `
        )
        .in('complaint_id', complaintIds)

      if (draftsError) {
        console.error('Error fetching completion drafts for PM:', draftsError)
      }

      

      const draftsByComplaint: Record<string, PMCompletionDraft> = {}

      ;(draftsData || []).forEach((draft: any) => {
        draftsByComplaint[draft.complaint_id] = {
          id: draft.id,
          complaint_id: draft.complaint_id,
          user_id: draft.user_id,
          profiles: draft.profiles,
        }
      })

const enriched: PMComplaint[] = (complaintsData || []).map((c: any) => {
  const draft = draftsByComplaint[c.id]

  return {
    id: c.id,
    building_name: c.building_name,
    incident_location: c.incident_location,
    incident_description: c.incident_description,
    incident_date: c.incident_date,
    status: c.status,
    created_at: c.created_at,

    // ⭐ ADD THESE TWO
    pdf_url: c.pdf_url ?? null,
    image_urls: c.image_urls ?? null,

    completion_id: c.completion_id ?? null,

    submitted_by: c.profiles?.full_name ?? null,
    submitted_by_username: c.profiles?.username ?? null,

    hasCompletionDraft: !!draft,
    completionDraftOwnerId: draft?.user_id ?? null,
    completionDraftOwnerName: draft?.profiles?.full_name ?? null,
    draftId: draft?.id ?? null,
  }
})



      setComplaints(enriched)
      setCompletionDrafts((draftsData || []) as PMCompletionDraft[])
    } catch (err) {
      console.error('Error fetching complaints for PM:', err)
    } finally {
      setLoading(false)
    }
  }


const fetchPMDrafts = async (userId: string, companyId: string) => {
  const { data, error } = await supabase
    .from("complaint_drafts")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading PM drafts:", error);
    return;
  }

  setDrafts(data || []);
};




  const handleMarkComplete = (complaint: PMComplaint) => {
    if (!userId) return

    // If got draft
    if (complaint.hasCompletionDraft && complaint.completionDraftOwnerId) {
      if (complaint.completionDraftOwnerId === userId) {
        // PM is the one who created the draft → can continue that draft
        if (!complaint.draftId) {
          alert('Ralat: ID draf tidak dijumpai.')
          return
        }

        router.push(
          `/completions/new?complaintId=${complaint.id}&draftId=${complaint.draftId}&companyId=${companyId}`
        )
      } else {
        // Draft belongs to another staff → PM cannot continue it
        alert(
          `Terdapat draf penyelesaian oleh ${
            complaint.completionDraftOwnerName || 'staf lain'
          }.\n\n` +
            `PM tidak boleh sambung draf tersebut. Mohon staf berkenaan padam / submit draf dahulu.`
        )
        return
      }
    } else {
      // No draft → PM can create completion normally
      router.push(
        `/completions/new?complaintId=${complaint.id}&companyId=${companyId}`
      )
    }
  }


const downloadPDF = async (pdfUrl: string | undefined, fileName: string) => {
  if (!pdfUrl) return;

  try {
    const response = await fetch(pdfUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Download failed:", error)
    window.open(pdfUrl, "_blank")
  }
}








const downloadCompletionPDF = async (completionId: string, fileName: string) => {
  try {
    const response = await fetch("/api/completion-pdf/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId }),
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error)

    await downloadPDF(result.pdfUrl, fileName)
    setOpenDropdown(null)
  } catch (err) {
    console.error(err)
    alert("Failed to download completion PDF")
  }
}


const viewReceipts = async (completionId: string) => {
  try {
    const { data: completion, error } = await supabase
      .from("completions")
      .select("completion_images")
      .eq("id", completionId)
      .single()

    if (error) throw error

    let images = completion.completion_images

    if (typeof images === "string") {
      images = JSON.parse(images)
    }

    const receiptImages = images.filter((img: any) => img.type === "receipt")

    if (receiptImages.length === 0) {
      alert("Tiada resit untuk aduan ini")
      return
    }

    setReceiptViewerImages(receiptImages.map((i: any) => i.url))
    setReceiptViewerOpen(true)
  } catch (err) {
    console.error(err)
    alert("Gagal memuat resit")
  }
}






  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard syarikat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Project Manager View
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Dashboard – {companyName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Anda sedang melihat semua aduan & penyelesaian untuk syarikat ini.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/pm')}
              className="px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-100"
            >
              Tukar Syarikat
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">


          <button
            // PM creates complaint for this specific company
            onClick={() => router.push(`/complaints?companyId=${companyId}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            + Aduan Baharu
          </button>
        </div>


        <div className="mb-6 border-b border-gray-200">
  <nav className="-mb-px flex space-x-8">
    
    <button
      onClick={() => setActiveTab('complaints')}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'complaints'
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Complaints ({complaints.length})
    </button>

    <button
      onClick={() => setActiveTab('drafts')}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'drafts'
          ? 'border-yellow-500 text-yellow-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Complaint Drafts ({drafts.length})
    </button>

  </nav>
</div>


        
{/* Complaints Table (Tab 1) */}
{activeTab === "complaints" && (
<div className="bg-white shadow rounded-lg">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">

      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Tarikh
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Bangunan / Lokasi
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Dilaporkan Oleh
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Tindakan
          </th>
        </tr>
      </thead>

      <tbody className="bg-white divide-y divide-gray-200">
        {filteredComplaints.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
              Tiada aduan buat masa ini untuk syarikat ini.
            </td>
          </tr>
        ) : (
          filteredComplaints.map((complaint: PMComplaint) => {
            const created = new Date(complaint.created_at)
            const isCompleted = complaint.status === 'completed'
            const isPending = complaint.status === 'pending'
            const hasDraft = complaint.hasCompletionDraft
            const isMyDraft = hasDraft && complaint.completionDraftOwnerId === userId

            let statusLabel = ''
            let statusClass = ''

            if (isCompleted) {
              statusLabel = 'Selesai'
              statusClass = 'bg-green-100 text-green-800 border border-green-200'
            } else if (isPending && hasDraft) {
              statusLabel = isMyDraft
                ? 'Draf Anda (Belum Submit)'
                : `Draf oleh ${complaint.completionDraftOwnerName || 'staf lain'}`
              statusClass = 'bg-blue-50 text-blue-800 border border-blue-200'
            } else if (isPending) {
              statusLabel = 'Pending'
              statusClass = 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            } else {
              statusLabel = complaint.status
              statusClass = 'bg-gray-50 text-gray-700 border border-gray-200'
            }

            return (
              <tr key={complaint.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {created.toLocaleDateString('ms-MY')}
                </td>

                <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 min-w-[140px]">

                  <div className="font-medium">{complaint.building_name}</div>
                  <div className="text-xs text-gray-500">{complaint.incident_location}</div>
                </td>

                <td className="px-4 py-3 text-xs sm:text-sm text-gray-700 min-w-[120px]">

                  <div>{complaint.submitted_by || '-'}</div>
                  {complaint.submitted_by_username && (
                    <div className="text-xs text-gray-400">@{complaint.submitted_by_username}</div>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm">
<span
  onClick={() => {
    if (isCompleted) return; // ❌ Completed = not clickable
    handleMarkComplete(complaint); // ✅ Pending or Draft = go to completion
  }}
  className={`
    inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass}
    ${!isCompleted ? "cursor-pointer hover:opacity-80" : "cursor-default"}
  `}
>
  {statusLabel}
</span>

                </td>

<td className="px-6 py-4 whitespace-nowrap text-right text-sm">

  <div className="flex items-center justify-end gap-2">



    {/* 🔽 ACTION DROPDOWN — same as staff */}
    <div className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpenDropdown(openDropdown === complaint.id ? null : complaint.id)
        }}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs flex items-center gap-1"
      >
        Action ▼
      </button>

      {openDropdown === complaint.id && (
        <div className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1">

            {/* PDF Aduan */}
<button
  onClick={() => {
    downloadPDF(
      complaint.pdf_url!, 
      `Complaint-${complaint.building_name}.pdf`
    )
    setOpenDropdown(null)
  }}
  className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
  disabled={!complaint.pdf_url}
            >
              PDF Aduan
            </button>

            {/* ✏️ Edit Complaint */}
<button
  onClick={() => {
    router.push(`/complaints/edit/${complaint.id}?companyId=${companyId}`)


    setOpenDropdown(null)
  }}
  className="block w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 text-left"
>
  Edit Aduan
</button>

            {/* PDF Penyelesaian */}
{isCompleted && complaint.completion_id && (
  <button
    onClick={() => {
      downloadCompletionPDF(
        complaint.completion_id!,   // ← FIX
        `Completion-${complaint.building_name}.pdf`
      )
      setOpenDropdown(null)
    }}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                PDF Penyelesaian
              </button>
            )}

                        {isCompleted && complaint.completion_id && (
  <button
    onClick={() => {
      router.push(`/completions/new?completionId=${complaint.completion_id}&companyId=${companyId}`)

      setOpenDropdown(null)
    }}
    className="block w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 text-left"
  >
    Edit Penyelesaian
  </button>
)}

            {/* Lihat Resit */}
            {isCompleted && (
              <button
                onClick={() => {
                  viewReceipts(complaint.completion_id!)
                  setOpenDropdown(null)
                }}
                className="block w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 text-left"
              >
                Lihat Resit
              </button>
            )}




            {receiptViewerOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-4 max-w-3xl w-full shadow-lg relative">

      <button
        onClick={() => setReceiptViewerOpen(false)}
        className="absolute top-2 right-2 text-gray-600 hover:text-black"
      >
        ✕
      </button>

      <h2 className="text-lg font-semibold mb-4">Resit Pembelian</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {receiptViewerImages.map((url, index) => (
          <div
            key={index}
            className="cursor-pointer border rounded-lg overflow-hidden hover:opacity-80"
            onClick={() => setZoomedReceipt(url)}
          >
            <img src={url} className="w-full h-32 object-cover" />
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{zoomedReceipt && (
  <div
    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
    onClick={() => setZoomedReceipt(null)}
  >
    <img src={zoomedReceipt} className="max-w-full max-h-full object-contain rounded shadow-lg" />
  </div>
)}



          </div>
        </div>
      )}
    </div>

  </div>

</td>

              </tr>
            )
          })
        )}
      </tbody>
    </table>
  </div>
    </div>
)}


{/* Drafts Table (Tab 2) */}
{activeTab === "drafts" && (
  <div className="bg-white shadow rounded-lg mt-6">

    {drafts.length === 0 ? (
      <div className="p-8 text-center text-gray-500">
        Tiada draf ditemui untuk syarikat ini.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">

                Building
              </th>
              <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">

                Incident
              </th>
              <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">

                Updated
              </th>

              <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">

                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {drafts.map((draft: any) => {

              const isMyDraft = draft.user_id === userId

              return (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {draft.form_data?.building_name || 'No building'}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {draft.form_data?.incident_description || 'No description'}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 min-w-[90px]">

                    {new Date(draft.updated_at).toLocaleString()}
                  </td>



                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm min-w-[110px]">

                    {isMyDraft ? (
                      <button
                        onClick={() =>
                          router.push(`/complaints?draftId=${draft.id}&companyId=${companyId}`)
                        }
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        disabled
                        className="bg-gray-200 text-gray-500 px-3 py-1 rounded cursor-not-allowed"
                      >
                        Locked (Staff Draft)
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

        
        
      </main>
      
    </div>
  )
}
