// app/complaints/page.tsx
'use client'

import { useState, useRef,useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadComplaintImages, validateImages } from '@/lib/image-upload'
import { addMetadataOverlay, getCurrentLocation } from '@/lib/image-metadata-overlay'
import { ImageWithCaption } from '@/Types'
import { useSearchParams } from 'next/navigation' // Add this import


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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  // Add these states
const [savingDraft, setSavingDraft] = useState(false)
const [isEditingDraft, setIsEditingDraft] = useState(false)
const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  // Add these states to your complaint form
const [imageCaptions, setImageCaptions] = useState<string[]>([])
// Inside your ComplaintForm component, add:
const searchParams = useSearchParams()
const draftId = searchParams.get('draftId')
const draftLoadedRef = useRef(false)

useEffect(() => {
  if (draftId && !draftLoadedRef.current) {
    console.log('📥 Loading draft for the first time...')
    draftLoadedRef.current = true
    loadDraft(draftId)
  }
}, [draftId])



// Update handleSaveDraft function
const handleSaveDraft = async () => {
  setSavingDraft(true)
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    // Upload images to storage if we have any
    let uploadedImagesData: any[] = []
    if (images.length > 0) {
      const { uploadDraftImages } = await import('@/lib/draft-image-utils')
      uploadedImagesData = await uploadDraftImages(user.id, images)
      
      // Add captions to uploaded images
      uploadedImagesData = uploadedImagesData.map((img, index) => ({
        ...img,
        caption: imageCaptions[index] || ''
      }))
    }

    const draftData = {
      form_data: formData,
      uploaded_images: uploadedImagesData
    }

if (isEditingDraft && currentDraftId) {
  // Delete old images if they exist
  const { data: oldDraft, error: fetchError } = await supabase
    .from('complaint_drafts')
    .select('uploaded_images')
    .eq('id', currentDraftId)
    .single()

  if (fetchError) {
    console.error('Error fetching old draft:', fetchError)
  }

  if (oldDraft?.uploaded_images && oldDraft.uploaded_images.length > 0) {
    try {
      // Use API route instead of direct import
      const response = await fetch('/api/drafts/delete-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: oldDraft.uploaded_images })
      })
      
      if (!response.ok) {
        console.error('Failed to delete old draft images via API')
        // Continue anyway - don't block the save
      }
    } catch (deleteError) {
      console.error('Error deleting old draft images:', deleteError)
      // Continue anyway - don't block the save
    }
  }


      // Update existing draft
      const { error } = await supabase
        .from('complaint_drafts')
        .update({
          form_data: draftData.form_data,
          uploaded_images: draftData.uploaded_images,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDraftId)
        .eq('user_id', user.id)

      if (error) throw error
      alert('Draf berjaya dikemas kini!')
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('complaint_drafts')
        .insert([
          {
            user_id: user.id,
            form_data: draftData.form_data,
            uploaded_images: draftData.uploaded_images
          }
        ])
        .select()

      if (error) throw error
      setCurrentDraftId(data[0].id)
      setIsEditingDraft(true)
      alert('Draf berjaya disimpan!')
    }
    
  } catch (error) {
    console.error('Error saving draft:', error)
    alert('Gagal menyimpan draf')
  } finally {
    setSavingDraft(false)
  }
}

// Update loadDraft function
const loadDraft = async (draftId: string) => {
    console.log('🔄 loadDraft called with ID:', draftId) // ADD THIS

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    const { data: draft, error } = await supabase
      .from('complaint_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    if (!draft) {
      alert('Draft not found')
      return
    }

    // Load form data
    setFormData(draft.form_data)
    
    // Load images from storage
    if (draft.uploaded_images && draft.uploaded_images.length > 0) {
      const { downloadDraftImages } = await import('@/lib/draft-image-utils')
      
      try {
        const downloadedFiles = await downloadDraftImages(draft.uploaded_images)
        
        // Set the actual File objects
        setImages(downloadedFiles)
        
        // Set previews and captions
        setImagePreviews(draft.uploaded_images.map((img: any) => img.preview))
        setImageCaptions(draft.uploaded_images.map((img: any) => img.caption || ''))
        
      } catch (error) {
        console.error('Error loading draft images:', error)
        alert('Some images could not be loaded from draft')
      }
    } else {
      // No images in draft
      setImages([])
      setImagePreviews([])
      setImageCaptions([])
    }

    setCurrentDraftId(draft.id)
    setIsEditingDraft(true)
    
        console.log('✅ Showing success alert now') // ADD THIS
    alert('Draft loaded successfully!')
    
  } catch (error) {
    console.error('Error loading draft:', error)
    alert('Failed to load draft')
  }
}

