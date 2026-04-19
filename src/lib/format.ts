import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return '$ ' + amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return format(d, 'dd/MM/yyyy')
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return format(d, "d 'de' MMMM", { locale: es })
}

export function formatDateLongWithYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return format(d, "d 'de' MMMM yyyy", { locale: es })
}

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return format(d, "MMMM yyyy", { locale: es })
}

export function formatQuantity(qty: number): string {
  return parseFloat(qty.toFixed(3)).toLocaleString('es-AR')
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}
