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
- Cada **cobertura** liga a un **Cliente / Pedido** y tiene dos patas de futuros:
  - **Compra** (long) — se abre al vender al cliente.
  - **Venta** (short) — se cierra al comprar el café.
- **Estado**: *Abierta* (falta cruzar una pata, resaltada) o *Cerrada* (ambas → neteada).
- **Resultado (USD)** = `(precio venta − precio compra) × lotes × 37.500`.
  Verificado contra el archivo del analista (coincide al centavo).
- **Código Hedge Point** por pata (para conciliar el extracto del broker).
- **Posición** = mes del futuro (Septiembre/Diciembre…) + nemotécnico (KCU, KCZ). **FND** = First Notice Day.
- Cantidades en **sacos de 60 kg** + **lotes** (1 lote = 37.500 lb). `1 kg = 2,2046226218 lb`.

## Limitaciones (por ser prototipo)
- **Sin login/registro** y **datos NO compartidos**: cada navegador guarda su propia copia.
  No hay sincronización ni respaldo. Sirve para *probar y opinar*, no para operar en equipo aún.
- **FX**: se capturan las coberturas; el resultado marcado a mercado llega con el feed de precios.

## Roadmap
1. **Prototipo (hoy)** — libro de coberturas + neteo + Resultado + FX + export CSV. HTML standalone.
2. **Base compartida** — Next.js + **Supabase**: login, roles, base en la nube (todos el mismo libro).
3. **Mercado + alertas** — feed KC/FX (mark-to-market) y notificaciones (email/WhatsApp).

## Estructura del repo
- `index.html` — **prototipo standalone v2** (el que prueba el equipo). Modelo de neteo + marca Equation.
- `app/`, `lib/`, `components/` — app **Next.js** (base para la versión con Supabase). *Nota: hoy
  refleja un modelo previo 1:1; se realineará al modelo de neteo antes de la fase Supabase.*
- `lib/domain/` — lógica pura testeada (unidades, cobertura, P&L) con Vitest.
- `docs/superpowers/` — spec y plan de implementación.

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
