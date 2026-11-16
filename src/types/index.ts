// Global TypeScript Type Definitions for Campus Resource Allocation Platform

export type UserRole = "ADMIN" | "FACULTY" | "CLUB";
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: number;
  department_id?: number | null;
  department_name?: string;
  email: string;
  name: string;
  role: UserRole;
  verification_status: VerificationStatus;
  verified_at?: string | null;
  club_id?: number;
  club_name?: string;
  created_at: string;
}

export interface ClubProfile {
  id: number;
  user_id: number;
  club_name: string;
  lead_name: string | null;
  lead_phone: string | null;
  category: "Technical" | "Cultural" | "Sports" | "Literary" | "Social" | "Academic" | "Other";
  description: string | null;
  founded_year: number | null;
  advisor?: ClubAdvisorSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ClubAdvisorSummary {
  id: number;
  faculty_user_id: number;
  faculty_name: string;
  faculty_email: string;
  faculty_department?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REPLACED";
  assigned_at: string;
  responded_at?: string | null;
  notes?: string | null;
}

export interface ClubAdvisor {
  id: number;
  club_id: number;
  club_name?: string;
  club_category?: string;
  faculty_user_id: number;
  faculty_name?: string;
  faculty_email?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REPLACED";
  assigned_at: string;
  responded_at?: string | null;
  notes?: string | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface ResourceType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type ResourceStatus = "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";

export interface Resource {
  id: number;
  resource_type_id: number;
  resource_type_name?: string;
  resource_type_code?: string;
  department_id: number;
  department_name?: string;
  code: string;
  name: string;
  capacity: number;
  location: string;
  status: ResourceStatus;
  created_at: string;
  facilities?: ResourceFacilityDetail[];
  profile?: ResourceProfile | null;
}

export interface Facility {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ResourceFacilityDetail {
  facility_id: number;
  facility_name: string;
  facility_code: string;
  quantity: number;
}

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type AdvisorReviewStatus = "NOT_APPLICABLE" | "PENDING_ADVISOR" | "ENDORSED" | "REJECTED";
export type RequestType = "FACULTY" | "CLUB";

export interface BookingRequest {
  id: number;
  user_id: number;
  faculty_name?: string;
  faculty_email?: string;
  applicant_role?: UserRole;
  department_name?: string;
  resource_type_id: number;
  resource_type_name?: string;
  preferred_resource_id: number | null;
  preferred_resource_name?: string | null;
  preferred_resource_code?: string | null;
  title: string;
  description: string | null;
  start_time: string; // YYYY-MM-DD HH:mm
  end_time: string;   // YYYY-MM-DD HH:mm
  expected_capacity: number;
  status: RequestStatus;
  request_type: RequestType;
  club_id?: number | null;
  club_name?: string | null;
  advisor_review_status: AdvisorReviewStatus;
  event_type?: string | null;
  expected_guests?: string | null;
  equipment_notes?: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requested_facilities?: Array<{
    facility_id: number;
    facility_name: string;
    min_quantity: number;
  }>;
  review_history?: RequestReviewHistory[];
}

export interface RequestReviewHistory {
  id: number;
  request_id: number;
  reviewer_user_id: number;
  reviewer_name?: string;
  reviewer_role?: UserRole;
  action: "SUBMITTED" | "ENDORSED" | "REJECTED_BY_ADVISOR" | "APPROVED_BY_ADMIN" | "REJECTED_BY_ADMIN" | "COMMENT";
  comments?: string | null;
  created_at: string;
}

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface Booking {
  id: number;
  request_id: number;
  resource_id: number;
  resource_code?: string;
  resource_name?: string;
  resource_location?: string;
  booked_by_user_id: number;
  faculty_name?: string;
  faculty_email?: string;
  department_name?: string;
  start_time: string; // YYYY-MM-DD HH:mm
  end_time: string;   // YYYY-MM-DD HH:mm
  status: BookingStatus;
  title?: string;
  created_at: string;
  updated_at: string;
}

export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Maintenance {
  id: number;
  resource_id: number;
  resource_code?: string;
  resource_name?: string;
  scheduled_by_user_id: number;
  scheduler_name?: string;
  start_time: string;
  end_time: string;
  status: MaintenanceStatus;
  reason: string;
  notes: string | null;
  created_at: string;
}

export interface RecommendedResource {
  resource_id: number;
  resource_code: string;
  resource_name: string;
  capacity: number;
  location: string;
  department_name: string;
  total_score: number;
  capacity_score: number;
  facilities_score: number;
  availability_score: number;
  type_score: number;
  location_score: number;
  facility_breakdown: Array<{
    facility_id: number;
    facility_name: string;
    required_qty: number;
    available_qty: number;
    satisfied: boolean;
  }>;
}

export interface ResourceProfile {
  _id?: string;
  pg_resource_id: number;
  resource_type: string;
  updated_at: string;
  specifications: Record<string, any>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}
