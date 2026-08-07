import { store } from '@/lib/data'
import { createCounterparty } from '@/app/actions'

export const dynamic = 'force-dynamic'

const input = 'rounded border p-2'

export default async function CounterpartiesPage() {
  const items = await store.listCounterparties()

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Counterparties</h1>

      <form action={createCounterparty} className="flex flex-wrap items-end gap-2 text-sm">
        <input name="nombre" required placeholder="Nombre" className={input} />
        <select name="tipo" className={input}>
          <option value="PROVEEDOR">Proveedor</option>
          <option value="CLIENTE">Cliente</option>
        </select>
        <input name="pais" placeholder="País" className={input} />
        <select name="monedaDefault" className={input}>
          <option>USD</option><option>COP</option><option>EUR</option>
        </select>
        <button className="rounded bg-amber-700 px-4 py-2 text-white hover:bg-amber-800">Agregar</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-2">Nombre</th><th className="p-2">Tipo</th><th className="p-2">País</th><th className="p-2">Moneda</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin counterparties todavía.</td></tr>
            ) : items.map(c => (
              <tr key={c.id} className="border-b">
                <td className="p-2 font-medium">{c.nombre}</td>
                <td className="p-2">{c.tipo}</td>
                <td className="p-2">{c.pais ?? '—'}</td>
                <td className="p-2">{c.monedaDefault}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
