import type { PhysicalContract, PriceFixation, Cost, Moneda } from './types'
import { pricedUsdValue } from './coverage'

export function totalCostsByCurrency(costs: Cost[]): Record<Moneda, number> {
  const acc: Record<Moneda, number> = { COP: 0, USD: 0, EUR: 0 }
  for (const c of costs) acc[c.moneda] += c.monto
  return acc
}

export function contractEconomics(
  c: PhysicalContract, fixations: PriceFixation[], costs: Cost[],
) {
  return {
    pricedUsdValue: pricedUsdValue(c, fixations),
    totalCosts: totalCostsByCurrency(costs),
  }
}
