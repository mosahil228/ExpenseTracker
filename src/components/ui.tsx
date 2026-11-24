import { useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes } from 'react'
import { Drawer } from 'vaul'
import { motion, AnimatePresence } from 'motion/react'
import NumberFlow from '@number-flow/react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tap } from '@/lib/native'
import { INR_FORMAT } from '@/lib/format'

export const ease = [0.22, 1, 0.36, 1] as const

/* ---------- layout ---------- */

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3 pt-2">
      <div>
        {subtitle && <p className="mb-1 text-[13px] font-medium text-zinc-500">{subtitle}</p>}
        <h1 className="text-[28px] font-bold leading-none tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  )
}

export function Card({ children, className, onClick, delay = 0 }: { children: ReactNode; className?: string; onClick?: () => void; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick ? () => { tap(); onClick() } : undefined}
      className={cn('rounded-[22px] border border-white/[0.06] bg-white/[0.035] p-4', onClick && 'cursor-pointer active:bg-white/[0.05]', className)}
    >
      {children}
    </motion.div>
  )
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{children}</h2>
      {right}
    </div>
  )
}

/* ---------- numbers ---------- */

export function Money({ value, className }: { value: number; className?: string }) {
  return <NumberFlow value={Math.round(value || 0)} locales="en-IN" format={INR_FORMAT} className={cn('tabular-nums', className)} />
}

export function Delta({ value, suffix = '%', className }: { value: number | null; suffix?: string; className?: string }) {
  if (value == null || !Number.isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums', up ? 'bg-lime-300/10 text-lime-300' : 'bg-rose-400/10 text-rose-400', className)}>
      {up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

/* ---------- buttons ---------- */

export function Button({ children, onClick, variant = 'primary', className, disabled, loading, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'soft'; className?: string; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-lime-300 text-zinc-950',
    soft: 'bg-white/[0.07] text-zinc-100',
    ghost: 'bg-transparent text-zinc-300',
    danger: 'bg-rose-500/10 text-rose-400',
  }[variant]
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      disabled={disabled || loading}
      onClick={() => { tap(); onClick?.() }}
      className={cn('inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition-opacity disabled:opacity-40', styles, className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </motion.button>
  )
}

export function Fab({ onClick, label = 'Add' }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      aria-label={label}
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
      whileTap={{ scale: 0.88 }}
      onClick={() => { tap('medium'); onClick() }}
      className="fixed right-5 z-30 grid size-14 place-items-center rounded-[20px] bg-lime-300 text-zinc-950 shadow-[0_10px_40px_-8px_rgba(190,242,100,0.55)]"
      style={{ bottom: 'calc(var(--sab) + 96px)' }}
    >
      <Plus className="size-6" strokeWidth={2.6} />
    </motion.button>
  )
}

/** Tap once → "Tap again", second tap deletes. No ugly system dialogs. */
export function DeleteButton({ onConfirm, label = 'Delete' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 2500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if (armed) { tap('warning'); onConfirm() } else { tap(); setArmed(true) }
      }}
      className={cn('inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition-colors', armed ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400')}
    >
      <Trash2 className="size-4" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(armed)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {armed ? 'Tap again' : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

/* ---------- sheet (bottom drawer) ---------- */

const sheetStack: (() => void)[] = []
/** used by the Android back button */
export function closeTopSheet() {
  const close = sheetStack.at(-1)
  if (close) { close(); return true }
  return false
}

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const fn = () => closeRef.current()
    sheetStack.push(fn)
    return () => { const i = sheetStack.indexOf(fn); if (i >= 0) sheetStack.splice(i, 1) }
  }, [open])
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-[28px] border-t border-white/[0.08] bg-zinc-900 outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-white/15" />
          <Drawer.Title className="px-5 pb-1 pt-4 text-[19px] font-bold tracking-tight">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">{children}</div>
          {footer && <div className="flex gap-2 border-t border-white/[0.06] px-5 pt-3" style={{ paddingBottom: 'calc(var(--sab) + 14px)' }}>{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ---------- form fields ---------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex items-center justify-between px-1 text-[13px] font-medium text-zinc-400">{label}{hint}</span>
      {children}
    </label>
  )
}

const inputCls = 'h-12 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 text-[16px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-lime-300/50 focus:bg-white/[0.06]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function MoneyInput({ value, onChange, placeholder = '0', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className={cn(inputCls, 'pl-9 tabular-nums')}
      />
    </div>
  )
}

/** Compact row: label left, money input right — used for long lists of balances */
export function MoneyRow({ label, dot, value, onChange }: { label: string; dot?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-2 last:border-0">
      {dot && <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="flex-1 truncate text-[15px] text-zinc-300">{label}</span>
      <MoneyInput value={value} onChange={onChange} className="w-[46%]" />
    </div>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={(v) => { tap(); onChange(v) }}
      className="relative h-7 w-12 shrink-0 rounded-full bg-white/10 transition-colors data-[state=checked]:bg-lime-300"
    >
      <SwitchPrimitive.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-zinc-950" />
    </SwitchPrimitive.Root>
  )
}

export function Chips<T extends string>({ options, value, onChange, layoutId }: { options: readonly T[]; value: T; onChange: (v: T) => void; layoutId: string }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => { tap(); onChange(o) }}
          className={cn('relative h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors', value === o ? 'text-zinc-950' : 'bg-white/[0.05] text-zinc-400')}
        >
          {value === o && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-lime-300" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <span className="relative">{o}</span>
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease }} className="flex flex-col items-center px-6 py-14 text-center">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-5 grid size-16 place-items-center rounded-3xl bg-lime-300/10 text-lime-300"
      >
        {icon}
      </motion.div>
      <h3 className="text-[18px] font-bold">{title}</h3>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-zinc-500">{text}</p>
      {action && <div className="mt-6 flex flex-col gap-2">{action}</div>}
    </motion.div>
  )
}

/** staggered list wrapper */
export const listItem = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
  transition: { duration: 0.35, ease, delay: Math.min(i, 12) * 0.035 },
})
