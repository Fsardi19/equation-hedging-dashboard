import type { TamanoSaco } from './types'

export const KC_CONTRACT_LB = 37500
export const LB_PER_KG = 2.2046226218

export function sacosToLb(sacos: number, tamanoSacoKg: TamanoSaco): number {
  return sacos * tamanoSacoKg * LB_PER_KG
}

export function lbToSacos(lb: number, tamanoSacoKg: TamanoSaco): number {
  return lb / (tamanoSacoKg * LB_PER_KG)
}

export function kcEquivalents(lb: number): {
  contracts: number
  wholeContracts: number
  residualLb: number
} {
  const contracts = lb / KC_CONTRACT_LB
  const wholeContracts = Math.round(contracts)
  const residualLb = lb - wholeContracts * KC_CONTRACT_LB
  return { contracts, wholeContracts, residualLb }
}
