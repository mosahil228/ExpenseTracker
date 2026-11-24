import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { addMonths, parseISO } from 'date-fns'
import { db, type Snapshot } from '@/db'
import { PageHeader, Card, Fab, Sheet, Field, Input, MoneyInput, MoneyRow, Button, DeleteButton, Money, Delta, Empty, SectionLabel, listItem } from '@/components/ui'
import { useSnapshotRows } from '@/lib/hooks'
import { snapshotTotals, type SnapshotRow } from '@/lib/calc'
import { inr, monthLabel, fullDate, pctChange, monthEnd, todayISO, num, str } from '@/lib/format'
import { tap } from '@/lib/native'

export default function Months() {
  const { rows, accounts, heads } = useSnapshotRows()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Snapshot | null | 'new'>(null)

  useEffect(() => {
    if (params.get('new') && rows) { setEditing('new'); setParams({}, { replace: true }) }
  }, [params, rows, setParams])

  const list = useMemo(() => [...(rows ?? [])].reverse(), [rows])
  const max = Math.max(1, ...list.map((r) => r.total))

  return (
    <>
      <PageHeader title="Months" subtitle={`${list.length} month-end ${list.length === 1 ? 'record' : 'records'}`} />

      {rows && list.length === 0 && (
        <Empty icon={<CalendarDays className="size-7" />} title="No months yet" text="On the last day of each month, add the closing balance of every account." action={<Button onClick={() => setEditing('new')}>Add a month</Button>} />
      )}

      <ul className="space-y-2.5">
        <AnimatePresence initial={true}>
          {list.map((r, i) => {
            const prev = list[i + 1] as SnapshotRow | undefined
            return (
              <motion.li key={r.id} layout {...listItem(i)}>
                <Card onClick={() => setEditing(r)} className="relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-lime-300/[0.05]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.total / max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.03 }}
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-center leading-none">
                      <div>
                        <div className="text-[11px] font-semibold uppercase text-zinc-500">{monthLabel(r.date).split(' ')[0]}</div>
                        <div className="mt-0.5 text-[14px] font-bold">{r.date.slice(2, 4)}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[17px] font-bold tabular-nums">{inr(r.myTotal)}</span>
                        {prev && <Delta value={pctChange(r.myTotal, prev.myTotal)} />}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                        Total {inr(r.total)} · Exp {inr(r.allExpenses)}{r.debt > 0 ? ` · Debt ${inr(r.debt)}` : ''}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-600" />
                  </div>
                </Card>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <Fab onClick={() => setEditing('new')} label="Add month" />
      {editing !== null && rows && (
        <SnapshotSheet
          key={editing === 'new' ? 'new' : editing.id}
          snapshot={editing === 'new' ? null : editing}
          last={rows.at(-1)}
          accounts={accounts}
          heads={heads}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

type Strs = Record<number, string>
const toStrs = (r: Record<number, number> | undefined): Strs => Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, str(v)]))
const toNums = (r: Strs) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '').map(([k, v]) => [k, num(v)]))

function SnapshotSheet({ snapshot, last, accounts, heads, onClose }: {
  snapshot: Snapshot | null
  last?: Snapshot
  accounts: ReturnType<typeof useSnapshotRows>['accounts']
  heads: ReturnType<typeof useSnapshotRows>['heads']
  onClose: () => void
}) {
  const [open, setOpen] = useState(true)
  // new month: start from last month's numbers so you only change what moved
  const base = snapshot ?? last
  const defaultDate = snapshot?.date ?? (last ? monthEnd(addMonths(parseISO(last.date), 1)) : monthEnd(todayISO()))
  const [date, setDate] = useState(defaultDate)
  const [balances, setBalances] = useState<Strs>(toStrs(base?.balances))
  const [expenses, setExpenses] = useState<Strs>(toStrs(snapshot?.expenses ?? last?.expenses))
  const [cash, setCash] = useState(str(base?.cash))
  const [interest, setInterest] = useState(str(snapshot?.interest))
  const [zakat, setZakat] = useState(str(snapshot?.zakat))
  const [pending, setPending] = useState(str(base?.pending))
  const [payable, setPayable] = useState(str(base?.payable))
  const [debt, setDebt] = useState(str(base?.debt))
  const [note, setNote] = useState(snapshot?.note ?? '')

  const draft: Snapshot = {
    ...(snapshot?.id ? { id: snapshot.id } : {}),
    date, balances: toNums(balances), expenses: toNums(expenses), cash: num(cash), interest: num(interest), zakat: num(zakat),
    pending: num(pending), payable: num(payable), debt: num(debt), note: note.trim() || undefined,
  }
  const t = snapshotTotals(draft, accounts, heads)
  const close = () => { setOpen(false); setTimeout(onClose, 250) }

  async function save() {
    const clash = await db.snapshots.where('date').equals(date).first()
    if (clash && clash.id !== snapshot?.id) { toast.error(`${fullDate(date)} already exists — edit that one instead`); return }
    await db.snapshots.put(draft)
    tap('success')
    toast.success(snapshot ? 'Month updated' : `${monthLabel(date, true)} saved`)
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={snapshot ? monthLabel(snapshot.date, true) : 'New month'}
      footer={
        <>
          {snapshot && <DeleteButton onConfirm={async () => { await db.snapshots.delete(snapshot.id!); toast('Month deleted'); close() }} />}
          <Button className="flex-1" onClick={save}>Save</Button>
        </>
      }
    >
      {/* live totals */}
      <div className="sticky top-0 z-10 -mx-5 mb-3 bg-zinc-900/95 px-5 pb-3 pt-1 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">My total</div>
            <Money value={t.myTotal} className="text-[20px] font-bold text-lime-300" />
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total amount</div>
            <Money value={t.total} className="text-[20px] font-bold" />
          </div>
          <div className="col-span-2 flex justify-between text-[12px] text-zinc-500">
            <span>E-money {inr(t.eMoney)}</span>
            <span>Deducted {inr(t.deducted + draft.pending + draft.debt)}</span>
          </div>
        </div>
      </div>

      <Field label="Month-end date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {!snapshot && last && <p className="-mt-1 mb-2 px-1 text-[12px] text-zinc-500">Pre-filled from {monthLabel(last.date, true)} — just change what moved.</p>}

      <SectionLabel>Bank balances</SectionLabel>
      <div className="rounded-2xl bg-white/[0.02] px-3">
        {accounts.map((a) => (
          <MoneyRow key={a.id} label={a.name} dot={a.color} value={balances[a.id!] ?? ''} onChange={(v) => setBalances((s) => ({ ...s, [a.id!]: v }))} />
        ))}
        <MoneyRow label="Cash in hand" dot="#e4e4e7" value={cash} onChange={setCash} />
      </div>

      <SectionLabel>Expenses</SectionLabel>
      <div className="rounded-2xl bg-white/[0.02] px-3">
        {heads.map((h) => (
          <MoneyRow key={h.id} label={h.name + (h.deduct ? '' : ' ·  not deducted')} value={expenses[h.id!] ?? ''} onChange={(v) => setExpenses((s) => ({ ...s, [h.id!]: v }))} />
        ))}
      </div>

      <SectionLabel>Payments & dues</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Interest"><MoneyInput value={interest} onChange={setInterest} /></Field>
        <Field label="Zakat"><MoneyInput value={zakat} onChange={setZakat} /></Field>
        <Field label="Pending payment"><MoneyInput value={pending} onChange={setPending} /></Field>
        <Field label="Payable"><MoneyInput value={payable} onChange={setPayable} /></Field>
        <Field label="Debt"><MoneyInput value={debt} onChange={setDebt} /></Field>
      </div>
      <Field label="Note"><Input value={note} placeholder="Optional" onChange={(e) => setNote(e.target.value)} /></Field>
    </Sheet>
  )
}
