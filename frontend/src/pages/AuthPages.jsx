import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Zap } from 'lucide-react'
import { authApi, orgApi, userApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import { Button, Input } from '@/components/ui'
import { extractError } from '@/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { setLoggedIn, isLoggedIn, setCurrentOrg, currentOrgId } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  // Already logged in — don't show the login page at all
  if (isLoggedIn) return <Navigate to="/dashboard" replace />

const handleSubmit = async (e) => {
  e.preventDefault()
  setErrors({})

  if (!email) return setErrors({ email: 'Email is required' })
  if (!password) return setErrors({ password: 'Password is required' })

  setLoading(true)

  try {
    await authApi.login(email, password)

    // Clear stale cache from previous session
    qc.clear()

    // Fetch logged in user
    const { data: user } = await userApi.me()

    // Load organizations
    let firstOrgId = null
    try {
      const { data } = await orgApi.getAll()
      const orgs = Array.isArray(data) ? data : data ? [data] : []

      if (orgs.length > 0) {
        firstOrgId = orgs[0].id
        if (!currentOrgId) setCurrentOrg(firstOrgId)
      }
    } catch (_) {}

    setLoggedIn(user)

    toast.success('Welcome back! 👋')

    navigate('/dashboard', { replace: true })

  } catch (err) {
    toast.error(extractError(err))
  } finally {
    setLoading(false)
  }
}

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-volt-400 flex items-center justify-center">
              <span className="font-display font-black text-ink-950 text-sm">P</span>
            </div>
            <span className="font-display font-bold text-ink-100 text-xl">Plane</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-ink-50 mb-1">Sign in</h1>
          <p className="text-sm text-ink-500">Welcome back. Let's get things done.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoFocus
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-8 text-ink-500 hover:text-ink-300 transition-colors"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign in <ArrowRight size={14} />
          </Button>
        </form>

        <p className="text-center text-sm text-ink-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-volt-400 hover:text-volt-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  )
}

// ── Register ──────────────────────────────────────────
export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name) e.name = 'Name is required'
    if (!form.email) e.email = 'Email is required'
    if (!form.password || form.password.length < 6) e.password = 'Password must be 6+ characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    try {
      await userApi.create(form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-volt-400 flex items-center justify-center">
              <span className="font-display font-black text-ink-950 text-sm">P</span>
            </div>
            <span className="font-display font-bold text-ink-100 text-xl">Plane</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-ink-50 mb-1">Create account</h1>
          <p className="text-sm text-ink-500">Start managing projects in minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
          <Input label="Email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} error={errors.password} />
          <Button type="submit" loading={loading} className="w-full mt-2">
            Create account <ArrowRight size={14} />
          </Button>
        </form>

        <p className="text-center text-sm text-ink-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-volt-400 hover:text-volt-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  )
}

// ── Auth Shell ────────────────────────────────────────
function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-ink-950 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-[420px] bg-ink-900 border-r border-ink-800 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {/* Grid pattern */}
          <div style={{
            backgroundImage: 'linear-gradient(rgba(176,255,26,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(176,255,26,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            width: '100%', height: '100%'
          }} />
        </div>
        {/* Glow orb */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-volt-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-azure-400/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Zap size={28} className="text-volt-400 mb-4" />
          <p className="font-display text-2xl font-bold text-ink-100 leading-tight">
            Ship faster.<br />Stay organized.
          </p>
          <p className="text-ink-500 text-sm mt-3">Everything your team needs to move from idea to delivery.</p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { emoji: '⚡', text: 'Real-time task tracking' },
            { emoji: '🏗️', text: 'Multi-org project management' },
            { emoji: '🎯', text: 'Priority-based workflows' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-ink-400">
              <span className="text-base">{emoji}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        {children}
      </div>
    </div>
  )
}