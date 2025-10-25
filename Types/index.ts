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
    completion_id?: string; // Add this
  pdf_url?: string; // ✅ Make sure this line exists
  profiles?: {
    full_name: string;
    username: string;
    image_urls?: string[]; // Add this line
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
  images?: File[]; // Add this line
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
}