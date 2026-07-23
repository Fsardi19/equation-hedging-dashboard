# Equation Coffee — Dashboard de Cobertura — Plan de Implementación (Fase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un dashboard web multi-usuario donde el analista financiero de Equation Coffee captura contratos físicos de café, sus fijaciones de precio, hedges y costos, y ve el estado de cobertura (precio, café, FX) por contrato, con exportación a Excel/CSV.

**Architecture:** Next.js (App Router) + TypeScript en Vercel; Supabase para Postgres, Auth, Storage y RLS. La lógica de negocio (conversiones de unidades, cobertura, P&L) vive en una capa de dominio TypeScript **pura y testeada** (`/lib/domain`), independiente de UI y base de datos. La UI lee/escribe vía queries tipadas de Supabase; los permisos se hacen cumplir en Postgres con RLS.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 3 + shadcn/ui, Vitest 2 (unit tests de dominio), @supabase/supabase-js 2 + @supabase/ssr, exceljs 4 (export), TanStack Table 8 (libro).

## Global Constraints

- **Node** ≥ 20. Gestor de paquetes: **npm**.
- **Unidad canónica de cantidad: libras (lb).** Sacos (35/70 kg) solo en captura/visualización. `LB_PER_KG = 2.2046226218`.
- **Contrato KC = 37,500 lb fijas** (`KC_CONTRACT_LB = 37500`). El residual/descalce SIEMPRE se muestra, nunca se esconde.
- **Umbral de cobertura: ≥ 0.95 = verde** (`COVERAGE_THRESHOLD = 0.95`).
- **Dirección de hedge de precio:** contrato `COMPRA` (long café) → hedge correcto `SHORT`; contrato `VENTA` (short café) → hedge correcto `LONG`.
- **Roles:** `ADMIN` (todo + usuarios), `ANALISTA` (CRUD contratos/fijaciones/hedges/costos + export), `LECTURA` (solo lectura). Enforcement por **RLS**, no solo UI.
- **Repo fuera de iCloud:** `~/dev/equation-hedging-dashboard` (evita el problema de `node_modules` "dataless").
- **Precisión numérica:** dinero y cantidades con `number` en dominio; en Postgres usar `numeric`, nunca `float`.
- **Idioma de UI:** español. Nombres de campo de dominio en español donde el spec los define (ej. `cantidadLb`, `tamanoSacoKg`).
- **Cada tarea termina con commit.** TDD donde hay lógica. DRY, YAGNI.

---

## Estructura de archivos (Fase 1)

```
~/dev/equation-hedging-dashboard/
├── package.json, tsconfig.json, next.config.ts, vitest.config.ts, tailwind.config.ts
├── .env.local                      # claves Supabase (no se commitea)
├── .env.example
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql         # tablas §4 del spec
│       └── 0002_rls.sql            # políticas RLS por rol
├── lib/
│   ├── domain/
│   │   ├── types.ts                # tipos de dominio (contratos, hedges, etc.)
│   │   ├── units.ts                # sacos↔lb, contratos KC equivalentes, residual
│   │   ├── coverage.ts             # 3 semáforos + estado consolidado
│   │   ├── pnl.ts                  # P&L básico (valor y costos por contrato)
│   │   └── __tests__/
│   │       ├── units.test.ts
│   │       ├── coverage.test.ts
│   │       └── pnl.test.ts
│   ├── supabase/
│   │   ├── client.ts               # cliente browser
│   │   ├── server.ts               # cliente server (RSC/actions)
│   │   ├── middleware.ts           # refresco de sesión
│   │   └── queries.ts              # queries tipadas
│   └── export/
│       └── workbook.ts             # generación .xlsx / .csv
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # shell con auth guard + nav
│   │   ├── page.tsx                # Libro (home)
│   │   ├── contratos/nuevo/page.tsx
│   │   ├── contratos/[id]/page.tsx
│   │   ├── counterparties/page.tsx
│   │   └── actions.ts              # server actions (crear/editar)
│   └── api/export/[tipo]/route.ts  # descarga xlsx/csv
├── components/
│   ├── ui/                         # shadcn (generado por CLI)
│   ├── semaforo.tsx
│   ├── libro-table.tsx
│   ├── contrato-form.tsx
│   ├── fixation-form.tsx
│   ├── hedge-form.tsx
│   └── cost-form.tsx
└── middleware.ts                   # entrypoint Next → lib/supabase/middleware
```

---

# HITO 1 — Fundaciones y capa de dominio (sin red, TDD puro)

Este hito no toca Supabase ni UI. Produce el "cerebro" testeado. Se puede ejecutar y validar 100% con `npm test`.

## Task 1: Scaffold del proyecto + testing

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder temporal)

**Interfaces:**
- Produces: proyecto Next.js que compila; `npm test` corre Vitest; `npm run dev` levanta la app.

- [ ] **Step 1: Crear el proyecto Next.js**

```bash
cd ~/dev/equation-hedging-dashboard
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```
Cuando pregunte por sobrescribir archivos existentes (docs/, .git), acepta conservar; create-next-app no borra `docs/`.

- [ ] **Step 2: Instalar dependencias de dominio y test**

```bash
npm install @supabase/supabase-js @supabase/ssr exceljs @tanstack/react-table
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que compila y test corre en vacío**

Create `lib/domain/__tests__/smoke.test.ts`:
```ts
import { expect, test } from 'vitest'
test('smoke', () => { expect(1 + 1).toBe(2) })
```
Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: `.env.example` y `.gitignore`**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Append to `.gitignore`: `.env.local`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Vitest"
```

---

## Task 2: Tipos de dominio

**Files:**
- Create: `lib/domain/types.ts`

**Interfaces:**
- Produces: los tipos usados por TODAS las tareas siguientes. Firmas exactas abajo.

- [ ] **Step 1: Escribir los tipos**

Create `lib/domain/types.ts`:
```ts
export type Lado = 'COMPRA' | 'VENTA'
export type TipoPrecio = 'PTBF' | 'FIJO'
export type Moneda = 'COP' | 'USD' | 'EUR'
export type RiesgoCubierto = 'PRECIO' | 'FX'
export type Direccion = 'LONG' | 'SHORT'
export type TipoHedge = 'KC_FUTURO' | 'KC_OPCION' | 'FX_FORWARD' | 'FX_OPCION'
export type TipoCosto =
  | 'FINANCIACION' | 'LOGISTICA' | 'COMISION_BROKER'
  | 'ALMACENAJE' | 'CERTIFICACION' | 'OTRO'
export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO'
export type Rol = 'ADMIN' | 'ANALISTA' | 'LECTURA'
export type TamanoSaco = 35 | 70

export interface PhysicalContract {
  id: string
  ref: string
  lado: Lado
  counterpartyId: string
  cantidadLb: number
  tamanoSacoKg: TamanoSaco
  calidadOrigen: string | null
  moneda: Moneda
  tipoPrecio: TipoPrecio
  mesFuturo: string | null          // solo PTBF, ej. "KCU6"
  diferencialUsdLb: number | null   // solo PTBF
  precioFijoUsdLb: number | null    // solo FIJO
  fechaTrade: string
  fechaEntrega: string | null
  estado: 'ABIERTO' | 'CERRADO'
  notas: string | null
}

export interface PriceFixation {
  id: string
  contractId: string
  fecha: string
  cantidadLbFijada: number
  precioFuturoFijadoUsdLb: number
}

export interface Hedge {
  id: string
  contractId: string
  riesgoCubierto: RiesgoCubierto
  tipo: TipoHedge
  direccion: Direccion
  cantidadLb: number                // lb (PRECIO) o nocional en divisa (FX)
  mesVencimiento: string | null
  strike: number | null
  callPut: 'CALL' | 'PUT' | null
  precioOTasaEjecucion: number
  broker: string | null
  fechaTrade: string
  estado: 'ABIERTA' | 'CERRADA'
}

export interface Cost {
  id: string
  contractId: string
  tipo: TipoCosto
  monto: number
  moneda: Moneda
  fecha: string
  descripcion: string | null
  facturaRef: string | null
}

export interface Counterparty {
  id: string
  nombre: string
  tipo: 'PROVEEDOR' | 'CLIENTE'
  pais: string | null
  monedaDefault: Moneda
  notas: string | null
}
```

