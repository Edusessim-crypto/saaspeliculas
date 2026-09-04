import type { OrderStatus } from '@/domain/status'
import type { AppRole } from '@/domain/roles'

export type OrderPriority = 'normal' | 'high' | 'urgent'

export type ServiceCategory =
  | 'automotive_film'
  | 'architectural_film'
  | 'ppf'
  | 'wrap'
  | 'other'

export type PlanTier = 'starter' | 'pro' | 'business'

export type NotificationKind =
  | 'order_started'
  | 'order_finished'
  | 'order_delayed'
  | 'employee_changed'
  | 'rescheduled'
  | 'cancelled'
  | 'vehicle_ready'

export interface Organization {
  id: string
  name: string
  slug: string | null
  document: string | null
  plan: PlanTier
  max_users: number
  max_locations: number
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  organization_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: AppRole
  is_active: boolean
  created_at: string
}

export interface Employee {
  id: string
  organization_id: string
  location_id: string | null
  user_id: string | null
  full_name: string
  role: AppRole
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  color: string
  weekly_hours: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeSpecialty {
  id: string
  employee_id: string
  specialty: string
}

export interface Workstation {
  id: string
  organization_id: string
  location_id: string | null
  name: string
  description: string | null
  allowed_categories: ServiceCategory[] | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Customer {
  id: string
  organization_id: string
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  document: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  organization_id: string
  customer_id: string
  brand: string
  model: string
  version: string | null
  year: number | null
  color: string | null
  plate: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ServiceType {
  id: string
  organization_id: string
  name: string
  category: ServiceCategory
  default_duration_minutes: number
  default_price: number | null
  default_employee_count: number
  requires_workstation: boolean
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ServiceOrder {
  id: string
  organization_id: string
  location_id: string | null
  code: number
  customer_id: string
  vehicle_id: string | null
  service_address: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  current_status: OrderStatus
  status_changed_at: string
  priority: OrderPriority
  workstation_id: string | null
  internal_notes: string | null
  customer_notes: string | null
  cancellation_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ServiceOrderItem {
  id: string
  organization_id: string
  service_order_id: string
  service_type_id: string
  name_snapshot: string
  duration_minutes: number
  price: number | null
  quantity: number
  created_at: string
}

export interface ServiceOrderEmployee {
  id: string
  organization_id: string
  service_order_id: string
  employee_id: string
  is_lead: boolean
  assigned_at: string
}

export interface StatusHistoryEntry {
  id: string
  organization_id: string
  service_order_id: string
  previous_status: OrderStatus | null
  new_status: OrderStatus
  changed_by: string | null
  changed_by_name: string | null
  note: string | null
  changed_at: string
}

export interface ActivityLogEntry {
  id: string
  organization_id: string
  service_order_id: string | null
  actor_id: string | null
  actor_name: string | null
  action: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  organization_id: string
  name: string
  category: ServiceCategory | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface ChecklistItem {
  id: string
  template_id: string
  label: string
  is_required: boolean
  sort_order: number
}

export interface ChecklistResponse {
  id: string
  organization_id: string
  service_order_id: string
  checklist_item_id: string
  label_snapshot: string
  checked: boolean
  note: string | null
  responded_by: string | null
  responded_at: string
}

export interface AppNotification {
  id: string
  organization_id: string
  user_id: string | null
  service_order_id: string | null
  kind: NotificationKind
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

export interface BusinessHours {
  id: string
  organization_id: string
  location_id: string | null
  weekday: number
  is_open: boolean
  opens_at: string | null
  closes_at: string | null
  break_start: string | null
  break_end: string | null
}

// ---------------------------------------------------------------
// Views compostas — o shape que as telas realmente consomem.
// ---------------------------------------------------------------

export interface OrderEmployeeView {
  employee_id: string
  full_name: string
  color: string
  avatar_url: string | null
  is_lead: boolean
}

export interface ServiceOrderView extends ServiceOrder {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'whatsapp'> | null
  vehicle: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'color' | 'plate'> | null
  workstation: Pick<Workstation, 'id' | 'name'> | null
  items: Pick<ServiceOrderItem, 'id' | 'name_snapshot' | 'duration_minutes' | 'price' | 'quantity'>[]
  employees: OrderEmployeeView[]
}

export interface ScheduleConflict {
  conflict_type: 'employee' | 'workstation'
  resource_id: string
  resource_name: string
  order_id: string
  conflict_start: string
  conflict_end: string
}

export interface SessionContext {
  userId: string
  profile: Profile
  organization: Organization
  role: AppRole
  employeeId: string | null
  locationId: string | null
}
