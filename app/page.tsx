import Link from 'next/link'
import { buildLibroRows } from '@/lib/view/libro'
import { LibroTable } from '@/components/libro-table'

export const dynamic = 'force-dynamic'

export default async function LibroPage() {
  const rows = await buildLibroRows()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Libro de contratos</h1>
        <div className="ml-auto flex gap-2">
          <a href="/api/export/libro" className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            ⬇ Excel
          </a>
          <Link href="/contratos/nuevo" className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800">
            + Nuevo contrato
          </Link>
        </div>
      </div>
      <LibroTable rows={rows} />
    </div>
  )
}
