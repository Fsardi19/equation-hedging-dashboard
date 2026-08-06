import { describe, expect, it } from 'vitest'
import { totalCostsByCurrency, contractEconomics } from '@/lib/domain/pnl'
import type { PhysicalContract, Cost } from '@/lib/domain/types'

const c: PhysicalContract = {
  id: 'c1', ref: 'EQ-2026-001', lado: 'VENTA', counterpartyId: 'cp1',
  cantidadLb: 37500, tamanoSacoKg: 70, calidadOrigen: null, moneda: 'USD',
  tipoPrecio: 'FIJO', mesFuturo: null, diferencialUsdLb: null,
  precioFijoUsdLb: 2.0, fechaTrade: '2026-07-01', fechaEntrega: null,
  estado: 'ABIERTO', notas: null,
}
const costs: Cost[] = [
  { id: 'x1', contractId: 'c1', tipo: 'LOGISTICA', monto: 500, moneda: 'USD', fecha: '2026-07-02', descripcion: null, facturaRef: null },
  { id: 'x2', contractId: 'c1', tipo: 'FINANCIACION', monto: 1_000_000, moneda: 'COP', fecha: '2026-07-03', descripcion: null, facturaRef: null },
  { id: 'x3', contractId: 'c1', tipo: 'COMISION_BROKER', monto: 200, moneda: 'USD', fecha: '2026-07-04', descripcion: null, facturaRef: null },
]

describe('costos por moneda', () => {
  it('agrupa y suma por moneda', () => {
    const r = totalCostsByCurrency(costs)
    expect(r.USD).toBe(700)
    expect(r.COP).toBe(1_000_000)
    expect(r.EUR).toBe(0)
  })
})

describe('economia del contrato', () => {
  it('valor priced + costos', () => {
    const r = contractEconomics(c, [], costs)
    expect(r.pricedUsdValue).toBe(75000)
    expect(r.totalCosts.USD).toBe(700)
  })
})
