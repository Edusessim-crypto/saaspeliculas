'use server'

import { authorize } from './shared'
import { formatPlate } from '@/lib/format'

export interface SearchResults {
  customers: { id: string; name: string; phone: string | null }[]
  vehicles: {
    id: string
    brand: string
    model: string
    year: number | null
    plate: string | null
    customer_id: string
    customer_name: string
  }[]
  orders: {
    id: string
    scheduled_start: string
    current_status: string
    customer_name: string
    vehicle_label: string | null
  }[]
}

const EMPTY: SearchResults = { customers: [], vehicles: [], orders: [] }

/** Pesquisa global: cliente, telefone, placa e modelo (§45). */
export async function globalSearch(term: string): Promise<SearchResults> {
  const auth = await authorize('orders:advance_own')
  const q = term.trim()
  if (!auth || q.length < 2) return EMPTY

  const orgId = auth.session.organization.id
  const digits = q.replace(/\D/g, '')
  const plate = formatPlate(q)

  const [customersRes, vehiclesRes] = await Promise.all([
    auth.supabase
      .from('customers')
      .select('id, name, phone')
      .eq('organization_id', orgId)
      .or(
        digits.length >= 3
          ? `name.ilike.%${q}%,phone.ilike.%${digits}%`
          : `name.ilike.%${q}%`,
      )
      .limit(5),
    auth.supabase
      .from('vehicles')
      .select('id, brand, model, year, plate, customer_id, customers(name)')
      .eq('organization_id', orgId)
      .or(`plate.ilike.%${plate}%,model.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(5),
  ])

  const vehicles = (vehiclesRes.data ?? []).map((v) => {
    const customer = Array.isArray(v.customers) ? v.customers[0] : v.customers
    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      customer_id: v.customer_id,
      customer_name: (customer as { name: string } | null)?.name ?? '',
    }
  })

  const vehicleIds = vehicles.map((v) => v.id)
  const customerIds = (customersRes.data ?? []).map((c) => c.id)

  let orders: SearchResults['orders'] = []
  if (vehicleIds.length || customerIds.length) {
    const filters = [
      vehicleIds.length ? `vehicle_id.in.(${vehicleIds.join(',')})` : null,
      customerIds.length ? `customer_id.in.(${customerIds.join(',')})` : null,
    ]
      .filter(Boolean)
      .join(',')

    const { data } = await auth.supabase
      .from('service_orders')
      .select('id, scheduled_start, current_status, customers(name), vehicles(brand, model)')
      .eq('organization_id', orgId)
      .or(filters)
      .order('scheduled_start', { ascending: false })
      .limit(5)

    orders = (data ?? []).map((o) => {
      const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
      const vehicle = Array.isArray(o.vehicles) ? o.vehicles[0] : o.vehicles
      const v = vehicle as { brand: string; model: string } | null
      return {
        id: o.id,
        scheduled_start: o.scheduled_start,
        current_status: o.current_status,
        customer_name: (customer as { name: string } | null)?.name ?? '',
        vehicle_label: v ? `${v.brand} ${v.model}` : null,
      }
    })
  }

  return { customers: customersRes.data ?? [], vehicles, orders }
}