- [ ] **Step 2: Verificar tipos compilan**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/domain/types.ts && git commit -m "feat(domain): tipos de dominio"
```

---

## Task 3: Conversión de unidades (sacos ↔ lb, contratos KC, residual)

**Files:**
- Create: `lib/domain/units.ts`, `lib/domain/__tests__/units.test.ts`

**Interfaces:**
- Consumes: (nada)
- Produces:
  - `KC_CONTRACT_LB = 37500`, `LB_PER_KG = 2.2046226218`
  - `sacosToLb(sacos: number, tamanoSacoKg: TamanoSaco): number`
  - `lbToSacos(lb: number, tamanoSacoKg: TamanoSaco): number`
  - `kcEquivalents(lb: number): { contracts: number; wholeContracts: number; residualLb: number }`
    donde `contracts = lb/37500`, `wholeContracts = round(contracts)`, `residualLb = lb - wholeContracts*37500` (negativo = sobre-hedge).

- [ ] **Step 1: Escribir el test que falla**

Create `lib/domain/__tests__/units.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sacosToLb, lbToSacos, kcEquivalents, KC_CONTRACT_LB } from '@/lib/domain/units'

describe('sacos ↔ lb', () => {
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
  it('42000 lb = 1.12 contratos, residual -33000 con 1 entero redondeado', () => {
    const r = kcEquivalents(42000)
    expect(r.contracts).toBeCloseTo(1.12, 2)
    expect(r.wholeContracts).toBe(1)
    expect(r.residualLb).toBeCloseTo(4500, 6)
  })
  it('70000 lb redondea a 2 contratos (sobre-hedge, residual negativo)', () => {
    const r = kcEquivalents(70000)
    expect(r.wholeContracts).toBe(2)
    expect(r.residualLb).toBeCloseTo(70000 - 2 * KC_CONTRACT_LB, 6) // -5000
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run lib/domain/__tests__/units.test.ts`
Expected: FAIL ("Cannot find module '@/lib/domain/units'").

- [ ] **Step 3: Implementar**

Create `lib/domain/units.ts`:
```ts
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
```

- [ ] **Step 4: Correr para ver que pasa**

Run: `npx vitest run lib/domain/__tests__/units.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/domain/units.ts lib/domain/__tests__/units.test.ts
git commit -m "feat(domain): conversiones de unidades y equivalentes KC"
```

---

## Task 4: Lógica de cobertura (3 semáforos + consolidado)

**Files:**
- Create: `lib/domain/coverage.ts`, `lib/domain/__tests__/coverage.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `units.ts` (`kcEquivalents`, `KC_CONTRACT_LB`)
- Produces:
  - `COVERAGE_THRESHOLD = 0.95`
  - `expectedFlatDirection(lado: Lado): Direccion` — COMPRA→SHORT, VENTA→LONG
  - `pricedUsdValue(c: PhysicalContract, fixations: PriceFixation[]): number`
    — FIJO: `cantidadLb * precioFijoUsdLb`; PTBF: `Σ cantidadLbFijada*(precioFuturoFijadoUsdLb + diferencialUsdLb)`
  - `computePriceStatus(c, fixations): { pricedPct: number; fixedLb: number; unfixedLb: number }`
  - `computeFlatCoverage(c, hedges): { coveredLb: number; coveragePct: number; kcContracts: number; residualLb: number; directionOk: boolean }`
  - `computeFxCoverage(c, fixations, hedges): { exposureNotional: number; coveredNotional: number; coveragePct: number }`
  - `consolidatedStatus(c, fixations, hedges): Semaforo`

- [ ] **Step 1: Escribir el test que falla**

Create `lib/domain/__tests__/coverage.test.ts`:
```ts
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

describe('dirección esperada', () => {
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
  it('venta cubierta al 100% con hedge LONG del tamaño correcto', () => {
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
  it('marca dirección equivocada', () => {
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
    // exposición = 37500 lb * 2.0 = 75000 USD
    const r = computeFxCoverage(base, [], hedges)
    expect(r.exposureNotional).toBeCloseTo(75000, 6)
    expect(r.coveragePct).toBeCloseTo(1, 6)
  })
})

describe('consolidado', () => {
  it('rojo si el flat está descubierto', () => {
    expect(consolidatedStatus(base, [], [])).toBe('ROJO')
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run lib/domain/__tests__/coverage.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Create `lib/domain/coverage.ts`:
```ts
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

  const pcts = [flat.coveragePct, fx.coveragePct, price.pricedPct]
  const allGreen = pcts.every(p => p >= COVERAGE_THRESHOLD)
  if (allGreen) return 'VERDE'
  const anyCovered = pcts.some(p => p > 0)
  return anyCovered ? 'AMARILLO' : 'ROJO'
}
```

- [ ] **Step 4: Correr para ver que pasa**

Run: `npx vitest run lib/domain/__tests__/coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/coverage.ts lib/domain/__tests__/coverage.test.ts
git commit -m "feat(domain): lógica de cobertura y estado consolidado"
```

---

## Task 5: P&L básico (valor y costos por contrato)

**Files:**
- Create: `lib/domain/pnl.ts`, `lib/domain/__tests__/pnl.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `coverage.ts` (`pricedUsdValue`)
- Produces:
  - `totalCostsByCurrency(costs: Cost[]): Record<Moneda, number>`
  - `contractEconomics(c, fixations, costs): { pricedUsdValue: number; totalCosts: Record<Moneda, number> }`
- Nota: el P&L mark-to-market real es Fase 2. Aquí solo valor priced + costos acumulados.

- [ ] **Step 1: Escribir el test que falla**

Create `lib/domain/__tests__/pnl.test.ts`:
```ts
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

describe('economía del contrato', () => {
  it('valor priced + costos', () => {
    const r = contractEconomics(c, [], costs)
    expect(r.pricedUsdValue).toBe(75000)
    expect(r.totalCosts.USD).toBe(700)
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run lib/domain/__tests__/pnl.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `lib/domain/pnl.ts`:
```ts
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
```

- [ ] **Step 4: Correr para ver que pasa**

Run: `npx vitest run lib/domain/__tests__/pnl.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/pnl.ts lib/domain/__tests__/pnl.test.ts
git commit -m "feat(domain): P&L básico (valor priced + costos por moneda)"
```

---

# HITO 2 — Supabase: esquema, auth y RLS

Requiere una cuenta Supabase. Crea el proyecto en supabase.com, copia URL y claves a `.env.local` (basado en `.env.example`).

## Task 6: Migración de esquema

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Interfaces:**
- Produces: tablas `counterparties, physical_contracts, price_fixations, hedges, costs, profiles` con los tipos del spec (columnas `snake_case`).

- [ ] **Step 1: Escribir la migración**

Create `supabase/migrations/0001_schema.sql`:
```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('ADMIN','ANALISTA','LECTURA')) default 'LECTURA',
  created_at timestamptz not null default now()
);

create table counterparties (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('PROVEEDOR','CLIENTE')),
  pais text,
  moneda_default text not null check (moneda_default in ('COP','USD','EUR')) default 'USD',
  notas text,
  created_at timestamptz not null default now()
);

