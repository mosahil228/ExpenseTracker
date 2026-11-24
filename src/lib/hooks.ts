import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/db'
import { withTotals } from './calc'

export const useAccounts = () => useLiveQuery(() => db.accounts.orderBy('order').toArray(), []) ?? []
export const useHeads = () => useLiveQuery(() => db.heads.orderBy('order').toArray(), []) ?? []
export const useSnapshots = () => useLiveQuery(() => db.snapshots.orderBy('date').toArray(), [])
export const useEarnings = () => useLiveQuery(() => db.earnings.orderBy('date').toArray(), [])
export const useInvestments = () => useLiveQuery(() => db.investments.orderBy('buyDate').reverse().toArray(), [])
export const useAutopays = () => useLiveQuery(() => db.autopays.toArray(), [])

/** month-end snapshots with all derived totals, oldest → newest */
export function useSnapshotRows() {
  const accounts = useAccounts()
  const heads = useHeads()
  const snaps = useSnapshots()
  const rows = useMemo(() => (snaps ? withTotals(snaps, accounts, heads) : undefined), [snaps, accounts, heads])
  return { rows, accounts, heads }
}
