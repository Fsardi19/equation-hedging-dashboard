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
  mesFuturo: string | null // solo PTBF, ej. "KCU6"
  diferencialUsdLb: number | null // solo PTBF
  precioFijoUsdLb: number | null // solo FIJO
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
  cantidadLb: number // lb (PRECIO) o nocional en divisa (FX)
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
