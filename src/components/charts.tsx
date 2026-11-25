import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { compact, inr } from '@/lib/format'

const axis = { fill: '#71717a', fontSize: 11 }

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur">
      {label && <div className="mb-1 font-semibold text-zinc-300">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 tabular-nums text-zinc-100">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name && <span className="text-zinc-400">{p.name}</span>}
          <span className="ml-auto font-semibold">{inr(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function NetWorthChart({ data }: { data: { label: string; total: number; my: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bef264" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#bef264" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gMy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compact} width={52} />
        <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
        <Area type="monotone" dataKey="total" name="Total" stroke="#bef264" strokeWidth={2.2} fill="url(#gTotal)" animationDuration={1100} />
        <Area type="monotone" dataKey="my" name="My total" stroke="#7dd3fc" strokeWidth={2} fill="url(#gMy)" animationDuration={1300} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MonthBars({ data, highlight, height = 200 }: { data: { label: string; total: number; key: string }[]; highlight?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 0, left: -8, bottom: 0 }}>
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={0} fontSize={10} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compact} width={50} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 8 }} />
        <Bar dataKey="total" name="Earned" radius={[8, 8, 8, 8]} maxBarSize={56} animationDuration={900}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.key === highlight ? '#bef264' : '#3f3f46'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, size = 170 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={size * 0.33} outerRadius={size * 0.48} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={900}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip content={<Tip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const TYPE_COLORS: Record<string, string> = {
  Gold: '#facc15', Silver: '#cbd5e1', Stocks: '#60a5fa', 'Mutual fund': '#a78bfa', FD: '#34d399',
  Crypto: '#fb923c', Property: '#f472b6', Other: '#71717a',
}
