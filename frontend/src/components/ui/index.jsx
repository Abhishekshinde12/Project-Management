import { cn } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'

// ── Button ────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none'

  const variants = {
    primary: 'bg-volt-400 text-ink-950 hover:bg-volt-300 active:bg-volt-500 volt-glow',
    secondary: 'bg-ink-800 text-ink-100 hover:bg-ink-700 active:bg-ink-900 border border-ink-700',
    ghost: 'text-ink-300 hover:bg-ink-800 hover:text-ink-100 active:bg-ink-900',
    danger: 'bg-coral-500/10 text-coral-400 hover:bg-coral-500/20 border border-coral-500/20',
    outline: 'border border-ink-700 text-ink-200 hover:bg-ink-800 hover:border-ink-600',
  }

  const sizes = {
    sm: 'h-7 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
    icon: 'h-9 w-9 p-0',
    'icon-sm': 'h-7 w-7 p-0',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────
export function Badge({ children, className, ...props }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium font-mono', className)}
      {...props}
    >
      {children}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────
import { getInitials, getAvatarColor } from '@/utils/helpers'

export function Avatar({ name, size = 'md', className }) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-12 h-12 text-base' }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-display font-semibold shrink-0', sizes[size], getAvatarColor(name), className)}>
      {getInitials(name)}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={cn('animate-spin text-ink-400', className)} />
}

// ── Input ─────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</label>}
      <input
        className={cn(
          'w-full h-10 px-3 rounded-lg bg-ink-900 border text-sm text-ink-100 placeholder:text-ink-600 transition-colors',
          'focus:outline-none focus:border-volt-400/50 focus:bg-ink-800',
          error ? 'border-coral-500/50' : 'border-ink-700',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-coral-400">{error}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────
export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</label>}
      <textarea
        className={cn(
          'w-full px-3 py-2.5 rounded-lg bg-ink-900 border text-sm text-ink-100 placeholder:text-ink-600 transition-colors resize-none',
          'focus:outline-none focus:border-volt-400/50 focus:bg-ink-800',
          error ? 'border-coral-500/50' : 'border-ink-700',
          className
        )}
        rows={4}
        {...props}
      />
      {error && <span className="text-xs text-coral-400">{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────
export function Select({ label, error, options = [], className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-ink-400 uppercase tracking-wider">{label}</label>}
      <select
        className={cn(
          'w-full h-10 px-3 rounded-lg bg-ink-900 border text-sm text-ink-100 transition-colors',
          'focus:outline-none focus:border-volt-400/50 focus:bg-ink-800',
          error ? 'border-coral-500/50' : 'border-ink-700',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-coral-400">{error}</span>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className, hover, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl surface p-4',
        hover && 'hover:border-ink-600 hover:bg-ink-900/50 transition-all duration-150 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-ink-800 flex items-center justify-center">
          <Icon size={20} className="text-ink-500" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-ink-300">{title}</p>
        {description && <p className="text-xs text-ink-600 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className={cn('relative w-full rounded-2xl bg-ink-900 border border-ink-700 shadow-2xl', sizes[size])}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
              <h2 className="font-display font-semibold text-ink-100">{title}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-ink-800 flex items-center justify-center text-ink-500 hover:text-ink-200 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── Dropdown Menu ─────────────────────────────────────
export function DropdownMenu({ trigger, items }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-40 rounded-xl bg-ink-900 border border-ink-700 shadow-2xl py-1 overflow-hidden"
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="h-px bg-ink-800 my-1" />
              ) : (
                <button
                  key={i}
                  onClick={() => { item.onClick?.(); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                    item.danger
                      ? 'text-coral-400 hover:bg-coral-400/10'
                      : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
                  )}
                >
                  {item.icon && <item.icon size={14} />}
                  {item.label}
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import React from 'react'
