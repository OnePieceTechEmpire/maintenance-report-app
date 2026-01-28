// app/complaints/page.tsx
'use client'

import { useState, useRef,useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadComplaintImages, validateImages } from '@/lib/image-upload'
import { addMetadataOverlay, getCurrentLocation } from '@/lib/image-metadata-overlay'
import type { DraftImageInfo } from '@/Types'
import { ImageWithCaption } from '@/Types'
import { useSearchParams, useParams } from 'next/navigation'



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

const debugMode = searchParams.get('debug') === 'true'
const draftId = searchParams.get('draftId')
const draftLoadedRef = useRef(false)
const [showOverlay, setShowOverlay] = useState(false)

const params = useParams() as { complaintId?: string }

const complaintIdFromURL =
  searchParams.get('complaintId') || params.complaintId || null

const isEditMode = Boolean(complaintIdFromURL)

const [isEditingComplaint, setIsEditingComplaint] = useState(false)
const [overrideCompanyId, setOverrideCompanyId] = useState<string | null>(null)


useEffect(() => {
  if (draftId && !draftLoadedRef.current) {
    console.log('📥 Loading draft for the first time...')
    draftLoadedRef.current = true
    loadDraft(draftId)
  }
}, [draftId])

useEffect(() => {
  if (complaintIdFromURL && !draftLoadedRef.current) {
    draftLoadedRef.current = true
    loadComplaintForEdit(complaintIdFromURL)
  }
}, [complaintIdFromURL])



const loadComplaintForEdit = async (complaintId: string) => {
  setShowOverlay(true)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Please login')

    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .eq('submitted_by', user.id) // 🔒 PM can only edit own
      .single()

    if (error || !complaint) {
      alert('Complaint not found or not yours')
      return
    }

    // 1️⃣ Load form fields
    setFormData({
      building_name: complaint.building_name,
      incident_location: complaint.incident_location,
      incident_description: complaint.incident_description,
      incident_date: complaint.incident_date,
      reporter_name: complaint.reporter_name,
      reporter_phone: complaint.reporter_phone,
      solution_suggestion: complaint.solution_suggestion,
    })

    // 2️⃣ Load images (same pattern as draft)
    if (complaint.image_urls?.length > 0) {
      const files = await Promise.all(
        complaint.image_urls.map(async (img: any, idx: number) => {
          const res = await fetch(img.url)
          const blob = await res.blob()
          return new File([blob], `complaint_${idx}.jpg`, { type: blob.type })
        })
      )

      setImages(files)
      setImagePreviews(complaint.image_urls.map((i: any) => i.url))
      setImageCaptions(complaint.image_urls.map((i: any) => i.caption || ''))
    }

    setIsEditingComplaint(true)

  } catch (err) {
    console.error(err)
    alert('Failed to load complaint')
  } finally {
    setShowOverlay(false)
  }
}


// Update handleSaveDraft function
const handleSaveDraft = async () => {
  setSavingDraft(true)
  setShowOverlay(true)

  try {
    // 1) Get current auth user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Please login first")
      return
    }

    // 2) Get fallback profile company_id (for staff)
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    // 3) FINAL company_id value
// 3) FINAL company_id value (PM = from URL, Staff = from profile)
const sp = new URLSearchParams(window.location.search)
const companyIdFromUrl = sp.get("companyId")

const finalCompanyId = companyIdFromUrl || userProfile?.company_id
if (!finalCompanyId) {
  alert("Error: Unable to determine correct company.")
  return
}


// 4) Upload images
let uploadedImages: DraftImageInfo[] = []

if (images.length > 0) {
  const { uploadDraftImages } = await import('@/lib/draft-image-utils')
  const uploaded = await uploadDraftImages(user.id, images)

  uploadedImages = uploaded.map((img, idx) => ({
    ...img,
    caption: imageCaptions[idx] || ""
  }))
}

    // 5) Create draft payload
    const draftData = {
      user_id: user.id,
      company_id: finalCompanyId,   
      form_data: formData,
      uploaded_images: uploadedImages,
    }

    // 6) UPDATE EXISTING DRAFT
    if (isEditingDraft && currentDraftId) {
      const { error } = await supabase
        .from("complaint_drafts")
        .update({
          company_id: finalCompanyId,
          form_data: draftData.form_data,
          uploaded_images: draftData.uploaded_images,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentDraftId)
        .eq("user_id", user.id)

      if (error) throw error

      alert("Draf berjaya dikemas kini!")
      return
    }

    // 7) CREATE NEW DRAFT
    const { data, error } = await supabase
      .from("complaint_drafts")
      .insert([draftData])
      .select()

    if (error) throw error

    setCurrentDraftId(data[0].id)
    setIsEditingDraft(true)
    alert("Draf berjaya disimpan!")

  } catch (err) {
    console.error("Error saving draft:", err)
    alert("Gagal menyimpan draf")
  } finally {
    setSavingDraft(false)
    setShowOverlay(false)
  }
}


