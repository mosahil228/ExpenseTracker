import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Gem } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { db, type Investment } from '@/db'
import { PageHeader, Card, Fab, Sheet, Field, Input, MoneyInput, Button, DeleteButton, Money, Empty, SectionLabel, Chips, Switch, listItem } from '@/components/ui'
import { Donut, TYPE_COLORS } from '@/components/charts'
import { useInvestments } from '@/lib/hooks'
import { investmentStats, investmentProfit } from '@/lib/calc'
import { inr, fullDate, todayISO, num, str } from '@/lib/format'
import { tap } from '@/lib/native'
import { cn } from '@/lib/utils'

const TYPES = ['Gold', 'Silver', 'Stocks', 'Mutual fund', 'FD', 'Crypto', 'Property', 'Other'] as const
const FILTERS = ['All', 'Holding', 'Sold', ...TYPES] as const

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${inr(Math.abs(n))}`

export default function Invest() {
  const invs = useInvestments()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [editing, setEditing] = useState<Investment | 'new' | null>(null)
  const s = investmentStats(invs ?? [])

  const alloc = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of invs ?? []) if (!i.sold) m.set(i.type, (m.get(i.type) ?? 0) + (i.currentValue ?? i.buyAmount))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] ?? '#71717a' }))
  }, [invs])

  const list = (invs ?? []).filter((i) => filter === 'All' || (filter === 'Holding' ? !i.sold : filter === 'Sold' ? i.sold : i.type === filter))

  return (
    <>
      <PageHeader title="Investments" subtitle={`${s.holdingCount} holding · ${s.soldCount} sold`} />

      <Card>
        <div className="text-[12px] font-medium text-zinc-500">Current value</div>
        <Money value={s.current} className="text-[34px] font-extrabold leading-tight tracking-tight" />
        <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          <Stat label="Invested" value={inr(s.invested)} />
          <Stat label="Unrealised" value={signed(s.unrealized)} tone={s.unrealized} />
          <Stat label="Booked profit" value={signed(s.realized)} tone={s.realized} />
        </div>
      </Card>

      {alloc.length > 0 && (
        <>
          <SectionLabel>Allocation</SectionLabel>
          <Card className="flex items-center gap-2">
            <div className="relative">
              <Donut data={alloc} size={150} />
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><div className="text-[11px] text-zinc-500">{alloc.length} types</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {alloc.map((a) => (
                <li key={a.name} className="flex items-center gap-2 text-[13px]">
                  <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="flex-1 text-zinc-300">{a.name}</span>
                  <span className="font-semibold tabular-nums">{((a.value / s.current) * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <SectionLabel>Holdings</SectionLabel>
      <Chips options={FILTERS} value={filter} onChange={setFilter} layoutId="inv-filter" />

      {invs && list.length === 0 ? (
        <Empty icon={<Gem className="size-7" />} title="Nothing here yet" text="Add gold, silver, stocks or anything you buy. When you sell, mark it sold and see your profit." />
      ) : (
        <ul className="mt-3 space-y-2.5">
          <AnimatePresence>
            {list.map((i, idx) => {
              const p = investmentProfit(i)
              return (
                <motion.li key={i.id} layout {...listItem(idx)}>
                  <Card onClick={() => setEditing(i)} className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-[15px] font-bold" style={{ background: `${TYPE_COLORS[i.type] ?? '#71717a'}22`, color: TYPE_COLORS[i.type] ?? '#a1a1aa' }}>
                      {i.type.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold">{i.name}</span>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', i.sold ? 'bg-white/[0.07] text-zinc-400' : 'bg-sky-300/10 text-sky-300')}>{i.sold ? 'Sold' : 'Holding'}</span>
                      </div>
                      <div className="truncate text-[12px] text-zinc-500">
                        {i.qty ? `${i.qty}${i.unit ? ' ' + i.unit : ''} · ` : ''}{fullDate(i.buyDate)}{i.sold && i.sellDate ? ` → ${fullDate(i.sellDate)}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold tabular-nums">{inr(p.value)}</div>
                      {p.hasValue && <div className={cn('text-[12px] font-semibold tabular-nums', p.profit >= 0 ? 'text-lime-300' : 'text-rose-400')}>{signed(p.profit)} · {p.pct.toFixed(1)}%</div>}
                    </div>
                  </Card>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Fab onClick={() => setEditing('new')} label="Add investment" />
      {editing !== null && <InvestSheet key={editing === 'new' ? 'new' : editing.id} inv={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-2.5 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={cn('truncate text-[13px] font-bold tabular-nums', tone == null ? '' : tone >= 0 ? 'text-lime-300' : 'text-rose-400')}>{value}</div>
    </div>
  )
}

