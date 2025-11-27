// types/index.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: 'staff' | 'boss';
}

export interface Complaint {
  id: string;
  building_name: string;
  incident_location: string;
  incident_description: string;
  incident_date: string;
  reporter_name: string;
  reporter_phone: string;
  solution_suggestion: string;
  status: 'pending' | 'in-progress' | 'completed';
  assigned_to?: string;
  submitted_by: string;
  created_at: string;
  pdf_url?: string;
  completion_id?: string;
  image_urls?: ImageWithCaption[]; // Change from string[] to ImageWithCaption[]
  profiles?: {
    full_name: string;
    username: string;
  }
    hasCompletionDraft?: boolean // Add this
      // ⭐ NEW FIELDS FOR DRAFT LOGIC ⭐
  hasDraft?: boolean
  isMyDraft?: boolean
  draftOwnerName?: string | null
  draftId?: string | null
}

export interface ComplaintFormData {
  building_name: string;
  incident_location: string;
  incident_description: string;
  incident_date: string;
  reporter_name: string;
  reporter_phone: string;
  solution_suggestion: string;
    images?: File[];
  imageCaptions?: string[]; // Add this
}

export interface Completion {
  id: string;
  complaint_id: string;
  completed_by: string;
  work_title: string;
  work_location: string;
  completion_date: string;
  company_name: string;
  work_order_number?: string;
  officer_name: string;
  supervisor_name: string;
  work_scope: string;
  quantity?: string;
  materials_equipment?: string;
  worker_count?: number;
  pic_signature_url?: string;
  created_at: string;
  complaints?: Complaint;
  profiles?: {
    full_name: string;
    completion_images?: ImageWithCaption[]; // Add this
  };
  completion_images: ImageWithCaption[]
  receipt_images: ImageWithCaption[]
}

export interface CompletionFormData {
  work_title: string;
  work_location: string;
  completion_date: string;
  company_name: string;
  work_order_number: string;
  officer_name: string;
  supervisor_name: string;
  work_scope: string;
  quantity: string;
  materials_equipment: string;
  worker_count: string;
  completionImages?: File[]; // Files to upload
  imageCaptions?: string[]; // Captions for each image
}

export interface ImageWithCaption {
  url: string;
  caption: string;
    storage_path?: string  // Add this (optional)
  type?: string         // Add this (optional)
}

// Add these to your existing Types.ts file
export interface DraftImageInfo {
  file_name: string
  storage_path: string
  caption: string
  preview: string
  size: number
  type: string
}

export interface ComplaintDraft {
  id: string
  user_id: string
  form_data: {
    building_name: string
    incident_location: string
    incident_description: string
    incident_date: string
    reporter_name: string
    reporter_phone: string
    solution_suggestion: string
  }
  uploaded_images: DraftImageInfo[]
  created_at: string
  updated_at: string
}



// Add to your existing Types
export interface Company {
  id: string
  name: string
  code: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  username: string | null
  full_name: string | null
  role: string
  company_id: string | null
  email: string | null
  status: string
  created_at: string
  updated_at: string
  companies?: Company
}

// Completion Draft stored in Supabase
export interface CompletionDraft {
  id: string
  complaint_id: string
  user_id: string
  uploaded_images: DraftImageInfo[]
  created_at: string
  updated_at: string
}
