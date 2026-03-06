// User and Auth types
export type UserRole = 'customer' | 'provider' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
  id: string;
  email: string;
  full_name: string;
  display_name?: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

// Job types
export type JobStatus =
  | 'draft' | 'posted' | 'quoting' | 'awarded'
  | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export type Urgency = 'emergency' | 'within_48h' | 'this_week' | 'this_month' | 'flexible';

export interface Job {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: Urgency;
  suburb: string;
  postcode: string;
  state: string;
  approximate_address?: string;
  exact_address?: string;
  budget_range?: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_is_gst: boolean;
  preferred_date?: string | null;
  preferred_start_date: string | null;
  awarded_provider_id: string | null;
  awarded_quote_id: string | null;
  quote_count: number;
  published_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: User;
  category?: { id: string; name: string; slug: string; icon: string };
}

// Quote types
export type QuoteStatus = 'pending' | 'viewed' | 'shortlisted' | 'awarded' | 'rejected' | 'withdrawn' | 'expired';
export type QuoteType = 'fixed' | 'estimate_range' | 'hourly' | 'call_for_quote';

export interface Quote {
  id: string;
  job_id: string;
  provider_id: string;
  status: QuoteStatus;
  quote_type: QuoteType;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  hourly_rate: number | null;
  is_gst_included: boolean;
  scope_notes: string | null;
  inclusions: string | null;
  exclusions: string | null;
  timeline_days: number | null;
  warranty_months: number | null;
  viewed_at: string | null;
  shortlisted_at: string | null;
  awarded_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
  provider?: User;
  job?: Job;
}

// Messaging types
export interface Conversation {
  id: string;
  job_id: string | null;
  conversation_type?: 'job' | 'admin_support';
  customer_id: string;
  provider_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_customer: number;
  unread_count_provider: number;
  customer_unread?: number;
  provider_unread?: number;
  created_at: string;
  updated_at: string;
  job?: Job;
  customer?: User;
  provider?: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: 'text' | 'voice' | 'image' | 'system' | 'quote_event';
  attachment_url: string | null;
  attachment_mime: string | null;
  is_deleted: boolean;
  read_by_recipient_at: string | null;
  created_at: string;
  sender?: User;
}

// Profile types
export interface CustomerProfile {
  user_id: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  jobs_posted: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  user_id: string;
  business_name: string | null;
  abn: string | null;
  bio: string | null;
  years_experience: number | null;
  service_radius_km: number;
  abn_verified: boolean;
  identity_verified: boolean;
  trade_license_verified: boolean;
  insurance_verified: boolean;
  avg_rating: number | null;
  total_reviews: number;
  total_quotes: number;
  jobs_completed: number;
  available: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface ProviderReviewSummary {
  id: string;
  rating: number | string;
  body: string | null;
  created_at: string;
  reviewer_name: string;
}

export interface CategoryProvider {
  user_id: string;
  full_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  business_name: string | null;
  bio: string | null;
  years_experience: number | null;
  avg_rating: number | string | null;
  total_reviews: number;
  jobs_completed: number;
  available: boolean;
  categories: string[];
  recent_reviews: ProviderReviewSummary[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  channel: 'push' | 'email' | 'in_app';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface APIError {
  message: string;
  code?: string;
  statusCode: number;
}
