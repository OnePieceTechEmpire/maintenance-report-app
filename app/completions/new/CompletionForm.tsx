// app/completions/new/CompletionForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadCompletionImages, validateImages } from '@/lib/image-upload'
import { addMetadataOverlay, getCurrentLocation } from '@/lib/image-metadata-overlay'
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [completionImageCaptions, setCompletionImageCaptions] = useState<string[]>([])
  // ⬇️⬇️ ADD THESE DRAFT STATES ⬇️⬇️
const [savingDraft, setSavingDraft] = useState(false)
const [isEditingDraft, setIsEditingDraft] = useState(false)
const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
// ⬆️⬆️ END OF DRAFT STATES ⬆️⬆️

  
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const complaintId = searchParams.get('complaintId')
  const draftId = searchParams.get('draftId') // Add this line
    const [uploadProgress, setUploadProgress] = useState(0)
  const [receiptImages, setReceiptImages] = useState<File[]>([])
const [receiptImagePreviews, setReceiptImagePreviews] = useState<string[]>([])


  useEffect(() => {
    if (complaintId) {
      fetchComplaint()
    }
  }, [complaintId])

  // ⬇️⬇️ ADD THIS NEW useEffect FOR DRAFT LOADING ⬇️⬇️
useEffect(() => {
  if (draftId && complaintId) {
    // Wait a bit for complaint data to load, then load the draft
    const timer = setTimeout(() => {
      loadCompletionDraft(draftId)
    }, 500)
    
    return () => clearTimeout(timer)
  }
}, [draftId, complaintId])



const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  
  // Check total images (completion + receipts) don't exceed limit
  const totalImages = completionImages.length + receiptImages.length + files.length
  if (totalImages > 10) { // Increased limit since we have receipts now
    alert('Maksimum 10 gambar (gambar penyelesaian + resit)')
    return
  }
  
  const validationError = validateImages(files)
  if (validationError) {
    alert(validationError)
    return
  }

  for (const file of files) {
    setReceiptImages(prev => [...prev, file])
    
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setReceiptImagePreviews(prev => [...prev, reader.result as string])
      }
    }
    reader.readAsDataURL(file)
  }
  
  e.target.value = ''
}

