# Equation Coffee — Dashboard de Cobertura (Hedging) — Diseño Fase 1

**Fecha:** 2026-07-23
**Estado:** Aprobado para escribir plan de implementación
**Autor:** Felipe Sardi + Claude

---

## 1. Contexto y propósito

**Equation Coffee** es un trader físico de café (Colombia). Este dashboard es la
herramienta de trabajo del **analista financiero**: debe decirle **exactamente qué hacer**
para cubrir cada negocio de compra/venta de café, tanto en riesgo de **precio** (futuros/
opciones KC) como en riesgo de **tasa de cambio** (COP/USD dominante, EUR/USD secundario).

Es un proyecto distinto y separado del dashboard de opciones KC existente (ese sigue una
sola posición direccional; este sigue un *libro* de contratos físicos y sus coberturas) y
de los dashboards Python/Streamlit viejos en `EQUATION COFFEE/AI STRATEGY`.

### Decisiones de negocio confirmadas
- **Cobertura 1:1** — cada contrato físico se cubre individualmente (puede tener varios
  hedges: uno de precio, otro de FX, y parciales).
- **Dos tipos de precio coexisten:** a diferencial sobre "C" (PTBF — hay que seguir qué
  está *fijado* vs *por fijar*) y a precio fijo (flat).
- **Flujo FX:** compra en COP, vende en USD. Riesgo dominante COP/USD; EUR/USD en ventas
  a Europa.
- **Captura 100% manual** por el analista dentro del dashboard. El sistema es la fuente de
  verdad; genera exportaciones a Excel/CSV para pasar a contabilidad.
- **Alertas por Email + WhatsApp** (Fase 3).
- **Web multi-usuario con login**, base de datos Supabase.
- Seguir por contrato: estado de cobertura, P&L y **costos** (financieros, logística, fees).

## 2. Stack

- **Next.js (App Router) + TypeScript**, desplegado en **Vercel**.
- **Supabase**: Postgres (datos), Auth (login), Storage (adjuntos de facturas),
  RLS (permisos por rol).
- **UI**: Tailwind + shadcn/ui; TanStack Table para el libro; gráficos ligeros para P&L.
- **Repo fuera de iCloud** (`~/dev/equation-hedging-dashboard`) para evitar el problema
  documentado de archivos "dataless"/cuelgues que iCloud causa con `node_modules`/venvs en
  `~/Desktop`.

## 3. Roadmap por fases

Cada fase es usable por sí sola.

- **Fase 1 (este diseño):** login + captura de contratos/hedges/costos + estado de
  cobertura + P&L básico + export Excel/CSV. Usable por el analista desde el día 1.
- **Fase 2:** feed de mercado en vivo (KC=F, COP/USD, EUR/USD) → mark-to-market y P&L real
  por contrato + costos consolidados.
- **Fase 3:** motor de alertas Email + WhatsApp (contrato descubierto, precio por fijar
  cerca de vencimiento, FX abierto, hedge en dirección equivocada, margin call).

Extracción de facturas con IA (OCR) queda como posible fase posterior; en Fase 1 las
facturas son metadata (referencia + adjunto).

---

## 4. Modelo de datos (Supabase / Postgres)

Unidad central: el **contrato físico**. A su alrededor cuelgan fijaciones de precio,
hedges y costos. **El estado de cobertura NO se guarda: se calcula** a partir de esas
piezas, para que nunca quede desincronizado.

**Unidad canónica de cantidad: libras (lb).** Razón: el contrato KC se mide en lb
(1 contrato = 37,500 lb), así la matemática de cobertura es directa. La captura y la
visualización pueden hacerse en sacos.

### Tablas

**`counterparties`**
- `id, nombre, tipo (PROVEEDOR/CLIENTE), pais, moneda_default, notas`