create table physical_contracts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  lado text not null check (lado in ('COMPRA','VENTA')),
  counterparty_id uuid not null references counterparties(id),
  cantidad_lb numeric not null check (cantidad_lb > 0),
  tamano_saco_kg int not null check (tamano_saco_kg in (35,70)),
  calidad_origen text,
  moneda text not null check (moneda in ('COP','USD','EUR')),
  tipo_precio text not null check (tipo_precio in ('PTBF','FIJO')),
  mes_futuro text,
  diferencial_usd_lb numeric,
  precio_fijo_usd_lb numeric,
  fecha_trade date not null,
  fecha_entrega date,
  estado text not null check (estado in ('ABIERTO','CERRADO')) default 'ABIERTO',
  notas text,
  created_at timestamptz not null default now()
);

create table price_fixations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references physical_contracts(id) on delete cascade,
  fecha date not null,
  cantidad_lb_fijada numeric not null check (cantidad_lb_fijada > 0),
  precio_futuro_fijado_usd_lb numeric not null,
  created_at timestamptz not null default now()
);

create table hedges (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references physical_contracts(id) on delete cascade,
  riesgo_cubierto text not null check (riesgo_cubierto in ('PRECIO','FX')),
  tipo text not null check (tipo in ('KC_FUTURO','KC_OPCION','FX_FORWARD','FX_OPCION')),
  direccion text not null check (direccion in ('LONG','SHORT')),
  cantidad_lb numeric not null check (cantidad_lb > 0),
  mes_vencimiento text,
  strike numeric,
  call_put text check (call_put in ('CALL','PUT')),
  precio_o_tasa_ejecucion numeric not null,
  broker text,
  fecha_trade date not null,
  estado text not null check (estado in ('ABIERTA','CERRADA')) default 'ABIERTA',
  created_at timestamptz not null default now()
);

create table costs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references physical_contracts(id) on delete cascade,
  tipo text not null check (tipo in ('FINANCIACION','LOGISTICA','COMISION_BROKER','ALMACENAJE','CERTIFICACION','OTRO')),
  monto numeric not null,
  moneda text not null check (moneda in ('COP','USD','EUR')),
  fecha date not null,
  descripcion text,
  factura_ref text,
  created_at timestamptz not null default now()
);

create index on physical_contracts (estado);
create index on physical_contracts (counterparty_id);
create index on price_fixations (contract_id);
create index on hedges (contract_id);
create index on costs (contract_id);
```

- [ ] **Step 2: Aplicar la migración**

En el SQL Editor de Supabase, pega y ejecuta el contenido de `0001_schema.sql`.
Expected: "Success. No rows returned".

- [ ] **Step 3: Verificar tablas**

Run en SQL Editor: `select table_name from information_schema.tables where table_schema='public' order by 1;`
Expected: aparecen las 6 tablas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat(db): esquema inicial (contratos, hedges, costos, etc.)"
```

---

## Task 7: Clientes Supabase + auth (login/logout, guard, perfil)

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `app/login/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/actions-auth.ts`
- Modify: `app/page.tsx` (mover el placeholder a `app/(app)/page.tsx` en Task 11; por ahora dejar redirect)

**Interfaces:**
- Consumes: `.env.local`
- Produces:
  - `createBrowserClient()` en `client.ts`
  - `createServerClient()` en `server.ts` (async, usa cookies)
  - `getSessionProfile(): Promise<{ userId: string; rol: Rol } | null>` en `server.ts`

- [ ] **Step 1: Cliente browser**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: Cliente server + helper de perfil**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Rol } from '@/lib/domain/types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* Server Component: ignora, el middleware refresca */ }
        },
      },
    },
  )
}

export async function getSessionProfile(): Promise<{ userId: string; rol: Rol } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  return { userId: user.id, rol: (data?.rol as Rol) ?? 'LECTURA' }
}
```

- [ ] **Step 3: Middleware de sesión**

Create `lib/supabase/middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}
```

Create `middleware.ts` (raíz):
```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

- [ ] **Step 4: Página de login + server action**