const removeReceipt = (index: number) => {
  setReceiptImages(prev => prev.filter((_, i) => i !== index))
  setReceiptImagePreviews(prev => prev.filter((_, i) => i !== index))
}




  const fetchComplaint = async () => {
    const { data, error } = await supabase
      .from('complaints')
        .select(`
    *,
    profiles:submitted_by (
      full_name
    )
  `)
      .eq('id', complaintId)
      .single()
    
    if (data && !error) {
      setComplaint(data)
      // Pre-fill some fields from complaint
      setFormData(prev => ({
        ...prev,
        work_location: data.incident_location,
        work_title: `Penyelenggaraan - ${data.building_name}`,
          supervisor_name: data.profiles?.full_name || "",
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
  
const handleCompletionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])

  // No metadata, no GPS, no limit
  for (const file of files) {
    try {
      // Add file directly
      setCompletionImages(prev => [...prev, file])

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setCompletionImagePreviews(prev => [...prev, reader.result as string])
          setCompletionImageCaptions(prev => [...prev, ""]) // default empty caption
        }
      }
      reader.readAsDataURL(file)

    } catch (error) {
      console.error("❌ Failed to process completion image:", error)
    }
  }

  // Reset input so user can re-upload same file
  if (e.target) {
    e.target.value = ""
  }
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

  // ✅ COMPLETION DRAFT FUNCTIONS

const handleSaveDraft = async () => {
  setSavingDraft(true)
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    if (!complaintId) {
      alert('No complaint selected')
      return
    }

    // Upload completion images to storage
    let uploadedCompletionImages: any[] = []
    if (completionImages.length > 0) {
      const { uploadDraftImages } = await import('@/lib/draft-image-utils')
      uploadedCompletionImages = await uploadDraftImages(user.id, completionImages, 'completion') // Add folder
      
      // Add captions and type to uploaded images
      uploadedCompletionImages = uploadedCompletionImages.map((img, index) => ({
        ...img,
        caption: completionImageCaptions[index] || '',
        type: 'completion' // Add type
      }))
    }

    // Upload receipt images to storage
    let uploadedReceiptImages: any[] = []
    if (receiptImages.length > 0) {
      const { uploadDraftImages } = await import('@/lib/draft-image-utils')
      uploadedReceiptImages = await uploadDraftImages(user.id, receiptImages, 'receipt') // Different folder
      
      // Add default caption and type for receipts
      uploadedReceiptImages = uploadedReceiptImages.map((img, index) => ({
        ...img,
        caption: 'Receipt', // Default caption for receipts
        type: 'receipt' // Add type
      }))
    }

    // Combine all images
    const allUploadedImages = [...uploadedCompletionImages, ...uploadedReceiptImages]

    const draftData = {
      form_data: formData,
      uploaded_images: allUploadedImages, // Use combined images
      signature: signature
    }

    if (isEditingDraft && currentDraftId) {
      // Delete old images if they exist
      const { data: oldDraft } = await supabase
        .from('completion_drafts')
        .select('uploaded_images')
        .eq('id', currentDraftId)
        .single()

      if (oldDraft?.uploaded_images && oldDraft.uploaded_images.length > 0) {
        const pathsToDelete = oldDraft.uploaded_images.map((img: any) => img.storage_path)
        await supabase.storage
          .from('draft-images')
          .remove(pathsToDelete)
      }

      // Update existing draft
      const { error } = await supabase
        .from('completion_drafts')
        .update({
          form_data: draftData.form_data,
          uploaded_images: draftData.uploaded_images,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDraftId)
        .eq('user_id', user.id)

      if (error) throw error
      alert('Draf penyelesaian berjaya dikemas kini!')
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('completion_drafts')
        .insert([
          {
            user_id: user.id,
            complaint_id: complaintId,
            form_data: draftData.form_data,
            uploaded_images: draftData.uploaded_images
          }
        ])
        .select()

      if (error) throw error
      setCurrentDraftId(data[0].id)
      setIsEditingDraft(true)
      alert('Draf penyelesaian berjaya disimpan!')
    }
    
  } catch (error) {
    console.error('Error saving completion draft:', error)
    alert('Gagal menyimpan draf penyelesaian')
  } finally {
    setSavingDraft(false)
  }
}

const loadCompletionDraft = async (draftId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    const { data: draft, error } = await supabase
      .from('completion_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    if (!draft) {
      alert('Completion draft not found')
      return
    }

    // Load form data
    setFormData(draft.form_data)
    setSignature(draft.form_data.signature || '')
    
     // Load images from storage
    if (draft.uploaded_images && draft.uploaded_images.length > 0) {
      const { downloadDraftImages } = await import('@/lib/draft-image-utils')
      
      try {
        const downloadedFiles = await downloadDraftImages(draft.uploaded_images)
        
// ✅ FIX: SEPARATE COMPLETION IMAGES FROM RECEIPT IMAGES
const completionImageData: any[] = []
const receiptImageData: any[] = []
        
        draft.uploaded_images.forEach((img: any, index: number) => {
          if (img.type === 'completion') {
            completionImageData.push({
              file: downloadedFiles[index],
              preview: img.preview,
              caption: img.caption || ''
            })
          } else if (img.type === 'receipt') {
            receiptImageData.push({
              file: downloadedFiles[index],
              preview: img.preview,
              caption: img.caption || ''
            })
          }
        })

        // ✅ Set completion images only
        setCompletionImages(completionImageData.map(item => item.file))
        setCompletionImagePreviews(completionImageData.map(item => item.preview))
        setCompletionImageCaptions(completionImageData.map(item => item.caption))

        // ✅ Set receipt images only  
        setReceiptImages(receiptImageData.map(item => item.file))
        setReceiptImagePreviews(receiptImageData.map(item => item.preview))
        
      } catch (error) {
        console.error('Error loading completion draft images:', error)
        alert('Some images could not be loaded from draft')
      }
    }


    setCurrentDraftId(draft.id)
    setIsEditingDraft(true)
    
    alert('Completion draft loaded successfully!')
    
  } catch (error) {
    console.error('Error loading completion draft:', error)
    alert('Failed to load completion draft')
  }
}

