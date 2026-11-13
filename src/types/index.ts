// Global TypeScript Type Definitions for Campus Resource Allocation Platform

export type UserRole = "ADMIN" | "FACULTY";

export interface User {
  id: number;
  department_id: number;
  department_name?: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
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

export interface BookingRequest {
  id: number;
  user_id: number;
  faculty_name?: string;
  faculty_email?: string;
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
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requested_facilities?: Array<{
    facility_id: number;
    facility_name: string;
    min_quantity: number;
  }>;
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
