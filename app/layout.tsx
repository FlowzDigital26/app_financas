import type { Metadata } from 'next'
import { ThemeProvider } from '@/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flowz Finance — Controle Financeiro Inteligente',
  description: 'Organize receitas, despesas e objetivos financeiros de forma simples, bonita e intuitiva. Gratuito e seguro.',
  icons: {
    icon: '/flowz-logo.svg',
    shortcut: '/flowz-logo.svg',
    apple: '/flowz-logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
