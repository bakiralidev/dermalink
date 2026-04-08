import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface DoctorPatientItem {
  phone: string;
  full_name: string;
  age: number;
  sex: string;
  body_part: string;
  last_timestamp: string;
  model_variant: string;
  top_label: string;
  top_confidence: number;
  total_cases: number;
}

export interface DoctorRecentCase {
  phone: string;
  full_name: string;
  body_part: string;
  timestamp: string;
  model_variant: string;
  top_label: string;
  top_confidence: number;
  comparison: string | null;
}

export interface DoctorDashboardResponse {
  patients: DoctorPatientItem[];
  recent_cases: DoctorRecentCase[];
  stats: {
    registered_patients: number;
    total_cases: number;
  };
}

export async function fetchDoctorDashboard(): Promise<DoctorDashboardResponse> {
  const response = await axios.get<DoctorDashboardResponse>(`${API_BASE}/api/doctor/dashboard`);
  return response.data;
}
