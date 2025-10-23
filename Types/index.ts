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
  pdf_url?: string; // Add this line
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
}