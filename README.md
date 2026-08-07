# Equation Coffee — Dashboard de Cobertura (MVP local)

Herramienta del analista financiero para gestionar la cobertura de contratos
físicos de café (riesgo de precio KC y riesgo FX COP/USD y EUR/USD), contrato por
contrato, con estado de cobertura en semáforo y exportación a Excel.

> **Estado: MVP local.** Datos en archivo JSON local (`data/db.json`), sin login.
> Antes de compartir con desarrolladores se migra la capa de datos a Supabase
> (Postgres + Auth + RLS) — ver `docs/superpowers/plans/`.

## Requisitos
- Node ≥ 20

## Arranque
```bash
npm install
npm run dev
# abrir http://localhost:3000
```

## Comandos
```bash
npm run dev        # servidor de desarrollo
npm test           # tests de la capa de dominio (unidades, cobertura, P&L, export)
npm run typecheck  # chequeo de tipos
npm run build      # build de producción
```

## Cómo se usa
1. **Counterparties** — crea proveedores (compra) y clientes (venta).
2. **Nuevo contrato** — captura el negocio físico. Cantidad en sacos (35 o 70 kg);
   se guarda en libras automáticamente. Precio fijo o diferencial (PTBF).
3. **Detalle del contrato** — agrega fijaciones de precio (PTBF), hedges (café/FX) y
   costos. Los tres semáforos (precio, café, FX) se recalculan en vivo.
4. **Libro** — vista maestra con el estado de cada contrato; filtra por color y lado.
5. **⬇ Excel** — exporta el libro con fecha.

## Reglas de negocio (capa de dominio, testeada)
- Unidad canónica: **libras**. `1 saco = 35 o 70 kg`, `1 kg = 2.2046226218 lb`.
- Contrato KC = **37,500 lb**. El residual/descalce siempre se muestra.
- Cobertura ≥ **95%** = verde.
- Dirección correcta: **compra → hedge SHORT**, **venta → hedge LONG** (si no, alerta).

## Arquitectura
```
lib/domain/   Lógica pura testeada (units, coverage, pnl). Sin dependencias de UI/DB.
lib/data/     Interfaz DataStore + LocalDataStore (JSON). Se cambia por Supabase en 1 archivo.
lib/view/     Composición datos + dominio para el libro.
lib/export/   Generación de Excel/CSV.
app/          Páginas Next.js (libro, contrato, counterparties) + server actions + API export.
components/   UI (tabla, semáforo, formularios).
```

Migrar a Supabase = implementar `SupabaseDataStore` (misma interfaz `DataStore`) y
cambiar la línea de selección en `lib/data/index.ts`. UI y dominio no cambian.