// Update loadDraft function
const loadDraft = async (draftId: string) => {
    console.log('🔄 loadDraft called with ID:', draftId) // ADD THIS

      // 🔥 SHOW LOADER
  setShowOverlay(true)

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
    // 1) Download blobs from storage
    const downloadedBlobs = await downloadDraftImages(draft.uploaded_images)

    // 2) Convert each Blob → File
    const reconstructedFiles = downloadedBlobs.map((blob: Blob, idx: number) => {
      const original = draft.uploaded_images[idx]

      // Use stored original name OR fallback
      const filename =
        original?.original_name ||
        original?.file_name ||
        `draft_image_${idx}.${(blob.type.split('/')[1] || 'jpg')}`

      return new File([blob], filename, { type: blob.type })
    })

    // 3) Set reconstructed File objects
    setImages(reconstructedFiles)

    // 4) Restore previews + captions
    setImagePreviews(
      draft.uploaded_images.map((img: any) => img.preview)
    )

    setImageCaptions(
      draft.uploaded_images.map((img: any) => img.caption || '')
    )

  } catch (error) {
    console.error('Error loading draft images:', error)
    alert('Some images could not be loaded from draft')
  }
} else {
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

  } finally {
    // 🔥 ALWAYS HIDE LOADER
    setShowOverlay(false)
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

  // No metadata, no location fetching, no validation limits
  for (const file of files) {
        try {
      const fixedFile = new File([file], file.name || "image.jpg", {
        type: file.type || "image/jpeg",
        lastModified: Date.now()
      });
      // Add file directly (no overlay)
      setImages(prev => [...prev, file])

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setImagePreviews(prev => [...prev, reader.result as string])
          setImageCaptions(prev => [...prev, ""]) // default empty caption
        }
      }
      reader.readAsDataURL(fixedFile)

    } catch (error) {
      console.error("❌ Failed to process image:", error)
    }
  }

  // Reset input so user can re-upload same file
  if (fileInputRef.current) {
    fileInputRef.current.value = ""
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
  setShowOverlay(true)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const searchParams = new URLSearchParams(window.location.search)
    const companyIdFromUrl = searchParams.get('companyId')

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const targetCompanyId = companyIdFromUrl || profile?.company_id
    if (!targetCompanyId) throw new Error('No company')

    let finalComplaintId = complaintIdFromURL

    // ✏️ EDIT MODE
    if (isEditMode && complaintIdFromURL) {
      const { error } = await supabase
        .from('complaints')
        .update({
          ...formData,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', complaintIdFromURL)
        .eq('submitted_by', user.id)

      if (error) throw error

      console.log('✏️ Complaint updated:', complaintIdFromURL)
    }

    // 🆕 CREATE MODE
    if (!isEditMode) {
      const { data, error } = await supabase
        .from('complaints')
        .insert([{
          ...formData,
          submitted_by: user.id,
          company_id: targetCompanyId,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      finalComplaintId = data.id
      console.log('🆕 Complaint created:', finalComplaintId)
    }

    if (!finalComplaintId) throw new Error('Complaint ID missing')


const fixedImages = images.map((file) => {
  if (!file.type || file.type === "") {
    return new File([file], file.name, {
      type: "image/jpeg",
      lastModified: Date.now()
    });
  }
  return file;
});


console.log("🧪 IMAGES BEFORE UPLOAD:", images)
console.log("🧪 IMAGE PREVIEWS:", imagePreviews)
console.log("🧪 IMAGE CAPTIONS:", imageCaptions)

    // Upload images if any
let imageUrls: ImageWithCaption[] = []
if (images.length > 0) {
  setUploadProgress(30)
  imageUrls = await uploadComplaintImages(
  finalComplaintId!,   // ✅ FIXED
  fixedImages,
  imageCaptions
)

  setUploadProgress(70)
  
  // Update complaint with image URLs and captions
  const { error: updateError } = await supabase
    .from('complaints')
    .update({ image_urls: imageUrls })
    .eq('id', finalComplaintId)

  if (updateError) {
    console.error('Failed to update complaint with images:', updateError)
  }
}

      setUploadProgress(90)
      
      // Generate PDF (we'll update this later to include images)
      await generatePDF(finalComplaintId!)
      
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
        // 🔁 Correct redirect
    if (companyIdFromUrl) {
      router.push(`/pm/${targetCompanyId}/dashboard`)
    } else {
      router.push('/dashboard')
    }
    
  } catch (error) {
    console.error('Error submitting complaint:', error)
    alert('Failed to submit complaint')
  } finally {
    setLoading(false)
    setShowOverlay(true)
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
              Gambar Kejadian 
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
                PNG, JPG sehingga 5MB.
              </p>
            </div>
            
{/* Image previews with captions */}
{/* Image previews with captions */}
{imagePreviews.length > 0 && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Gambar Dipilih ({imagePreviews.length})
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
              Gerakan Kerja Awalan
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
  onClick={() => {
    const searchParams = new URLSearchParams(window.location.search)
    const companyIdFromUrl = searchParams.get('companyId')

    if (companyIdFromUrl) {
      // PM → go back to the selected company dashboard
      router.push(`/pm/${companyIdFromUrl}/dashboard`)
    } else {
      // Staff → normal dashboard
      router.push('/dashboard')
    }
  }}
  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
>
  Back
</button>

</div>
        </form>
      </div>
      {showOverlay && (
  <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]">
    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    <p className="text-white mt-4 text-lg font-medium animate-pulse">
      Loading....
    </p>
  </div>
)}

    </div>
  )
}