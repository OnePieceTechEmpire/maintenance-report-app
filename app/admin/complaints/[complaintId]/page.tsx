'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminComplaintDetailPage() {
  const { complaintId } = useParams() as { complaintId: string }
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [complaint, setComplaint] = useState<any>(null)
  const [completion, setCompletion] = useState<any>(null)
  const [completionDraft, setCompletionDraft] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<
  'complaint' | 'completion' | 'receipt'
>('complaint')


  useEffect(() => {
    if (complaintId) fetchData()
  }, [complaintId])

  const fetchData = async () => {
    setLoading(true)

    /** 1️⃣ Fetch complaint */
    const { data: complaintData, error } = await supabase
      .from('complaints')
      .select(`
        *,
        profiles:submitted_by ( full_name )
      `)
      .eq('id', complaintId)
      .single()

    if (error || !complaintData) {
      alert('Complaint not found')
      router.push('/admin')
      return
    }

    setComplaint(complaintData)

    /** 2️⃣ Fetch completion (if exists) */
    if (complaintData.completion_id) {
      const { data: completionData } = await supabase
        .from('completions')
        .select('*')
        .eq('id', complaintData.completion_id)
        .single()

      setCompletion(completionData)
    }

    /** 3️⃣ Fetch completion draft (if exists) */
    const { data: draftData } = await supabase
      .from('completion_drafts')
      .select(`
        *,
        profiles:user_id ( full_name )
      `)
      .eq('complaint_id', complaintId)
      .maybeSingle()

    setCompletionDraft(draftData)

    setLoading(false)
  }

  if (loading) {
    return <div className="p-8">Loading complaint...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto p-6 space-y-6">

      
      {/* Header */}
      <div className="flex items-center gap-4">

        <h1 className="text-xl font-bold">
          Complaint Review
        </h1>
      </div>



      {/* Tabs */}
<div className="border-b border-gray-200 mb-6">
  <nav className="-mb-px flex space-x-8">
    <button
      onClick={() => setActiveTab('complaint')}
      className={`pb-3 text-sm font-medium border-b-2 ${
        activeTab === 'complaint'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Maklumat Aduan
    </button>

    <button
      onClick={() => setActiveTab('completion')}
      className={`pb-3 text-sm font-medium border-b-2 ${
        activeTab === 'completion'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Penyelesaian
    </button>

    <button
      onClick={() => setActiveTab('receipt')}
      className={`pb-3 text-sm font-medium border-b-2 ${
        activeTab === 'receipt'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Resit
    </button>
  </nav>
</div>


{/* Complaint Info */}
{activeTab === 'complaint' && (
  <div className="bg-white shadow rounded-lg overflow-hidden">
<div className="bg-white rounded-lg shadow p-6 space-y-3">
  <h2 className="text-lg font-semibold text-gray-800">
    Maklumat Aduan
  </h2>

  

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <Info label="Bangunan" value={complaint.building_name} />
    <Info label="Lokasi" value={complaint.incident_location} />
    <Info
      label="Tarikh Aduan"
      value={new Date(complaint.created_at).toLocaleDateString('ms-MY')}
    />
    <Info
      label="Dilaporkan Oleh"
      value={complaint.profiles?.full_name || '-'}
    />
    <Info label="Telefon" value={complaint.reporter_phone} />
    <Info label="Status" value={complaint.status} />
  </div>

  {/* Skop Kerja */}
{complaint.incident_description && (
  <div className="border rounded-lg bg-gray-50 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
      Keterangan Aduan
    </p>
    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
      {complaint.incident_description}
    </p>
  </div>
)}
</div>
{/* Complaint Images */}
{/* Complaint Images */}
{complaint.image_urls && complaint.image_urls.length > 0 && (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-800">
        Gambar Aduan ({complaint.image_urls.length})
      </h2>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {complaint.image_urls.map((img: any, index: number) => (
        <ComplaintImageCard key={index} img={img} />
      ))}
    </div>
  </div>
)}

  </div>

  
)}



{activeTab === 'receipt' && (
  <div className="bg-white shadow rounded-lg p-6 space-y-4">
    <h2 className="text-lg font-semibold text-gray-800">
      Resit Pembelian
    </h2>

    <ReceiptImages
      images={
        completion
          ? completion.completion_images?.filter((i: any) => i.type === 'receipt')
          : completionDraft?.uploaded_images?.filter((i: any) => i.type === 'receipt')
      }
    />
  </div>
)}










{/* Completion Section */}
{activeTab === 'completion' && (
  <div className="space-y-6">

    {completion && (
      <CompletionSection
        title="Penyelesaian Kerja (Disiapkan)"
        badge="COMPLETED"
        color="green"
        completion={completion}
      />
    )}

    {!completion && completionDraft && (
      <CompletionSection
        title="Draf Penyelesaian (Belum Diserahkan)"
        badge="DRAFT"
        color="yellow"
        completion={completionDraft}
        isDraft
      />
    )}

    {!completion && !completionDraft && (
      <div className="bg-white shadow rounded-lg p-6 text-sm text-gray-500">
        Belum ada penyelesaian atau draf untuk aduan ini.
      </div>
    )}

  </div>
)}


  </div>

    </div>
  )
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium text-gray-800 break-all">
        {value || '-'}
      </p>
    </div>
  )
}


function CompletionSection({
  title,
  badge,
  color,
  completion,
  isDraft = false,
}: any) {
  const images = completion.completion_images || completion.uploaded_images || []

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-3">

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            color === 'green'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Completion Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <Info label="Tajuk Kerja" value={completion.work_title} />
        <Info label="Lokasi" value={completion.work_location} />
        <Info label="Tarikh Siap" value={completion.completion_date} />
        <Info label="Nama Staff" value={completion.supervisor_name} />
      </div>

      {/* Skop Kerja */}
{completion.work_scope && (
  <div className="border rounded-lg bg-gray-50 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
      Skop Kerja
    </p>
    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
      {completion.work_scope}
    </p>
  </div>
)}

      {/* Images */}
      {images.length > 0 && (
        <CompletionImages images={images} />
      )}
    </div>
  )
}

function CompletionImages({ images }: { images: any[] }) {
  const before = images.filter(i => i.type === 'before')
  const after  = images.filter(i => i.type === 'after')

  const maxRows = Math.max(before.length, after.length)

  if (maxRows === 0) {
    return (
      <p className="text-sm text-gray-500">
        Tiada gambar sebelum / selepas.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold text-gray-800">
        Gambar 
      </h3>

      {/* Header */}
      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600">
        <div className="text-center">Sebelum</div>
        <div className="text-center">Selepas</div>
      </div>

      {/* Rows */}
      {Array.from({ length: maxRows }).map((_, index) => {
        const beforeImg = before[index]
        const afterImg  = after[index]

        return (
<div
  key={index}
  className="grid grid-cols-2 gap-6 py-3 border-b last:border-b-0"
>
  <ImageCell img={beforeImg} />
  <ImageCell img={afterImg} />
</div>
        )
      })}
    </div>
  )
}

function ImageCell({ img }: { img?: any }) {
  if (!img) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 border rounded-lg">
        Tiada gambar
      </div>
    )
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(img.url)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = img.url.split('/').pop() || 'image.jpg'
      document.body.appendChild(a)
      a.click()

      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal muat turun imej')
    }
  }

  const handleCopyCaption = async () => {
    if (!img.caption) return
    await navigator.clipboard.writeText(img.caption)
  }

  return (
    <div className="space-y-2">
      {/* IMAGE */}
      <div className="relative rounded-lg overflow-hidden group">
        <img
          src={img.url}
          className="w-full h-[220px] object-cover"
          alt="completion image"
        />

        {/* ACTION BAR */}
        <div
          className="
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/60 to-transparent
            p-2
            flex items-center justify-end gap-2
            opacity-0 group-hover:opacity-100
            transition
          "
        >
          <button
            onClick={() => window.open(img.url, '_blank')}
            className="px-3 py-1 text-xs rounded bg-white/90 text-gray-800 hover:bg-white"
          >
            View
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      </div>

      {/* CAPTION (IMPORTANT & COPYABLE) */}
      {img.caption && (
        <div className="border rounded-md px-3 py-2 bg-gray-50 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="text-gray-700 whitespace-pre-wrap">
              {img.caption}
            </p>

            <button
              onClick={handleCopyCaption}
              className="text-gray-400 hover:text-gray-600"
              title="Copy caption"
            >
              📋
            </button>
          </div>
        </div>
      )}
    </div>
  )
}





function ReceiptImages({ images }: { images?: any[] }) {
  if (!images || images.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Tiada resit dimuat naik.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((img, index) => (
        <ReceiptImageCard key={index} img={img} />
      ))}
    </div>
  )
}

function ReceiptImageCard({ img }: { img: any }) {
  const handleDownload = async () => {
    try {
      const res = await fetch(img.url)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = img.url.split('/').pop() || 'receipt.jpg'
      document.body.appendChild(a)
      a.click()

      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Gagal muat turun resit')
    }
  }

  const handleCopyCaption = async () => {
    if (!img.caption) return
    await navigator.clipboard.writeText(img.caption)
  }

  return (
    <div className="space-y-2">
      {/* IMAGE */}
      <div className="relative rounded-lg overflow-hidden group">
        <img
          src={img.url}
          className="w-full h-[220px] object-cover"
          alt="receipt image"
        />

        {/* ACTION BAR */}
        <div
          className="
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/60 to-transparent
            p-2
            flex items-center justify-end gap-2
            opacity-0 group-hover:opacity-100
            transition
          "
        >
          <button
            onClick={() => window.open(img.url, '_blank')}
            className="px-3 py-1 text-xs rounded bg-white/90 text-gray-800 hover:bg-white"
          >
            View
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      </div>


    </div>
  )
}




function ComplaintImageCard({ img }: { img: any }) {
  const handleDownload = async () => {
    try {
      const res = await fetch(img.url)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = img.url.split('/').pop() || 'image.jpg'
      document.body.appendChild(a)
      a.click()

      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Gagal muat turun imej')
    }
  }

  const handleCopyCaption = async () => {
    if (!img.caption) return
    await navigator.clipboard.writeText(img.caption)
  }

  return (
    <div className="space-y-2">
      {/* IMAGE */}
      <div className="relative rounded-lg overflow-hidden group">
        <img
          src={img.url}
          className="w-full h-[220px] object-cover"
          alt="complaint image"
        />

        {/* ACTIONS */}
        <div
          className="
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/60 to-transparent
            p-2
            flex items-center justify-end gap-2
            opacity-0 group-hover:opacity-100
            transition
          "
        >
          <button
            onClick={() => window.open(img.url, '_blank')}
            className="px-3 py-1 text-xs rounded bg-white/90 text-gray-800 hover:bg-white"
          >
            View
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      </div>

      {/* CAPTION (copyable) */}
      {img.caption && (
        <div className="border rounded-md px-3 py-2 bg-gray-50 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="text-gray-700 whitespace-pre-wrap">
              {img.caption}
            </p>

            <button
              onClick={handleCopyCaption}
              className="text-gray-400 hover:text-gray-600"
              title="Copy caption"
            >
              📋
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
