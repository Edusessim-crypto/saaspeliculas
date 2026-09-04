'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { signIn, requestPasswordReset } from '@/lib/actions/auth'

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await signIn(values)
      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível entrar.')
        return
      }
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') ? next : (result.data?.next ?? '/hoje'))
      router.refresh()
    })
  }

  function onForgotPassword() {
    const email = getValues('email')
    if (!email) {
      toast.error('Informe seu e-mail para receber o link.')
      return
    }
    startTransition(async () => {
      await requestPasswordReset(email)
      toast.success('Se o e-mail existir, enviamos um link de recuperação.')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
      <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="voce@empresa.com.br"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>

      <Field label="Senha" htmlFor="password" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-11"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Entrar
      </Button>

      <button
        type="button"
        onClick={onForgotPassword}
        className="block w-full text-center text-[13px] font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
      >
        Esqueci minha senha
      </button>
    </form>
  )
}
