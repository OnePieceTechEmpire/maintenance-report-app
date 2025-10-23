// app/complaints/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ComplaintForm() {
  const [formData, setFormData] = useState({
    building_name: '',
    incident_location: '',
    incident_description: '',
    incident_date: '',
    reporter_name: '',
    reporter_phone: '',
    solution_suggestion: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

      // Submit complaint
      const { data, error } = await supabase
        .from('complaints')
        .insert([
          {
            ...formData,
            submitted_by: user.id,
            status: 'pending'
          }
        ])
        .select()

      if (error) throw error

      alert('Complaint submitted successfully!')
      
      // Generate PDF (we'll implement this next)
      await generatePDF(data[0].id)
      
      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error submitting complaint:', error)
      alert('Failed to submit complaint')
    } finally {
      setLoading(false)
    }
  }

// In app/complaints/page.tsx - update generatePDF function
const generatePDF = async (complaintId: string) => {
  try {
    console.log('Generating PDF for complaint:', complaintId)
    
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complaintId }),
    })

    const result = await response.json()
    console.log('PDF generation response:', result)

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    console.log('PDF generated successfully:', result.pdfUrl)
    return result.pdfUrl
  } catch (error: any) {
    console.error('PDF generation error details:', error)
    throw new Error(`PDF generation failed: ${error.message}`)
  }
}

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Submit Maintenance Complaint</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nama Bangunan *
              </label>
              <input
                type="text"
                name="building_name"
                value={formData.building_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tempat Kejadian *
              </label>
              <input
                type="text"
                name="incident_location"
                value={formData.incident_location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Kejadian *
            </label>
            <textarea
              name="incident_description"
              value={formData.incident_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tarikh Kejadian *
              </label>
              <input
                type="date"
                name="incident_date"
                value={formData.incident_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nama Pelapor *
              </label>
              <input
                type="text"
                name="reporter_name"
                value={formData.reporter_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nombor Telefon Pelapor *
              </label>
              <input
                type="tel"
                name="reporter_phone"
                value={formData.reporter_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Cadangan Penyelesaian
            </label>
            <textarea
              name="solution_suggestion"
              value={formData.solution_suggestion}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cadangan untuk menyelesaikan masalah ini..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}