'use client'

import { addFixation } from '@/app/actions'

const input = 'rounded border p-1.5'

export function FixationForm({ contractId }: { contractId: string }) {
  return (
    <form action={addFixation} className="flex flex-wrap items-end gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <input name="fecha" type="date" required className={input} />
      <input name="cantidadLbFijada" type="number" step="any" required placeholder="lb fijadas" className={input} />
      <input name="precioFuturoFijadoUsdLb" type="number" step="any" required placeholder="precio futuro USD/lb" className={input} />
      <button className="rounded bg-gray-800 px-3 py-1.5 text-white hover:bg-black">+ Fijación</button>
    </form>
  )
}
