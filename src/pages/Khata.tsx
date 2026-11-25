import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, BookUser, Search, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Contact, type KhataEntry } from '@/db'
import { PageHeader, Card, Fab, Sheet, Field, Input, Button, DeleteButton, Money, Empty, SectionLabel, listItem, ease } from '@/components/ui'
import { useContacts, useKhata } from '@/lib/hooks'
import { khataBalance } from '@/lib/calc'
import { inr, dayLabel, fullDate, todayISO, num, str } from '@/lib/format'
import { tap } from '@/lib/native'
import { cn } from '@/lib/utils'

function BalanceText({ balance, className }: { balance: number; className?: string }) {
  if (Math.round(balance) === 0) return <span className={cn('text-zinc-500', className)}>Settled</span>
  return (
    <span className={cn(balance > 0 ? 'text-lime-300' : 'text-rose-400', className)}>
      {balance > 0 ? 'You will get' : 'You will give'}
    </span>
  )
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'

const HUES = ['#bef264', '#7dd3fc', '#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#f87171']
const hue = (id = 0) => HUES[id % HUES.length]

/* ======================= Contact list ======================= */

export default function Khata() {
  const nav = useNavigate()
  const contacts = useContacts()
  const entries = useKhata()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    return (contacts ?? []).map((c) => {
      const list = (entries ?? []).filter((e) => e.contactId === c.id)
      const last = list.reduce<string | null>((m, e) => (!m || e.date > m ? e.date : m), null)
      return { ...c, ...khataBalance(list), count: list.length, last }
    }).sort((a, b) => (b.last ?? b.createdAt).localeCompare(a.last ?? a.createdAt))
  }, [contacts, entries])

  const willGet = rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0)
  const willGive = rows.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0)
  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <PageHeader title="Khata" subtitle={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-lime-300/[0.06]">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-400"><ArrowDownLeft className="size-4 text-lime-300" /> You will get</div>
          <Money value={willGet} className="mt-1 block text-[22px] font-extrabold tracking-tight text-lime-300" />
        </Card>
        <Card delay={0.05} className="bg-rose-400/[0.06]">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-400"><ArrowUpRight className="size-4 text-rose-400" /> You will give</div>
          <Money value={willGive} className="mt-1 block text-[22px] font-extrabold tracking-tight text-rose-400" />
        </Card>
      </div>

      {rows.length > 4 && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" className="pl-10" />
        </div>
      )}

      <SectionLabel>People</SectionLabel>
      {contacts && rows.length === 0 && (
        <Empty icon={<BookUser className="size-7" />} title="Your khata is empty" text="Add a person, then record money you send or receive. The balance adds up automatically." action={<Button onClick={() => setAdding(true)}>Add person</Button>} />
      )}
      <ul className="space-y-2.5">
        <AnimatePresence>
          {shown.map((c, i) => (
            <motion.li key={c.id} layout {...listItem(i)}>
              <Card onClick={() => nav(`/khata/${c.id}`)} className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-[15px] font-bold" style={{ background: `${hue(c.id)}1f`, color: hue(c.id) }}>
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{c.name}</div>
                  <div className="truncate text-[12px] text-zinc-500">{c.last ? `Last: ${fullDate(c.last)}` : 'No entries yet'} · {c.count} entries</div>
                </div>
                <div className="text-right">
                  <div className={cn('text-[15px] font-bold tabular-nums', c.balance > 0 ? 'text-lime-300' : c.balance < 0 ? 'text-rose-400' : 'text-zinc-400')}>{inr(Math.abs(c.balance))}</div>
                  <BalanceText balance={c.balance} className="text-[11px] font-medium" />
                </div>
              </Card>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <Fab onClick={() => setAdding(true)} label="Add person" />
      {adding && <ContactSheet contact={null} onClose={() => setAdding(false)} onSaved={(id) => nav(`/khata/${id}`)} />}
    </>
  )
}

function ContactSheet({ contact, onClose, onSaved }: { contact: Contact | null; onClose: () => void; onSaved?: (id: number) => void }) {
  const [open, setOpen] = useState(true)
  const [name, setName] = useState(contact?.name ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const close = () => { setOpen(false); setTimeout(onClose, 250) }
  async function save() {
    if (!name.trim()) { toast.error('Enter a name'); return }
    const id = await db.contacts.put({ ...(contact?.id ? { id: contact.id } : {}), name: name.trim(), phone: phone.trim() || undefined, createdAt: contact?.createdAt ?? todayISO() })
    tap('success')
    toast.success(contact ? 'Updated' : `${name.trim()} added`)
    close()
    if (!contact) setTimeout(() => onSaved?.(id as number), 260)
  }
  return (
    <Sheet open={open} onClose={close} title={contact ? 'Edit person' : 'Add person'} footer={<Button className="flex-1" onClick={save}>Save</Button>}>
      <Field label="Name"><Input value={name} autoFocus={!contact} placeholder="e.g. Rahul" onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Phone (optional)"><Input value={phone} inputMode="tel" placeholder="98xxxxxxxx" onChange={(e) => setPhone(e.target.value)} /></Field>
    </Sheet>
  )
}

/* ======================= One person (chat view) ======================= */

export function KhataContact() {
  const { id } = useParams()
  const nav = useNavigate()
  const contactId = Number(id)
  const contact = useLiveQuery(() => db.contacts.get(contactId), [contactId])
  const entries = useLiveQuery(() => db.khata.where('contactId').equals(contactId).toArray(), [contactId])
  const [entry, setEntry] = useState<KhataEntry | { type: 'send' | 'receive' } | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // oldest → newest, with running balance, then grouped by day
  const timeline = useMemo(() => {
    const sorted = [...(entries ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    let run = 0
    const withRun = sorted.map((e) => ({ ...e, run: (run += e.type === 'send' ? e.amount : -e.amount) }))
    const days: { date: string; items: typeof withRun }[] = []
    for (const e of withRun) {
      const d = days.at(-1)
      if (d && d.date === e.date) d.items.push(e)
      else days.push({ date: e.date, items: [e] })
    }
    return days
  }, [entries])
  const b = khataBalance(entries ?? [])

  if (contact === undefined) return null
  if (contact === null) return <Empty icon={<BookUser className="size-7" />} title="Person not found" text="This person may have been deleted." action={<Button onClick={() => nav('/khata')}>Back to Khata</Button>} />

  return (
    <>
      <div className="flex items-center justify-between">
        <button onClick={() => { tap(); nav('/khata') }} className="-ml-1 flex h-9 items-center gap-1 rounded-full pr-3 text-[14px] text-zinc-400 active:text-zinc-100">
          <ArrowLeft className="size-4" /> Khata
        </button>
        <div className="flex gap-1">
          <button aria-label="Edit person" onClick={() => { tap(); setEditing(true) }} className="grid size-9 place-items-center rounded-full bg-white/[0.05] text-zinc-400"><Pencil className="size-4" /></button>
          <button aria-label="Delete person" onClick={() => { tap(); setDeleting(true) }} className="grid size-9 place-items-center rounded-full bg-white/[0.05] text-zinc-400"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="mt-3 flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-[20px] text-[19px] font-bold" style={{ background: `${hue(contact.id)}1f`, color: hue(contact.id) }}>{initials(contact.name)}</div>
        <div className="min-w-0">
          <h1 className="truncate text-[24px] font-bold tracking-tight">{contact.name}</h1>
          {contact.phone && <a href={`tel:${contact.phone}`} className="text-[13px] text-zinc-500">{contact.phone}</a>}
        </div>
      </motion.div>

      <Card delay={0.05} className={cn('mt-4', b.balance > 0 ? 'bg-lime-300/[0.06]' : b.balance < 0 ? 'bg-rose-400/[0.06]' : '')}>
        <div className="flex items-end justify-between">
          <div>
            <BalanceText balance={b.balance} className="text-[13px] font-semibold" />
            <Money value={Math.abs(b.balance)} className={cn('block text-[32px] font-extrabold leading-tight tracking-tight', b.balance > 0 ? 'text-lime-300' : b.balance < 0 ? 'text-rose-400' : '')} />
          </div>
          <div className="space-y-0.5 text-right text-[12px] tabular-nums">
            <div className="text-zinc-500">Sent <b className="text-zinc-200">{inr(b.sent)}</b></div>
            <div className="text-zinc-500">Received <b className="text-zinc-200">{inr(b.received)}</b></div>
          </div>
        </div>
      </Card>

      {timeline.length === 0 ? (
        <Empty icon={<ArrowUpRight className="size-7" />} title="No entries yet" text="Tap Send when you give money, Receive when you get money back." />
      ) : (
        <div className="mt-5 space-y-4 pb-24">
          {timeline.map((day) => (
            <div key={day.date}>
              <div className="mb-2 flex justify-center">
                <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-zinc-500">{dayLabel(day.date)}, {day.date.slice(0, 4)}</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {day.items.map((e) => {
                    const sent = e.type === 'send'
                    return (
                      <motion.div
                        key={e.id}
                        layout
                        initial={{ opacity: 0, x: sent ? 30 : -30, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className={cn('flex', sent ? 'justify-end' : 'justify-start')}
                      >
                        <button
                          onClick={() => { tap(); setEntry(e) }}
                          className={cn(
                            'max-w-[78%] rounded-[20px] px-4 py-2.5 text-left active:opacity-80',
                            sent ? 'rounded-br-md bg-rose-400/[0.12]' : 'rounded-bl-md bg-lime-300/[0.12]',
                          )}
                        >
                          <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', sent ? 'text-rose-300' : 'text-lime-300')}>
                            {sent ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />} {sent ? 'Sent' : 'Received'}
                          </div>
                          <div className="text-[20px] font-bold tabular-nums">{inr(e.amount)}</div>
                          {e.note && <div className="mt-0.5 text-[13px] text-zinc-300">{e.note}</div>}
                          <div className="mt-1 text-[11px] tabular-nums text-zinc-500">Balance {inr(Math.abs(e.run))} {e.run > 0 ? 'to get' : e.run < 0 ? 'to give' : ''}</div>
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* send / receive bar — portal keeps it pinned to the screen */}
      {createPortal(<div className="fixed inset-x-0 z-30 mx-auto flex max-w-md gap-3 px-4" style={{ bottom: 'calc(var(--sab) + 92px)' }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { tap('medium'); setEntry({ type: 'send' }) }}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-400 text-[16px] font-bold text-zinc-950 shadow-lg shadow-rose-500/20">
          <ArrowUpRight className="size-5" /> Send
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { tap('medium'); setEntry({ type: 'receive' }) }}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-300 text-[16px] font-bold text-zinc-950 shadow-lg shadow-lime-400/20">
          <ArrowDownLeft className="size-5" /> Receive
        </motion.button>
      </div>, document.body)}

      {entry && <EntrySheet key={'id' in entry ? entry.id : entry.type} contact={contact} entry={entry} onClose={() => setEntry(null)} />}
      {editing && <ContactSheet contact={contact} onClose={() => setEditing(false)} />}
      <Sheet open={deleting} onClose={() => setDeleting(false)} title={`Delete ${contact.name}?`} footer={<>
        <Button variant="soft" className="flex-1" onClick={() => setDeleting(false)}>Cancel</Button>
        <DeleteButton onConfirm={async () => {
          await db.transaction('rw', db.contacts, db.khata, async () => {
            await db.khata.where('contactId').equals(contactId).delete()
            await db.contacts.delete(contactId)
          })
          setDeleting(false); toast(`${contact.name} deleted`); nav('/khata')
        }} />
      </>}>
        <p className="text-[14px] leading-relaxed text-zinc-400">This deletes {contact.name} and all {entries?.length ?? 0} entries. It can't be undone.</p>
      </Sheet>
    </>
  )
}

function EntrySheet({ contact, entry, onClose }: { contact: Contact; entry: KhataEntry | { type: 'send' | 'receive' }; onClose: () => void }) {
  const existing = 'id' in entry ? entry : null
  const [open, setOpen] = useState(true)
  const [type, setType] = useState<'send' | 'receive'>(entry.type)
  const [amount, setAmount] = useState(str(existing?.amount))
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [note, setNote] = useState(existing?.note ?? '')
  const close = () => { setOpen(false); setTimeout(onClose, 250) }
  const sent = type === 'send'

  async function save() {
    if (!num(amount)) { toast.error('Enter an amount'); return }
    await db.khata.put({
      ...(existing?.id ? { id: existing.id } : {}),
      contactId: contact.id!, type, amount: num(amount), date, note: note.trim() || undefined,
      createdAt: existing?.createdAt ?? Date.now(),
    })
    tap('success')
    toast.success(`${sent ? 'Sent' : 'Received'} ${inr(num(amount))}`)
    close()
  }

  return (
    <Sheet open={open} onClose={close} title={existing ? 'Edit entry' : sent ? `Send to ${contact.name}` : `Receive from ${contact.name}`} footer={<>
      {existing && <DeleteButton onConfirm={async () => { await db.khata.delete(existing.id!); toast('Entry deleted'); close() }} />}
      <Button className={cn('flex-1', sent && 'bg-rose-400')} onClick={save}>Save</Button>
    </>}>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1">
        {(['send', 'receive'] as const).map((t) => (
          <button key={t} type="button" onClick={() => { tap(); setType(t) }} className={cn('relative h-10 rounded-xl text-[14px] font-semibold', type === t ? 'text-zinc-950' : 'text-zinc-400')}>
            {type === t && <motion.span layoutId="entry-type" className={cn('absolute inset-0 rounded-xl', t === 'send' ? 'bg-rose-400' : 'bg-lime-300')} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
            <span className="relative">{t === 'send' ? 'Send' : 'Receive'}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 rounded-3xl bg-white/[0.03] px-4 py-5 text-center">
        <div className="text-[12px] font-medium text-zinc-500">{sent ? `You give ${contact.name}` : `${contact.name} gives you`}</div>
        <div className={cn('mt-1 flex items-center justify-center text-[40px] font-extrabold tracking-tight', sent ? 'text-rose-300' : 'text-lime-300')}>
          <span className="mr-1 opacity-50">₹</span>
          <input autoFocus={!existing} inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full max-w-[240px] bg-transparent text-center tabular-nums outline-none placeholder:text-zinc-700" />
        </div>
      </div>
      <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Note"><Input value={note} placeholder="e.g. for rent, UPI, cash" onChange={(e) => setNote(e.target.value)} /></Field>
    </Sheet>
  )
}
