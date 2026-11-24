import * as XLSX from 'xlsx'
import { db, ALL_TABLES, DEFAULT_ACCOUNTS, DEFAULT_HEADS, type Snapshot, type Earning, type Investment } from '@/db'
import { withTotals, earningsByMonth, investmentProfit } from './calc'
import { monthLabel, todayISO } from './format'
import { saveFile, textToBase64 } from './native'
import { format, subMonths, addDays, parseISO, startOfMonth } from 'date-fns'

/* ---------------- Excel export (your sheet, rebuilt) ---------------- */

export async function exportExcel() {
  const [accounts, heads, snaps, earnings, invs, autopays] = await Promise.all([
    db.accounts.orderBy('order').toArray(),
    db.heads.orderBy('order').toArray(),
    db.snapshots.orderBy('date').toArray(),
    db.earnings.orderBy('date').toArray(),
    db.investments.orderBy('buyDate').toArray(),
    db.autopays.toArray(),
  ])
  const rows = withTotals(snaps, accounts, heads)
  const monthly = rows.map((r) => {
    const o: Record<string, string | number> = { DATE: r.date }
    accounts.forEach((a) => (o[a.name.toUpperCase()] = r.balances[a.id!] || 0))
    o['TOTAL E-MONEY'] = r.eMoney
    o['TOTAL CASH'] = r.cash
    o['TOTAL AMOUNT'] = r.total
    o['MY TOTAL'] = r.myTotal
    heads.forEach((h) => (o[h.name.toUpperCase()] = r.expenses[h.id!] || 0))
    o['INTEREST'] = r.interest
    o['ZAKAT'] = r.zakat
    o['PENDING PAYMENT'] = r.pending
    o['PAYABLE'] = r.payable
    o['DEBT'] = r.debt
    o['NOTE'] = r.note || ''
    return o
  })
  const wb = XLSX.utils.book_new()
  const add = (name: string, data: object[]) => {
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ '': 'No data yet' }])
    const keys = Object.keys(data[0] || { '': '' })
    ws['!cols'] = keys.map((k) => ({ wch: Math.max(12, k.length + 2) }))
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  add('Monthly', monthly)
  add('Daily Earnings', earnings.map((e) => ({ DATE: e.date, AMOUNT: e.amount, SOURCE: e.source, NOTE: e.note || '' })))
  add('Monthly Earnings', earningsByMonth(earnings).map((m) => ({ MONTH: monthLabel(m.month, true), TOTAL: m.total })))
  add(
    'Investments',
    invs.map((i) => {
      const p = investmentProfit(i)
      return {
        TYPE: i.type, NAME: i.name, QTY: i.qty ?? '', UNIT: i.unit ?? '', 'BUY DATE': i.buyDate, INVESTED: i.buyAmount,
        STATUS: i.sold ? 'Sold' : 'Holding', 'SELL DATE': i.sellDate ?? '', 'SELL / CURRENT': p.hasValue ? p.value : '',
        PROFIT: p.hasValue ? p.profit : '', NOTE: i.note || '',
      }
    }),
  )
  add('Auto Pay', autopays.map((a) => ({ NAME: a.name, AMOUNT: a.amount, DAY: a.day ?? '', ACTIVE: a.active ? 'Yes' : 'No' })))
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string
  await saveFile(`money-tracker-${todayISO()}.xlsx`, b64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/* ---------------- Full backup / restore ---------------- */

export async function exportBackup() {
  const data: Record<string, unknown[]> = {}
  for (const t of ALL_TABLES) data[t] = await db.table(t).toArray()
  const json = JSON.stringify({ app: 'money-tracker', version: 1, exportedAt: new Date().toISOString(), data })
  await saveFile(`money-tracker-backup-${todayISO()}.json`, textToBase64(json), 'application/json')
}

export async function restoreBackup(file: File) {
  const parsed = JSON.parse(await file.text())
  if (parsed?.app !== 'money-tracker' || !parsed.data) throw new Error('This is not a Money Tracker backup file')
  await db.transaction('rw', db.tables, async () => {
    for (const t of ALL_TABLES) {
      await db.table(t).clear()
      if (Array.isArray(parsed.data[t])) await db.table(t).bulkPut(parsed.data[t])
    }
  })
}

/* ---------------- Sample data (from your dummy sheet) ---------------- */

// [date, HDFC cur, HDFC sav, Yes, IND, SBI, FD, cash, mom, other, my, remaining, interest, pending, payable, debt]
const SHEET: (string | number)[][] = [
  ['2025-07-31', 708137, 574464, 519497, 428608, 346315, 0, 558600, 350000, 10000, 20000, 8000, 4212, 4212, 0, 0],
  ['2025-08-31', 222450, 51115, 511042, 428308, 346315, 1225000, 616900, 390000, 2000, 20000, 20000, 4212, 4212, 0, 0],
  ['2025-09-30', 115075, 56843, 32930, 247707, 218420, 1225000, 65000, 407000, 2000, 20000, 10000, 11489, 11000, 0, 0],
  ['2025-10-31', 86652, 174199, 177884, 321934, 218420, 1225000, 60000, 420000, 2000, 30000, 30000, 1700, 1700, 0, 0],
  ['2025-11-30', 34108, 207279, 302865, 414293, 198420, 1225000, 27000, 470000, 2000, 15000, 8000, 1700, 1700, 0, 0],
  ['2025-12-31', 63927, 37198, 265527, 213650, 65929, 725000, 19000, 519500, 2000, 15000, 15000, 19908, 6133, 0, 0],
  ['2026-01-31', 124000, 93805, 348400, 349400, 139000, 725000, 1819000, 569500, 2000, 20000, 20000, 6133, 6133, 0, 0],
  ['2026-02-28', 358000, 106477, 354463, 323044, 147094, 725000, 1540000, 542000, 6000, 20000, 20000, 13171, 13171, 0, 0],
  ['2026-03-31', 95082, 88949, 154000, 328844, 160000, 725000, 836000, 592000, 35000, 20000, 20000, 13942, 13942, 0, 0],
  ['2026-04-30', 363124, 117590, 155935, 332461, 162764, 725000, 778000, 630000, 37000, 20000, 24000, 8548, 17490, 0, 0],
  ['2026-05-31', 535832, 12703, 165616, 331661, 192891, 825000, 891500, 672000, 62000, 20000, 20000, 3579, 13069, 0, 0],
  ['2026-06-30', 282877, 89231, 248505, 332661, 199851, 825000, 143100, 700000, 2000, 20000, 20000, 5353, 18422, 0, 0],
  ['2026-07-31', 221512, 140025, 270856, 342977, 199851, 825000, 113000, 750000, 52000, 14000, 20000, 7157, 25579, 0, 0],
  ['2026-08-31', 992264, 200200, 335465, 362823, 207351, 100000, 43000, 767500, 2000, 18000, 18000, 4243, 27822, 0, 0],
  ['2026-09-30', 133243, 121862, 486455, 295522, 211738, 1100000, 49500, 807500, 76670, 20000, 20000, 1832, 24654, 0, 0],
  ['2026-10-31', 158722, 40560, 168649, 49388, 34568, 1100000, 50400, 846965, 2000, 20000, 20000, 9558, 34212, 124670, 100000],
]

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export async function loadSampleData() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    const accIds = (await db.accounts.bulkAdd(DEFAULT_ACCOUNTS.map((a) => ({ ...a })), { allKeys: true })) as number[]
    const headIds = (await db.heads.bulkAdd(DEFAULT_HEADS.map((h) => ({ ...h })), { allKeys: true })) as number[]

    const snaps: Snapshot[] = SHEET.map((r) => {
      const n = r.slice(1) as number[]
      return {
        date: r[0] as string,
        balances: Object.fromEntries(accIds.map((id, i) => [id, n[i]])),
        cash: n[6],
        expenses: Object.fromEntries(headIds.map((id, i) => [id, n[7 + i]])),
        interest: n[11], zakat: 0, pending: n[12], payable: n[13], debt: n[14],
      }
    })
    await db.snapshots.bulkAdd(snaps)

    // Sample daily earnings for the last 8 months
    const rand = rng(42)
    const earnings: Earning[] = []
    const start = startOfMonth(subMonths(new Date(), 7))
    const today = todayISO()
    for (let d = start; format(d, 'yyyy-MM-dd') <= today; d = addDays(d, 1)) {
      const date = format(d, 'yyyy-MM-dd')
      if (d.getDate() === 1) earnings.push({ date, amount: 85000, source: 'Salary' })
      if (rand() < 0.45) earnings.push({ date, amount: Math.round((1500 + rand() * 9000) / 50) * 50, source: 'Freelance' })
      if (rand() < 0.2) earnings.push({ date, amount: Math.round((rand() * 6000 - 1200) / 10) * 10 + 1500, source: 'Trading' })
      if (d.getDate() === 5) earnings.push({ date, amount: 18000, source: 'Rent' })
    }
    await db.earnings.bulkAdd(earnings)

    const invs: Investment[] = [
      { type: 'FD', name: 'HDFC Fixed Deposit', buyDate: '2026-09-01', buyAmount: 1100000, currentValue: 1119800, sold: false },
      { type: 'Stocks', name: 'Equity portfolio', buyDate: '2025-08-10', buyAmount: 3664223, currentValue: 3912400, sold: false },
      { type: 'Gold', name: 'Gold coins', qty: 80, unit: 'g', buyDate: '2025-09-12', buyAmount: 1134000, currentValue: 1268000, sold: false },
      { type: 'Silver', name: 'Silver bar', qty: 1, unit: 'kg', buyDate: '2025-11-10', buyAmount: 95000, sold: true, sellDate: '2026-06-15', sellAmount: 118500 },
      { type: 'Gold', name: 'Gold 24K', qty: 10, unit: 'g', buyDate: '2025-12-02', buyAmount: 128000, sold: true, sellDate: '2026-08-20', sellAmount: 141200 },
    ]
    await db.investments.bulkAdd(invs)
    await db.autopays.bulkAdd([
      { name: 'Telegram', amount: 319, day: 5, active: true },
      { name: 'ChatGPT', amount: 399, day: 12, active: false },
    ])
  })
}

export const isoMonthsBack = (n: number) => format(subMonths(parseISO(todayISO()), n), 'yyyy-MM')
