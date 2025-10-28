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
  };
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
}