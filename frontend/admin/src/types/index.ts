// ─── Auth ────────────────────────────────────────────────────────
export interface User {
  id: number
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

// ─── API ─────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// ─── Customer ────────────────────────────────────────────────────
export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string
  address: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
}

// ─── Package ─────────────────────────────────────────────────────
export interface Package {
  id: number
  name: string
  speed_download: number
  speed_upload: number
  price: number
  description: string | null
  is_active: boolean
}

// ─── Invoice ─────────────────────────────────────────────────────
export interface Invoice {
  id: number
  customer_id: number
  customer?: Customer
  amount: number
  due_date: string
  paid_at: string | null
  status: 'unpaid' | 'paid' | 'overdue'
  created_at: string
}

// ─── Router ──────────────────────────────────────────────────────
export interface MikrotikRouter {
  id: number
  name: string
  host: string
  port: number
  username: string
  is_active: boolean
  status?: 'online' | 'offline' | 'unknown'
}

// ─── Dashboard Stats ─────────────────────────────────────────────
export interface DashboardStats {
  total_customers: number
  active_customers: number
  suspended_customers: number
  total_revenue_this_month: number
  unpaid_invoices: number
  overdue_invoices: number
  total_routers: number
  online_routers: number
}
