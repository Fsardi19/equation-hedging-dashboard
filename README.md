# Equation Coffee — Libro de Coberturas (MVP)

Herramienta para gestionar la **cobertura de café** de Equation Coffee: cruce de **compra/venta
de futuros** (neteo) por Cliente/Pedido, con el **Resultado (USD)** que se lleva a contabilidad,
más un módulo de **coberturas FX** (COP/USD, EUR/USD).

> **Estado: prototipo en pruebas.** Modelo validado con el analista (Luis M. García) a partir de
> su archivo de control real. En evolución.

## 🔗 Probar (sin instalar nada)
**https://fsardi19.github.io/equation-hedging-dashboard/**

Es un solo `index.html` con datos en el navegador (localStorage). Trae datos de ejemplo.

## Modelo (según el control real del analista)
- Cada **cobertura** liga a un **Cliente / Pedido / Lote OIC** y tiene dos patas de futuros:
  - **Compra** (long) — se abre al vender al cliente.
  - **Venta** (short) — se cierra al comprar el café.
- **Estado**: *Abierta* (falta cruzar una pata, resaltada) o *Cerrada* (ambas → neteada).
- **Resultado (USD)** = `(precio venta − precio compra) × lotes × 37.500`.
  Verificado contra el archivo del analista (coincide al centavo).
- **Código Hedge Point** por pata (para conciliar el extracto del broker).
- **Posición** = mes **y año** del futuro (Septiembre 2026, Marzo 2027…) + nemotécnico (KCU6, KCH7). **FND** = First Notice Day.
- Cantidades en **sacos de 60 kg** + **lotes** (1 lote = 37.500 lb). `1 kg = 2,2046226218 lb`.

## Funcionalidades (v3)
- **Dashboard** — libro con KPIs, semáforos de estado, gráficas (resultado por cliente/pedido/OIC), filtros y **columnas ordenables**.
- **Cierre de mes / conciliación** — precio de cierre + **σ** por posición; valora las abiertas al cierre y **concilia por posición** contra el extracto Hedge Point (Realizado + Valorado = Total).
- **Acción sugerida** por cobertura — motor determinístico (días a FND, exposición, σ, banda 1σ, VaR 95%) → ROLAR/CERRAR, TOMAR, REVISAR, MANTENER.
- **Escenarios de volatilidad** — sensibilidad de la exposición abierta a KC ±10/25/50%, P&L y llamado a margen, **peor caso → FCF mensual**, margen inicial/lote, desglose por posición.
- **Cierre parcial** — cierra una fracción (realizada) y deja el resto abierto (pergamino fraccionado).
- **Coberturas FX** (COP/USD, EUR/USD) — módulo aparte. **Export CSV** en todas las vistas.

## Limitaciones (por ser prototipo)
- **Sin login/registro** y **datos NO compartidos**: cada navegador guarda su propia copia.
  No hay sincronización ni respaldo. Sirve para *probar y opinar*, no para operar en equipo aún.
- **FX**: se capturan las coberturas; el resultado marcado a mercado llega con el feed de precios.

## Roadmap
1. **Prototipo (hoy)** — libro de coberturas + neteo + Resultado + FX + export CSV. HTML standalone.
2. **Base compartida** — Next.js + **Supabase**: login, roles, base en la nube (todos el mismo libro).
3. **Mercado + alertas** — feed KC/FX (mark-to-market) y notificaciones (email/WhatsApp).

## Estructura del repo
- `index.html` — **prototipo standalone v3** (el que prueba el equipo): modelo de neteo, conciliación,
  motor de recomendación, escenarios de volatilidad y cierre parcial. Identidad visual de Equation.
- `app/`, `lib/`, `components/` — app **Next.js** (base para la versión con Supabase). *Nota: hoy
  refleja un modelo previo 1:1; se realineará al modelo de neteo antes de la fase Supabase.*
- `lib/domain/` — lógica pura testeada (unidades, cobertura, P&L) con Vitest.
- `docs/superpowers/` — spec y plan de implementación.

## Pendientes (esperando datos/decisión del equipo)
- **Margen físico** (precio físico, diferenciales, gastos FOB, utilidad/lb) → margen total por producto.
- **FX con resultado en COP** y valoración a tasa de cierre (hoja "USD Libertario").
- **Cupos de crédito** de cobertura + **política FX** (proteger margen bruto vs. flujo de caja).
- **PTBF** como alerta discreta. Y la **migración a Supabase** (login + base compartida).

## Correr la app Next.js (para desarrolladores)
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests de dominio
```
Requiere Node ≥ 20.

## Identidad visual
Colores y tipografía de la marca (equationcoffee.com): teal `#1a383f`, crema `#f7f7f1`,
tan `#cec1ad`; Baskerville (títulos) + Lato (cuerpo).
