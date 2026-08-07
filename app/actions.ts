'use server'

import { revalidatePath } from 'next/cache'
import { store } from '@/lib/data'
import { sacosToLb } from '@/lib/domain/units'
import type { Lado, Moneda, TamanoSaco, TipoPrecio, RiesgoCubierto, TipoHedge, Direccion, TipoCosto } from '@/lib/domain/types'

function str(fd: FormData, k: string): string { return String(fd.get(k) ?? '') }
function opt(fd: FormData, k: string): string | null { const v = fd.get(k); return v ? String(v) : null }
function num(fd: FormData, k: string): number { return Number(fd.get(k)) }

export async function createCounterparty(fd: FormData) {
  await store.createCounterparty({
    nombre: str(fd, 'nombre'),
    tipo: str(fd, 'tipo') as 'PROVEEDOR' | 'CLIENTE',
    pais: opt(fd, 'pais'),
    monedaDefault: str(fd, 'monedaDefault') as Moneda,
    notas: opt(fd, 'notas'),
  })
  revalidatePath('/counterparties')
}

export async function createContract(fd: FormData) {
  const tamano = num(fd, 'tamanoSacoKg') as TamanoSaco
  const sacos = num(fd, 'sacos')
  const tipoPrecio = str(fd, 'tipoPrecio') as TipoPrecio
  await store.createContract({
    ref: str(fd, 'ref'),
    lado: str(fd, 'lado') as Lado,
    counterpartyId: str(fd, 'counterpartyId'),
    cantidadLb: sacosToLb(sacos, tamano),
    tamanoSacoKg: tamano,
    calidadOrigen: opt(fd, 'calidadOrigen'),
    moneda: str(fd, 'moneda') as Moneda,
    tipoPrecio,
    mesFuturo: tipoPrecio === 'PTBF' ? opt(fd, 'mesFuturo') : null,
    diferencialUsdLb: tipoPrecio === 'PTBF' ? num(fd, 'diferencialUsdLb') : null,
    precioFijoUsdLb: tipoPrecio === 'FIJO' ? num(fd, 'precioFijoUsdLb') : null,
    fechaTrade: str(fd, 'fechaTrade'),
    fechaEntrega: opt(fd, 'fechaEntrega'),
    notas: opt(fd, 'notas'),
  })
  revalidatePath('/')
}

export async function addFixation(fd: FormData) {
  const contractId = str(fd, 'contractId')
  await store.addFixation({
    contractId,
    fecha: str(fd, 'fecha'),
    cantidadLbFijada: num(fd, 'cantidadLbFijada'),
    precioFuturoFijadoUsdLb: num(fd, 'precioFuturoFijadoUsdLb'),
  })
  revalidatePath(`/contratos/${contractId}`)
}

export async function addHedge(fd: FormData) {
  const contractId = str(fd, 'contractId')
  await store.addHedge({
    contractId,
    riesgoCubierto: str(fd, 'riesgoCubierto') as RiesgoCubierto,
    tipo: str(fd, 'tipo') as TipoHedge,
    direccion: str(fd, 'direccion') as Direccion,
    cantidadLb: num(fd, 'cantidadLb'),
    mesVencimiento: opt(fd, 'mesVencimiento'),
    strike: fd.get('strike') ? num(fd, 'strike') : null,
    callPut: (opt(fd, 'callPut') as 'CALL' | 'PUT' | null),
    precioOTasaEjecucion: num(fd, 'precioOTasaEjecucion'),
    broker: opt(fd, 'broker'),
    fechaTrade: str(fd, 'fechaTrade'),
  })
  revalidatePath(`/contratos/${contractId}`)
}

export async function addCost(fd: FormData) {
  const contractId = str(fd, 'contractId')
  await store.addCost({
    contractId,
    tipo: str(fd, 'tipo') as TipoCosto,
    monto: num(fd, 'monto'),
    moneda: str(fd, 'moneda') as Moneda,
    fecha: str(fd, 'fecha'),
    descripcion: opt(fd, 'descripcion'),
    facturaRef: opt(fd, 'facturaRef'),
  })
  revalidatePath(`/contratos/${contractId}`)
}
