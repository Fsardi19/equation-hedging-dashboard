import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Equation Coffee — Cobertura',
  description: 'Dashboard de cobertura de contratos físicos de café y FX',
}

import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="flex items-center gap-4 border-b bg-white px-4 py-3 text-sm shadow-sm">
          <Link href="/" className="font-semibold text-amber-800">☕ Equation — Cobertura</Link>
          <Link href="/" className="text-gray-600 hover:text-black">Libro</Link>
          <Link href="/contratos/nuevo" className="text-gray-600 hover:text-black">Nuevo contrato</Link>
          <Link href="/counterparties" className="text-gray-600 hover:text-black">Counterparties</Link>
          <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">MVP local</span>
        </nav>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  )
}
