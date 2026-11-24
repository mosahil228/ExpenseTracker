import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarPlus, Sparkles, TrendingUp, Gem, Repeat, AlertCircle, ChevronRight, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Card, Money, Delta, SectionLabel, Empty, Button, ease } from '@/components/ui'
import { NetWorthChart } from '@/components/charts'
import { useSnapshotRows, useEarnings, useInvestments, useAutopays } from '@/lib/hooks'
import { earningsByMonth, investmentStats } from '@/lib/calc'
import { fullDate, inr, monthLabel, pctChange, todayISO, monthKey } from '@/lib/format'
import { loadSampleData } from '@/lib/data'
import { tap } from '@/lib/native'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Home() {
  const nav = useNavigate()
  const { rows, accounts } = useSnapshotRows()
  const earnings = useEarnings()
  const invs = useInvestments()
  const autopays = useAutopays()
  const [loading, setLoading] = useState(false)

  const latest = rows?.at(-1)
  const prev = rows?.at(-2)

  const chart = useMemo(() => (rows ?? []).slice(-12).map((r) => ({ label: monthLabel(r.date), total: r.total, my: r.myTotal })), [rows])
  const em = useMemo(() => earningsByMonth(earnings ?? []), [earnings])
  const thisMonth = em.find((m) => m.month === monthKey(todayISO()))?.total ?? 0
  const best = em.reduce<{ month: string; total: number } | null>((b, m) => (!b || m.total > b.total ? m : b), null)
  const inv = investmentStats(invs ?? [])
  const autopayTotal = (autopays ?? []).filter((a) => a.active).reduce((s, a) => s + a.amount, 0)

  if (rows === undefined) return null

  if (!latest) {
    return (
      <>
        <p className="pt-2 text-[13px] font-medium text-zinc-500">{greeting()}</p>
        <h1 className="text-[28px] font-bold tracking-tight">Money Tracker</h1>
        <Empty
          icon={<Wallet className="size-7" />}
          title="Let's map your money"
          text="Add the closing balance of every bank for the month. Everything else is calculated for you."
          action={
            <>
              <Button onClick={() => nav('/months?new=1')}><CalendarPlus className="size-4" /> Add this month</Button>
              <Button variant="soft" loading={loading} onClick={async () => { setLoading(true); await loadSampleData(); setLoading(false); tap('success'); toast.success('Sample data loaded') }}>
                <Sparkles className="size-4" /> Try with sample data
              </Button>
            </>
          }
        />
      </>
    )
  }

  const balances = accounts
    .map((a) => ({ ...a, value: latest.balances[a.id!] || 0 }))
    .concat([{ id: -1, name: 'Cash', color: '#e4e4e7', kind: 'wallet', order: 99, value: latest.cash }])
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <p className="pt-2 text-[13px] font-medium text-zinc-500">{greeting()} · as of {fullDate(latest.date)}</p>

      {/* hero */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }} className="relative mt-3 overflow-hidden rounded-[28px] bg-lime-300 p-5 text-zinc-950">
        <motion.div
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/30 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] opacity-70">My total</span>
            {prev && (
              <span className="rounded-full bg-zinc-950/10 px-2.5 py-1 text-[12px] font-bold tabular-nums">
                {latest.myTotal >= prev.myTotal ? '↑' : '↓'} {Math.abs(pctChange(latest.myTotal, prev.myTotal) ?? 0).toFixed(1)}% vs {monthLabel(prev.date)}
              </span>
            )}
          </div>
          <Money value={latest.myTotal} className="mt-2 block text-[40px] font-extrabold leading-none tracking-tight" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[['Total', latest.total], ['E-money', latest.eMoney], ['Cash', latest.cash]].map(([l, v]) => (
              <div key={l as string} className="min-w-0 rounded-2xl bg-zinc-950/[0.07] px-2.5 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{l}</div>
                <div className="mt-0.5 whitespace-nowrap text-[13px] font-bold tabular-nums tracking-tight">{inr(v as number)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* alerts */}
      {(latest.pending > 0 || latest.debt > 0 || latest.payable > 0) && (
        <Card delay={0.08} className="mt-3 flex items-center gap-3" onClick={() => nav('/months')}>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-400/10 text-rose-400"><AlertCircle className="size-5" /></div>
          <div className="min-w-0 flex-1 text-[13px] text-zinc-400">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {latest.pending > 0 && <span>Pending <b className="text-zinc-100">{inr(latest.pending)}</b></span>}
              {latest.payable > 0 && <span>Payable <b className="text-zinc-100">{inr(latest.payable)}</b></span>}
              {latest.debt > 0 && <span>Debt <b className="text-rose-300">{inr(latest.debt)}</b></span>}
            </div>
          </div>
          <ChevronRight className="size-4 text-zinc-600" />
        </Card>
      )}

      {/* trend */}
      {chart.length > 1 && (
        <>
          <SectionLabel right={<span className="flex gap-3 text-[11px] text-zinc-500"><span className="flex items-center gap-1"><i className="size-2 rounded-full bg-lime-300" />Total</span><span className="flex items-center gap-1"><i className="size-2 rounded-full bg-sky-300" />My total</span></span>}>
            Growth
          </SectionLabel>
          <Card delay={0.12} className="px-2 pb-2">
            <NetWorthChart data={chart} />
          </Card>
        </>
      )}

      {/* quick tiles */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card delay={0.16} onClick={() => nav('/earn')}>
          <TrendingUp className="size-5 text-lime-300" />
          <div className="mt-3 text-[12px] font-medium text-zinc-500">Earned in {monthLabel(todayISO())}</div>
          <Money value={thisMonth} className="text-[19px] font-bold" />
          {best && <div className="mt-1 truncate text-[11px] text-zinc-500">Best: {monthLabel(best.month)} · {inr(best.total)}</div>}
        </Card>
        <Card delay={0.2} onClick={() => nav('/invest')}>
          <Gem className="size-5 text-amber-300" />
          <div className="mt-3 text-[12px] font-medium text-zinc-500">Invested</div>
          <Money value={inv.invested} className="text-[19px] font-bold" />
          <div className="mt-1"><Delta value={inv.invested ? (inv.unrealized / inv.invested) * 100 : null} /></div>
        </Card>
        <Card delay={0.24} onClick={() => nav('/months')}>
          <Wallet className="size-5 text-sky-300" />
          <div className="mt-3 text-[12px] font-medium text-zinc-500">Expenses this month</div>
          <Money value={latest.allExpenses} className="text-[19px] font-bold" />
          {prev && <div className="mt-1 text-[11px] text-zinc-500">{monthLabel(prev.date)}: {inr(prev.allExpenses)}</div>}
        </Card>
        <Card delay={0.28} onClick={() => nav('/more/autopay')}>
          <Repeat className="size-5 text-violet-300" />
          <div className="mt-3 text-[12px] font-medium text-zinc-500">Auto-pay / month</div>
          <Money value={autopayTotal} className="text-[19px] font-bold" />
          <div className="mt-1 truncate text-[11px] text-zinc-500">{(autopays ?? []).filter((a) => a.active).map((a) => a.name).join(', ') || 'None active'}</div>
        </Card>
      </div>

      {/* where money sits */}
      <SectionLabel>Where it sits</SectionLabel>
      <Card delay={0.32}>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
          {balances.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ width: 0 }}
              animate={{ width: `${(b.value / latest.total) * 100}%` }}
              transition={{ duration: 0.9, ease, delay: 0.3 + i * 0.06 }}
              style={{ background: b.color }}
              className="h-full border-r-2 border-zinc-950 last:border-0"
            />
          ))}
        </div>
        <ul className="mt-4 space-y-2.5">
          {balances.map((b, i) => (
            <motion.li key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.04 }} className="flex items-center gap-3 text-[14px]">
              <span className="size-2.5 rounded-full" style={{ background: b.color }} />
              <span className="flex-1 text-zinc-300">{b.name}</span>
              <span className="text-[12px] tabular-nums text-zinc-500">{((b.value / latest.total) * 100).toFixed(0)}%</span>
              <span className="w-28 text-right font-semibold tabular-nums">{inr(b.value)}</span>
            </motion.li>
          ))}
        </ul>
      </Card>
    </>
  )
}