const deleteCompletionDraft = async () => {
  if (!currentDraftId) return
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      return
    }

    // Get draft to access image info
    const { data: draft } = await supabase
      .from('completion_drafts')
      .select('uploaded_images')
      .eq('id', currentDraftId)
      .eq('user_id', user.id)
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
      .eq('id', currentDraftId)
      .eq('user_id', user.id)

    if (error) throw error

    // Reset form but keep complaint data
    setFormData(prev => ({
      ...prev,
      work_title: `Penyelenggaraan - ${complaint?.building_name}`,
      work_location: complaint?.incident_location || '',
      completion_date: new Date().toISOString().split('T')[0],
      company_name: '',
      work_order_number: '',
      officer_name: '',
      supervisor_name: '',
      work_scope: '',
      quantity: '',
      materials_equipment: '',
      worker_count: '',
    }))
    setSignature('')
    setCompletionImages([])
    setCompletionImagePreviews([])
    setCompletionImageCaptions([])
    setCurrentDraftId(null)
    setIsEditingDraft(false)
    
    alert('Completion draft deleted successfully!')
    
  } catch (error) {
    console.error('Error deleting completion draft:', error)
    alert('Failed to delete completion draft')
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

          // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Simple null check
    if (!profile?.company_id) {
      alert('Error: Unable to determine your company. Please contact admin.')
      return
    }

      // Create completion record
      const { data: completion, error } = await supabase
        .from('completions')
        .insert([
          {
            complaint_id: complaintId,
            completed_by: user.id,
            company_id: profile.company_id, // ⬅️ ADD THIS LINE
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
          completionImageCaptions,
                  'completion' // Specify folder
        )
      }

          // Upload receipt images
    let receiptImageData: ImageWithCaption[] = []
    if (receiptImages.length > 0) {
      receiptImageData = await uploadCompletionImages(
        completion[0].id, 
        receiptImages, 
        Array(receiptImages.length).fill('Receipt'), // Default caption
        'receipt' // Different folder
      )
    }

    
    // Combine both image types
    const allImages = [...completionImageData, ...receiptImageData]

    // Update completion with all images
    const { error: updateCompletionError } = await supabase
      .from('completions')
      .update({ 
        completion_images: allImages
        // We're using the same column but images have 'type' field
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

// ⬇️⬇️ ADD THIS CLEANUP CODE ⬇️⬇️
// Cleanup completion draft after successful submission
if (isEditingDraft && currentDraftId) {
  try {
    // Use the same user from the beginning of the function
    console.log('🧹 Cleaning up completion draft...')
    
    const { data: draft } = await supabase
      .from('completion_drafts')
      .select('uploaded_images')
      .eq('id', currentDraftId)
      .eq('user_id', user.id)  // Now using the user from line 238
      .single()

    if (draft?.uploaded_images && draft.uploaded_images.length > 0) {
      const pathsToDelete = draft.uploaded_images.map((img: any) => img.storage_path)
      console.log('🗑️ Deleting completion draft images:', pathsToDelete)
      
      const { error: storageError } = await supabase.storage
        .from('draft-images')
        .remove(pathsToDelete)

      if (storageError) {
        console.error('❌ Failed to delete completion draft images:', storageError)
      } else {
        console.log('✅ Completion draft images deleted')
      }
    }

    const { error: deleteError } = await supabase
      .from('completion_drafts')
      .delete()
      .eq('id', currentDraftId)
      .eq('user_id', user.id)  // Using the same user

    if (deleteError) {
      console.error('❌ Failed to delete completion draft record:', deleteError)
    } else {
      console.log('✅ Completion draft completely cleaned up after submission')
    }
  } catch (cleanupError) {
    console.error('💥 Completion draft cleanup error:', cleanupError)
  }
}
// ⬆️⬆️ END CLEANUP CODE ⬆️⬆️

      alert('Work completion recorded successfully!')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error submitting completion:', error)
      alert('Failed to submit completion form')
    } finally {
      setLoading(false)
          setUploadProgress(0)
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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
  {isEditingDraft ? 'Edit Draf Penyelesaian' : 'Borang Penyelesaian Kerja'}
</h1>
{isEditingDraft && (
  <p className="text-yellow-600 text-sm mb-4">
    📝 Sedang mengedit draf penyelesaian
  </p>
)}
{complaint && (
  <p className="text-gray-600 mb-6">
    untuk aduan: <strong>{complaint.building_name}</strong> - {complaint.incident_description}
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
                4. No Arahan Kerja
              </label>
              <input
                type="text"
                name="work_order_number"
                value={formData.work_order_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                6. Nama Staff *
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
                7. Bil Pekerja
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


                  {/* NEW: Completion Images Section */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Gambar Selepas Pembaikan 
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
                PNG, JPG, GIF sehingga 5MB.
              </p>
            </div>

            
            
            {/* Completion Image Previews with Captions */}
{/* Completion Image Previews with Captions */}
{completionImagePreviews.length > 0 && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Gambar Pembaikan ({completionImagePreviews.length})
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {completionImagePreviews.map((preview, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="relative mb-3">
            {/* Clickable image preview */}
            <div 
              className="relative h-48 bg-gray-100 rounded border overflow-hidden cursor-pointer"
              onClick={() => setZoomedImage(preview)}
            >
              <img 
                src={preview} 
                alt={`Completion preview ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
            {/* Remove button */}
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

    {/* Zoom Modal (add this at the bottom) */}
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

{/* Simple Receipt Section */}
<div className="mt-6">
  <label className="block text-gray-700 text-sm font-bold mb-2">
    📄 Resit Pembelian (Optional)
  </label>
  <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center bg-purple-50">
    <input
      type="file"
      multiple
      accept="image/*"
      onChange={handleReceiptUpload}
      className="hidden"
      id="receipt-upload"
    />
    <label
      htmlFor="receipt-upload"
      className="cursor-pointer bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 inline-block mb-2"
    >
      Upload Resit
    </label>
    <p className="text-xs text-gray-600">
      PNG, JPG sehingga 5MB. {receiptImages.length}/5 resit.
    </p>
  </div>
  
  {/* Receipt Previews */}
  {receiptImagePreviews.length > 0 && (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Resit ({receiptImagePreviews.length})
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {receiptImagePreviews.map((preview, index) => (
          <div key={index} className="relative border rounded-lg p-2 bg-white">
            <img 
              src={preview} 
              alt={`Receipt ${index + 1}`} 
              className="w-full h-24 object-cover rounded"
            />
            <button
              type="button"
              onClick={() => removeReceipt(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
            <p className="text-xs text-center mt-1 text-gray-600">Resit {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
          </div>

   {/*          <div>
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
          </div>*/}

<div className="flex gap-4 pt-4 flex-wrap">
  <button
    type="submit"
    disabled={loading}
    className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
  >
    {loading ? 'Submitting...' : 'Selesaikan Kerja'}
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
      onClick={deleteCompletionDraft}
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