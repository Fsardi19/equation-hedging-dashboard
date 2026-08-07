'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LibroRow } from '@/lib/view/libro'
import { SemaforoDot } from './semaforo'

const pct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 })

function pctClass(n: number): string {
  if (n >= 0.95) return 'text-green-700'
  if (n > 0) return 'text-yellow-700'
  return 'text-red-700'
}

export function LibroTable({ rows }: { rows: LibroRow[] }) {
  const [color, setColor] = useState('TODOS')
  const [lado, setLado] = useState('TODOS')

  const filtered = rows.filter(
    r => (color === 'TODOS' || r.status === color) && (lado === 'TODOS' || r.lado === lado),
  )

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
        No hay contratos todavía.{' '}
        <Link href="/contratos/nuevo" className="text-blue-600 underline">Crear el primero</Link>.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <select value={color} onChange={e => setColor(e.target.value)} className="rounded border p-1.5">
          <option value="TODOS">Todos los colores</option>
          <option value="VERDE">🟢 Verde</option>
          <option value="AMARILLO">🟡 Amarillo</option>
          <option value="ROJO">🔴 Rojo</option>
        </select>
        <select value={lado} onChange={e => setLado(e.target.value)} className="rounded border p-1.5">
          <option value="TODOS">Compra y venta</option>
          <option value="COMPRA">Compra</option>
          <option value="VENTA">Venta</option>
        </select>
        <span className="self-center text-xs text-gray-500">{filtered.length} de {rows.length} contratos</span>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-2">Estado</th>
              <th className="p-2">Ref</th>
              <th className="p-2">Lado</th>
              <th className="p-2">Counterparty</th>
              <th className="p-2 text-right">Sacos</th>
              <th className="p-2 text-right">Libras</th>
              <th className="p-2">Precio</th>
              <th className="p-2 text-right">% fijado</th>
              <th className="p-2 text-right">% café</th>
              <th className="p-2 text-right">% FX</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-2"><SemaforoDot status={r.status} /></td>
                <td className="p-2">
                  <Link href={`/contratos/${r.id}`} className="font-medium text-blue-600 underline">{r.ref}</Link>
                </td>
                <td className="p-2">{r.lado}</td>
                <td className="p-2">{r.counterparty}</td>
                <td className="p-2 text-right">{fmt(r.sacos)}×{r.tamanoSacoKg}</td>
                <td className="p-2 text-right">{fmt(r.lb)}</td>
                <td className="p-2">{r.tipoPrecio}</td>
                <td className={`p-2 text-right ${pctClass(r.pricedPct)}`}>{pct(r.pricedPct)}</td>
                <td className={`p-2 text-right ${pctClass(r.flatPct)}`}>{pct(r.flatPct)}</td>
                <td className={`p-2 text-right ${pctClass(r.fxPct)}`}>{pct(r.fxPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
