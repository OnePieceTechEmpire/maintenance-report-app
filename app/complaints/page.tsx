// app/complaints/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadComplaintImages, validateImages } from '@/lib/image-upload'
import { ImageWithCaption } from '@/Types'

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
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  // Add these states to your complaint form
const [imageCaptions, setImageCaptions] = useState<string[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  
  const validationError = validateImages([...images, ...files])
  if (validationError) {
    alert(validationError)
    return
  }

  setImages(prev => [...prev, ...files])
  
  // Create previews with captions
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setImagePreviews(prev => [...prev, reader.result as string])
        setImageCaptions(prev => [...prev, '']) // Initialize with empty caption
      }
    }
    reader.onerror = () => {
      console.error('Failed to read file:', file.name)
      setImages(prev => prev.filter(f => f !== file))
    }
    reader.readAsDataURL(file)
  })

  // Reset file input
  if (fileInputRef.current) {
    fileInputRef.current.value = ''
  }
}

const handleCaptionChange = (index: number, caption: string) => {
  setImageCaptions(prev => {
    const newCaptions = [...prev]
    newCaptions[index] = caption
    return newCaptions
  })
}

const removeImage = (index: number) => {
  setImages(prev => prev.filter((_, i) => i !== index))
  setImagePreviews(prev => prev.filter((_, i) => i !== index))
  setImageCaptions(prev => prev.filter((_, i) => i !== index))
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setUploadProgress(0)

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

      const complaintId = data[0].id
      console.log('Complaint submitted with ID:', complaintId)

    // Upload images if any
let imageUrls: ImageWithCaption[] = []
if (images.length > 0) {
  setUploadProgress(30)
  imageUrls = await uploadComplaintImages(data[0].id, images, imageCaptions) // Pass captions
  setUploadProgress(70)
  
  // Update complaint with image URLs and captions
  const { error: updateError } = await supabase
    .from('complaints')
    .update({ image_urls: imageUrls })
    .eq('id', data[0].id)

  if (updateError) {
    console.error('Failed to update complaint with images:', updateError)
  }
}

      setUploadProgress(90)
      
      // Generate PDF (we'll update this later to include images)
      await generatePDF(data[0].id)
      
      setUploadProgress(100)

      alert(`Complaint submitted successfully! ${images.length > 0 ? `${images.length} images uploaded.` : ''}`)
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error submitting complaint:', error)
      alert('Failed to submit complaint')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const generatePDF = async (complaintId: string) => {
    try {
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ complaintId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      console.log('PDF generated successfully:', result.pdfUrl)
      return result.pdfUrl
    } catch (error: any) {
      console.error('PDF generation error:', error)
      // Don't block form submission if PDF fails
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Submit Maintenance Complaint</h1>
        
        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Existing form fields remain the same */}
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

          {/* NEW: Image Upload Section */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Gambar Kejadian (Maksimum 5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block mb-2"
              >
                Pilih Gambar
              </label>

              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG sehingga 5MB. Maksimum 5 gambar.
              </p>
            </div>
            
{/* Image previews with captions */}
{imagePreviews.length > 0 && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Gambar Dipilih ({imagePreviews.length}/5)
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {imagePreviews.map((preview, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="relative">
            <img 
              src={preview} 
              alt={`Preview ${index + 1}`}
              className="w-full h-48 object-cover rounded border"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
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
              value={imageCaptions[index] || ''}
              onChange={(e) => handleCaptionChange(index, e.target.value)}
              placeholder="e.g., Keadaan semasa, lokasi tepat, etc."
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