function InvestSheet({ inv, onClose }: { inv: Investment | null; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  const [type, setType] = useState<string>(inv?.type ?? 'Gold')
  const [name, setName] = useState(inv?.name ?? '')
  const [qty, setQty] = useState(str(inv?.qty))
  const [unit, setUnit] = useState(inv?.unit ?? 'g')
  const [buyDate, setBuyDate] = useState(inv?.buyDate ?? todayISO())
  const [buyAmount, setBuyAmount] = useState(str(inv?.buyAmount))
  const [currentValue, setCurrentValue] = useState(str(inv?.currentValue))
  const [sold, setSold] = useState(inv?.sold ?? false)
  const [sellDate, setSellDate] = useState(inv?.sellDate ?? todayISO())
  const [sellAmount, setSellAmount] = useState(str(inv?.sellAmount))
  const [note, setNote] = useState(inv?.note ?? '')
  const close = () => { setOpen(false); setTimeout(onClose, 250) }

  const value = sold ? num(sellAmount) : currentValue ? num(currentValue) : null
  const profit = value != null && num(buyAmount) ? value - num(buyAmount) : null

  async function save() {
    if (!num(buyAmount)) { toast.error('Enter how much you invested'); return }
    if (sold && !num(sellAmount)) { toast.error('Enter the sell amount'); return }
    const item: Investment = {
      ...(inv?.id ? { id: inv.id } : {}),
      type, name: name.trim() || type, qty: qty ? num(qty) : undefined, unit: qty ? unit.trim() || undefined : undefined,
      buyDate, buyAmount: num(buyAmount), currentValue: !sold && currentValue ? num(currentValue) : undefined,
      sold, sellDate: sold ? sellDate : undefined, sellAmount: sold ? num(sellAmount) : undefined, note: note.trim() || undefined,
    }
    await db.investments.put(item)
    tap('success')
    if (sold && !inv?.sold && profit != null && profit > 0) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.75 }, colors: ['#bef264', '#facc15', '#ffffff'] })
      toast.success(`Booked ${inr(profit)} profit 🎉`)
    } else toast.success(inv ? 'Updated' : 'Investment added')
    close()
  }

  return (
    <Sheet open={open} onClose={close} title={inv ? 'Edit investment' : 'New investment'} footer={
      <>
        {inv && <DeleteButton onConfirm={async () => { await db.investments.delete(inv.id!); toast('Deleted'); close() }} />}
        <Button className="flex-1" onClick={save}>Save</Button>
      </>
    }>
      <p className="mb-1.5 px-1 text-[13px] font-medium text-zinc-400">Type</p>
      <div className="mb-3"><Chips options={TYPES} value={type as (typeof TYPES)[number]} onChange={setType} layoutId="inv-type" /></div>
      <Field label="Name"><Input value={name} placeholder={`e.g. ${type} coins, Tata Motors…`} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <Field label="Quantity (optional)"><Input inputMode="decimal" value={qty} placeholder="10" onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
        <Field label="Unit"><Input value={unit} placeholder="g" onChange={(e) => setUnit(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Invested"><MoneyInput value={buyAmount} onChange={setBuyAmount} /></Field>
        <Field label="Buy date"><Input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} /></Field>
      </div>

      <div className="my-2 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold">Sold</div>
          <div className="text-[12px] text-zinc-500">Mark it sold to book the profit</div>
        </div>
        <Switch checked={sold} onChange={setSold} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {sold ? (
          <motion.div key="sold" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden pt-2">
            <Field label="Sold for"><MoneyInput value={sellAmount} onChange={setSellAmount} /></Field>
            <Field label="Sell date"><Input type="date" value={sellDate} onChange={(e) => setSellDate(e.target.value)} /></Field>
          </motion.div>
        ) : (
          <motion.div key="hold" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2">
            <Field label="Current value (optional)"><MoneyInput value={currentValue} onChange={setCurrentValue} /></Field>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profit != null && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className={cn('mb-3 flex items-center justify-between rounded-2xl px-4 py-3', profit >= 0 ? 'bg-lime-300/10 text-lime-300' : 'bg-rose-400/10 text-rose-400')}>
            <span className="text-[13px] font-semibold">{sold ? 'Profit' : 'Unrealised'}</span>
            <span className="text-[17px] font-bold tabular-nums">{signed(profit)} · {((profit / num(buyAmount)) * 100).toFixed(1)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
      <Field label="Note"><Input value={note} placeholder="Optional" onChange={(e) => setNote(e.target.value)} /></Field>
    </Sheet>
  )
}
