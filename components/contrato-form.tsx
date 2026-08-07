'use client'

import { useState } from 'react'
import type { Counterparty } from '@/lib/domain/types'
import { createContract } from '@/app/actions'

const input = 'rounded border p-2'

export function ContratoForm({ counterparties }: { counterparties: Counterparty[] }) {
  const [tipoPrecio, setTipoPrecio] = useState('FIJO')

  return (
    <form action={createContract} className="grid max-w-2xl grid-cols-2 gap-3 text-sm">
      <input name="ref" required placeholder="Ref (EQ-2026-001)" className={input} />
      <select name="lado" className={input}>
        <option value="COMPRA">Compra</option>
        <option value="VENTA">Venta</option>
      </select>

      <select name="counterpartyId" required className={`${input} col-span-2`} defaultValue="">
        <option value="" disabled>— Counterparty —</option>
        {counterparties.map(c => (
          <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
        ))}
      </select>

      <input name="sacos" type="number" step="any" required placeholder="Cantidad (sacos)" className={input} />
      <select name="tamanoSacoKg" className={input}>
        <option value="70">70 kg / saco</option>
        <option value="35">35 kg / saco</option>
      </select>

      <input name="calidadOrigen" placeholder="Calidad / origen" className={`${input} col-span-2`} />

      <select name="moneda" className={input}>
        <option>USD</option><option>COP</option><option>EUR</option>
      </select>
      <select name="tipoPrecio" value={tipoPrecio} onChange={e => setTipoPrecio(e.target.value)} className={input}>
        <option value="FIJO">Precio fijo</option>
        <option value="PTBF">Diferencial (PTBF)</option>
      </select>

      {tipoPrecio === 'FIJO' ? (
        <input name="precioFijoUsdLb" type="number" step="any" placeholder="Precio fijo USD/lb" className={`${input} col-span-2`} />
      ) : (
        <>
          <input name="mesFuturo" placeholder="Mes futuro (KCU6)" className={input} />
          <input name="diferencialUsdLb" type="number" step="any" placeholder="Diferencial USD/lb" className={input} />
        </>
      )}

      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Fecha trade
        <input name="fechaTrade" type="date" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Fecha entrega
        <input name="fechaEntrega" type="date" className={input} />
      </label>

      <textarea name="notas" placeholder="Notas" className={`${input} col-span-2`} rows={2} />
      <button className="col-span-2 rounded bg-amber-700 p-2 text-white hover:bg-amber-800">Crear contrato</button>
    </form>
  )
}
