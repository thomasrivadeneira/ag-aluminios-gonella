import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Formatea una fecha en formato dd/MM/yyyy (Argentina)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

/**
 * Formatea una fecha larga: ej. "martes 10 de junio de 2025"
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return '—'
  }
}

/**
 * Formatea un monto en pesos argentinos: $ 1.250,00
 */
export function formatMonto(monto: number | null | undefined): string {
  if (monto === null || monto === undefined) return '$ 0,00'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(monto)
}

/**
 * Convierte fecha yyyy-MM-dd a formato para input[type=date]
 */
export function toInputDate(date: string | null | undefined): string {
  if (!date) return ''
  return date.split('T')[0]
}

/**
 * Retorna la fecha de hoy como string yyyy-MM-dd
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}