// Update deleteDraft function to also delete images
// Update deleteDraft function to use API route
const deleteDraft = async () => {
  if (!currentDraftId) return
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    // Get draft to access image info
    const { data: draft, error: fetchError } = await supabase
      .from('complaint_drafts')
      .select('uploaded_images')
      .eq('id', currentDraftId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching draft:', fetchError)
      // Continue with deletion anyway
    }

    // Delete images from storage if they exist (using API route)
    if (draft?.uploaded_images && draft.uploaded_images.length > 0) {
      try {
        const response = await fetch('/api/drafts/delete-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: draft.uploaded_images })
        })
        
        if (!response.ok) {
          console.error('Failed to delete draft images via API')
          // Continue with draft deletion anyway
        }
      } catch (imageError) {
        console.error('Error deleting draft images:', imageError)
        // Continue with draft deletion anyway
      }
    }

    // Delete the draft record
    const { error: deleteError } = await supabase
      .from('complaint_drafts')
      .delete()
      .eq('id', currentDraftId)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    // Reset form
    setFormData({
      building_name: '',
      incident_location: '',
      incident_description: '',
      incident_date: '',
      reporter_name: '',
      reporter_phone: '',
      solution_suggestion: ''
    })
    setImages([])
    setImagePreviews([])
    setImageCaptions([])
    setCurrentDraftId(null)
    setIsEditingDraft(false)
    
    alert('Draft deleted successfully!')
    
  } catch (error) {
    console.error('Error deleting draft:', error)
    alert('Failed to delete draft')
  }
}

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  
  const validationError = validateImages([...images, ...files])
  if (validationError) {
    alert(validationError)
    return
  }

  // Get current form data for metadata
  const latestFormData = {
    building_name: formData.building_name,
    incident_location: formData.incident_location
  }

  // Try to get current location - with timeout and better error handling
  let currentLocationText = latestFormData.incident_location || '' // Fallback to form data
  
  try {
    console.log('📍 Attempting to get current location...')
    const currentLocation = await Promise.race([
      getCurrentLocation(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 10000)) // 10 second timeout
    ]) as any
    
    if (currentLocation?.location) {
      currentLocationText = currentLocation.location
      console.log('📍 Location obtained:', currentLocationText)
    }
  } catch (err) {
    console.warn('⚠️ Location access failed:', err)
    // Don't show alert here - just use fallback
    currentLocationText = latestFormData.incident_location || 'Location not available'
    console.log('📍 Using fallback location:', currentLocationText)
  }

  const now = new Date()
  const dayNames = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']
  const dayName = dayNames[now.getDay()]

  const metadata = {
    timestamp: now.toLocaleTimeString('ms-MY'),
    date: `${dayName}, ${now.toLocaleDateString('ms-MY')}`,
    location: currentLocationText, // Use the location we got (or fallback)
    additionalInfo: `Bangunan: ${formData.building_name || 'N/A'}`
  }

  // Process each image with metadata overlay
  for (const file of files) {
    try {
      console.log('🖼️ Adding metadata overlay to image...')
      
      // Add metadata overlay to the image
      const imageWithMetadata = await addMetadataOverlay(file, metadata)
      
      // Add the processed image to state
      setImages(prev => [...prev, imageWithMetadata])
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setImagePreviews(prev => [...prev, reader.result as string])
          setImageCaptions(prev => [...prev, '']) // Initialize with empty caption
        }
      }
      reader.onerror = () => {
        console.error('Failed to read file:', file.name)
        setImages(prev => prev.filter(f => f !== imageWithMetadata))
      }
      reader.readAsDataURL(imageWithMetadata)
      
    } catch (error) {
      console.error('❌ Failed to add metadata overlay:', error)
      // Fallback: use original image without metadata
      setImages(prev => [...prev, file])
      
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setImagePreviews(prev => [...prev, reader.result as string])
          setImageCaptions(prev => [...prev, ''])
        }
      }
      reader.onerror = () => {
        console.error('Failed to read file:', file.name)
        setImages(prev => prev.filter(f => f !== file))
      }
      reader.readAsDataURL(file)
    }
  }

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

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Please login first')
      router.push('/login')
      return
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

          // SIMPLE NULL CHECK - no new variables
    if (!profile?.company_id) {
      alert('Error: Unable to determine your company. Please contact admin.')
      return
    }

    // Submit complaint WITH company_id
    const { data, error } = await supabase
      .from('complaints')
      .insert([
        {
          ...formData,
          submitted_by: user.id,
          company_id: profile.company_id, // ⬅️ ADD THIS
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

 // ✅ CLEANUP: Delete draft images if this was from a draft
if (isEditingDraft && currentDraftId) {
  try {
    console.log('🧹 STARTING DRAFT CLEANUP...')
    
    // Get the draft to access image info
    const { data: draft, error: fetchError } = await supabase
      .from('complaint_drafts')
      .select('uploaded_images')
      .eq('id', currentDraftId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch draft:', fetchError)
      throw fetchError
    }

    console.log('📋 Draft found with images:', draft?.uploaded_images)

    // Delete images from draft storage
// Delete images from draft storage - DIRECT VERSION (no API)
if (draft?.uploaded_images && draft.uploaded_images.length > 0) {
  const pathsToDelete = draft.uploaded_images.map((img: any) => img.storage_path)
  console.log('🗑️ Direct deletion of:', pathsToDelete)
  
  const { error: storageError } = await supabase.storage
    .from('draft-images')
    .remove(pathsToDelete)

  if (storageError) {
    console.error('❌ Direct storage deletion failed:', storageError)
  } else {
    console.log('✅ Direct storage deletion successful')
  }
}

    // Delete the draft record
    console.log('🗑️ Deleting draft record...')
    const { error: deleteError } = await supabase
      .from('complaint_drafts')
      .delete()
      .eq('id', currentDraftId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ Failed to delete draft record:', deleteError)
      throw deleteError
    }

    console.log('✅ Draft completely cleaned up after submission')

  } catch (cleanupError) {
    console.error('💥 CLEANUP FAILED:', cleanupError)
    // Don't fail the submission if cleanup fails
  }
}

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

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
  {isEditingDraft ? 'Edit Draf Aduan' : 'Submit Maintenance Complaint'}
</h1>
{isEditingDraft && (
  <p className="text-yellow-600 text-sm mb-4">
    📝 Sedang mengedit draf - perubahan akan disimpan apabila anda klik "Simpan Draf"
  </p>
)}
        
        
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
                No Lot*
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
              Detail Aduan*
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
                Tarikh *
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
                Nama Pengadu *
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
                Nombor Telefon Pengadu *
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
{/* Image previews with captions */}
{imagePreviews.length > 0 && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Gambar Dipilih ({imagePreviews.length}/5)
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {imagePreviews.map((preview, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="relative mb-3">
            {/* Clickable image preview */}
            <div 
              className="relative h-48 bg-gray-100 rounded border overflow-hidden cursor-pointer"
              onClick={() => setZoomedImage(preview)}
            >
              <img 
                src={preview} 
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-contain"
              />

            </div>
            {/* Remove button */}
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

    {/* Zoom Modal */}
    {zoomedImage && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={() => setZoomedImage(null)}
      >
        <div className="max-w-4xl max-h-full">
          <img 
            src={zoomedImage} 
            alt="Zoomed preview"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
    )}
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

<div className="flex gap-4 flex-wrap">
  <button
    type="submit"
    disabled={loading}
    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
  >
    {loading ? 'Submitting...' : 'Submit Complaint'}
  </button>
  
  {/* Save Draft Button */}
  <button
    type="button"
    onClick={handleSaveDraft}
    disabled={savingDraft}
    className="bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
  >
    {savingDraft ? 'Menyimpan...' : 'Simpan Draf'}
  </button>

  {/* Delete Draft Button (only show when editing draft) */}
  {isEditingDraft && (
    <button
      type="button"
      onClick={deleteDraft}
      className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
    >
      Padam Draf
    </button>
  )}
  
  <button
    type="button"
    onClick={() => router.push('/dashboard')}
    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
  >
    Back
  </button>
</div>
        </form>
      </div>
    </div>
  )
}