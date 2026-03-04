export type UserRole = 'customer' | 'provider' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending_verification' | 'deleted';
export type JobStatus = 'draft' | 'posted' | 'quoting' | 'awarded' | 'in_progress' | 'completed' | 'cancelled' | 'expired' | 'closed' | 'disputed';
export type JobUrgency = 'emergency' | 'within_48h' | 'this_week' | 'this_month' | 'flexible';
export type PropertyType = 'house' | 'apartment' | 'townhouse' | 'commercial' | 'land' | 'other';
export type AUState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
export type QuoteStatus = 'pending' | 'viewed' | 'shortlisted' | 'awarded' | 'rejected' | 'withdrawn' | 'expired';
export type QuoteType = 'fixed' | 'estimate_range' | 'hourly' | 'call_for_quote';
export type MessageType = 'text' | 'image' | 'system' | 'quote_event';
export type NotificationType = 'quote_received' | 'quote_viewed' | 'quote_shortlisted' | 'quote_awarded' | 'quote_rejected' | 'job_posted' | 'job_awarded' | 'job_completed' | 'new_message' | 'review_received';

// ===== AUTH =====

export interface User {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  phone: string | null;
  avatar_url: string | null;
  timezone: string | null;
  push_enabled: boolean;
  email_notifications: boolean;
  created_at: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

// Re-exported for convenience — source of truth is the schema file
export type { LoginInput, RegisterInput, CreateJobInput, SubmitQuoteInput } from '@tradeconnect/shared';

// ===== JOB =====

export interface Job {
  id: string;
  customer_id: string;
  category_id: string;
  subcategory_id: string | null;
  title: string;
  description: string;
  status: JobStatus;
  urgency: JobUrgency;
  property_type: PropertyType | null;
  suburb: string;
  postcode: string;
  state: AUState;
  exact_address?: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_is_gst: boolean;
  preferred_start_date: string | null;
  preferred_end_date: string | null;
  time_window_notes: string | null;
  quote_count: number;
  awarded_quote_id: string | null;
  awarded_provider_id: string | null;
  awarded_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  is_flagged: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  customer?: User;
  category?: JobCategory;
  attachments?: JobAttachment[];
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
}

export interface JobAttachment {
  id: string;
  job_id: string;
  uploader_id: string;
  file_type: 'image' | 'document';
  mime_type: string;
  s3_key: string;
  cdn_url: string;
  file_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_flagged: boolean;
  scan_passed: boolean | null;
  created_at: string;
}

export interface JobFeedResponse {
  jobs: Job[];
  nextCursor: string | null;
}

// ===== QUOTE =====

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
  withdrawal_reason: string | null;
  expires_at: string | null;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  provider?: ProviderProfile & { user?: User };
  job?: Job;
}

// ===== PROFILE =====

export interface CustomerProfile {
  user_id: string;
  suburb: string | null;
  state: AUState | null;
  postcode: string | null;
  jobs_posted: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  user_id: string;
  bio: string | null;
  years_experience: number | null;
  service_radius_km: number;
  business_name: string | null;
  abn: string | null;
  abn_verified: boolean;
  identity_verified: boolean;
  trade_license_verified: boolean;
  insurance_verified: boolean;
  avg_rating: number | null;
  total_reviews: number;
  total_quotes: number;
  jobs_completed: number;
  available: boolean;
  last_active_at: string | null;
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
  display_name: string | null;
  avatar_url: string | null;
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

// ===== MESSAGING =====

export interface Conversation {
  id: string;
  job_id: string;
  customer_id: string;
  provider_id: string;
  quote_id: string | null;
  last_message_at: string | null;
  customer_unread: number;
  provider_unread: number;
  is_archived: boolean;
  created_at: string;
  job?: Job;
  customer?: User;
  provider?: User;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  body: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  pii_detected: boolean;
  pii_blocked: boolean;
  is_flagged: boolean;
  read_by_recipient_at: string | null;
  created_at: string;
  sender?: User;
}

// ===== NOTIFICATION =====

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: 'push' | 'email' | 'in_app';
  title: string;
  body: string;
  data: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  failed: boolean;
  failure_reason: string | null;
  created_at: string;
}

// ===== REVIEW =====

export interface Review {
  id: string;
  job_id: string;
  quote_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  rating_quality: number | null;
  rating_timeliness: number | null;
  rating_communication: number | null;
  rating_value: number | null;
  body: string | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  is_verified: boolean;
  is_flagged: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  reviewer?: User;
  reviewee?: User;
  job?: Job;
}
