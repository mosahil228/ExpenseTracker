import Dexie, { type EntityTable } from 'dexie'

export type AccountKind = 'bank' | 'fd' | 'wallet'

export interface Account {
  id?: number
  name: string
  color: string
  kind: AccountKind
  order: number
}

/** An expense column like MOM-EXP / MY EXP. `deduct` = subtract from "My Total". */
export interface ExpenseHead {
  id?: number
  name: string
  deduct: boolean
  order: number
}

/** One row of the month-end sheet. */
export interface Snapshot {
  id?: number
  date: string // YYYY-MM-DD (month end)
  balances: Record<number, number> // accountId -> balance
  cash: number
  expenses: Record<number, number> // headId -> amount
  interest: number
  zakat: number
  pending: number
  payable: number
  debt: number
  note?: string
}

export interface Earning {
  id?: number
  date: string // YYYY-MM-DD
  amount: number
  source: string
  note?: string
}

export interface Investment {
  id?: number
  type: string
  name: string
  qty?: number
  unit?: string
  buyDate: string
  buyAmount: number
  currentValue?: number
  sold: boolean
  sellDate?: string
  sellAmount?: number
  note?: string
}

export interface AutoPay {
  id?: number
  name: string
  amount: number
  day?: number
  active: boolean
}

/** Khata: a person you send money to / receive money from */
export interface Contact {
  id?: number
  name: string
  phone?: string
  createdAt: string
}

export interface KhataEntry {
  id?: number
  contactId: number
  type: 'send' | 'receive'
  amount: number
  date: string // YYYY-MM-DD
  note?: string
  createdAt: number
}

export const db = new Dexie('money-tracker') as Dexie & {
  contacts: EntityTable<Contact, 'id'>
  khata: EntityTable<KhataEntry, 'id'>
  accounts: EntityTable<Account, 'id'>
  heads: EntityTable<ExpenseHead, 'id'>
  snapshots: EntityTable<Snapshot, 'id'>
  earnings: EntityTable<Earning, 'id'>
  investments: EntityTable<Investment, 'id'>
  autopays: EntityTable<AutoPay, 'id'>
}

db.version(1).stores({
  accounts: '++id, order',
  heads: '++id, order',
  snapshots: '++id, date',
  earnings: '++id, date',
  investments: '++id, type, buyDate',
  autopays: '++id',
})

// v2 only ADDS tables — everything saved in v1 stays untouched
db.version(2).stores({
  contacts: '++id, name',
  khata: '++id, contactId, date',
})

export const DEFAULT_ACCOUNTS: Account[] = [
  { name: 'HDFC Current', color: '#f87171', kind: 'bank', order: 0 },
  { name: 'HDFC Saving', color: '#fb7185', kind: 'bank', order: 1 },
  { name: 'Yes Bank', color: '#60a5fa', kind: 'bank', order: 2 },
  { name: 'IND Bank', color: '#fbbf24', kind: 'bank', order: 3 },
  { name: 'SBI Bank', color: '#818cf8', kind: 'bank', order: 4 },
  { name: 'FD (HDFC)', color: '#34d399', kind: 'fd', order: 5 },
]

export const DEFAULT_HEADS: ExpenseHead[] = [
  { name: 'Mom exp', deduct: true, order: 0 },
  { name: 'Other exp', deduct: true, order: 1 },
  { name: 'My exp', deduct: true, order: 2 },
  { name: 'Remaining exp', deduct: false, order: 3 },
]

db.on('populate', (tx) => {
  tx.table('accounts').bulkAdd(DEFAULT_ACCOUNTS)
  tx.table('heads').bulkAdd(DEFAULT_HEADS)
})

export const ALL_TABLES = ['accounts', 'heads', 'snapshots', 'earnings', 'investments', 'autopays', 'contacts', 'khata'] as const

export async function eraseAll(keepDefaults = true) {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    if (keepDefaults) {
      await db.accounts.bulkAdd(DEFAULT_ACCOUNTS.map((a) => ({ ...a })))
      await db.heads.bulkAdd(DEFAULT_HEADS.map((h) => ({ ...h })))
    }
  })
}
