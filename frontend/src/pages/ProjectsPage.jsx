import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderKanban, Plus, MoreHorizontal, Archive, Trash2,
  ArrowLeft, Calendar, Edit2, CheckSquare
} from 'lucide-react'
import { projectApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import {
  Card, Button, Modal, Input, Textarea, Select,
  Badge, EmptyState, Spinner, DropdownMenu
} from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { formatDate, getProjectStatusConfig, extractError } from '@/utils/helpers'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

// ── Projects List ─────────────────────────────────────
export default function ProjectsPage() {
  const { currentOrgId } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d ? [d] : []
    }),
    enabled: !!currentOrgId,
  })

  const projects = data || []

  const deleteMutation = useMutation({
    mutationFn: (id) => projectApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted') },
    onError: (e) => toast.error(extractError(e)),
  })

  if (!currentOrgId) {
    return (
      <div className="p-6">
        <PageHeader title="Projects" />
        <EmptyState icon={FolderKanban} title="No organization selected" description="Go to settings to set up an organization." />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} in your organization`}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New project
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start organizing tasks and collaborating with your team."
          action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Create project</Button>}
        />
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {projects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              onDelete={() => deleteMutation.mutate(proj.id)}
            />
          ))}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            onClick={() => setShowCreate(true)}
            className="rounded-xl border border-dashed border-ink-700 hover:border-volt-400/40 hover:bg-volt-400/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[140px] group"
          >
            <Plus size={18} className="text-ink-600 group-hover:text-volt-400 transition-colors" />
            <span className="text-sm text-ink-600 group-hover:text-volt-400 transition-colors font-medium">New project</span>
          </motion.div>
        </motion.div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        orgId={currentOrgId}
      />
    </div>
  )
}

function ProjectCard({ project, onDelete }) {
  const statusCfg = getProjectStatusConfig(project.status)
  const navigate = useNavigate()

  const menuItems = [
    { icon: Edit2, label: 'Edit', onClick: () => navigate(`/projects/${project.id}/edit`) },
    { separator: true },
    { icon: Trash2, label: 'Delete', danger: true, onClick: onDelete },
  ]

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
    >
      <Card hover className="group relative h-full flex flex-col" onClick={() => navigate(`/projects/${project.id}`)}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-volt-400/10 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-volt-400 text-base">{project.name?.charAt(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(statusCfg.color, statusCfg.bg)}>{statusCfg.label}</Badge>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu
                trigger={
                  <button className="w-6 h-6 rounded-md hover:bg-ink-700 flex items-center justify-center text-ink-600 hover:text-ink-300 opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal size={13} />
                  </button>
                }
                items={menuItems}
              />
            </div>
          </div>
        </div>

        <h3 className="font-display font-semibold text-ink-100 text-sm mb-1 line-clamp-1">{project.name}</h3>
        <p className="text-xs text-ink-500 line-clamp-2 flex-1">{project.description}</p>

        <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-1.5 text-xs text-ink-600">
          <Calendar size={11} />
          <span>{formatDate(project.created_at)}</span>
        </div>
      </Card>
    </motion.div>
  )
}

function CreateProjectModal({ open, onClose, orgId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: (data) => projectApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['projects'])
      toast.success('Project created! 🎉')
      setForm({ name: '', description: '' })
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name) errs.name = 'Name is required'
    if (!form.description) errs.description = 'Description is required'
    if (Object.keys(errs).length) return setErrors(errs)
    mutation.mutate({ ...form, org_id: orgId })
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Project Name" placeholder="e.g. Marketing Website" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
        <Textarea label="Description" placeholder="What's this project about?" value={form.description} onChange={set('description')} error={errors.description} rows={3} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create project</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Project Detail ────────────────────────────────────
export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreateTask, setShowCreateTask] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId).then((r) => r.data),
  })

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner size={24} /></div>
  if (!project) return <div className="p-6 text-ink-500">Project not found</div>

  const statusCfg = getProjectStatusConfig(project.status)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-200 mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back to projects
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-volt-400/10 flex items-center justify-center">
            <span className="font-display font-bold text-volt-400 text-lg">{project.name?.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-ink-50">{project.name}</h1>
              <Badge className={cn(statusCfg.color, statusCfg.bg)}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-ink-500">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)}>
            <Edit2 size={13} /> Edit
          </Button>
          <Button size="sm" onClick={() => setShowCreateTask(true)}>
            <Plus size={13} /> Add task
          </Button>
        </div>
      </div>

      <div className="surface rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={14} className="text-ink-500" />
          <h2 className="font-display font-semibold text-sm text-ink-300">Tasks</h2>
        </div>
        <p className="text-sm text-ink-600">
          Navigate to <Link to="/tasks" className="text-volt-400 hover:underline">Tasks</Link> to manage tasks for this project.
        </p>
      </div>
    </div>
  )
}
