import type {
  PhysicalContract, PriceFixation, Hedge, Direccion, Lado, Semaforo,
} from './types'
import { kcEquivalents } from './units'

export const COVERAGE_THRESHOLD = 0.95

export function expectedFlatDirection(lado: Lado): Direccion {
  return lado === 'COMPRA' ? 'SHORT' : 'LONG'
}

export function pricedUsdValue(c: PhysicalContract, fixations: PriceFixation[]): number {
  if (c.tipoPrecio === 'FIJO') {
    return c.cantidadLb * (c.precioFijoUsdLb ?? 0)
  }
  const dif = c.diferencialUsdLb ?? 0
  return fixations.reduce(
    (acc, f) => acc + f.cantidadLbFijada * (f.precioFuturoFijadoUsdLb + dif),
    0,
  )
}

export function computePriceStatus(c: PhysicalContract, fixations: PriceFixation[]) {
  if (c.tipoPrecio === 'FIJO') {
    return { pricedPct: 1, fixedLb: c.cantidadLb, unfixedLb: 0 }
  }
  const fixedLb = fixations.reduce((a, f) => a + f.cantidadLbFijada, 0)
  const pricedPct = c.cantidadLb === 0 ? 0 : fixedLb / c.cantidadLb
  return { pricedPct, fixedLb, unfixedLb: Math.max(c.cantidadLb - fixedLb, 0) }
}

export function computeFlatCoverage(c: PhysicalContract, hedges: Hedge[]) {
  const expected = expectedFlatDirection(c.lado)
  const flat = hedges.filter(h => h.riesgoCubierto === 'PRECIO' && h.estado === 'ABIERTA')
  const coveredLb = flat
    .filter(h => h.direccion === expected)
    .reduce((a, h) => a + h.cantidadLb, 0)
  const directionOk = flat.length === 0 || flat.every(h => h.direccion === expected)
  const coveragePct = c.cantidadLb === 0 ? 0 : coveredLb / c.cantidadLb
  const { wholeContracts, residualLb } = kcEquivalents(coveredLb)
  return { coveredLb, coveragePct, kcContracts: wholeContracts, residualLb, directionOk }
}

export function computeFxCoverage(
  c: PhysicalContract, fixations: PriceFixation[], hedges: Hedge[],
) {
  const exposureNotional = pricedUsdValue(c, fixations)
  const coveredNotional = hedges
    .filter(h => h.riesgoCubierto === 'FX' && h.estado === 'ABIERTA')
    .reduce((a, h) => a + h.cantidadLb, 0)
  const coveragePct = exposureNotional === 0 ? 0 : coveredNotional / exposureNotional
  return { exposureNotional, coveredNotional, coveragePct }
}

export function consolidatedStatus(
  c: PhysicalContract, fixations: PriceFixation[], hedges: Hedge[],
): Semaforo {
  const flat = computeFlatCoverage(c, hedges)
  const fx = computeFxCoverage(c, fixations, hedges)
  const price = computePriceStatus(c, fixations)

  if (!flat.directionOk) return 'ROJO'

  // Dimensiones que representan una ACCION de cobertura pendiente.
  // Cafe y FX siempre. La fijacion de precio solo cuenta en PTBF (en FIJO
  // el precio ya esta pactado: pricedPct=1 es trivial, no una accion).
  const dims = [flat.coveragePct, fx.coveragePct]
  if (c.tipoPrecio === 'PTBF') dims.push(price.pricedPct)

  const allGreen = dims.every(p => p >= COVERAGE_THRESHOLD)
  if (allGreen) return 'VERDE'
  const anyProgress = dims.some(p => p > 0)
  return anyProgress ? 'AMARILLO' : 'ROJO'
}