**`physical_contracts`** (una fila = un negocio físico; es lo que el analista ve en el libro)
- `id, ref (ej. EQ-2026-001), lado (COMPRA/VENTA), counterparty_id`
- `cantidad_lb` (número libre; soporta contratos fraccionados, ej. contenedor 40ft = 42,000 lb)
- `tamano_saco_kg (35 o 70)` — para captura/visualización en sacos; la conversión a lb es automática
- `calidad_origen, moneda (COP/USD/EUR)`
- `tipo_precio (PTBF/FIJO)`
- `mes_futuro (ej. KCU6, solo PTBF), diferencial_usd_lb (solo PTBF)`
- `precio_fijo_usd_lb (solo FIJO)`
- `fecha_trade, fecha_entrega, estado (ABIERTO/CERRADO), notas`

**`price_fixations`** (solo PTBF; permite fijar en tramos)
- `id, contract_id, fecha, cantidad_lb_fijada, precio_futuro_fijado_usd_lb`

**`hedges`** (cobertura ligada 1:1 al contrato; un contrato puede tener varios)
- `id, contract_id, riesgo_cubierto (PRECIO/FX)`
- `tipo (KC_FUTURO/KC_OPCION/FX_FORWARD/FX_OPCION), direccion (LONG/SHORT)`
- `cantidad_lb` (o nocional, para FX), `mes_vencimiento`
- `strike, call_put` (si opción)
- `precio_o_tasa_ejecucion, broker, fecha_trade, estado (ABIERTA/CERRADA)`

**`costs`** (costos por contrato)
- `id, contract_id, tipo (FINANCIACION/LOGISTICA/COMISION_BROKER/ALMACENAJE/CERTIFICACION/OTRO)`
- `monto, moneda, fecha, descripcion, factura_ref` (+ link a adjunto en Storage)

**`profiles`** (encima de Supabase Auth)
- `id, nombre, rol (ADMIN/ANALISTA/LECTURA)`

---

## 5. Lógica de estado de cobertura (por contrato)

Vive en una **capa de dominio TypeScript pura y testeable** (`/lib/domain`), no en la base
ni pegada a la UI. Para cada contrato calcula **tres semáforos independientes**:

### A) Estado de precio (¿flat price fijado?)
- **FIJO:** 100% priced siempre (precio existe desde el día 1).
- **PTBF:** `% fijado = Σ cantidad_lb_fijada ÷ cantidad_lb`. Muestra **lb por fijar**;
  marca urgencia si el mes futuro está cerca de vencer.

### B) Cobertura de precio de café (riesgo flat)
- `lb cubiertas = Σ hedges (riesgo=PRECIO, dirección correcta) en lb`
- `% cobertura = lb cubiertas ÷ lb con riesgo`
- Muestra **contratos KC equivalentes** (`cantidad_lb ÷ 37,500`) y **residual/descalce**
  por el tamaño fijo del contrato KC (ej. 42,000 lb → 1.12 contratos → residual visible).
- **Dirección correcta** según el lado: si Equation **compra** físico (long café) el hedge
  correcto es **vender** futuros; si **vende**, al revés. El sistema alerta si el hedge está
  en dirección equivocada.

### C) Cobertura FX
- Exposición en divisa (USD o EUR) aún no cubierta con FX_FORWARD/FX_OPCION.
- `% FX cubierto = nocional hedge FX ÷ exposición en divisa`

### Semáforo consolidado
- **Umbral simple: ≥95% cubierto = verde.** Amarillo = parcial. Rojo = descubierto o hedge
  en dirección equivocada.
- El color ordena el libro y (Fase 3) dispara alertas.

---

## 6. Arquitectura de la app y pantallas (Fase 1)

### Pantallas
1. **Login** — email + contraseña (Supabase Auth).
2. **Libro (home)** — tabla maestra: una fila por contrato con los tres semáforos,
   cantidad (sacos + lb), tipo de precio, % fijado, % cubierto café, % cubierto FX, color
   consolidado. Filtros por lado/estado/counterparty/color.
