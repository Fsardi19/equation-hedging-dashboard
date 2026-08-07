import { store } from '@/lib/data'
import {
  computePriceStatus, computeFlatCoverage, computeFxCoverage, consolidatedStatus,
} from '@/lib/domain/coverage'
import { lbToSacos } from '@/lib/domain/units'
import type { Semaforo } from '@/lib/domain/types'

export interface LibroRow {
  id: string
  ref: string
  lado: string
  counterparty: string
  estado: string
  moneda: string
  sacos: number
  lb: number
  tamanoSacoKg: number
  tipoPrecio: string
  pricedPct: number
  flatPct: number
  fxPct: number
  exposureNotional: number
  status: Semaforo
}

/** Arma las filas del libro combinando datos + logica de dominio. */
export async function buildLibroRows(): Promise<LibroRow[]> {
  const contracts = await store.listContracts()
  const counterparties = await store.listCounterparties()
  const cpName = new Map(counterparties.map(c => [c.id, c.nombre]))

  const rows: LibroRow[] = []
  for (const contract of contracts) {
    const bundle = await store.getBundle(contract.id)
    const fixations = bundle?.fixations ?? []
    const hedges = bundle?.hedges ?? []
    const flat = computeFlatCoverage(contract, hedges)
    const fx = computeFxCoverage(contract, fixations, hedges)
    rows.push({
      id: contract.id,
      ref: contract.ref,
      lado: contract.lado,
      counterparty: cpName.get(contract.counterpartyId) ?? '—',
      estado: contract.estado,
      moneda: contract.moneda,
      lb: contract.cantidadLb,
      tamanoSacoKg: contract.tamanoSacoKg,
      sacos: lbToSacos(contract.cantidadLb, contract.tamanoSacoKg),
      tipoPrecio: contract.tipoPrecio,
      pricedPct: computePriceStatus(contract, fixations).pricedPct,
      flatPct: flat.coveragePct,
      fxPct: fx.coveragePct,
      exposureNotional: fx.exposureNotional,
      status: consolidatedStatus(contract, fixations, hedges),
    })
  }
  return rows
}
