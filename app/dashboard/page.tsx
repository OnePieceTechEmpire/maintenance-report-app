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
  

  useEffect(() => {
    checkUser()
    fetchComplaints()
  }, [])



  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
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
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles:submitted_by (
          full_name,
          username
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    setComplaints(data || [])
  } catch (error) {
    console.error('Error fetching complaints:', error)
  } finally {
    setLoading(false)
  }
}

  const handleMarkComplete = (complaintId: string) => {
  router.push(`/completions/new?complaintId=${complaintId}`)
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
          <h1 className="text-2xl font-bold text-gray-800">Maintenance Dashboard</h1>
          <div className="flex items-center gap-4">
            
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">All Complaints</h2>
          <button
            onClick={() => router.push('/complaints')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            + New Complaint
          </button>
        </div>

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
        {complaint.status === 'pending' ? (
          <button
            onClick={() => handleMarkComplete(complaint.id)}
            className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-yellow-200 cursor-pointer"
          >
            Pending
          </button>
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
      </main>
    </div>
  )
}