Create `app/(app)/actions-auth.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

Create `app/login/page.tsx`:
```tsx
import { login } from '@/app/(app)/actions-auth'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-xl font-semibold">Equation Coffee — Cobertura</h1>
      {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form action={login} className="space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2" />
        <input name="password" type="password" required placeholder="Contraseña" className="w-full rounded border p-2" />
        <button className="w-full rounded bg-black p-2 text-white">Entrar</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Layout con guard**

Create `app/(app)/layout.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/supabase/server'
import { logout } from './actions-auth'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b p-3 text-sm">
        <Link href="/" className="font-semibold">Libro</Link>
        <Link href="/contratos/nuevo">Nuevo contrato</Link>
        <Link href="/counterparties">Counterparties</Link>
        <span className="ml-auto text-gray-500">Rol: {profile.rol}</span>
        <form action={logout}><button className="text-red-600">Salir</button></form>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Crear el primer usuario y su perfil ADMIN**

En Supabase → Authentication → Add user (email + password). Luego en SQL Editor:
```sql
insert into profiles (id, nombre, rol)
select id, 'Analista Principal', 'ADMIN' from auth.users order by created_at desc limit 1;
```

- [ ] **Step 7: Probar login manual**

Run: `npm run dev`, abrir http://localhost:3000 → debe redirigir a `/login`; con el usuario creado debe entrar y mostrar el nav.
Expected: entra y ve "Rol: ADMIN".

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(auth): login/logout, guard y perfil por rol"
```

---

## Task 8: Políticas RLS por rol

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

**Interfaces:**
- Consumes: tablas de Task 6, `profiles.rol`
- Produces: RLS que permite lectura a cualquier usuario autenticado; escritura solo a ADMIN/ANALISTA; gestión de `profiles` solo a ADMIN.

- [ ] **Step 1: Escribir las políticas**

Create `supabase/migrations/0002_rls.sql`:
```sql
create or replace function public.current_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['counterparties','physical_contracts','price_fixations','hedges','costs']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy "read_all_auth" on %I for select to authenticated using (true);$f$, t);
    execute format($f$create policy "write_staff" on %I for all to authenticated
      using (public.current_rol() in ('ADMIN','ANALISTA'))
      with check (public.current_rol() in ('ADMIN','ANALISTA'));$f$, t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "profiles_read_self_or_admin" on profiles for select to authenticated
  using (id = auth.uid() or public.current_rol() = 'ADMIN');
create policy "profiles_admin_write" on profiles for all to authenticated
  using (public.current_rol() = 'ADMIN')
  with check (public.current_rol() = 'ADMIN');
```

- [ ] **Step 2: Aplicar**

Ejecutar `0002_rls.sql` en el SQL Editor de Supabase.
Expected: Success.

- [ ] **Step 3: Verificar con un usuario LECTURA**

Crear un 2º usuario, asignarle `rol='LECTURA'` (via el usuario ADMIN o SQL). Con ese usuario, intentar insertar un counterparty desde la app (Task 9) debe fallar; leer el libro debe funcionar.
Expected: lectura OK, escritura rechazada.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat(db): políticas RLS por rol"
```

---

# HITO 3 — Captura de datos (UI CRUD)

Instala componentes shadcn una vez: `npx shadcn@latest init -d` y luego `npx shadcn@latest add button input select table` (genera en `components/ui/`). Estos comandos traen el código real de los componentes; no son placeholders.

## Task 9: Queries tipadas + Counterparties (CRUD mínimo)

**Files:**
- Create: `lib/supabase/queries.ts`, `app/(app)/counterparties/page.tsx`, `components/cost-form.tsx` (no — ver Task 12), `app/(app)/actions.ts`

**Interfaces:**
- Consumes: `client.ts`/`server.ts`, tipos de dominio
- Produces:
  - `listCounterparties(): Promise<Counterparty[]>`
  - `createCounterparty(input): Promise<void>` (server action)
  - mapeo `snake_case` (DB) ↔ `camelCase` (dominio)

- [ ] **Step 1: Query de lectura tipada**

Create `lib/supabase/queries.ts`:
```ts
import { createClient } from './server'
import type { Counterparty } from '@/lib/domain/types'

export async function listCounterparties(): Promise<Counterparty[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('counterparties').select('*').order('nombre')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, pais: r.pais,
    monedaDefault: r.moneda_default, notas: r.notas,
  }))
}
```

- [ ] **Step 2: Server action de creación**

Create `app/(app)/actions.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCounterparty(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('counterparties').insert({
    nombre: String(formData.get('nombre')),
    tipo: String(formData.get('tipo')),
    pais: (formData.get('pais') as string) || null,
    moneda_default: String(formData.get('monedaDefault')),
    notas: (formData.get('notas') as string) || null,
  })
  if (error) throw error
  revalidatePath('/counterparties')
}
```

- [ ] **Step 3: Página de counterparties**

Create `app/(app)/counterparties/page.tsx`:
```tsx
import { listCounterparties } from '@/lib/supabase/queries'
import { createCounterparty } from '../actions'

