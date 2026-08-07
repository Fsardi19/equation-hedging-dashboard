'use client'

import { addCost } from '@/app/actions'

const input = 'rounded border p-1.5'

export function CostForm({ contractId }: { contractId: string }) {
  return (
    <form action={addCost} className="flex flex-wrap items-end gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <select name="tipo" className={input}>
        <option>FINANCIACION</option>
        <option>LOGISTICA</option>
        <option>COMISION_BROKER</option>
        <option>ALMACENAJE</option>
        <option>CERTIFICACION</option>
        <option>OTRO</option>
      </select>
      <input name="monto" type="number" step="any" required placeholder="monto" className={`${input} w-28`} />
      <select name="moneda" className={input}>
        <option>USD</option><option>COP</option><option>EUR</option>
      </select>
      <input name="fecha" type="date" required className={input} />
      <input name="facturaRef" placeholder="factura ref" className={`${input} w-28`} />
      <input name="descripcion" placeholder="descripción" className={`${input} w-40`} />
      <button className="rounded bg-gray-800 px-3 py-1.5 text-white hover:bg-black">+ Costo</button>
    </form>
  )
}
