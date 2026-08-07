import { NextResponse } from 'next/server'
import { buildLibroRows } from '@/lib/view/libro'
import { buildLibroWorkbook } from '@/lib/export/workbook'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params
  if (tipo !== 'libro') {
    return new NextResponse('Tipo no soportado', { status: 404 })
  }

  const rows = await buildLibroRows()
  const buf = await buildLibroWorkbook(rows)
  const fecha = new Date().toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="libro_equation_${fecha}.xlsx"`,
    },
  })
}
