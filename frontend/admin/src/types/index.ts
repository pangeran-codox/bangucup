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

// ─── Ticket ──────────────────────────────────────────────────────
export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface TicketReply {
  id: number
  ticket_id: number
  user_id: number
  message: string
  created_at: string
  user?: User
}

export interface Ticket {
  id: number
  customer_id: number
  subscription_id: number | null
  subject: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  assigned_to: number | null
  resolved_at: string | null
  created_at: string
  customer?: Customer
  replies?: TicketReply[]
}

export interface TicketPayload {
  customer_id: number
  subscription_id?: number | null
  subject: string
  description?: string | null
  priority?: TicketPriority
  assigned_to?: number | null
}

export interface TicketListParams {
  status?: TicketStatus | ''
  priority?: TicketPriority | ''
  page?: number
  per_page?: number
}

// ─── Device (CPE/ONU via GenieACS) ───────────────────────────────
export type DeviceStatus = 'online' | 'offline' | 'unknown'

export interface Device {
  id: number
  customer_id: number
  genieacs_device_id: string
  serial_number: string | null
  brand_model: string | null
  last_inform_at: string | null
  last_status: DeviceStatus
  rx_power: number | string | null
  ssid: string | null
  updated_at: string
  customer?: Customer
}

export interface DeviceListParams {
  customer_id?: number
  status?: DeviceStatus | ''
  page?: number
  per_page?: number
}

// ─── Asset ───────────────────────────────────────────────────────
export interface Asset {
  id: number
  name: string
  category: string
  sku: string | null
  stock_qty: number
  unit: string | null
  created_at: string
  updated_at: string
}

export interface AssetPayload {
  name: string
  category: string
  sku?: string | null
  stock_qty?: number
  unit?: string | null
}

export interface AssetMovement {
  id: number
  asset_id: number
  type: 'in' | 'out'
  qty: number
  subscription_id: number | null
  note: string | null
  created_at: string
}

export interface AssetListParams {
  search?: string
  category?: string
  page?: number
  per_page?: number
}
