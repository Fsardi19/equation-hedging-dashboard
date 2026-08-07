import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  Counterparty, PhysicalContract, PriceFixation, Hedge, Cost,
} from '@/lib/domain/types'
import type {
  DataStore, ContractBundle, NewCounterparty, NewContract,
  NewFixation, NewHedge, NewCost,
} from './store'

interface DbShape {
  counterparties: Counterparty[]
  contracts: PhysicalContract[]
  fixations: PriceFixation[]
  hedges: Hedge[]
  costs: Cost[]
}

const EMPTY: DbShape = {
  counterparties: [], contracts: [], fixations: [], hedges: [], costs: [],
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8')
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY }
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

/** Implementacion local (archivo JSON) del DataStore para el MVP. */
export class LocalDataStore implements DataStore {
  async listCounterparties(): Promise<Counterparty[]> {
    const db = await readDb()
    return [...db.counterparties].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  async createCounterparty(input: NewCounterparty): Promise<Counterparty> {
    const db = await readDb()
    const cp: Counterparty = { id: randomUUID(), ...input }
    db.counterparties.push(cp)
    await writeDb(db)
    return cp
  }

  async listContracts(): Promise<PhysicalContract[]> {
    const db = await readDb()
    return [...db.contracts].sort((a, b) => b.fechaTrade.localeCompare(a.fechaTrade))
  }

  async getBundle(contractId: string): Promise<ContractBundle | null> {
    const db = await readDb()
    const contract = db.contracts.find(c => c.id === contractId)
    if (!contract) return null
    return {
      contract,
      counterparty: db.counterparties.find(cp => cp.id === contract.counterpartyId) ?? null,
      fixations: db.fixations.filter(f => f.contractId === contractId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      hedges: db.hedges.filter(h => h.contractId === contractId)
        .sort((a, b) => a.fechaTrade.localeCompare(b.fechaTrade)),
      costs: db.costs.filter(k => k.contractId === contractId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }
  }

  async createContract(input: NewContract): Promise<PhysicalContract> {
    const db = await readDb()
    const contract: PhysicalContract = { id: randomUUID(), estado: 'ABIERTO', ...input }
    db.contracts.push(contract)
    await writeDb(db)
    return contract
  }

  async addFixation(input: NewFixation): Promise<PriceFixation> {
    const db = await readDb()
    const row: PriceFixation = { id: randomUUID(), ...input }
    db.fixations.push(row)
    await writeDb(db)
    return row
  }

  async addHedge(input: NewHedge): Promise<Hedge> {
    const db = await readDb()
    const row: Hedge = { id: randomUUID(), estado: 'ABIERTA', ...input }
    db.hedges.push(row)
    await writeDb(db)
    return row
  }

  async addCost(input: NewCost): Promise<Cost> {
    const db = await readDb()
    const row: Cost = { id: randomUUID(), ...input }
    db.costs.push(row)
    await writeDb(db)
    return row
  }
}