export default async function CounterpartiesPage() {
  const items = await listCounterparties()
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Counterparties</h1>
      <form action={createCounterparty} className="flex flex-wrap gap-2">
        <input name="nombre" required placeholder="Nombre" className="rounded border p-2" />
        <select name="tipo" className="rounded border p-2">
          <option value="PROVEEDOR">Proveedor</option>
          <option value="CLIENTE">Cliente</option>
        </select>
        <input name="pais" placeholder="País" className="rounded border p-2" />
        <select name="monedaDefault" className="rounded border p-2">
          <option>USD</option><option>COP</option><option>EUR</option>
        </select>
        <button className="rounded bg-black px-4 text-white">Agregar</button>
      </form>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th>Nombre</th><th>Tipo</th><th>País</th><th>Moneda</th></tr></thead>
        <tbody>
          {items.map(c => (
            <tr key={c.id} className="border-b"><td>{c.nombre}</td><td>{c.tipo}</td><td>{c.pais}</td><td>{c.monedaDefault}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Probar manualmente**

Run: `npm run dev` → /counterparties → agregar uno → aparece en la tabla.
Expected: se crea y se lista. (Con usuario LECTURA, "Agregar" lanza error de RLS — comportamiento correcto.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): counterparties CRUD + queries tipadas"
```

---

## Task 10: Alta de contrato (formulario con sacos↔lb)

**Files:**
- Create: `components/contrato-form.tsx`, `app/(app)/contratos/nuevo/page.tsx`
- Modify: `lib/supabase/queries.ts` (agregar `createContract`, `listContractRefsExist`), `app/(app)/actions.ts` (agregar `createContract`)

**Interfaces:**
- Consumes: `sacosToLb`, `listCounterparties`
- Produces:
  - `createContract(formData): Promise<void>` — convierte sacos→lb en el server antes de insertar
  - `getContractsForLibro()` (definido en Task 11)

- [ ] **Step 1: Test de la conversión usada por el form**

La conversión sacos→lb ya está testeada (Task 3). Agregar test de que el action arma `cantidad_lb` correcto es integración; en su lugar, test unitario del helper puro que usará el action.

Create `lib/domain/__tests__/units.form.test.ts`:
```ts
import { expect, it } from 'vitest'
import { sacosToLb } from '@/lib/domain/units'
it('600 sacos 70kg → lb para el form', () => {
  expect(Math.round(sacosToLb(600, 70))).toBe(92594)
})
```
Run: `npx vitest run lib/domain/__tests__/units.form.test.ts` → PASS.

- [ ] **Step 2: Server action de contrato**

Add to `app/(app)/actions.ts`:
```ts
import { sacosToLb } from '@/lib/domain/units'

export async function createContract(formData: FormData) {
  const supabase = await createClient()
  const sacos = Number(formData.get('sacos'))
  const tamano = Number(formData.get('tamanoSacoKg')) as 35 | 70
  const tipoPrecio = String(formData.get('tipoPrecio'))
  const { error } = await supabase.from('physical_contracts').insert({
    ref: String(formData.get('ref')),
    lado: String(formData.get('lado')),
    counterparty_id: String(formData.get('counterpartyId')),
    cantidad_lb: sacosToLb(sacos, tamano),
    tamano_saco_kg: tamano,
    calidad_origen: (formData.get('calidadOrigen') as string) || null,
    moneda: String(formData.get('moneda')),
    tipo_precio: tipoPrecio,
    mes_futuro: tipoPrecio === 'PTBF' ? String(formData.get('mesFuturo')) : null,
    diferencial_usd_lb: tipoPrecio === 'PTBF' ? Number(formData.get('diferencialUsdLb')) : null,
    precio_fijo_usd_lb: tipoPrecio === 'FIJO' ? Number(formData.get('precioFijoUsdLb')) : null,
    fecha_trade: String(formData.get('fechaTrade')),
    fecha_entrega: (formData.get('fechaEntrega') as string) || null,
    notas: (formData.get('notas') as string) || null,
  })
  if (error) throw error
  revalidatePath('/')
}
```

- [ ] **Step 3: Formulario de contrato (client component)**

Create `components/contrato-form.tsx`:
```tsx
'use client'
import { useState } from 'react'
import type { Counterparty } from '@/lib/domain/types'
import { createContract } from '@/app/(app)/actions'

export function ContratoForm({ counterparties }: { counterparties: Counterparty[] }) {
  const [tipoPrecio, setTipoPrecio] = useState('FIJO')
  return (
    <form action={createContract} className="grid max-w-2xl grid-cols-2 gap-3 text-sm">
      <input name="ref" required placeholder="Ref (EQ-2026-001)" className="rounded border p-2" />
      <select name="lado" className="rounded border p-2"><option value="COMPRA">Compra</option><option value="VENTA">Venta</option></select>
      <select name="counterpartyId" required className="rounded border p-2 col-span-2">
        <option value="">— Counterparty —</option>
        {counterparties.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
      </select>
      <input name="sacos" type="number" step="any" required placeholder="Cantidad (sacos)" className="rounded border p-2" />
      <select name="tamanoSacoKg" className="rounded border p-2"><option value="70">70 kg</option><option value="35">35 kg</option></select>
      <input name="calidadOrigen" placeholder="Calidad / origen" className="rounded border p-2 col-span-2" />
      <select name="moneda" className="rounded border p-2"><option>USD</option><option>COP</option><option>EUR</option></select>
      <select name="tipoPrecio" value={tipoPrecio} onChange={e => setTipoPrecio(e.target.value)} className="rounded border p-2">
        <option value="FIJO">Precio fijo</option><option value="PTBF">Diferencial (PTBF)</option>
      </select>
      {tipoPrecio === 'FIJO'
        ? <input name="precioFijoUsdLb" type="number" step="any" placeholder="Precio fijo USD/lb" className="rounded border p-2 col-span-2" />
        : <>
            <input name="mesFuturo" placeholder="Mes futuro (KCU6)" className="rounded border p-2" />
            <input name="diferencialUsdLb" type="number" step="any" placeholder="Diferencial USD/lb" className="rounded border p-2" />
          </>}
      <input name="fechaTrade" type="date" required className="rounded border p-2" />
      <input name="fechaEntrega" type="date" className="rounded border p-2" />
      <textarea name="notas" placeholder="Notas" className="rounded border p-2 col-span-2" />
      <button className="col-span-2 rounded bg-black p-2 text-white">Crear contrato</button>
    </form>
  )
}
```

Create `app/(app)/contratos/nuevo/page.tsx`:
```tsx
import { listCounterparties } from '@/lib/supabase/queries'
import { ContratoForm } from '@/components/contrato-form'

export default async function NuevoContrato() {
  const cps = await listCounterparties()
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo contrato</h1>
      <ContratoForm counterparties={cps} />
    </div>
  )
}
```

- [ ] **Step 4: Probar**

Run: `npm run dev` → /contratos/nuevo → crear un contrato FIJO y uno PTBF.
Expected: se crean sin error (verificar en Supabase Table Editor que `cantidad_lb` = sacos×kg×2.2046).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): alta de contrato con conversión sacos→lb"
```

---

## Task 11: Detalle de contrato + fijaciones/hedges/costos

**Files:**
- Create: `app/(app)/contratos/[id]/page.tsx`, `components/fixation-form.tsx`, `components/hedge-form.tsx`, `components/cost-form.tsx`
- Modify: `lib/supabase/queries.ts` (`getContractBundle`), `app/(app)/actions.ts` (`addFixation`, `addHedge`, `addCost`)

**Interfaces:**
- Consumes: `computePriceStatus`, `computeFlatCoverage`, `computeFxCoverage`, `consolidatedStatus`, `contractEconomics`
- Produces:
  - `getContractBundle(id): Promise<{ contract: PhysicalContract; fixations: PriceFixation[]; hedges: Hedge[]; costs: Cost[] }>`
  - `addFixation(formData)`, `addHedge(formData)`, `addCost(formData)` (server actions)

- [ ] **Step 1: Query bundle (con mapeo snake→camel)**

Add to `lib/supabase/queries.ts`:
```ts
import type { PhysicalContract, PriceFixation, Hedge, Cost } from '@/lib/domain/types'

function mapContract(r: any): PhysicalContract {
  return {
    id: r.id, ref: r.ref, lado: r.lado, counterpartyId: r.counterparty_id,
    cantidadLb: Number(r.cantidad_lb), tamanoSacoKg: r.tamano_saco_kg,
    calidadOrigen: r.calidad_origen, moneda: r.moneda, tipoPrecio: r.tipo_precio,
    mesFuturo: r.mes_futuro, diferencialUsdLb: r.diferencial_usd_lb == null ? null : Number(r.diferencial_usd_lb),
    precioFijoUsdLb: r.precio_fijo_usd_lb == null ? null : Number(r.precio_fijo_usd_lb),
    fechaTrade: r.fecha_trade, fechaEntrega: r.fecha_entrega, estado: r.estado, notas: r.notas,
  }
}

export async function getContractBundle(id: string) {
  const supabase = await createClient()
  const [c, f, h, k] = await Promise.all([
    supabase.from('physical_contracts').select('*').eq('id', id).single(),
    supabase.from('price_fixations').select('*').eq('contract_id', id).order('fecha'),
    supabase.from('hedges').select('*').eq('contract_id', id).order('fecha_trade'),
    supabase.from('costs').select('*').eq('contract_id', id).order('fecha'),
  ])
  if (c.error) throw c.error
  return {
    contract: mapContract(c.data),
    fixations: (f.data ?? []).map((r: any): PriceFixation => ({
      id: r.id, contractId: r.contract_id, fecha: r.fecha,
      cantidadLbFijada: Number(r.cantidad_lb_fijada), precioFuturoFijadoUsdLb: Number(r.precio_futuro_fijado_usd_lb),
    })),
    hedges: (h.data ?? []).map((r: any): Hedge => ({
      id: r.id, contractId: r.contract_id, riesgoCubierto: r.riesgo_cubierto, tipo: r.tipo,
      direccion: r.direccion, cantidadLb: Number(r.cantidad_lb), mesVencimiento: r.mes_vencimiento,
      strike: r.strike == null ? null : Number(r.strike), callPut: r.call_put,
      precioOTasaEjecucion: Number(r.precio_o_tasa_ejecucion), broker: r.broker,
      fechaTrade: r.fecha_trade, estado: r.estado,
    })),
    costs: (k.data ?? []).map((r: any): Cost => ({
      id: r.id, contractId: r.contract_id, tipo: r.tipo, monto: Number(r.monto),
      moneda: r.moneda, fecha: r.fecha, descripcion: r.descripcion, facturaRef: r.factura_ref,
    })),
  }
}
```

- [ ] **Step 2: Server actions de fijación/hedge/costo**

Add to `app/(app)/actions.ts`:
```ts
export async function addFixation(formData: FormData) {
  const supabase = await createClient()
  const contractId = String(formData.get('contractId'))
  const { error } = await supabase.from('price_fixations').insert({
    contract_id: contractId, fecha: String(formData.get('fecha')),
    cantidad_lb_fijada: Number(formData.get('cantidadLbFijada')),
    precio_futuro_fijado_usd_lb: Number(formData.get('precioFuturoFijadoUsdLb')),
  })
  if (error) throw error
  revalidatePath(`/contratos/${contractId}`)
}

export async function addHedge(formData: FormData) {
  const supabase = await createClient()
  const contractId = String(formData.get('contractId'))
  const { error } = await supabase.from('hedges').insert({
    contract_id: contractId, riesgo_cubierto: String(formData.get('riesgoCubierto')),
    tipo: String(formData.get('tipo')), direccion: String(formData.get('direccion')),
    cantidad_lb: Number(formData.get('cantidadLb')),
    mes_vencimiento: (formData.get('mesVencimiento') as string) || null,
    strike: formData.get('strike') ? Number(formData.get('strike')) : null,
    call_put: (formData.get('callPut') as string) || null,
    precio_o_tasa_ejecucion: Number(formData.get('precioOTasaEjecucion')),
    broker: (formData.get('broker') as string) || null,
    fecha_trade: String(formData.get('fechaTrade')),
  })
  if (error) throw error
  revalidatePath(`/contratos/${contractId}`)
}

export async function addCost(formData: FormData) {
  const supabase = await createClient()
  const contractId = String(formData.get('contractId'))
  const { error } = await supabase.from('costs').insert({
    contract_id: contractId, tipo: String(formData.get('tipo')),
    monto: Number(formData.get('monto')), moneda: String(formData.get('moneda')),
    fecha: String(formData.get('fecha')),
    descripcion: (formData.get('descripcion') as string) || null,
    factura_ref: (formData.get('facturaRef') as string) || null,
  })
  if (error) throw error
  revalidatePath(`/contratos/${contractId}`)
}
```

- [ ] **Step 3: Sub-formularios (client components)**

Create `components/fixation-form.tsx`:
```tsx
'use client'
import { addFixation } from '@/app/(app)/actions'
export function FixationForm({ contractId }: { contractId: string }) {
  return (
    <form action={addFixation} className="flex flex-wrap gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <input name="fecha" type="date" required className="rounded border p-1" />
      <input name="cantidadLbFijada" type="number" step="any" required placeholder="lb fijadas" className="rounded border p-1" />
      <input name="precioFuturoFijadoUsdLb" type="number" step="any" required placeholder="precio futuro USD/lb" className="rounded border p-1" />
      <button className="rounded bg-black px-3 text-white">+ Fijación</button>
    </form>
  )
}
```

Create `components/hedge-form.tsx`:
```tsx
'use client'
import { addHedge } from '@/app/(app)/actions'
export function HedgeForm({ contractId }: { contractId: string }) {
  return (
    <form action={addHedge} className="flex flex-wrap gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <select name="riesgoCubierto" className="rounded border p-1"><option value="PRECIO">Precio</option><option value="FX">FX</option></select>
      <select name="tipo" className="rounded border p-1">
        <option value="KC_FUTURO">KC Futuro</option><option value="KC_OPCION">KC Opción</option>
        <option value="FX_FORWARD">FX Forward</option><option value="FX_OPCION">FX Opción</option>
      </select>
      <select name="direccion" className="rounded border p-1"><option value="LONG">Long</option><option value="SHORT">Short</option></select>
      <input name="cantidadLb" type="number" step="any" required placeholder="lb / nocional" className="rounded border p-1" />
      <input name="mesVencimiento" placeholder="Vto (KCU6)" className="rounded border p-1" />
      <input name="strike" type="number" step="any" placeholder="strike" className="rounded border p-1" />
      <select name="callPut" className="rounded border p-1"><option value="">—</option><option>CALL</option><option>PUT</option></select>
      <input name="precioOTasaEjecucion" type="number" step="any" required placeholder="precio/tasa" className="rounded border p-1" />
      <input name="broker" placeholder="broker" className="rounded border p-1" />
      <input name="fechaTrade" type="date" required className="rounded border p-1" />
      <button className="rounded bg-black px-3 text-white">+ Hedge</button>
    </form>
  )
}
```

Create `components/cost-form.tsx`:
```tsx
'use client'
import { addCost } from '@/app/(app)/actions'
export function CostForm({ contractId }: { contractId: string }) {
  return (
    <form action={addCost} className="flex flex-wrap gap-2 text-sm">
      <input type="hidden" name="contractId" value={contractId} />
      <select name="tipo" className="rounded border p-1">
        <option>FINANCIACION</option><option>LOGISTICA</option><option>COMISION_BROKER</option>
        <option>ALMACENAJE</option><option>CERTIFICACION</option><option>OTRO</option>
      </select>
      <input name="monto" type="number" step="any" required placeholder="monto" className="rounded border p-1" />
      <select name="moneda" className="rounded border p-1"><option>USD</option><option>COP</option><option>EUR</option></select>
      <input name="fecha" type="date" required className="rounded border p-1" />
      <input name="facturaRef" placeholder="factura ref" className="rounded border p-1" />
      <input name="descripcion" placeholder="descripción" className="rounded border p-1" />
      <button className="rounded bg-black px-3 text-white">+ Costo</button>
    </form>
  )
}
```

- [ ] **Step 4: Página de detalle (usa el dominio para mostrar cobertura)**

Create `app/(app)/contratos/[id]/page.tsx`:
```tsx
import { getContractBundle } from '@/lib/supabase/queries'
import { computePriceStatus, computeFlatCoverage, computeFxCoverage, consolidatedStatus } from '@/lib/domain/coverage'
import { contractEconomics } from '@/lib/domain/pnl'
import { lbToSacos } from '@/lib/domain/units'
import { FixationForm } from '@/components/fixation-form'
import { HedgeForm } from '@/components/hedge-form'
import { CostForm } from '@/components/cost-form'

export default async function ContratoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { contract, fixations, hedges, costs } = await getContractBundle(id)
  const price = computePriceStatus(contract, fixations)
  const flat = computeFlatCoverage(contract, hedges)
  const fx = computeFxCoverage(contract, fixations, hedges)
  const status = consolidatedStatus(contract, fixations, hedges)
  const econ = contractEconomics(contract, fixations, costs)
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`

  return (
    <div className="space-y-6 text-sm">
      <h1 className="text-lg font-semibold">
        {contract.ref} — {contract.lado} · {status}
      </h1>
      <section className="grid grid-cols-3 gap-4">
        <div className="rounded border p-3">
          <div className="font-medium">Precio (fijación)</div>
          <div>{pct(price.pricedPct)} · por fijar: {price.unfixedLb.toFixed(0)} lb</div>
        </div>
        <div className="rounded border p-3">
          <div className="font-medium">Cobertura café</div>
          <div>{pct(flat.coveragePct)} · {flat.kcContracts} contratos KC · residual {flat.residualLb.toFixed(0)} lb</div>
          {!flat.directionOk && <div className="text-red-600">⚠ dirección de hedge equivocada</div>}
        </div>
        <div className="rounded border p-3">
          <div className="font-medium">Cobertura FX</div>
          <div>{pct(fx.coveragePct)} · exposición {fx.exposureNotional.toFixed(0)} {contract.moneda}</div>
        </div>
      </section>

      <section>
        <div className="mb-1 font-medium">Cantidad: {lbToSacos(contract.cantidadLb, contract.tamanoSacoKg).toFixed(0)} sacos ×{contract.tamanoSacoKg}kg = {contract.cantidadLb.toFixed(0)} lb</div>
        <div>Valor priced: {econ.pricedUsdValue.toFixed(0)} USD · Costos: USD {econ.totalCosts.USD.toFixed(0)} / COP {econ.totalCosts.COP.toFixed(0)} / EUR {econ.totalCosts.EUR.toFixed(0)}</div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Fijaciones</h2>
        {fixations.map(f => <div key={f.id}>{f.fecha} · {f.cantidadLbFijada} lb @ {f.precioFuturoFijadoUsdLb}</div>)}
        {contract.tipoPrecio === 'PTBF' && <FixationForm contractId={contract.id} />}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Hedges</h2>
        {hedges.map(h => <div key={h.id}>{h.riesgoCubierto} · {h.tipo} · {h.direccion} · {h.cantidadLb} @ {h.precioOTasaEjecucion} ({h.estado})</div>)}
        <HedgeForm contractId={contract.id} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Costos</h2>
        {costs.map(k => <div key={k.id}>{k.fecha} · {k.tipo} · {k.monto} {k.moneda} {k.facturaRef ? `· ${k.facturaRef}` : ''}</div>)}
        <CostForm contractId={contract.id} />
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Probar el ciclo completo**

Run: `npm run dev`. Crear contrato → abrir su detalle → agregar hedge PRECIO en dirección correcta → ver cobertura subir y semáforo cambiar; agregar fijación (si PTBF); agregar costo.
Expected: los tres paneles reflejan los cambios; residual KC visible.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(ui): detalle de contrato con fijaciones, hedges, costos y cobertura"
```

---

# HITO 4 — El libro y la exportación

## Task 12: Libro (tabla maestra con semáforos y filtros)

**Files:**
- Create: `components/semaforo.tsx`, `components/libro-table.tsx`, `app/(app)/page.tsx`
- Modify: `lib/supabase/queries.ts` (`getLibro`)

**Interfaces:**
- Consumes: `consolidatedStatus`, `computeFlatCoverage`, `computeFxCoverage`, `computePriceStatus`, `lbToSacos`
- Produces:
  - `getLibro(): Promise<LibroRow[]>` con `LibroRow = { id, ref, lado, counterparty, estado, sacos, lb, tipoPrecio, pricedPct, flatPct, fxPct, status }`

- [ ] **Step 1: Query del libro (calcula estado por contrato)**

Add to `lib/supabase/queries.ts`:
```ts
import { consolidatedStatus, computeFlatCoverage, computeFxCoverage, computePriceStatus } from '@/lib/domain/coverage'
import { lbToSacos } from '@/lib/domain/units'
import type { Semaforo } from '@/lib/domain/types'

export interface LibroRow {
  id: string; ref: string; lado: string; counterparty: string; estado: string
  sacos: number; lb: number; tamanoSacoKg: number; tipoPrecio: string
  pricedPct: number; flatPct: number; fxPct: number; status: Semaforo
}

export async function getLibro(): Promise<LibroRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('physical_contracts')
    .select('*, counterparties(nombre), price_fixations(*), hedges(*)')
    .order('fecha_trade', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: any) => {
    const contract = mapContract(r)
    const fixations = (r.price_fixations ?? []).map((f: any) => ({
      id: f.id, contractId: f.contract_id, fecha: f.fecha,
      cantidadLbFijada: Number(f.cantidad_lb_fijada), precioFuturoFijadoUsdLb: Number(f.precio_futuro_fijado_usd_lb),
    }))
    const hedges = (r.hedges ?? []).map((h: any) => ({
      id: h.id, contractId: h.contract_id, riesgoCubierto: h.riesgo_cubierto, tipo: h.tipo,
      direccion: h.direccion, cantidadLb: Number(h.cantidad_lb), mesVencimiento: h.mes_vencimiento,
      strike: h.strike, callPut: h.call_put, precioOTasaEjecucion: Number(h.precio_o_tasa_ejecucion),
      broker: h.broker, fechaTrade: h.fecha_trade, estado: h.estado,
    }))
    return {
      id: contract.id, ref: contract.ref, lado: contract.lado,
      counterparty: r.counterparties?.nombre ?? '', estado: contract.estado,
      lb: contract.cantidadLb, tamanoSacoKg: contract.tamanoSacoKg,
      sacos: lbToSacos(contract.cantidadLb, contract.tamanoSacoKg), tipoPrecio: contract.tipoPrecio,
      pricedPct: computePriceStatus(contract, fixations).pricedPct,
      flatPct: computeFlatCoverage(contract, hedges).coveragePct,
      fxPct: computeFxCoverage(contract, fixations, hedges).coveragePct,
      status: consolidatedStatus(contract, fixations, hedges),
    }
  })
}
```

- [ ] **Step 2: Semáforo**

Create `components/semaforo.tsx`:
```tsx
import type { Semaforo } from '@/lib/domain/types'
const color: Record<Semaforo, string> = { VERDE: 'bg-green-500', AMARILLO: 'bg-yellow-400', ROJO: 'bg-red-500' }
export function SemaforoDot({ status }: { status: Semaforo }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${color[status]}`} title={status} />
}
```

- [ ] **Step 3: Tabla con filtros (client)**

Create `components/libro-table.tsx`:
```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { LibroRow } from '@/lib/supabase/queries'
import { SemaforoDot } from './semaforo'

export function LibroTable({ rows }: { rows: LibroRow[] }) {
  const [color, setColor] = useState('TODOS')
  const [lado, setLado] = useState('TODOS')
  const filtered = rows.filter(r =>
    (color === 'TODOS' || r.status === color) && (lado === 'TODOS' || r.lado === lado))
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`
  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <select value={color} onChange={e => setColor(e.target.value)} className="rounded border p-1">
          <option value="TODOS">Todos los colores</option><option>VERDE</option><option>AMARILLO</option><option>ROJO</option>
        </select>
        <select value={lado} onChange={e => setLado(e.target.value)} className="rounded border p-1">
          <option value="TODOS">Compra y venta</option><option value="COMPRA">Compra</option><option value="VENTA">Venta</option>
        </select>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left">
          <th></th><th>Ref</th><th>Lado</th><th>Counterparty</th><th>Sacos</th><th>lb</th>
          <th>Precio</th><th>% fijado</th><th>% café</th><th>% FX</th><th>Estado</th>
        </tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td><SemaforoDot status={r.status} /></td>
              <td><Link href={`/contratos/${r.id}`} className="text-blue-600 underline">{r.ref}</Link></td>
              <td>{r.lado}</td><td>{r.counterparty}</td>
              <td>{r.sacos.toFixed(0)}×{r.tamanoSacoKg}</td><td>{r.lb.toFixed(0)}</td>
              <td>{r.tipoPrecio}</td><td>{pct(r.pricedPct)}</td><td>{pct(r.flatPct)}</td><td>{pct(r.fxPct)}</td>
              <td>{r.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Home = libro**

Create `app/(app)/page.tsx`:
```tsx
import { getLibro } from '@/lib/supabase/queries'
import { LibroTable } from '@/components/libro-table'

export default async function LibroPage() {
  const rows = await getLibro()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Libro de contratos</h1>
        <a href="/api/export/libro" className="ml-auto rounded border px-3 py-1 text-sm">Exportar Excel</a>
      </div>
      <LibroTable rows={rows} />
    </div>
  )
}
```

Si existe un `app/page.tsx` del scaffold, bórralo (el home vive en `(app)/page.tsx`).

- [ ] **Step 5: Probar**

Run: `npm run dev` → home muestra todos los contratos con semáforos; filtros por color y lado funcionan; click en ref abre el detalle.
Expected: tabla y filtros OK.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(ui): libro maestro con semáforos y filtros"
```

---

## Task 13: Exportación Excel/CSV

**Files:**
- Create: `lib/export/workbook.ts`, `lib/export/__tests__/workbook.test.ts`, `app/api/export/[tipo]/route.ts`
- Modify: `lib/supabase/queries.ts` (`getCostsExport`, `getHedgesExport`)

**Interfaces:**
- Consumes: `getLibro`, y nuevas queries de costos/hedges
- Produces:
  - `buildLibroWorkbook(rows: LibroRow[]): Promise<Buffer>` (xlsx)
  - `toCsv(headers: string[], rows: (string|number)[][]): string`
  - Ruta `GET /api/export/libro` → descarga `.xlsx` con `Content-Disposition` sellado con fecha.

- [ ] **Step 1: Test de CSV (función pura)**

Create `lib/export/__tests__/workbook.test.ts`:
```ts
import { expect, it, describe } from 'vitest'
import { toCsv } from '@/lib/export/workbook'

describe('toCsv', () => {
  it('escapa comas y comillas', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'he said "hi"']])
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""')
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run lib/export/__tests__/workbook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar workbook**

Create `lib/export/workbook.ts`:
```ts
import ExcelJS from 'exceljs'
import type { LibroRow } from '@/lib/supabase/queries'

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

export async function buildLibroWorkbook(rows: LibroRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Libro')
  ws.columns = [
    { header: 'Ref', key: 'ref', width: 16 },
    { header: 'Lado', key: 'lado', width: 8 },
    { header: 'Counterparty', key: 'counterparty', width: 22 },
    { header: 'Estado', key: 'estado', width: 10 },
    { header: 'Sacos', key: 'sacos', width: 10 },
    { header: 'Tamaño saco (kg)', key: 'tamanoSacoKg', width: 14 },
    { header: 'Libras', key: 'lb', width: 12 },
    { header: 'Tipo precio', key: 'tipoPrecio', width: 12 },
    { header: '% fijado', key: 'pricedPct', width: 10 },
    { header: '% café', key: 'flatPct', width: 10 },
    { header: '% FX', key: 'fxPct', width: 10 },
    { header: 'Semáforo', key: 'status', width: 10 },
  ]
  ws.getRow(1).font = { bold: true }
  for (const r of rows) {
    ws.addRow({ ...r, sacos: Math.round(r.sacos), lb: Math.round(r.lb),
      pricedPct: r.pricedPct, flatPct: r.flatPct, fxPct: r.fxPct })
  }
  ;['pricedPct', 'flatPct', 'fxPct'].forEach(k => {
    ws.getColumn(k).numFmt = '0%'
  })
  const arr = await wb.xlsx.writeBuffer()
  return Buffer.from(arr)
}
```

- [ ] **Step 4: Correr para ver que pasa**

Run: `npx vitest run lib/export/__tests__/workbook.test.ts`
Expected: PASS.

- [ ] **Step 5: Ruta de descarga**

Create `app/api/export/[tipo]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/supabase/server'
import { getLibro } from '@/lib/supabase/queries'
import { buildLibroWorkbook } from '@/lib/export/workbook'

export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const profile = await getSessionProfile()
  if (!profile) return new NextResponse('No autorizado', { status: 401 })
  const { tipo } = await params
  if (tipo !== 'libro') return new NextResponse('Tipo no soportado', { status: 404 })

  const rows = await getLibro()
  const buf = await buildLibroWorkbook(rows)
  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="libro_equation_${fecha}.xlsx"`,
    },
  })
}
```

- [ ] **Step 6: Probar la descarga**

Run: `npm run dev` → en el libro, click "Exportar Excel" → descarga `libro_equation_YYYY-MM-DD.xlsx`, ábrelo y verifica encabezados, % con formato de porcentaje y las filas.
Expected: archivo válido con los contratos.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(export): exportación del libro a Excel + util CSV"
```

---

## Cierre de Fase 1

- [ ] **Correr toda la suite:** `npm test` → todos los tests de dominio y export en verde.
- [ ] **Type check:** `npx tsc --noEmit` → sin errores.
- [ ] **Deploy a Vercel:** conectar el repo, definir las 3 variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), desplegar.
- [ ] **Smoke test en prod:** login, crear contrato, agregar hedge, ver semáforo, exportar.

