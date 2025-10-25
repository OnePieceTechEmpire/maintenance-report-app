// app/completions/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CompletionForm() {
  const [formData, setFormData] = useState({
    work_title: '',
    work_location: '',
    completion_date: '',
    company_name: '',
    work_order_number: '',
    officer_name: '',
    supervisor_name: '',
    work_scope: '',
    quantity: '',
    materials_equipment: '',
    worker_count: '',
  })
  const [complaint, setComplaint] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [signature, setSignature] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const complaintId = searchParams.get('complaintId')

  useEffect(() => {
    if (complaintId) {
      fetchComplaint()
    }
  }, [complaintId])

  const fetchComplaint = async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single()
    
    if (data && !error) {
      setComplaint(data)
      // Pre-fill some fields from complaint
      setFormData(prev => ({
        ...prev,
        work_location: ``,
        work_title: ``,
        completion_date: new Date().toISOString().split('T')[0]
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignature(e.target.value)
  }

  const generateCompletionPDF = async (completionId: string) => {
  try {
    const response = await fetch('/api/completion-pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completionId }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    console.log('Completion PDF generated successfully:', result.pdfUrl)
    return result.pdfUrl
  } catch (error: any) {
    console.error('Completion PDF generation error:', error)
    // Don't block form submission if PDF fails
  }
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Please login first')
        router.push('/login')
        return
      }

      if (!complaintId) {
        alert('No complaint selected')
        return
      }

      // Create completion record
      const { data: completion, error } = await supabase
        .from('completions')
        .insert([
          {
            complaint_id: complaintId,
            completed_by: user.id,
            work_title: formData.work_title,
            work_location: formData.work_location,
            completion_date: formData.completion_date,
            company_name: formData.company_name,
            work_order_number: formData.work_order_number,
            officer_name: formData.officer_name,
            supervisor_name: formData.supervisor_name,
            work_scope: formData.work_scope,
            quantity: formData.quantity,
            materials_equipment: formData.materials_equipment,
            worker_count: formData.worker_count ? parseInt(formData.worker_count) : null,
            pic_signature_url: signature || null,
          }
        ])
        .select()

      if (error) throw error

      // Generate completion PDF
await generateCompletionPDF(completion[0].id)

      // Update complaint status and link completion
      const { error: updateError } = await supabase
        .from('complaints')
        .update({ 
          status: 'completed',
          completion_id: completion[0].id
        })
        .eq('id', complaintId)

      if (updateError) throw updateError

      alert('Work completion recorded successfully!')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error submitting completion:', error)
      alert('Failed to submit completion form')
    } finally {
      setLoading(false)
    }
  }

  if (!complaintId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">No complaint selected</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Borang Penyelesaian Kerja</h1>
        {complaint && (
          <p className="text-gray-600 mb-6">
            untuk aduan: <strong>{complaint.building_name}</strong> - {complaint.incident_description}
          </p>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                1. Tajuk kerja *
              </label>
              <input
                type="text"
                name="work_title"
                value={formData.work_title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                2. Tempat/Lokasi *
              </label>
              <input
                type="text"
                name="work_location"
                value={formData.work_location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                3. Tarikh *
              </label>
              <input
                type="date"
                name="completion_date"
                value={formData.completion_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                4. Nama syarikat *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                5. No Arahan Kerja
              </label>
              <input
                type="text"
                name="work_order_number"
                value={formData.work_order_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                6. Nama pegawai *
              </label>
              <input
                type="text"
                name="officer_name"
                value={formData.officer_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                7. Nama Penyelia *
              </label>
              <input
                type="text"
                name="supervisor_name"
                value={formData.supervisor_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                11. Bil Pekerja
              </label>
              <input
                type="number"
                name="worker_count"
                value={formData.worker_count}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              8. Skop Kerja *
            </label>
            <textarea
              name="work_scope"
              value={formData.work_scope}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                9. Kuantiti
              </label>
              <input
                type="text"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2 unit, 5 meter, etc."
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                10. Bahan Peralatan
              </label>
              <input
                type="text"
                name="materials_equipment"
                value={formData.materials_equipment}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cat, paku, berus, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              12. Tandatangan PIC
            </label>
            <input
              type="text"
              value={signature}
              onChange={handleSignature}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama penuh untuk tandatangan"
            />
            <p className="text-xs text-gray-500 mt-1">
              * Masukkan nama penuh sebagai tandatangan digital
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Selesaikan Kerja'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}