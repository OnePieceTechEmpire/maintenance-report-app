// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Complaint } from '@/Types'

export default function Dashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  // Add this state to your Dashboard component
const [drafts, setDrafts] = useState<any[]>([])
const [completionDrafts, setCompletionDrafts] = useState<any[]>([]) // Add this
const [activeTab, setActiveTab] = useState<'complaints' | 'drafts' | 'completion-drafts'>('complaints') // Update this
const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
const [receiptViewerImages, setReceiptViewerImages] = useState<string[]>([])
const [zoomedReceipt, setZoomedReceipt] = useState<string | null>(null)



  

useEffect(() => {
  checkUser()
  fetchComplaints()
  fetchDrafts()
  fetchCompletionDrafts() // Add this
}, [])
  
// Add this function to fetch drafts
const fetchDrafts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

          // SIMPLE NULL CHECK
    if (!profile?.company_id) return

    const { data, error } = await supabase
      .from('complaint_drafts')
      .select('*')
      .eq('user_id', user.id)
      //.eq('company_id', profile.company_id) // ⬅️ ADD THIS FILTER
      .order('updated_at', { ascending: false })

    if (error) throw error
    setDrafts(data || [])
  } catch (error) {
    console.error('Error fetching drafts:', error)
  }
}

// Add this function to fetch completion drafts
const fetchCompletionDrafts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

          // SIMPLE NULL CHECK
    if (!profile?.company_id) return

    const { data, error } = await supabase
      .from('completion_drafts')
      .select(`
        *,
        complaints (
          building_name,
          incident_description
        )
      `)
      .eq('user_id', user.id)
      //.eq('company_id', profile.company_id) // ⬅️ ADD THIS FILTER
      .order('updated_at', { ascending: false })

    if (error) throw error
    setCompletionDrafts(data || [])
  } catch (error) {
    console.error('Error fetching completion drafts:', error)
  }
}

// Add this function to load completion draft
const loadCompletionDraft = (draftId: string) => {
  router.push(`/completions/new?complaintId=${completionDrafts.find(d => d.id === draftId)?.complaint_id}&draftId=${draftId}`)
}

// Add this function to delete completion draft
const deleteCompletionDraft = async (draftId: string) => {
  if (!confirm('Adakah anda pasti mahu padam draf penyelesaian ini?')) {
    return
  }

  try {
    // Get draft to access image info
    const { data: draft } = await supabase
      .from('completion_drafts')
      .select('uploaded_images')
      .eq('id', draftId)
      .single()

    // Delete images from storage if they exist
    if (draft?.uploaded_images && draft.uploaded_images.length > 0) {
      const pathsToDelete = draft.uploaded_images.map((img: any) => img.storage_path)
      await supabase.storage
        .from('draft-images')
        .remove(pathsToDelete)
    }

    // Delete the draft record
    const { error } = await supabase
      .from('completion_drafts')
      .delete()
      .eq('id', draftId)

    if (error) throw error

    alert('Draf penyelesaian berjaya dipadam!')
    fetchCompletionDrafts() // Refresh the list
    
  } catch (error) {
    console.error('Error deleting completion draft:', error)
    alert('Gagal memadam draf penyelesaian')
  }
}






// Add this function to load a draft into the complaint form
const loadDraftForEditing = (draftId: string) => {
  router.push(`/complaints?draftId=${draftId}`)
}

// Update the deleteDraft function in dashboard
const deleteDraft = async (draftId: string) => {
  if (!confirm('Adakah anda pasti mahu padam draf ini?')) {
    return
  }

  try {
    // Get draft to access image info
    const { data: draft, error: fetchError } = await supabase
      .from('complaint_drafts')
      .select('uploaded_images')
      .eq('id', draftId)
      .single()

    if (fetchError) throw fetchError

    // Delete images from storage if they exist
    if (draft?.uploaded_images && draft.uploaded_images.length > 0) {
      const response = await fetch('/api/drafts/delete-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: draft.uploaded_images })
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete draft images')
      }
    }

    // Delete the draft record
    const { error: deleteError } = await supabase
      .from('complaint_drafts')
      .delete()
      .eq('id', draftId)

    if (deleteError) throw deleteError

    alert('Draf berjaya dipadam!')
    fetchDrafts()
    
  } catch (error) {
    console.error('Error deleting draft:', error)
    alert('Gagal memadam draf')
  }
}

const viewReceipts = async (completionId: string) => {
  try {
    const { data: completion, error } = await supabase
      .from('completions')
      .select('completion_images')
      .eq('id', completionId)
      .single()

    if (error) throw error

    let images = completion.completion_images

    // Parse JSON
    if (typeof images === 'string') {
      images = JSON.parse(images)
    }

    // Get receipt images
    const receiptImages = images.filter((img: any) => img.type === 'receipt')

    if (receiptImages.length === 0) {
      alert('Tiada resit untuk aduan ini')
      return
    }

    // 👉 OPEN RECEIPT VIEWER MODAL
    setReceiptViewerImages(receiptImages.map((img: any) => img.url))
    setReceiptViewerOpen(true)

  } catch (error) {
    console.error('Error viewing receipts:', error)
    alert('Gagal memuat resit')
  }
}


