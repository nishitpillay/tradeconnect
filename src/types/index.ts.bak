// User and Auth types
export type UserRole = 'customer' | 'provider';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

// Job types
export type JobStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type BudgetRange = '$200-$500' | '$500-$1000' | '$1000-$2000' | '$2000+';
export type Urgency = 'flexible' | 'within_week' | 'within_days' | 'urgent';

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  category: string;
  status: JobStatus;
  budget_range: BudgetRange;
  urgency: Urgency;
  preferred_date: string | null;
  exact_address: string;
  approximate_address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  images: string[];
  awarded_provider_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: User;
  quotes_count?: number;
}

// Quote types
export type QuoteStatus = 'pending' | 'accepted' | 'rejected';
export type QuoteType = 'fixed' | 'hourly' | 'quote_range';

export interface Quote {
  id: string;
  job_id: string;
  provider_id: string;
  quote_type: QuoteType;
  amount: number;
  hourly_rate?: number;
  estimated_hours?: number;
  estimated_days: number;
  notes: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  provider?: User;
  job?: Job;
}

// Messaging types
export interface Conversation {
  id: string;
  job_id: string;
  customer_id: string;
  provider_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_customer: number;
  unread_count_provider: number;
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
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: User;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

// Profile types
export interface CustomerProfile {
  user_id: string;
  jobs_posted: number;
  jobs_completed: number;
  average_rating: number | null;
  total_reviews: number;
}

export interface ProviderProfile {
  user_id: string;
  business_name: string | null;
  abn: string | null;
  trade_categories: string[];
  years_experience: number | null;
  bio: string | null;
  verification_status: 'unverified' | 'pending' | 'verified';
  insurance_verified: boolean;
  license_verified: boolean;
  police_check_verified: boolean;
  quotes_sent: number;
  jobs_won: number;
  jobs_completed: number;
  average_rating: number | null;
  total_reviews: number;
}

// API Error
export interface APIError {
  message: string;
  code?: string;
  statusCode: number;
}

// Form inputs (for Zod)
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
}

export interface CreateJobInput {
  title: string;
  description: string;
  category: string;
  budget_range: BudgetRange;
  urgency: Urgency;
  preferred_date: string | null;
  exact_address: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface SubmitQuoteInput {
  job_id: string;
  quote_type: QuoteType;
  amount: number;
  hourly_rate?: number;
  estimated_hours?: number;
  estimated_days: number;
  notes: string;
}
