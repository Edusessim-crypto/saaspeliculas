'use server'

import { authorize } from './shared'
import type { ServiceType, Workstation, Vehicle } from '@/types/database'

export interface BookingCatalog {
  serviceTypes: ServiceType[]
  workstations: Workstation[]
}

/** Catálogo carregado sob demanda ao abrir o fluxo de agendamento. */
export async function getBookingCatalog(): Promise<BookingCatalog> {
  const auth = await authorize('orders:create')
  if (!auth) return { serviceTypes: [], workstations: [] }

  const orgId = auth.session.organization.id
  const [services, stations] = await Promise.all([
    auth.supabase
      .from('service_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order'),
    auth.supabase
      .from('workstations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return {
    serviceTypes: (services.data ?? []) as ServiceType[],
    workstations: (stations.data ?? []) as Workstation[],
  }
}

export async function getVehiclesFor(customerId: string): Promise<Vehicle[]> {
  const auth = await authorize('orders:create')
  if (!auth) return []

  const { data } = await auth.supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Vehicle[]
}
