import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TrendingUp, Trophy, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { db, type Earning } from '@/db'
import { PageHeader, Card, Fab, Sheet, Field, Input, Button, DeleteButton, Money, Delta, Empty, SectionLabel, Chips, listItem } from '@/components/ui'
import { MonthBars } from '@/components/charts'
import { useEarnings } from '@/lib/hooks'
import { earningsByMonth } from '@/lib/calc'
import { inr, monthLabel, dayLabel, monthKey, todayISO, pctChange, num, str } from '@/lib/format'
import { tap } from '@/lib/native'
import { cn } from '@/lib/utils'

const RANGES = ['6M', '12M', 'All'] as const

export default function Earn() {
  const earnings = useEarnings()
  const [editing, setEditing] = useState<Earning | 'new' | null>(null)
  const [range, setRange] = useState<(typeof RANGES)[number]>('12M')
  const months = useMemo(() => earningsByMonth(earnings ?? []), [earnings])
  const current = monthKey(todayISO())
  const [selected, setSelected] = useState<string>(current)

  const shown = range === 'All' ? months : months.slice(range === '6M' ? -6 : -12)
  const best = months.reduce<(typeof months)[number] | null>((b, m) => (!b || m.total > b.total ? m : b), null)
  const avg = months.length ? months.reduce((s, m) => s + m.total, 0) / months.length : 0
  const thisTotal = months.find((m) => m.month === current)?.total ?? 0
  const prevKey = months.filter((m) => m.month < current).at(-1)
  const ranked = [...months].sort((a, b) => b.total - a.total)

  const monthKeys = useMemo(() => {
    const keys = new Set(months.map((m) => m.month))
    keys.add(current)
    return [...keys].sort().reverse()
  }, [months, current])

  const days = useMemo(() => {
    const map = new Map<string, Earning[]>()
    for (const e of earnings ?? []) if (monthKey(e.date) === selected) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [earnings, selected])
  const selectedTotal = months.find((m) => m.month === selected)?.total ?? 0

  return (
    <>
      <PageHeader title="Earnings" subtitle={monthLabel(current, true)} />

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] font-medium text-zinc-500">Earned this month</div>
            <Money value={thisTotal} className="text-[34px] font-extrabold leading-tight tracking-tight" />
          </div>
          {prevKey && <Delta value={pctChange(thisTotal, prevKey.total)} className="mt-1" />}
        </div>
        {prevKey && <div className="text-[12px] text-zinc-500">{monthLabel(prevKey.month, true)}: {inr(prevKey.total)}</div>}
      </Card>

      {months.length > 0 && (
        <>
          <SectionLabel right={<div className="w-[170px]"><Chips options={RANGES} value={range} onChange={setRange} layoutId="range" /></div>}>By month</SectionLabel>
          <Card className="px-2 pb-1">
            <MonthBars data={shown.map((m) => ({ key: m.month, label: monthLabel(m.month).split(' ')[0], total: m.total }))} highlight={best?.month} />
          </Card>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Card delay={0.05}>
              <Trophy className="size-5 text-lime-300" />
              <div className="mt-2 text-[12px] text-zinc-500">Best month</div>
              <div className="text-[17px] font-bold">{best ? monthLabel(best.month, true) : '—'}</div>
              <div className="text-[13px] font-semibold tabular-nums text-lime-300">{best ? inr(best.total) : ''}</div>
            </Card>
            <Card delay={0.1}>
              <Sparkles className="size-5 text-sky-300" />
              <div className="mt-2 text-[12px] text-zinc-500">Monthly average</div>
              <div className="text-[17px] font-bold tabular-nums">{inr(avg)}</div>
              <div className="text-[13px] text-zinc-500">over {months.length} months</div>
            </Card>
          </div>

          <SectionLabel>Ranking</SectionLabel>
          <Card className="space-y-2.5">
            {ranked.slice(0, 5).map((m, i) => (
              <div key={m.month} className="flex items-center gap-3 text-[14px]">
                <span className={cn('grid size-6 place-items-center rounded-full text-[11px] font-bold', i === 0 ? 'bg-lime-300 text-zinc-950' : 'bg-white/[0.06] text-zinc-400')}>{i + 1}</span>
                <span className="w-20 text-zinc-300">{monthLabel(m.month)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div className={cn('h-full rounded-full', i === 0 ? 'bg-lime-300' : 'bg-zinc-500')} initial={{ width: 0 }} animate={{ width: `${(m.total / ranked[0].total) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06 }} />
                </div>
                <span className="w-24 text-right font-semibold tabular-nums">{inr(m.total)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionLabel right={<span className="text-[13px] font-semibold tabular-nums text-lime-300">{inr(selectedTotal)}</span>}>Daily</SectionLabel>
      <Chips options={monthKeys.map((k) => monthLabel(k))} value={monthLabel(selected)} onChange={(l) => setSelected(monthKeys.find((k) => monthLabel(k) === l)!)} layoutId="month" />

      {days.length === 0 ? (
        <Empty icon={<TrendingUp className="size-7" />} title="Nothing earned yet" text="Log each day's earning. Monthly totals and charts update on their own." />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 space-y-2.5">
            {days.map(([date, list], i) => (
              <motion.div key={date} {...listItem(i)}>
                <Card className="py-3">
                  <div className="mb-1.5 flex justify-between text-[12px] font-semibold text-zinc-500">
                    <span>{dayLabel(date)}</span>
                    <span className="tabular-nums">{inr(list.reduce((s, e) => s + e.amount, 0))}</span>
                  </div>
                  {list.map((e) => (
                    <button key={e.id} onClick={() => { tap(); setEditing(e) }} className="flex w-full items-center gap-3 rounded-xl py-1.5 text-left active:bg-white/[0.04]">
                      <span className="grid size-8 place-items-center rounded-xl bg-lime-300/10 text-[13px] font-bold text-lime-300">{e.source.slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{e.source}</span>
                        {e.note && <span className="block truncate text-[12px] text-zinc-500">{e.note}</span>}
                      </span>
                      <span className={cn('font-semibold tabular-nums', e.amount >= 0 ? 'text-lime-300' : 'text-rose-400')}>{e.amount >= 0 ? '+' : ''}{inr(e.amount)}</span>
                    </button>
                  ))}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      <Fab onClick={() => setEditing('new')} label="Add earning" />
      {editing !== null && (
        <EarningSheet key={editing === 'new' ? 'new' : editing.id} earning={editing === 'new' ? null : editing} earnings={earnings ?? []} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function EarningSheet({ earning, earnings, onClose }: { earning: Earning | null; earnings: Earning[]; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  const [amount, setAmount] = useState(str(earning?.amount))
  const [date, setDate] = useState(earning?.date ?? todayISO())
  const [source, setSource] = useState(earning?.source ?? '')
  const [note, setNote] = useState(earning?.note ?? '')
  const sources = useMemo(() => {
    const count = new Map<string, number>()
    earnings.forEach((e) => count.set(e.source, (count.get(e.source) ?? 0) + 1))
    const list = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
    return list.length ? list.slice(0, 8) : ['Salary', 'Freelance', 'Business', 'Trading', 'Rent']
  }, [earnings])
  const close = () => { setOpen(false); setTimeout(onClose, 250) }

  async function save() {
    if (!num(amount)) { toast.error('Enter an amount'); return }
    await db.earnings.put({ ...(earning?.id ? { id: earning.id } : {}), amount: num(amount), date, source: source.trim() || 'Earning', note: note.trim() || undefined })
    tap('success')
    toast.success(earning ? 'Updated' : `+${inr(num(amount))} added`)
    close()
  }

  return (
    <Sheet open={open} onClose={close} title={earning ? 'Edit earning' : 'Add earning'} footer={
      <>
        {earning && <DeleteButton onConfirm={async () => { await db.earnings.delete(earning.id!); toast('Deleted'); close() }} />}
        <Button className="flex-1" onClick={save}>Save</Button>
      </>
    }>
      <div className="mb-4 rounded-3xl bg-white/[0.03] px-4 py-5 text-center">
        <div className="text-[12px] font-medium text-zinc-500">Amount</div>
        <div className="mt-1 flex items-center justify-center text-[40px] font-extrabold tracking-tight">
          <span className="mr-1 text-zinc-600">₹</span>
          <input autoFocus={!earning} inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.-]/g, ''))}
            className="w-full max-w-[240px] bg-transparent text-center tabular-nums outline-none placeholder:text-zinc-700" />
        </div>
      </div>
      <Field label="Source">
        <Input value={source} placeholder="Salary, freelance, shop…" onChange={(e) => setSource(e.target.value)} />
      </Field>
      <div className="no-scrollbar -mt-1 mb-3 flex gap-1.5 overflow-x-auto">
        {sources.map((s) => (
          <button key={s} type="button" onClick={() => { tap(); setSource(s) }} className={cn('h-8 shrink-0 rounded-full px-3 text-[13px] font-medium', source === s ? 'bg-lime-300 text-zinc-950' : 'bg-white/[0.05] text-zinc-400')}>{s}</button>
        ))}
      </div>
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Note"><Input value={note} placeholder="Optional" onChange={(e) => setNote(e.target.value)} /></Field>
      <p className="px-1 text-[12px] text-zinc-600">Tip: for an old month you only know the total of, add one entry dated in that month.</p>
    </Sheet>
  )
}
