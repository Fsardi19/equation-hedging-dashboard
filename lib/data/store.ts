import type {
  Counterparty, PhysicalContract, PriceFixation, Hedge, Cost,
} from '@/lib/domain/types'

// Datos de entrada (sin id; el store lo genera).
export type NewCounterparty = Omit<Counterparty, 'id'>
export type NewContract = Omit<PhysicalContract, 'id' | 'estado'>
export type NewFixation = Omit<PriceFixation, 'id'>
export type NewHedge = Omit<Hedge, 'id' | 'estado'>
export type NewCost = Omit<Cost, 'id'>

export interface ContractBundle {
  contract: PhysicalContract
  counterparty: Counterparty | null
  fixations: PriceFixation[]
  hedges: Hedge[]
  costs: Cost[]
}

/**
 * Contrato de acceso a datos. La UI y el dominio solo dependen de esta
 * interfaz. En el MVP local la implementa `LocalDataStore` (archivo JSON);
 * al migrar, `SupabaseDataStore` la implementa sin tocar UI ni dominio.
 */
export interface DataStore {
  listCounterparties(): Promise<Counterparty[]>
  createCounterparty(input: NewCounterparty): Promise<Counterparty>

  listContracts(): Promise<PhysicalContract[]>
  getBundle(contractId: string): Promise<ContractBundle | null>
  createContract(input: NewContract): Promise<PhysicalContract>

  addFixation(input: NewFixation): Promise<PriceFixation>
  addHedge(input: NewHedge): Promise<Hedge>
  addCost(input: NewCost): Promise<Cost>
}
