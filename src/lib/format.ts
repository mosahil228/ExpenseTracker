import { format, lastDayOfMonth, parseISO } from 'date-fns'

const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const inr = (n: number) => inrFmt.format(Math.round(n || 0))

export const INR_FORMAT = { style: 'currency', currency: 'INR', maximumFractionDigits: 0 } as const

/** ₹12.4L / ₹1.2Cr style short form for chart axes */
export function compact(n: number) {
  const a = Math.abs(n)
  const s = n < 0 ? '-' : ''
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a >= 1e8 ? 0 : 2)}Cr`
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a >= 1e6 ? 1 : 2)}L`
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}k`
  return `${s}₹${Math.round(a)}`
}

export const monthKey = (date: string) => date.slice(0, 7)

export const monthLabel = (key: string, long = false) =>
  format(parseISO(key.length === 7 ? `${key}-01` : key), long ? 'MMMM yyyy' : 'MMM yy')

export const dayLabel = (date: string) => format(parseISO(date), 'EEE, d MMM')

export const fullDate = (date: string) => format(parseISO(date), 'd MMM yyyy')

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export const monthEnd = (date: string | Date) =>
  format(lastDayOfMonth(typeof date === 'string' ? parseISO(date) : date), 'yyyy-MM-dd')

export function pctChange(curr: number, prev: number) {
  if (!prev) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

/** parse a user-typed number: "1,23,456.50" -> 123456.5 */
export function num(s: string | number | undefined | null) {
  if (typeof s === 'number') return s
  if (!s) return 0
  const n = parseFloat(String(s).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const str = (n: number | undefined) => (n ? String(n) : '')
