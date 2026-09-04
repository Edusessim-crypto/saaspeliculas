import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FilmFlow — Operação da loja',
    template: '%s · FilmFlow',
  },
  description:
    'Sistema operacional para lojas de aplicação de películas, PPF e envelopamento.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FilmFlow',
  },
}

export const viewport: Viewport = {
  themeColor: '#172554',
  width: 'device-width',
  initialScale: 1,
  // Permite zoom: bloquear prejudica acessibilidade (§68).
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'text-[13.5px]',
            style: {
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </body>
    </html>
  )
}
