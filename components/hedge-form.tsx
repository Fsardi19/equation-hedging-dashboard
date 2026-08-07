'use client'

import { addHedge } from '@/app/actions'

const input = 'rounded border p-1.5'

export function HedgeForm({ contractId }: { contractId: string }) {
  return (
    <form action={addHedge} className="flex flex-wrap items-end gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <select name="riesgoCubierto" className={input}>
        <option value="PRECIO">Precio (café)</option>
        <option value="FX">FX (divisa)</option>
      </select>
      <select name="tipo" className={input}>
        <option value="KC_FUTURO">KC Futuro</option>
        <option value="KC_OPCION">KC Opción</option>
        <option value="FX_FORWARD">FX Forward</option>
        <option value="FX_OPCION">FX Opción</option>
      </select>
      <select name="direccion" className={input}>
        <option value="LONG">Long</option>
        <option value="SHORT">Short</option>
      </select>
      <input name="cantidadLb" type="number" step="any" required placeholder="lb / nocional" className={input} />
      <input name="mesVencimiento" placeholder="Vto (KCU6)" className={`${input} w-24`} />
      <input name="strike" type="number" step="any" placeholder="strike" className={`${input} w-20`} />
      <select name="callPut" className={input} defaultValue="">
        <option value="">—</option>
        <option>CALL</option>
        <option>PUT</option>
      </select>
      <input name="precioOTasaEjecucion" type="number" step="any" required placeholder="precio/tasa" className={`${input} w-24`} />
      <input name="broker" placeholder="broker" className={`${input} w-24`} />
      <input name="fechaTrade" type="date" required className={input} />
      <button className="rounded bg-gray-800 px-3 py-1.5 text-white hover:bg-black">+ Hedge</button>
    </form>
  )
}
