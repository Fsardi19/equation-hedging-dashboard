import type { Semaforo } from '@/lib/domain/types'

const color: Record<Semaforo, string> = {
  VERDE: 'bg-green-500',
  AMARILLO: 'bg-yellow-400',
  ROJO: 'bg-red-500',
}

export function SemaforoDot({ status }: { status: Semaforo }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-full ${color[status]}`} />
      <span className="text-xs text-gray-500">{status}</span>
    </span>
  )
}