const checkUser = async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    router.push('/login')
    return
  }

  // Get user profile with company info
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      companies (name, code)
    `)
    .eq('id', authUser.id)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return
  }

  setUser({
    ...authUser,
    company: profile.companies,
    role: profile.role
  })
}

const downloadPDF = async (pdfUrl: string | undefined, fileName: string) => {
  if (!pdfUrl) {
    console.error('No PDF URL provided')
    return
  }
  
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
    console.error('Download failed:', error)
    window.open(pdfUrl, '_blank')
  }
}

const handleDeleteComplaint = async (complaintId: string, status: string) => {
  if (!confirm('Adakah anda pasti mahu padam aduan ini?')) {
    return
  }

  try {
    // Delete the complaint first
    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', complaintId)

    if (error) throw error

    // If it was completed, also delete the completion record
    if (status === 'completed') {
      // We don't even need to worry about the foreign key anymore
      // since the complaint is already deleted
      await supabase
        .from('completions')
        .delete()
        .eq('complaint_id', complaintId) // Use complaint_id to find the completion
    }

    alert('Aduan berjaya dipadam!')
    fetchComplaints()
    setOpenDropdown(null)
    
  } catch (error) {
    console.error('Error deleting complaint:', error)
    alert('Gagal memadam aduan')
  }
}

// Update the fetchComplaints function to include completion_id
const fetchComplaints = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1️⃣ Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) return

    // 2️⃣ Fetch complaints for that company
    const { data: complaintsData, error } = await supabase
      .from("complaints")
      .select(`
        *,
        profiles:submitted_by (
          full_name,
          username
        )
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    // 3️⃣ Fetch ALL drafts for these complaints
    const { data: draftData } = await supabase
      .from("completion_drafts")
      .select(`
        id,
        complaint_id,
        user_id,
        profiles:user_id (
          full_name
        )
      `)
      .in("complaint_id", complaintsData.map(c => c.id))

    // 4️⃣ SAFE map for drafts
    const draftsByComplaint: Record<string, {
      id: string,
      user_id: string,
      owner_name: string
    }> = {}

    draftData?.forEach((draft: any) => {
      draftsByComplaint[draft.complaint_id] = {
        id: draft.id,
        user_id: draft.user_id,
        owner_name: draft.profiles?.full_name || "Unknown"
      }
    })

    // 5️⃣ Merge into complaint list safely
    const merged = complaintsData.map((complaint: any) => {
      const draft = draftsByComplaint[complaint.id]

      return {
        ...complaint,
        hasDraft: !!draft,
        isMyDraft: draft?.user_id === user.id,
        draftId: draft?.id || null,
        draftOwnerName: draft?.owner_name || null
      }
    })

    setComplaints(merged)

  } catch (error) {
    console.error("Error fetching complaints:", error)
  } finally {
    setLoading(false)
  }
}



const handleMarkComplete = (complaintId: string) => {
  const complaint = complaints.find(c => c.id === complaintId)

  if (!complaint) return

  if (complaint.hasDraft && complaint.isMyDraft) {
    // Continue YOUR draft
    router.push(`/completions/new?complaintId=${complaintId}&draftId=${complaint.draftId}`)
  } else {
    // Start a new completion
    router.push(`/completions/new?complaintId=${complaintId}`)
  }
}


// Add this function to download completion PDF
const downloadCompletionPDF = async (completionId: string, fileName: string) => {
  try {
    // First, generate or get the completion PDF URL
    const response = await fetch('/api/completion-pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completionId }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate completion PDF')
    }

    // Download the generated PDF
    await downloadPDF(result.pdfUrl, fileName)
    setOpenDropdown(null)
    
  } catch (error) {
    console.error('Completion PDF download failed:', error)
    alert('Failed to download completion PDF')
  }
}

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
<header className="bg-white shadow">
  <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Maintenance Dashboard</h1>
      <p className="text-sm text-gray-600 mt-1">
        Company: <span className="font-semibold">{user?.company?.name || 'Loading...'}</span>
      </p>
    </div>
    <div className="flex items-center gap-4">
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  </div>
  {user?.role === 'super_admin' && (
  <button
    onClick={() => router.push('/admin')}
    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
  >
    Admin Panel
  </button>
)}
</header>

      {/* Main Content */}
<main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
  <div className="mb-6 flex justify-between items-center">
    <div>
      <h2 className="text-xl font-semibold text-gray-800">
        {activeTab === 'complaints' ? 'All Complaints' : 'My Drafts'}
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        {activeTab === 'complaints' 
          ? `Total: ${complaints.length} complaints` 
          : `Total: ${drafts.length} drafts`
        }
      </p>
    </div>
    <button
      onClick={() => router.push('/complaints')}
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
    >
      + New Complaint
    </button>
  </div>

  {/* Tab Navigation */}
{/* Tab Navigation */}
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
   {/* <button
      onClick={() => setActiveTab('completion-drafts')}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'completion-drafts'
          ? 'border-purple-500 text-purple-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Completion Drafts ({completionDrafts.length})
    </button>*/}
  </nav>
