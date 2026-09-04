'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fail, succeed, type ActionResult } from './shared'

const credentialsSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres'),
})

export async function signIn(raw: unknown): Promise<ActionResult<{ next: string }>> {
  const parsed = credentialsSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  // Mensagem generica de proposito: nao revela se o e-mail existe.
  if (error) return fail('E-mail ou senha incorretos.')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail('Não foi possível entrar. Tente novamente.')

  const { data: employee } = await supabase
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organizations(onboarding_completed)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const org = Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations

  if (!membership) return succeed({ next: '/onboarding' })
  if (!org?.onboarding_completed) return succeed({ next: '/onboarding' })

  const role = membership.role ?? employee?.role
  revalidatePath('/', 'layout')
  return succeed({ next: role === 'applicator' ? '/app' : '/hoje' })
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const parsed = z.string().email().safeParse(email.trim())
  if (!parsed.success) return fail('Informe um e-mail válido.')

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data)

  // Sempre sucesso, para nao vazar quais e-mails existem.
  return succeed()
}
