import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const BARS = [
  { h: 30, o: 0.38 },
  { h: 50, o: 0.68 },
  { h: 74, o: 1 },
]

/** Branded launch screen shown for a moment every time the app opens. */
export function Intro() {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1700)
    return () => clearTimeout(t)
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute size-72 rounded-full bg-lime-300/10 blur-3xl"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
          />
          <div className="relative flex h-20 items-end gap-2.5">
            {BARS.map((b, i) => (
              <motion.span
                key={i}
                className="w-5 rounded-[7px] bg-lime-300"
                style={{ opacity: b.o }}
                initial={{ height: 0 }}
                animate={{ height: b.h }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 + i * 0.12 }}
              />
            ))}
          </div>
          <motion.h1
            className="relative mt-6 text-[26px] font-extrabold tracking-tight text-zinc-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Money Tracker
          </motion.h1>
          <motion.p
            className="absolute text-[13px] font-medium tracking-wide text-zinc-500"
            style={{ bottom: 'calc(var(--sab) + 40px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            Powered by <span className="font-bold text-lime-300">Sahil</span>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
