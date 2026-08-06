import { describe, expect, it } from 'vitest'
import { sacosToLb, lbToSacos, kcEquivalents, KC_CONTRACT_LB } from '@/lib/domain/units'

describe('sacos <-> lb', () => {
  it('convierte 600 sacos de 70kg a lb', () => {
    expect(sacosToLb(600, 70)).toBeCloseTo(92594.15, 1)
  })
  it('convierte sacos de 35kg', () => {
    expect(sacosToLb(600, 35)).toBeCloseTo(46297.07, 1)
  })
  it('es reversible', () => {
    expect(lbToSacos(sacosToLb(600, 70), 70)).toBeCloseTo(600, 6)
  })
})

describe('kcEquivalents', () => {
  it('42000 lb = 1.12 contratos, 1 entero, residual 4500', () => {
    const r = kcEquivalents(42000)
    expect(r.contracts).toBeCloseTo(1.12, 2)
    expect(r.wholeContracts).toBe(1)
    expect(r.residualLb).toBeCloseTo(4500, 6)
  })
  it('70000 lb redondea a 2 contratos (sobre-hedge, residual negativo)', () => {
    const r = kcEquivalents(70000)
    expect(r.wholeContracts).toBe(2)
    expect(r.residualLb).toBeCloseTo(70000 - 2 * KC_CONTRACT_LB, 6)
  })
})
