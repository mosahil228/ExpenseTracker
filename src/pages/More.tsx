import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ChevronRight, Repeat, Landmark, Receipt, Database, FileSpreadsheet, DownloadCloud, UploadCloud, Sparkles, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { db, eraseAll, type Account, type AutoPay, type ExpenseHead, type AccountKind } from '@/db'
import { PageHeader, Card, Fab, Sheet, Field, Input, MoneyInput, Button, DeleteButton, Switch, Chips, SectionLabel, Empty, listItem, Money } from '@/components/ui'
import { useAccounts, useAutopays, useHeads } from '@/lib/hooks'
import { exportExcel, exportBackup, restoreBackup, loadSampleData } from '@/lib/data'
import { inr, num, str } from '@/lib/format'
import { tap } from '@/lib/native'
import { cn } from '@/lib/utils'

export default function More() {
  const nav = useNavigate()
  const autopays = useAutopays()
  const accounts = useAccounts()
  const heads = useHeads()
  const items: { to: string; icon: ReactNode; title: string; sub: string; color: string }[] = [
    { to: '/more/autopay', icon: <Repeat className="size-5" />, title: 'Auto-pay', sub: `${(autopays ?? []).filter((a) => a.active).length} active subscriptions`, color: 'text-violet-300 bg-violet-300/10' },
    { to: '/more/accounts', icon: <Landmark className="size-5" />, title: 'Bank accounts', sub: `${accounts.length} accounts`, color: 'text-sky-300 bg-sky-300/10' },
    { to: '/more/heads', icon: <Receipt className="size-5" />, title: 'Expense types', sub: heads.map((h) => h.name).join(', ') || 'None', color: 'text-amber-300 bg-amber-300/10' },
    { to: '/more/data', icon: <Database className="size-5" />, title: 'Excel & backup', sub: 'Export to Excel, backup, restore', color: 'text-lime-300 bg-lime-300/10' },
  ]
  return (
    <>
      <PageHeader title="More" subtitle="Settings & tools" />
      <div className="space-y-2.5">
        {items.map((it, i) => (
          <Card key={it.to} delay={i * 0.05} onClick={() => nav(it.to)} className="flex items-center gap-3">
            <div className={cn('grid size-11 place-items-center rounded-2xl', it.color)}>{it.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{it.title}</div>
              <div className="truncate text-[12px] text-zinc-500">{it.sub}</div>
            </div>
            <ChevronRight className="size-4 text-zinc-600" />
          </Card>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-zinc-600">
        <ShieldCheck className="size-4" /> Your data stays on this phone only
      </div>
      <p className="mt-2 text-center text-[12px] text-zinc-600">Powered by <span className="font-bold text-lime-300">Sahil</span></p>
    </>
  )
}

function SubHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  const nav = useNavigate()
  return (
    <>
      <button onClick={() => { tap(); nav('/more') }} className="-ml-1 mb-1 flex h-9 items-center gap-1 rounded-full pr-3 text-[14px] text-zinc-400 active:text-zinc-100">
        <ArrowLeft className="size-4" /> More
      </button>
      <PageHeader title={title} subtitle={subtitle} />
    </>
  )
}

/* ---------------- Auto-pay ---------------- */

export function AutopayPage() {
  const list = useAutopays()
  const [editing, setEditing] = useState<AutoPay | 'new' | null>(null)
  const active = (list ?? []).filter((a) => a.active)
  const monthly = active.reduce((s, a) => s + a.amount, 0)
  return (
    <>
      <SubHeader title="Auto-pay" />
      <Card>
        <div className="text-[12px] text-zinc-500">Going out every month</div>
        <Money value={monthly} className="text-[32px] font-extrabold tracking-tight" />
        <div className="text-[12px] text-zinc-500">{inr(monthly * 12)} a year · {active.length} active</div>
      </Card>
      <SectionLabel>Subscriptions</SectionLabel>
      {list && list.length === 0 && <Empty icon={<Repeat className="size-7" />} title="No auto-pays" text="Track subscriptions like Telegram or ChatGPT so nothing renews by surprise." />}
      <ul className="space-y-2.5">
        <AnimatePresence>
          {(list ?? []).map((a, i) => (
            <motion.li key={a.id} layout {...listItem(i)}>
              <Card className="flex items-center gap-3">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { tap(); setEditing(a) }}>
                  <div className={cn('grid size-11 place-items-center rounded-2xl text-[16px] font-bold', a.active ? 'bg-violet-300/10 text-violet-300' : 'bg-white/[0.05] text-zinc-600')}>{a.name.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className={cn('truncate text-[15px] font-semibold', !a.active && 'text-zinc-500 line-through')}>{a.name}</div>
                    <div className="text-[12px] text-zinc-500">{inr(a.amount)} / month{a.day ? ` · on day ${a.day}` : ''}</div>
                  </div>
                </button>
                <Switch checked={a.active} onChange={(v) => db.autopays.update(a.id!, { active: v })} />
              </Card>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Fab onClick={() => setEditing('new')} label="Add auto-pay" />
      {editing !== null && <AutopaySheet key={editing === 'new' ? 'n' : editing.id} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function AutopaySheet({ item, onClose }: { item: AutoPay | null; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(str(item?.amount))
  const [day, setDay] = useState(str(item?.day))
  const close = () => { setOpen(false); setTimeout(onClose, 250) }
  async function save() {
    if (!name.trim() || !num(amount)) { toast.error('Add a name and amount'); return }
    const d = Math.min(31, Math.max(0, Math.round(num(day))))
    await db.autopays.put({ ...(item?.id ? { id: item.id } : {}), name: name.trim(), amount: num(amount), day: d || undefined, active: item?.active ?? true })
    tap('success'); toast.success('Saved'); close()
  }
  return (
    <Sheet open={open} onClose={close} title={item ? 'Edit auto-pay' : 'New auto-pay'} footer={<>
      {item && <DeleteButton onConfirm={async () => { await db.autopays.delete(item.id!); close() }} />}
      <Button className="flex-1" onClick={save}>Save</Button>
    </>}>
      <Field label="Name"><Input value={name} autoFocus={!item} placeholder="Telegram, Netflix…" onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount / month"><MoneyInput value={amount} onChange={setAmount} /></Field>
        <Field label="Day of month"><Input inputMode="numeric" value={day} placeholder="5" onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
    </Sheet>
  )
}

/* ---------------- Accounts ---------------- */

const COLORS = ['#f87171', '#fb7185', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#e4e4e7']
const KINDS: Record<string, AccountKind> = { Bank: 'bank', 'Fixed deposit': 'fd', Wallet: 'wallet' }

export function AccountsPage() {
  const list = useAccounts()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  return (
    <>
      <SubHeader title="Bank accounts" subtitle="Columns in your month-end sheet" />
      <ul className="space-y-2.5">
        <AnimatePresence>
          {list.map((a, i) => (
            <motion.li key={a.id} layout {...listItem(i)}>
              <Card onClick={() => setEditing(a)} className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `${a.color}22` }}><span className="size-3 rounded-full" style={{ background: a.color }} /></span>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">{a.name}</div>
                  <div className="text-[12px] text-zinc-500">{Object.keys(KINDS).find((k) => KINDS[k] === a.kind)}</div>
                </div>
                <ChevronRight className="size-4 text-zinc-600" />
              </Card>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Fab onClick={() => setEditing('new')} label="Add account" />
      {editing !== null && <AccountSheet key={editing === 'new' ? 'n' : editing.id} item={editing === 'new' ? null : editing} count={list.length} onClose={() => setEditing(null)} />}
    </>
  )
}

function AccountSheet({ item, count, onClose }: { item: Account | null; count: number; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  const [name, setName] = useState(item?.name ?? '')
  const [color, setColor] = useState(item?.color ?? COLORS[count % COLORS.length])
  const [kind, setKind] = useState<AccountKind>(item?.kind ?? 'bank')
  const close = () => { setOpen(false); setTimeout(onClose, 250) }
  async function save() {
    if (!name.trim()) { toast.error('Give it a name'); return }
    await db.accounts.put({ ...(item?.id ? { id: item.id } : {}), name: name.trim(), color, kind, order: item?.order ?? count })
    tap('success'); toast.success('Saved'); close()
  }
  return (
    <Sheet open={open} onClose={close} title={item ? 'Edit account' : 'New account'} footer={<>
      {item && <DeleteButton label="Remove" onConfirm={async () => { await db.accounts.delete(item.id!); toast('Account removed from totals'); close() }} />}
      <Button className="flex-1" onClick={save}>Save</Button>
    </>}>
      <Field label="Name"><Input value={name} autoFocus={!item} placeholder="Axis Bank" onChange={(e) => setName(e.target.value)} /></Field>
      <p className="mb-1.5 px-1 text-[13px] font-medium text-zinc-400">Type</p>
      <div className="mb-4"><Chips options={Object.keys(KINDS)} value={Object.keys(KINDS).find((k) => KINDS[k] === kind)!} onChange={(k) => setKind(KINDS[k])} layoutId="kind" /></div>
      <p className="mb-2 px-1 text-[13px] font-medium text-zinc-400">Colour</p>
      <div className="grid grid-cols-6 gap-3">
        {COLORS.map((c) => (
          <motion.button key={c} whileTap={{ scale: 0.85 }} onClick={() => { tap(); setColor(c) }} className="grid aspect-square place-items-center rounded-2xl" style={{ background: `${c}22` }}>
            <motion.span animate={{ scale: color === c ? 1.25 : 0.8 }} className={cn('size-5 rounded-full', color === c && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900')} style={{ background: c }} />
          </motion.button>
        ))}
      </div>
      {item && <p className="mt-4 px-1 text-[12px] text-zinc-600">Removing an account takes its balance out of every month's total.</p>}
    </Sheet>
  )
}

/* ---------------- Expense heads ---------------- */

export function HeadsPage() {
  const list = useHeads()
  const [editing, setEditing] = useState<ExpenseHead | 'new' | null>(null)
  return (
    <>
      <SubHeader title="Expense types" subtitle="Columns like Mom exp, My exp" />
      <ul className="space-y-2.5">
        {list.map((h, i) => (
          <motion.li key={h.id} {...listItem(i)}>
            <Card onClick={() => setEditing(h)} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{h.name}</div>
                <div className="text-[12px] text-zinc-500">{h.deduct ? 'Subtracted from My total' : 'Tracked only, not subtracted'}</div>
              </div>
              <ChevronRight className="size-4 text-zinc-600" />
            </Card>
          </motion.li>
        ))}
      </ul>
      <p className="mt-4 px-1 text-[12px] leading-relaxed text-zinc-600">My total = Total amount − expenses marked “subtract” − pending payment − debt.</p>
      <Fab onClick={() => setEditing('new')} label="Add expense type" />
      {editing !== null && <HeadSheet key={editing === 'new' ? 'n' : editing.id} item={editing === 'new' ? null : editing} count={list.length} onClose={() => setEditing(null)} />}
    </>
  )
}

function HeadSheet({ item, count, onClose }: { item: ExpenseHead | null; count: number; onClose: () => void }) {
  const [open, setOpen] = useState(true)
  const [name, setName] = useState(item?.name ?? '')
  const [deduct, setDeduct] = useState(item?.deduct ?? true)
  const close = () => { setOpen(false); setTimeout(onClose, 250) }
  async function save() {
    if (!name.trim()) { toast.error('Give it a name'); return }
    await db.heads.put({ ...(item?.id ? { id: item.id } : {}), name: name.trim(), deduct, order: item?.order ?? count })
    tap('success'); toast.success('Saved'); close()
  }
  return (
    <Sheet open={open} onClose={close} title={item ? 'Edit expense type' : 'New expense type'} footer={<>
      {item && <DeleteButton label="Remove" onConfirm={async () => { await db.heads.delete(item.id!); close() }} />}
      <Button className="flex-1" onClick={save}>Save</Button>
    </>}>
      <Field label="Name"><Input value={name} autoFocus={!item} placeholder="Rent, Bills…" onChange={(e) => setName(e.target.value)} /></Field>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold">Subtract from My total</div>
          <div className="text-[12px] text-zinc-500">Off = only shown, not deducted</div>
        </div>
        <Switch checked={deduct} onChange={setDeduct} />
      </div>
    </Sheet>
  )
}

/* ---------------- Data ---------------- */

export function DataPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const run = (key: string, fn: () => Promise<void>, ok: string) => async () => {
    setBusy(key)
    try { await fn(); tap('success'); toast.success(ok) } catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong') }
    setBusy(null)
  }
  const Row = ({ k, icon, title, sub, onClick, danger }: { k: string; icon: ReactNode; title: string; sub: string; onClick: () => void; danger?: boolean }) => (
    <Card onClick={onClick} className="flex items-center gap-3">
      <div className={cn('grid size-11 place-items-center rounded-2xl', danger ? 'bg-rose-400/10 text-rose-400' : 'bg-white/[0.06] text-zinc-200')}>
        {busy === k ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Sparkles className="size-5" /></motion.span> : icon}
      </div>
      <div className="flex-1">
        <div className={cn('text-[15px] font-semibold', danger && 'text-rose-400')}>{title}</div>
        <div className="text-[12px] text-zinc-500">{sub}</div>
      </div>
    </Card>
  )
  const [confirmErase, setConfirmErase] = useState(false)

  return (
    <>
      <SubHeader title="Excel & backup" />
      <div className="space-y-2.5">
        <Row k="xlsx" icon={<FileSpreadsheet className="size-5 text-lime-300" />} title="Export to Excel" sub="Monthly, daily earnings, investments, auto-pay" onClick={run('xlsx', exportExcel, 'Excel file ready')} />
        <Row k="backup" icon={<DownloadCloud className="size-5" />} title="Backup" sub="Save everything as one file (Drive, WhatsApp…)" onClick={run('backup', exportBackup, 'Backup ready')} />
        <Row k="restore" icon={<UploadCloud className="size-5" />} title="Restore backup" sub="Replaces all data with the backup file" onClick={() => fileRef.current?.click()} />
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]; e.target.value = ''
        if (f) run('restore', () => restoreBackup(f), 'Backup restored')()
      }} />

      <SectionLabel>Danger zone</SectionLabel>
      <div className="space-y-2.5">
        <Row k="sample" icon={<Sparkles className="size-5" />} title="Load sample data" sub="Your dummy sheet — replaces current data" onClick={run('sample', loadSampleData, 'Sample data loaded')} />
        <Row k="erase" danger icon={<Trash2 className="size-5" />} title="Erase everything" sub="Can't be undone — back up first" onClick={() => setConfirmErase(true)} />
      </div>
      <Sheet open={confirmErase} onClose={() => setConfirmErase(false)} title="Erase all data?" footer={<>
        <Button variant="soft" className="flex-1" onClick={() => setConfirmErase(false)}>Cancel</Button>
        <DeleteButton label="Erase" onConfirm={async () => { await eraseAll(); setConfirmErase(false); toast('All data erased') }} />
      </>}>
        <p className="text-[14px] leading-relaxed text-zinc-400">Every month, earning, investment and auto-pay on this phone will be deleted. Bank accounts reset to the defaults. This can't be undone.</p>
      </Sheet>
    </>
  )
}
