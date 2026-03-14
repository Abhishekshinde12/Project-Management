import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, User, Plus, Check, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react'
import { orgApi, userApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import { Button, Input, Card, Modal, Spinner, Badge } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { extractError, cn, formatDate } from '@/utils/helpers'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [tab, setTab] = useState('org')

  const tabs = [
    { id: 'org',     label: 'Organization', icon: Building2 },
    { id: 'profile', label: 'Profile',       icon: User      },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your workspace and account" />

      <div className="flex gap-1 mb-6 p-1 bg-ink-900 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'org'     && <OrgSettings />}
      {tab === 'profile' && <ProfileSettings />}
    </div>
  )
}

// ── Org Settings ──────────────────────────────────────
function OrgSettings() {
  const { currentOrgId, setCurrentOrg } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')

  // Load ALL orgs the current user belongs to
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['my-orgs'],
    queryFn:  () => orgApi.getAll().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d ? [d] : []
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => orgApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries(['my-orgs'])
      qc.invalidateQueries(['org'])
      toast.success('Organization updated')
      setEditingId(null)
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => orgApi.delete(id),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries(['my-orgs'])
      // If we deleted the active org, switch to another or clear
      if (currentOrgId === deletedId) {
        const remaining = orgs.filter((o) => o.id !== deletedId)
        setCurrentOrg(remaining[0]?.id || null)
      }
      toast.success('Organization deleted')
    },
    onError: (e) => toast.error(extractError(e)),
  })

  return (
    <div className="space-y-4">
      {/* List of all orgs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink-200 text-sm">Your Organizations</h3>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus size={12} /> New
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-600 mb-3">No organizations yet</p>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create your first org
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {orgs.map((org) => {
              const isActive  = org.id === currentOrgId
              const isEditing = editingId === org.id

              return (
                <motion.div
                  key={org.id}
                  layout
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    isActive
                      ? 'border-volt-400/30 bg-volt-400/5'
                      : 'border-ink-800 hover:border-ink-700 hover:bg-ink-900/50'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-sm',
                    isActive ? 'bg-volt-400/20 text-volt-400' : 'bg-ink-800 text-ink-400'
                  )}>
                    {org.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Name / edit field */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-7 px-2 rounded-lg bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:outline-none focus:border-volt-400/50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateMutation.mutate({ id: org.id, name: editName })
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <Button size="icon-sm" onClick={() => updateMutation.mutate({ id: org.id, name: editName })} loading={updateMutation.isPending}>
                          <Check size={12} />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink-100 truncate">{org.name}</p>
                          {isActive && (
                            <Badge className="text-volt-400 bg-volt-400/10 text-[10px]">Active</Badge>
                          )}
                        </div>
                        <p className="text-xs text-ink-600 font-mono truncate">{org.id}</p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentOrg(org.id)
                            qc.invalidateQueries(['projects'])
                            qc.invalidateQueries(['members'])
                            toast.success(`Switched to ${org.name}`)
                          }}
                        >
                          Switch
                        </Button>
                      )}
                      <button
                        onClick={() => { setEditingId(org.id); setEditName(org.name) }}
                        className="w-7 h-7 rounded-lg hover:bg-ink-700 flex items-center justify-center text-ink-600 hover:text-ink-200 transition-colors text-xs"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${org.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(org.id)
                          }
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-coral-400/10 flex items-center justify-center text-ink-600 hover:text-coral-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

function CreateOrgModal({ open, onClose }) {
  const { setCurrentOrg } = useAuthStore()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => orgApi.create({ name }),
    onSuccess: (res) => {
      setCurrentOrg(res.data.id)
      qc.invalidateQueries(['my-orgs'])
      qc.invalidateQueries(['projects'])
      toast.success('Organization created! 🎉')
      setName('')
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    setError('')
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organization Name"
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Profile Settings ──────────────────────────────────
function ProfileSettings() {
  const { user, setUser, currentOrgId } = useAuthStore()
  const [saved, setSaved] = useState(false)

  // Try to fetch the real user profile from the backend if we have a user id.
  // This also runs on mount to populate name if it wasn't stored during login.
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => userApi.me().then((r) => r.data),
    enabled: !!user,
    onSuccess: (data) => {
      // Sync name/email into Zustand so rest of app has it
      setUser({ ...user, name: data.name, email: data.email, id: data.id })
    },
  })

  // Merge stored user with freshly fetched profile; profile wins
  const merged = { ...user, ...profile }

  const [form, setForm] = useState({
    name:     merged?.name  || '',
    email:    merged?.email || '',
    password: '',
  })

  // Keep form in sync when profile loads (e.g. first load after login)
  useEffect(() => {
    if (merged?.name || merged?.email) {
      setForm((f) => ({
        ...f,
        name:  merged.name  || f.name,
        email: merged.email || f.email,
      }))
    }
  }, [merged?.name, merged?.email])

  const mutation = useMutation({
    mutationFn: (data) => {
      if (!user?.id) throw new Error('User ID not found — please log out and back in')
      const payload = {}
      if (data.name  !== merged?.name)  payload.name     = data.name
      if (data.email !== merged?.email) payload.email    = data.email
      if (data.password)                payload.password = data.password
      return userApi.update(user.id, payload)
    },
    onSuccess: (res) => {
      setUser({ ...user, ...res.data })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('Profile updated!')
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Card>
      <h3 className="font-display font-semibold text-ink-200 text-sm mb-4">Account Settings</h3>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Input
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="you@company.com"
        />
        <Input
          label="New Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="Leave blank to keep current"
        />

        {merged?.id && (
          <div className="p-3 rounded-lg bg-ink-900 border border-ink-800">
            <p className="text-xs text-ink-600 mb-0.5">
              Your User ID <span className="text-ink-700">(share this to be added to an org)</span>
            </p>
            <p className="text-xs font-mono text-ink-400 break-all select-all">{merged.id}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={mutation.isPending}>
            {saved ? <><Check size={13} /> Saved!</> : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  )
}