// app/complaints/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadComplaintImages, validateImages } from '@/lib/image-upload'

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  
  // Validate images
  const validationError = validateImages([...images, ...files])
  if (validationError) {
    alert(validationError)
    return
  }

  setImages(prev => [...prev, ...files])
  
  // Create previews with error handling
  files.forEach(file => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (reader.result) {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
    }
    
    reader.onerror = () => {
      console.error('Failed to read file:', file.name)
      alert(`Failed to load image: ${file.name}`)
      // Remove the file that failed to load
      setImages(prev => prev.filter(f => f !== file))
    }
    
    reader.readAsDataURL(file)
  })

  // Reset file input
  if (fileInputRef.current) {
    fileInputRef.current.value = ''
  }
}

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
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
    let imageUrls: string[] = []
    if (images.length > 0) {
      setUploadProgress(30)
      
      // Show compression status
      if (images.some(img => img.size > 1024 * 1024)) {
        alert('Compressing large images... This may take a moment.')
      }
      
      imageUrls = await uploadComplaintImages(data[0].id, images)
      setUploadProgress(70)
      
      // Update complaint with image URLs
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
              <p className="text-sm text-gray-500">
                atau seret dan lepas gambar di sini
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF sehingga 5MB. Maksimum 5 gambar.
              </p>
            </div>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Gambar Dipilih ({imagePreviews.length}/5)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                        {images[index]?.name}
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