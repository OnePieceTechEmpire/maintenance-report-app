// app/completions/new/CompletionForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadCompletionImages, validateImages } from '@/lib/image-upload'
import { ImageWithCaption } from '@/Types'

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
  const [completionImages, setCompletionImages] = useState<File[]>([])
  const [completionImagePreviews, setCompletionImagePreviews] = useState<string[]>([])
  const [completionImageCaptions, setCompletionImageCaptions] = useState<string[]>([])
  
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
        work_location: data.incident_location,
        work_title: `Penyelenggaraan - ${data.building_name}`,
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
    }
  }

  const handleCompletionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const validationError = validateImages([...completionImages, ...files])
    if (validationError) {
      alert(validationError)
      return
    }

    setCompletionImages(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setCompletionImagePreviews(prev => [...prev, reader.result as string])
          setCompletionImageCaptions(prev => [...prev, '']) // Initialize with empty caption
        }
      }
      reader.onerror = () => {
        console.error('Failed to read file:', file.name)
        setCompletionImages(prev => prev.filter(f => f !== file))
      }
      reader.readAsDataURL(file)
    })

    // Reset file input
    e.target.value = ''
  }

  const removeCompletionImage = (index: number) => {
    setCompletionImages(prev => prev.filter((_, i) => i !== index))
    setCompletionImagePreviews(prev => prev.filter((_, i) => i !== index))
    setCompletionImageCaptions(prev => prev.filter((_, i) => i !== index))
  }

  const handleCaptionChange = (index: number, caption: string) => {
    setCompletionImageCaptions(prev => {
      const newCaptions = [...prev]
      newCaptions[index] = caption
      return newCaptions
    })
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

      // Upload completion images with captions
      let completionImageData: ImageWithCaption[] = []
      if (completionImages.length > 0) {
        completionImageData = await uploadCompletionImages(
          completion[0].id, 
          completionImages, 
          completionImageCaptions
        )
      }

      // Update completion with images
      const { error: updateCompletionError } = await supabase
        .from('completions')
        .update({ 
          completion_images: completionImageData
        })
        .eq('id', completion[0].id)

      if (updateCompletionError) throw updateCompletionError

      // Update complaint status and link completion
      const { error: updateComplaintError } = await supabase
        .from('complaints')
        .update({ 
          status: 'completed',
          completion_id: completion[0].id
        })
        .eq('id', complaintId)

      if (updateComplaintError) throw updateComplaintError

      // Generate completion PDF
      await generateCompletionPDF(completion[0].id)

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

                  {/* NEW: Completion Images Section */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Gambar Selepas Pembaikan (Maksimum 5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleCompletionImageUpload}
                className="hidden"
                id="completion-image-upload"
              />
              <label
                htmlFor="completion-image-upload"
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block mb-2"
              >
                Pilih Gambar
              </label>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF sehingga 5MB. Maksimum 5 gambar.
              </p>
            </div>
            
            {/* Completion Image Previews with Captions */}
            {completionImagePreviews.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Gambar Pembaikan ({completionImagePreviews.length}/5)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completionImagePreviews.map((preview, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="relative">
                        <img 
                          src={preview} 
                          alt={`Completion preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeCompletionImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">
                          Keterangan Gambar {index + 1}:
                        </label>
                        <input
                          type="text"
                          value={completionImageCaptions[index] || ''}
                          onChange={(e) => handleCaptionChange(index, e.target.value)}
                          placeholder="e.g., Selepas pembaikan, keadaan semasa, etc."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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