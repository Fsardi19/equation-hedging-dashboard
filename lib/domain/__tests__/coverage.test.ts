import { describe, expect, it } from 'vitest'
import {
  expectedFlatDirection, pricedUsdValue, computePriceStatus,
  computeFlatCoverage, computeFxCoverage, consolidatedStatus,
} from '@/lib/domain/coverage'
import type { PhysicalContract, PriceFixation, Hedge } from '@/lib/domain/types'

const base: PhysicalContract = {
  id: 'c1', ref: 'EQ-2026-001', lado: 'VENTA', counterpartyId: 'cp1',
  cantidadLb: 37500, tamanoSacoKg: 70, calidadOrigen: null, moneda: 'USD',
  tipoPrecio: 'FIJO', mesFuturo: null, diferencialUsdLb: null,
  precioFijoUsdLb: 2.0, fechaTrade: '2026-07-01', fechaEntrega: null,
  estado: 'ABIERTO', notas: null,
}

describe('direccion esperada', () => {
  it('COMPRA se cubre vendiendo futuros', () => {
    expect(expectedFlatDirection('COMPRA')).toBe('SHORT')
  })
  it('VENTA se cubre comprando futuros', () => {
    expect(expectedFlatDirection('VENTA')).toBe('LONG')
  })
})

describe('estado de precio', () => {
  it('FIJO siempre 100% priced', () => {
    const s = computePriceStatus(base, [])
    expect(s.pricedPct).toBe(1)
    expect(s.unfixedLb).toBe(0)
  })
  it('PTBF fija en tramos', () => {
    const ptbf: PhysicalContract = { ...base, tipoPrecio: 'PTBF', precioFijoUsdLb: null, diferencialUsdLb: 0.1, mesFuturo: 'KCU6', cantidadLb: 100000 }
    const fx: PriceFixation[] = [
      { id: 'f1', contractId: 'c1', fecha: '2026-07-02', cantidadLbFijada: 40000, precioFuturoFijadoUsdLb: 1.9 },
    ]
    const s = computePriceStatus(ptbf, fx)
    expect(s.pricedPct).toBeCloseTo(0.4, 6)
    expect(s.unfixedLb).toBeCloseTo(60000, 6)
  })
})

describe('cobertura flat', () => {
  it('venta cubierta al 100% con hedge LONG del tamano correcto', () => {
    const hedges: Hedge[] = [{
      id: 'h1', contractId: 'c1', riesgoCubierto: 'PRECIO', tipo: 'KC_FUTURO',
      direccion: 'LONG', cantidadLb: 37500, mesVencimiento: 'KCU6', strike: null,
      callPut: null, precioOTasaEjecucion: 1.95, broker: 'StoneX',
      fechaTrade: '2026-07-01', estado: 'ABIERTA',
    }]
    const r = computeFlatCoverage(base, hedges)
    expect(r.coveragePct).toBeCloseTo(1, 6)
    expect(r.kcContracts).toBe(1)
    expect(r.directionOk).toBe(true)
  })
  it('marca direccion equivocada', () => {
    const hedges: Hedge[] = [{
      id: 'h1', contractId: 'c1', riesgoCubierto: 'PRECIO', tipo: 'KC_FUTURO',
      direccion: 'SHORT', cantidadLb: 37500, mesVencimiento: 'KCU6', strike: null,
      callPut: null, precioOTasaEjecucion: 1.95, broker: null,
      fechaTrade: '2026-07-01', estado: 'ABIERTA',
    }]
    const r = computeFlatCoverage(base, hedges)
    expect(r.directionOk).toBe(false)
  })
})

describe('cobertura FX', () => {
  it('expone el valor priced en USD y cubre con forward', () => {
    const hedges: Hedge[] = [{
      id: 'h2', contractId: 'c1', riesgoCubierto: 'FX', tipo: 'FX_FORWARD',
      direccion: 'SHORT', cantidadLb: 75000, mesVencimiento: null, strike: null,
      callPut: null, precioOTasaEjecucion: 4000, broker: null,
      fechaTrade: '2026-07-01', estado: 'ABIERTA',
    }]
    const r = computeFxCoverage(base, [], hedges)
    expect(r.exposureNotional).toBeCloseTo(75000, 6)
    expect(r.coveragePct).toBeCloseTo(1, 6)
  })
})

describe('consolidado', () => {
  it('rojo si el flat esta descubierto', () => {
    expect(consolidatedStatus(base, [], [])).toBe('ROJO')
  })
  it('verde si precio, cafe y FX estan cubiertos', () => {
    const hedges: Hedge[] = [
      { id: 'h1', contractId: 'c1', riesgoCubierto: 'PRECIO', tipo: 'KC_FUTURO', direccion: 'LONG', cantidadLb: 37500, mesVencimiento: 'KCU6', strike: null, callPut: null, precioOTasaEjecucion: 1.95, broker: null, fechaTrade: '2026-07-01', estado: 'ABIERTA' },
      { id: 'h2', contractId: 'c1', riesgoCubierto: 'FX', tipo: 'FX_FORWARD', direccion: 'SHORT', cantidadLb: 75000, mesVencimiento: null, strike: null, callPut: null, precioOTasaEjecucion: 4000, broker: null, fechaTrade: '2026-07-01', estado: 'ABIERTA' },
    ]
    expect(consolidatedStatus(base, [], hedges)).toBe('VERDE')
  })
})