3. **Detalle de contrato** — datos comerciales + fijaciones + hedges + costos + desglose del
   cálculo de cobertura (con residual KC visible). Botones para agregar fijación/hedge/costo.
4. **Nuevo/editar contrato** — formulario con selector saco 35/70 kg y conversión a lb.
5. **Counterparties** — alta y listado.
6. **Export** — botones de descarga Excel/CSV (ver §8).

### Organización del código
```
/app            → páginas y rutas (login, libro, contrato/[id], etc.)
/components     → UI reutilizable (tabla, semáforo, formularios)
/lib/domain     → lógica pura: coverage.ts, units.ts, pnl.ts  ← el cerebro, testeado
/lib/supabase   → cliente y queries tipadas
/lib/export     → generación de Excel/CSV
/supabase       → migraciones SQL (las tablas de §4)
```
La lógica de cobertura y de unidades (sacos↔lb, contratos KC equivalentes) queda aislada y
con tests, independiente de UI y base. Cambiar una regla = tocar un solo archivo.

---

## 7. Autenticación y permisos

- **Login:** Supabase Auth (email + contraseña). El admin invita a los miembros; sin
  auto-registro abierto (herramienta interna).
- **Roles** (`profiles.rol`):
  | Rol | Puede |
  |-----|-------|
  | **ADMIN** | Todo, incl. gestionar usuarios. |
  | **ANALISTA** | Capturar/editar contratos, fijaciones, hedges, costos; exportar. No gestiona usuarios. |
  | **LECTURA** | Ver libro/detalles/reportes; recibir alertas. No modifica. |
- **Enforcement con RLS en Supabase** (regla en la base de datos, no solo escondiendo
  botones): Postgres rechaza escrituras no permitidas aunque se intente por fuera de la app.
- **Alcance de datos v1:** todos ven el mismo libro de Equation. Permisos por *acción*
  (leer/escribir/administrar), no por *qué contratos ve cada quien*. Segmentación por
  libro/mesa = YAGNI por ahora.

---

## 8. Exportación a Excel/CSV

Tres exportaciones, cada una una hoja/archivo limpio:
1. **Libro de contratos** — una fila por contrato: comercial + estado de cobertura
   (% fijado, % café, % FX, color), cantidades en sacos y lb, valores calculados.
2. **Costos** — una fila por costo (`contrato_ref, tipo, monto, moneda, fecha, factura_ref,
   descripcion`), listo para conciliar con contabilidad.
3. **Hedges** — una fila por cobertura (instrumento, broker, precio/tasa, vencimiento, estado).

Detalles:
- **Excel (.xlsx)** con encabezados y formato de números/moneda/fechas; **CSV** como
  alternativa plana.
- **Respeta filtros:** exporta lo que el analista está viendo.
- **Sello de fecha** en el nombre (`libro_equation_2026-07-23.xlsx`).
- Se genera en el servidor (Next.js) leyendo de Supabase, reusando `/lib/domain`
  (sin duplicar cálculos).

---

## 9. Fuera de alcance en Fase 1 (explícito)

- Feed de precios de mercado en vivo y mark-to-market (Fase 2).
- Motor de alertas Email/WhatsApp (Fase 3).
- Extracción de facturas con IA / OCR.
- Segmentación de datos por usuario/mesa.
- Integración directa con sistemas contables (se cubre vía export).

## 10. Riesgos y notas

- **iCloud:** el repo va fuera de `~/Desktop` para evitar cuelgues de `node_modules`.
- **WhatsApp (Fase 3):** requiere proveedor (Twilio / WhatsApp Business) con costo por
  mensaje y configuración inicial — dependencia externa a planear.
- **Descalce KC 37,500 lb:** los contratos fraccionados nunca calzan exacto con el tamaño
  del futuro; el dashboard debe mostrar el residual, no esconderlo.
- **Precisión numérica:** montos y cantidades deben usar tipos numéricos exactos
  (evitar errores de redondeo en lb ↔ sacos y en dinero).
