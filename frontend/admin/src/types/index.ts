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
export type CustomerStatus = 'active' | 'isolir' | 'inactive' | 'pending'

export interface Customer {
  id: number
  name: string
  phone: string
  email: string | null
  address: string
  coordinate_lat: string | null
  coordinate_lng: string | null
  status: CustomerStatus
  joined_at: string | null
  created_at: string
  updated_at: string
  subscriptions?: Subscription[]
}

export interface CustomerPayload {
  name: string
  phone: string
  email?: string | null
  address: string
  coordinate_lat?: number | null
  coordinate_lng?: number | null
  status?: CustomerStatus
  joined_at?: string | null
}

export interface CustomerListParams {
  search?: string
  status?: CustomerStatus | ''
  page?: number
  per_page?: number
}

// ─── Subscription ─────────────────────────────────────────────────
export interface Subscription {
  id: number
  customer_id: number
  package_id: number
  odp_id: number | null
  mikrotik_router_id: number | null
  port_number: number | null
  pppoe_username: string
  billing_due_date: number
  status: 'active' | 'isolir' | 'terminated'
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
  package?: Package
}

// ─── Package ─────────────────────────────────────────────────────
export interface Package {
  id: number
  name: string
  speed_mbps: number
  price: number
  mikrotik_profile_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PackagePayload {
  name: string
  speed_mbps: number
  price: number
  mikrotik_profile_name: string
  is_active?: boolean
}

// ─── Invoice ─────────────────────────────────────────────────────
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue'
export type InvoiceType   = 'installation' | 'monthly' | 'other'

export interface Invoice {
  id: number
  invoice_number: string
  customer_id: number
  subscription_id: number
  voucher_id: number | null
  type: InvoiceType
  period_month: string | null
  amount: number
  discount_amount: number
  final_amount: number
  due_date: string
  status: InvoiceStatus
  paid_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  payments?: Payment[]
}

export interface InvoiceListParams {
  customer_id?: number
  status?: InvoiceStatus | ''
  from?: string
  to?: string
  page?: number
  per_page?: number
}

// ─── Payment ─────────────────────────────────────────────────────
export type PaymentGateway = 'midtrans' | 'xendit' | 'manual' | 'other'
export type PaymentStatus  = 'pending' | 'success' | 'failed' | 'expired'

export interface Payment {
  id: number
  invoice_id: number
  gateway: PaymentGateway
  gateway_transaction_id: string | null
  method: string | null
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  invoice?: Invoice
}

export interface PaymentListParams {
  invoice_id?: number
  status?: PaymentStatus | ''
  page?: number
  per_page?: number
}

// ─── Router ──────────────────────────────────────────────────────
export interface MikrotikRouter {
  id: number
  name: string
  host: string
  api_port: number | null
  username: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // dari realtime WebSocket / Redis (tidak ada di API resource)
  status?: 'online' | 'offline' | 'unknown'
}

export interface RouterPayload {
  name: string
  host: string
  api_port?: number | null
  username: string
  password: string
  is_active?: boolean
  notes?: string | null
}

export interface RouterTrafficResponse {
  router_id: number
  router: string
  timestamp: string
  interfaces: import('./realtime').InterfaceTraffic[]
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
