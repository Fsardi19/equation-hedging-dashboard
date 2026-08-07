import Link from 'next/link'
import { notFound } from 'next/navigation'
import { store } from '@/lib/data'
import {
  computePriceStatus, computeFlatCoverage, computeFxCoverage, consolidatedStatus,
} from '@/lib/domain/coverage'
import { contractEconomics } from '@/lib/domain/pnl'
import { lbToSacos } from '@/lib/domain/units'
import { SemaforoDot } from '@/components/semaforo'
import { FixationForm } from '@/components/fixation-form'
import { HedgeForm } from '@/components/hedge-form'
import { CostForm } from '@/components/cost-form'

export const dynamic = 'force-dynamic'

const pct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 })

function Panel({ title, ok, children }: { title: string; ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded border p-3 ${ok ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-xs font-medium uppercase text-gray-500">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

export default async function ContratoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bundle = await store.getBundle(id)
  if (!bundle) notFound()

  const { contract, counterparty, fixations, hedges, costs } = bundle
  const price = computePriceStatus(contract, fixations)
  const flat = computeFlatCoverage(contract, hedges)
  const fx = computeFxCoverage(contract, fixations, hedges)
  const status = consolidatedStatus(contract, fixations, hedges)
  const econ = contractEconomics(contract, fixations, costs)

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-blue-600 underline">← Libro</Link>
        <h1 className="text-lg font-semibold">{contract.ref} — {contract.lado}</h1>
        <SemaforoDot status={status} />
      </div>

      <div className="text-gray-600">
        {counterparty?.nombre ?? '—'} · {fmt(lbToSacos(contract.cantidadLb, contract.tamanoSacoKg))} sacos ×{contract.tamanoSacoKg}kg = {fmt(contract.cantidadLb)} lb ·{' '}
        {contract.tipoPrecio === 'FIJO'
          ? `precio fijo ${contract.precioFijoUsdLb} USD/lb`
          : `${contract.mesFuturo} + dif ${contract.diferencialUsdLb} USD/lb`}
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Panel title="Precio (fijación)" ok={price.pricedPct >= 0.95}>
          <div className="text-lg font-semibold">{pct(price.pricedPct)}</div>
          {contract.tipoPrecio === 'PTBF'
            ? <div className="text-gray-500">Por fijar: {fmt(price.unfixedLb)} lb</div>
            : <div className="text-gray-500">Precio fijo (nada por fijar)</div>}
        </Panel>

        <Panel title="Cobertura café" ok={flat.coveragePct >= 0.95 && flat.directionOk}>
          <div className="text-lg font-semibold">{pct(flat.coveragePct)}</div>
          <div className="text-gray-500">{flat.kcContracts} contratos KC · residual {fmt(flat.residualLb)} lb</div>
          {!flat.directionOk && <div className="font-medium text-red-600">⚠ dirección de hedge equivocada</div>}
        </Panel>

        <Panel title="Cobertura FX" ok={fx.coveragePct >= 0.95}>
          <div className="text-lg font-semibold">{pct(fx.coveragePct)}</div>
          <div className="text-gray-500">Exposición {fmt(fx.exposureNotional)} {contract.moneda}</div>
        </Panel>
      </section>

      <section className="rounded border bg-white p-3">
        <div className="font-medium">Economía (Fase 1)</div>
        <div className="mt-1 text-gray-600">
          Valor priced: {fmt(econ.pricedUsdValue)} USD · Costos: USD {fmt(econ.totalCosts.USD)} / COP {fmt(econ.totalCosts.COP)} / EUR {fmt(econ.totalCosts.EUR)}
        </div>
        <div className="mt-1 text-xs text-gray-400">Mark-to-market real llega en Fase 2 (feed de mercado).</div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Fijaciones de precio</h2>
        {fixations.length === 0
          ? <div className="text-gray-400">Sin fijaciones.</div>
          : fixations.map(f => (
              <div key={f.id} className="text-gray-700">{f.fecha} · {fmt(f.cantidadLbFijada)} lb @ {f.precioFuturoFijadoUsdLb} USD/lb</div>
            ))}
        {contract.tipoPrecio === 'PTBF' && <FixationForm contractId={contract.id} />}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Hedges</h2>
        {hedges.length === 0
          ? <div className="text-gray-400">Sin hedges.</div>
          : hedges.map(h => (
              <div key={h.id} className="text-gray-700">
                {h.riesgoCubierto} · {h.tipo} · {h.direccion} · {fmt(h.cantidadLb)} @ {h.precioOTasaEjecucion}
                {h.mesVencimiento ? ` · ${h.mesVencimiento}` : ''} ({h.estado})
              </div>
            ))}
        <HedgeForm contractId={contract.id} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Costos</h2>
        {costs.length === 0
          ? <div className="text-gray-400">Sin costos.</div>
          : costs.map(k => (
              <div key={k.id} className="text-gray-700">
                {k.fecha} · {k.tipo} · {fmt(k.monto)} {k.moneda}{k.facturaRef ? ` · ${k.facturaRef}` : ''}{k.descripcion ? ` · ${k.descripcion}` : ''}
              </div>
            ))}
        <CostForm contractId={contract.id} />
      </section>
    </div>
  )
}
