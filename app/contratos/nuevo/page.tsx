import Link from 'next/link'
import { store } from '@/lib/data'
import { ContratoForm } from '@/components/contrato-form'

export const dynamic = 'force-dynamic'

export default async function NuevoContrato() {
  const counterparties = await store.listCounterparties()

  if (counterparties.length === 0) {
    return (
      <div className="rounded border border-dashed p-8 text-center text-sm text-gray-600">
        Primero crea al menos un{' '}
        <Link href="/counterparties" className="text-blue-600 underline">counterparty</Link>{' '}
        (proveedor o cliente) para poder asociar el contrato.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo contrato</h1>
      <ContratoForm counterparties={counterparties} />
    </div>
  )
}