</div>

  {/* Complaints Table */}
  {activeTab === 'complaints' && (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {complaints.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No complaints submitted yet.
        </div>
      ) : (
        // Your existing complaints table goes here
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                    {/* Complaints Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {complaints.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No complaints submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Incident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Actions
    </th>
                  </tr>
                </thead>
<tbody className="bg-white divide-y divide-gray-200">
  {complaints.map((complaint) => (
    <tr key={complaint.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {complaint.building_name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
        {complaint.incident_description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(complaint.incident_date).toLocaleDateString()}
      </td>
 <td className="px-6 py-4 whitespace-nowrap">
  {complaint.status === "pending" ? (
    complaint.hasDraft ? (
      complaint.isMyDraft ? (
        // YOU OWN THIS DRAFT
        <button
          onClick={() => handleMarkComplete(complaint.id)}
          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-200"
        >
          Continue Draft
        </button>
      ) : (
        // OTHER STAFF OWNS THIS DRAFT
        <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold cursor-not-allowed">
          Draft by {complaint.draftOwnerName}
        </span>
      )
    ) : (
      // NO DRAFT EXIST
      <button
        onClick={() => handleMarkComplete(complaint.id)}
        className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-yellow-200"
      >
        Pending
      </button>
    )
  ) : (
    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
      Completed
    </span>
  )}
</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {complaint.profiles?.full_name || 'Unknown'}
      </td>


<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {/* PDF Dropdown - Available for ALL complaints */}
  <div className="relative inline-block text-left">
    <button
      onClick={(e) => {
        e.stopPropagation()
        setOpenDropdown(openDropdown === complaint.id ? null : complaint.id)
      }}
      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center gap-1"
    >
      Action
      <span>▼</span>
    </button>
    
    {openDropdown === complaint.id && (
      <div className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {/* PDF Complaint - Always Available */}
          <button
            onClick={() => {
              downloadPDF(complaint.pdf_url, `Complaint-${complaint.building_name}.pdf`)
              setOpenDropdown(null)
            }}
            className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left disabled:opacity-50"
            disabled={!complaint.pdf_url}
          >
            PDF Aduan
          </button>
          
          {/* PDF Completion - Only for Completed */}
          {complaint.status === 'completed' && (
            <button
              onClick={() => {
                downloadCompletionPDF(complaint.completion_id!, `Completion-${complaint.building_name}.pdf`)
                setOpenDropdown(null)
              }}
              className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
            >
              PDF Penyelesaian
            </button>
          )}

                    {/* ✅ VIEW RECEIPT - Only for Completed with receipts */}
          {complaint.status === 'completed' && (
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
          
          {/* Receipt Viewer Modal */}
{receiptViewerOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-4 max-w-3xl w-full shadow-lg relative">

      {/* Close button */}
      <button
        onClick={() => setReceiptViewerOpen(false)}
        className="absolute top-2 right-2 text-gray-600 hover:text-black"
      >
        ✕
      </button>

      <h2 className="text-lg font-semibold mb-4">Resit Pembelian</h2>

      {/* Grid of receipts */}
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

{/* Zoom Modal */}
{zoomedReceipt && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
    onClick={() => setZoomedReceipt(null)}
  >
    <img 
      src={zoomedReceipt} 
      className="max-w-full max-h-full object-contain rounded shadow-lg"
    />
  </div>
)}

          
          {/* Delete - Always Available */}
          <button
            onClick={() => handleDeleteComplaint(complaint.id, complaint.status)}
            className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100 mt-1"
          >
            Padam Aduan
          </button>
        </div>
      </div>
    )}
  </div>
</td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          )}
        </div>
          </table>
        </div>
      )}
    </div>
  )}

  {/* Drafts Table */}
  {activeTab === 'drafts' && (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {drafts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No drafts saved yet. Start a new complaint and click "Save Draft" to save your work.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Building
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incident
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Images
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {draft.form_data?.building_name || 'No building name'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {draft.form_data?.incident_description || 'No description'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(draft.updated_at).toLocaleDateString()} at{' '}
                    {new Date(draft.updated_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {draft.uploaded_images?.length || 0} images
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadDraftForEditing(draft.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDraft(draft.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
  {/* Completion Drafts Table 
{activeTab === 'completion-drafts' && (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    {completionDrafts.length === 0 ? (
      <div className="p-8 text-center text-gray-500">
        No completion drafts saved yet. Click on a pending complaint to start a completion form and save as draft.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Complaint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Work Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Images
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {completionDrafts.map((draft) => (
              <tr key={draft.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {draft.complaints?.building_name || 'Unknown complaint'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {draft.form_data?.work_title || 'No work title'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(draft.updated_at).toLocaleDateString()} at{' '}
                  {new Date(draft.updated_at).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {draft.uploaded_images?.length || 0} images
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadCompletionDraft(draft.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => deleteCompletionDraft(draft.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}*/}
</main>
    </div>
  )
}