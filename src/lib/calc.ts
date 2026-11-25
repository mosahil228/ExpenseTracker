import type { Account, ExpenseHead, Investment, Snapshot, Earning, KhataEntry } from '@/db'
import { monthKey } from './format'

export function snapshotTotals(s: Snapshot, accounts: Account[], heads: ExpenseHead[]) {
  const eMoney = accounts.reduce((sum, a) => sum + (s.balances[a.id!] || 0), 0)
  const total = eMoney + (s.cash || 0)
  const deducted = heads.filter((h) => h.deduct).reduce((sum, h) => sum + (s.expenses[h.id!] || 0), 0)
  const allExpenses = heads.reduce((sum, h) => sum + (s.expenses[h.id!] || 0), 0)
  const myTotal = total - deducted - (s.pending || 0) - (s.debt || 0)
  return { eMoney, total, deducted, allExpenses, myTotal }
}

export type SnapshotRow = Snapshot & ReturnType<typeof snapshotTotals>

export function withTotals(snaps: Snapshot[], accounts: Account[], heads: ExpenseHead[]): SnapshotRow[] {
  return snaps.map((s) => ({ ...s, ...snapshotTotals(s, accounts, heads) }))
}

export function earningsByMonth(earnings: Earning[]) {
  const map = new Map<string, number>()
  for (const e of earnings) map.set(monthKey(e.date), (map.get(monthKey(e.date)) || 0) + e.amount)
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }))
}

export function earningsByYear(earnings: Earning[]) {
  const map = new Map<string, { total: number; months: Set<string> }>()
  for (const e of earnings) {
    const y = e.date.slice(0, 4)
    const cur = map.get(y) ?? { total: 0, months: new Set<string>() }
    cur.total += e.amount
    cur.months.add(e.date.slice(0, 7))
    map.set(y, cur)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, v]) => ({ year, total: v.total, months: v.months.size }))
}

export function khataBalance(entries: KhataEntry[]) {
  let sent = 0
  let received = 0
  for (const e of entries) e.type === 'send' ? (sent += e.amount) : (received += e.amount)
  return { sent, received, balance: sent - received } // > 0 → you will get
}

export function investmentStats(list: Investment[]) {
  const holding = list.filter((i) => !i.sold)
  const sold = list.filter((i) => i.sold)
  const invested = holding.reduce((s, i) => s + i.buyAmount, 0)
  const current = holding.reduce((s, i) => s + (i.currentValue ?? i.buyAmount), 0)
  const unrealized = current - invested
  const realized = sold.reduce((s, i) => s + ((i.sellAmount || 0) - i.buyAmount), 0)
  return { invested, current, unrealized, realized, holdingCount: holding.length, soldCount: sold.length }
}

export function investmentProfit(i: Investment) {
  const value = i.sold ? i.sellAmount || 0 : i.currentValue ?? i.buyAmount
  const profit = value - i.buyAmount
  const pct = i.buyAmount ? (profit / i.buyAmount) * 100 : 0
  return { value, profit, pct, hasValue: i.sold || i.currentValue != null }
}
