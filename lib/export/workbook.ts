import ExcelJS from 'exceljs'
import type { LibroRow } from '@/lib/view/libro'

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

export async function buildLibroWorkbook(rows: LibroRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Libro')
  ws.columns = [
    { header: 'Ref', key: 'ref', width: 16 },
    { header: 'Lado', key: 'lado', width: 8 },
    { header: 'Counterparty', key: 'counterparty', width: 22 },
    { header: 'Estado', key: 'estado', width: 10 },
    { header: 'Sacos', key: 'sacos', width: 10 },
    { header: 'Tamaño saco (kg)', key: 'tamanoSacoKg', width: 15 },
    { header: 'Libras', key: 'lb', width: 12 },
    { header: 'Moneda', key: 'moneda', width: 8 },
    { header: 'Tipo precio', key: 'tipoPrecio', width: 12 },
    { header: 'Exposición FX', key: 'exposureNotional', width: 14 },
    { header: '% fijado', key: 'pricedPct', width: 10 },
    { header: '% café', key: 'flatPct', width: 10 },
    { header: '% FX', key: 'fxPct', width: 10 },
    { header: 'Semáforo', key: 'status', width: 10 },
  ]
  ws.getRow(1).font = { bold: true }
  for (const r of rows) {
    ws.addRow({
      ref: r.ref, lado: r.lado, counterparty: r.counterparty, estado: r.estado,
      sacos: Math.round(r.sacos), tamanoSacoKg: r.tamanoSacoKg, lb: Math.round(r.lb),
      moneda: r.moneda, tipoPrecio: r.tipoPrecio, exposureNotional: Math.round(r.exposureNotional),
      pricedPct: r.pricedPct, flatPct: r.flatPct, fxPct: r.fxPct, status: r.status,
    })
  }
  for (const key of ['pricedPct', 'flatPct', 'fxPct']) {
    ws.getColumn(key).numFmt = '0%'
  }
  const arr = await wb.xlsx.writeBuffer()
  return Buffer.from(arr)
}