---

## Self-Review (cobertura del spec)

- **§4 Modelo de datos** → Task 6 (todas las tablas) + Task 2 (tipos). ✔
- **§5 Cobertura (3 semáforos, umbral 95%, dirección, residual KC)** → Task 4 + Task 3 (residual). ✔
- **§6 Pantallas (login, libro, detalle, nuevo, counterparties, export)** → Tasks 7, 12, 11, 10, 9, 13. ✔
- **§7 Auth + roles + RLS** → Task 7 (auth/roles) + Task 8 (RLS). ✔
- **§8 Export xlsx/csv, respeta filtros, sello de fecha** → Task 13. Nota: la exportación de "Costos" y "Hedges" separadas (§8, ítems 2 y 3) se añaden como extensión de Task 13 reusando el mismo patrón `buildLibroWorkbook`/`toCsv`; en v1 se entrega el Libro y las otras dos hojas quedan como incremento inmediato del mismo archivo `workbook.ts` (misma firma, distinta query). El filtro "respeta lo que el analista ve" en la ruta API v1 exporta el libro completo; pasar los filtros por querystring es un incremento pequeño posterior.
- **P&L básico** → Task 5. ✔
- **Fuera de alcance (feed de mercado, alertas, OCR)** → correctamente ausentes de Fase 1. ✔

Dos puntos anotados como incremento inmediato (no bloquean Fase 1): hojas de Costos/Hedges en el export, y propagar filtros del libro al export vía querystring.
