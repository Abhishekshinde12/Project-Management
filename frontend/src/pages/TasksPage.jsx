import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Calendar, MessageSquare, Trash2, Edit2,
  ChevronRight, UserPlus, Check, MoreHorizontal, Flag
} from 'lucide-react'
import { taskApi, projectApi, commentApi, userApi, orgApi } from '@/api/services'
import { taskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { Button, Modal, Input, Textarea, Select, Badge, Spinner, EmptyState, Avatar } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { getPriorityConfig, getStatusConfig, formatDate, isOverdue, extractError, timeAgo, cn } from '@/utils/helpers'
import { isToday, isFuture, isPast, endOfDay, parseISO, format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUSES   = ['todo', 'in_progress', 'in_review', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

// ── Shared task loader ────────────────────────────────
function useProjectTasks(projectId, boardKey) {
  const qc = useQueryClient()
  const [taskIds, setTaskIds] = useState(() => taskStore.getIds(projectId))
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setTaskIds(taskStore.getIds(projectId)) }, [projectId, boardKey])

  useEffect(() => {
    if (!projectId || taskIds.length === 0) { setTasks([]); return }
    setLoading(true)
    Promise.all(
      taskIds.map((id) =>
        qc.getQueryData(['task', id])
          ? Promise.resolve(qc.getQueryData(['task', id]))
          : taskApi.get(id).then((r) => { qc.setQueryData(['task', id], r.data); return r.data }).catch(() => null)
      )
    ).then((results) => {
      const valid = results.filter(Boolean)
      taskIds.forEach((id) => { if (!valid.find(t => t.id === id)) taskStore.removeId(projectId, id) })
      setTasks(valid)
      setLoading(false)
    })
  }, [projectId, taskIds.join(',')])

  return { tasks, loading, refresh: () => setTaskIds(taskStore.getIds(projectId)) }
}

// ── Tasks Page ────────────────────────────────────────
export default function TasksPage() {
  const { currentOrgId } = useAuthStore()
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const [boardKey, setBoardKey]     = useState(0)
  const [view, setView]             = useState('list') // 'list' | 'board'

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => {
      const d = r.data; return Array.isArray(d) ? d : d ? [d] : []
    }),
    enabled: !!currentOrgId,
  })

  const projId = selectedProjectId || projects[0]?.id
  const refresh = () => setBoardKey((k) => k + 1)

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track work across projects"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-ink-900 rounded-lg border border-ink-800">
              {['list', 'board'].map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                    view === v ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300')}>
                  {v}
                </button>
              ))}
            </div>
            {projects.length > 0 && (
              <select value={projId || ''} onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-ink-800 border border-ink-700 text-sm text-ink-200 focus:outline-none focus:border-volt-400/50">
                {projects.map((p) => <option key={p.id} value={p.id} className="bg-ink-900">{p.name}</option>)}
              </select>
            )}
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={!projId}>
              <Plus size={13} /> New task
            </Button>
          </div>
        }
      />

      {!projId ? (
        <EmptyState icon={Plus} title="No projects found" description="Create a project first to start adding tasks." />
      ) : view === 'list' ? (
        <ListView projectId={projId} onTaskClick={setActiveTask} boardKey={boardKey} onRefresh={refresh} />
      ) : (
        <KanbanView projectId={projId} onTaskClick={setActiveTask} boardKey={boardKey} onRefresh={refresh} />
      )}

      {projId && (
        <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)}
          projectId={projId} defaultStatus="todo" onCreated={refresh} />
      )}
      <TaskDrawer task={activeTask} onClose={() => setActiveTask(null)} onUpdated={refresh} currentOrgId={currentOrgId} />
    </div>
  )
}

// ── List View (ProofHub-style grouped table) ──────────
function ListView({ projectId, onTaskClick, boardKey, onRefresh }) {
  const { tasks, loading } = useProjectTasks(projectId, boardKey)
  const qc = useQueryClient()

  const now = new Date()
  const todayTasks    = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done')
  const overduesTasks = tasks.filter(t => t.due_date && isPast(endOfDay(parseISO(t.due_date))) && !isToday(parseISO(t.due_date)) && t.status !== 'done')
  const upcomingTasks = tasks.filter(t => t.due_date && isFuture(endOfDay(parseISO(t.due_date))) && !isToday(parseISO(t.due_date)) && t.status !== 'done')
  const noDueTasks    = tasks.filter(t => !t.due_date && t.status !== 'done')
  const doneTasks     = tasks.filter(t => t.status === 'done')

  if (loading && tasks.length === 0) return <div className="flex justify-center pt-12"><Spinner size={24} /></div>
  if (tasks.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState icon={Check} title="No tasks yet" description="Create your first task to get started." />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-1">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_100px_90px_80px] gap-2 px-3 py-1.5 text-[10px] font-medium text-ink-600 uppercase tracking-wider border-b border-ink-800">
        <span>Task</span>
        <span>Assignees</span>
        <span>Due date</span>
        <span>Priority</span>
        <span>Status</span>
      </div>

      {overduesTasks.length > 0 && (
        <TaskGroup title="Overdue" tasks={overduesTasks} onTaskClick={onTaskClick}
          accent="text-coral-400" borderAccent="border-l-coral-500" defaultOpen onRefresh={onRefresh}
          badge={{ text: `${overduesTasks.length} overdue`, className: 'text-coral-400 bg-coral-400/10' }} />
      )}
      <TaskGroup title="Today" tasks={todayTasks} onTaskClick={onTaskClick}
        accent="text-volt-400" borderAccent="border-l-volt-400" defaultOpen onRefresh={onRefresh}
        badge={todayTasks.length > 0 ? { text: 'Due today', className: 'text-volt-400 bg-volt-400/10' } : null} />
      {upcomingTasks.length > 0 && (
        <TaskGroup title="Upcoming" tasks={upcomingTasks} onTaskClick={onTaskClick}
          accent="text-ink-400" borderAccent="" defaultOpen={upcomingTasks.length <= 5} onRefresh={onRefresh} />
      )}
      {noDueTasks.length > 0 && (
        <TaskGroup title="No due date" tasks={noDueTasks} onTaskClick={onTaskClick}
          accent="text-ink-500" borderAccent="" defaultOpen={false} onRefresh={onRefresh} />
      )}
      {doneTasks.length > 0 && (
        <TaskGroup title="Completed" tasks={doneTasks} onTaskClick={onTaskClick}
          accent="text-ink-600" borderAccent="" defaultOpen={false} muted onRefresh={onRefresh} />
      )}
    </div>
  )
}

function TaskGroup({ title, tasks, onTaskClick, accent, borderAccent, defaultOpen, badge, muted, onRefresh }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-ink-800 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/30 transition-colors">
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={13} className="text-ink-600" />
        </motion.div>
        <span className={cn('font-display font-semibold text-sm', muted ? 'text-ink-500' : accent)}>{title}</span>
        <span className="text-xs font-mono text-ink-700 bg-ink-800 px-1.5 py-0.5 rounded">{tasks.length}</span>
        {badge && <Badge className={cn('text-[10px] ml-auto', badge.className)}>{badge.text}</Badge>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="divide-y divide-ink-800/50">
              {tasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-ink-700">No tasks here</div>
              ) : tasks.map((task) => (
                <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} muted={muted} onRefresh={onRefresh} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskRow({ task, onClick, muted, onRefresh }) {
  const qc            = useQueryClient()
  const priorityCfg   = getPriorityConfig(task.priority)
  const statusCfg     = getStatusConfig(task.status)
  const overdue       = isOverdue(task.due_date) && task.status !== 'done'

  // Fetch assignees for this task
  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees', task.id],
    queryFn:  () => taskApi.getAssignees(task.id).then(r => r.data),
    staleTime: 60_000,
  })

  // Fetch user names for assignees
  const assigneeUsers = useQuery({
    queryKey: ['assignee-users', task.id, assignees.map(a => a.user_id).join(',')],
    queryFn: () => Promise.all(assignees.map(a => userApi.get(a.user_id).then(r => r.data).catch(() => null))).then(r => r.filter(Boolean)),
    enabled: assignees.length > 0,
    staleTime: 120_000,
  })

  const updateStatus = useMutation({
    mutationFn: (status) => taskApi.update(task.id, { ...task, status }),
    onSuccess: (res) => { qc.setQueryData(['task', task.id], res.data); onRefresh?.() },
    onError: (e) => toast.error(extractError(e)),
  })

  const users = assigneeUsers.data || []

  return (
    <motion.div layout
      className={cn('grid grid-cols-[1fr_120px_100px_90px_80px] gap-2 items-center px-3 py-2.5 hover:bg-ink-800/20 transition-colors group cursor-pointer', muted && 'opacity-60')}
      onClick={onClick}
    >
      {/* Task name */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Inline status toggle — click circle without opening drawer */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            const next = { todo: 'in_progress', in_progress: 'in_review', in_review: 'done', done: 'todo' }
            updateStatus.mutate(next[task.status] || 'todo')
          }}
          className={cn('text-base shrink-0 hover:scale-110 transition-transform', statusCfg.color)}
          title={`Mark as ${statusCfg.label}`}
        >
          {statusCfg.icon}
        </button>
        <div className="min-w-0">
          <p className={cn('text-sm font-medium truncate', muted ? 'text-ink-500 line-through' : 'text-ink-200 group-hover:text-ink-50')}>
            {task.title}
          </p>
          {task.description && <p className="text-[10px] text-ink-600 truncate">{task.description}</p>}
        </div>
      </div>

      {/* Assignees — stacked avatars */}
      <div className="flex items-center" onClick={e => e.stopPropagation()}>
        <div className="flex -space-x-1.5">
          {users.slice(0, 3).map((u) => (
            <Avatar key={u.id} name={u.name} size="sm"
              className="border border-ink-900 ring-0" title={u.name} />
          ))}
          {users.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-ink-700 border border-ink-900 flex items-center justify-center">
              <span className="text-[9px] font-medium text-ink-300">+{users.length - 3}</span>
            </div>
          )}
        </div>
      </div>

      {/* Due date */}
      <div className={cn('flex items-center gap-1 text-xs', overdue ? 'text-coral-400' : 'text-ink-500')}>
        {task.due_date ? (
          <><Calendar size={10} /> {format(parseISO(task.due_date), 'MMM d')}</>
        ) : <span className="text-ink-700">—</span>}
      </div>

      {/* Priority */}
      <div>
        <Badge className={cn('text-[10px] gap-1', priorityCfg.color, priorityCfg.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', priorityCfg.dot)} />
          {priorityCfg.label}
        </Badge>
      </div>

      {/* Status */}
      <div>
        <Badge className={cn('text-[10px]', statusCfg.color, statusCfg.bg)}>
          {statusCfg.label}
        </Badge>
      </div>
    </motion.div>
  )
}

// ── Kanban View ───────────────────────────────────────
function KanbanView({ projectId, onTaskClick, boardKey, onRefresh }) {
  const { tasks, loading } = useProjectTasks(projectId, boardKey)
  const [createStatus, setCreateStatus] = useState(null)

  const grouped = STATUSES.reduce((acc, s) => { acc[s] = tasks.filter(t => t.status === s); return acc }, {})

  if (loading && tasks.length === 0) return <div className="flex justify-center pt-12"><Spinner size={24} /></div>

  return (
    <div className="flex gap-3 overflow-x-auto flex-1 pb-2 mt-1">
      {STATUSES.map((status) => {
        const cfg = getStatusConfig(status)
        return (
          <div key={status} className="shrink-0 w-72 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1 py-1">
              <span className={cn('text-sm', cfg.color)}>{cfg.icon}</span>
              <span className="text-xs font-display font-semibold text-ink-400 uppercase tracking-wider">{cfg.label}</span>
              <span className="ml-auto text-xs text-ink-600 font-mono bg-ink-800 px-1.5 py-0.5 rounded">{grouped[status].length}</span>
              <button onClick={() => setCreateStatus(status)}
                className="w-5 h-5 rounded flex items-center justify-center text-ink-600 hover:text-volt-400 hover:bg-volt-400/10 transition-colors">
                <Plus size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-2 min-h-30">
              <AnimatePresence>
                {grouped[status].map((task) => (
                  <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
              </AnimatePresence>
              {grouped[status].length === 0 && (
                <div className="rounded-lg border border-dashed border-ink-800 h-20 flex items-center justify-center">
                  <p className="text-xs text-ink-700">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
      <CreateTaskModal open={!!createStatus} onClose={() => setCreateStatus(null)}
        projectId={projectId} defaultStatus={createStatus || 'todo'} onCreated={() => { onRefresh(); setCreateStatus(null) }} />
    </div>
  )
}

function KanbanCard({ task, onClick }) {
  const priorityCfg = getPriorityConfig(task.priority)
  const overdue     = isOverdue(task.due_date)

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees', task.id],
    queryFn: () => taskApi.getAssignees(task.id).then(r => r.data),
    staleTime: 60_000,
  })

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="bg-ink-900 border border-ink-800 hover:border-ink-600 rounded-xl p-3 cursor-pointer group transition-all hover:shadow-lg hover:shadow-ink-950/50">
      <p className="text-sm text-ink-200 font-medium leading-snug mb-2 line-clamp-2">{task.title}</p>
      {task.description && <p className="text-xs text-ink-600 line-clamp-1 mb-2">{task.description}</p>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge className={cn('text-[10px]', priorityCfg.color, priorityCfg.bg)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', priorityCfg.dot)} />{priorityCfg.label}
          </Badge>
          {task.due_date && (
            <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-coral-400' : 'text-ink-600')}>
              <Calendar size={9} />{format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1">
            {assignees.slice(0, 2).map(a => (
              <div key={a.id} className="w-5 h-5 rounded-full bg-volt-400/20 border border-ink-800 flex items-center justify-center">
                <span className="text-[8px] text-volt-400 font-bold">{a.user_id.slice(0, 1).toUpperCase()}</span>
              </div>
            ))}
            {assignees.length > 2 && <div className="w-5 h-5 rounded-full bg-ink-700 border border-ink-800 flex items-center justify-center"><span className="text-[8px] text-ink-400">+{assignees.length - 2}</span></div>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Task Drawer (replaces modal — side panel like ProofHub) ──
function TaskDrawer({ task, onClose, onUpdated, currentOrgId }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [comment, setComment]   = useState('')
  const [editing, setEditing]   = useState(false)
  const [editForm, setEditForm] = useState({})

  // When task changes, reset edit form
  useEffect(() => {
    if (task) setEditForm({ title: task.title, description: task.description, priority: task.priority, status: task.status, due_date: task.due_date ? task.due_date.slice(0, 16) : '' })
  }, [task?.id])

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', task?.id],
    queryFn: () => commentApi.getAll(task.id).then(r => r.data),
    enabled: !!task?.id,
  })

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees', task?.id],
    queryFn: () => taskApi.getAssignees(task.id).then(r => r.data),
    enabled: !!task?.id,
  })

  // Fetch member list to pick assignees from
  const { data: members = [] } = useQuery({
    queryKey: ['members', currentOrgId],
    queryFn: () => orgApi.getMembers(currentOrgId).then(r => r.data),
    enabled: !!currentOrgId && !!task?.id,
  })

  // Fetch member user profiles
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ['member-profiles', members.map(m => m.user_id).join(',')],
    queryFn: () => Promise.all(members.map(m => userApi.get(m.user_id).then(r => r.data).catch(() => null))).then(r => r.filter(Boolean)),
    enabled: members.length > 0,
    staleTime: 120_000,
  })

  const assigneeUserIds = assignees.map(a => a.user_id)

  const updateMutation = useMutation({
    mutationFn: (data) => taskApi.update(task.id, data),
    onSuccess: (res) => {
      qc.setQueryData(['task', task.id], res.data)
      onUpdated?.()
      setEditing(false)
      toast.success('Task updated!')
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => taskApi.delete(task.id),
    onSuccess: () => {
      taskStore.removeId(task.proj_id, task.id)
      qc.removeQueries(['task', task.id])
      onUpdated?.()
      onClose()
      toast.success('Task deleted')
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const commentMutation = useMutation({
    mutationFn: (text) => commentApi.create(task.id, { text }),
    onSuccess: () => { qc.invalidateQueries(['comments', task.id]); setComment('') },
    onError: (e) => toast.error(extractError(e)),
  })

  const addAssigneeMutation = useMutation({
    mutationFn: (userId) => taskApi.addAssignee(task.id, userId),
    onSuccess: () => { qc.invalidateQueries(['assignees', task.id]); toast.success('Assignee added') },
    onError: (e) => toast.error(extractError(e)),
  })

  const removeAssigneeMutation = useMutation({
    mutationFn: (userId) => taskApi.removeAssignee(task.id, userId),
    onSuccess: () => { qc.invalidateQueries(['assignees', task.id]); toast.success('Assignee removed') },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: () => commentApi.delete(task.id),
    onSuccess: () => qc.invalidateQueries(['comments', task.id]),
    onError: (e) => toast.error(extractError(e)),
  })

  if (!task) return null

  const priorityCfg = getPriorityConfig(task.priority)
  const statusCfg   = getStatusConfig(task.status)
  const overdue     = isOverdue(task.due_date) && task.status !== 'done'

  const setEdit = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-130 bg-ink-900 border-l border-ink-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800 shrink-0">
              <div className="flex items-center gap-2">
                <Badge className={cn(statusCfg.color, statusCfg.bg)}>{statusCfg.icon} {statusCfg.label}</Badge>
                {overdue && <Badge className="text-coral-400 bg-coral-400/10">Overdue</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors">
                    <Edit2 size={12} /> Edit
                  </button>
                )}
                <button onClick={onClose}
                  className="w-7 h-7 rounded-lg hover:bg-ink-800 flex items-center justify-center text-ink-500 hover:text-ink-200 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {editing ? (
                /* ── Edit Form ── */
                <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ ...editForm, due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : task.due_date }) }}
                  className="p-5 space-y-4">
                  <Input label="Title" value={editForm.title || ''} onChange={setEdit('title')} autoFocus />
                  <Textarea label="Description" value={editForm.description || ''} onChange={setEdit('description')} rows={3} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Priority" value={editForm.priority || 'medium'} onChange={setEdit('priority')}
                      options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
                    <Select label="Status" value={editForm.status || 'todo'} onChange={setEdit('status')}
                      options={STATUSES.map(s => ({ value: s, label: getStatusConfig(s).label }))} />
                  </div>
                  <Input label="Due Date" type="datetime-local" value={editForm.due_date || ''} onChange={setEdit('due_date')} />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" size="sm" loading={updateMutation.isPending}>Save changes</Button>
                  </div>
                </form>
              ) : (
                /* ── View Mode ── */
                <div className="p-5 space-y-6">
                  {/* Title & description */}
                  <div>
                    <h2 className="font-display font-bold text-lg text-ink-50 leading-snug mb-2">{task.title}</h2>
                    {task.description && <p className="text-sm text-ink-400 leading-relaxed">{task.description}</p>}
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="surface rounded-xl p-3">
                      <p className="text-[10px] font-medium text-ink-600 uppercase tracking-wider mb-1.5">Priority</p>
                      <Badge className={cn('text-xs', priorityCfg.color, priorityCfg.bg)}>
                        <span className={cn('w-2 h-2 rounded-full', priorityCfg.dot)} />{priorityCfg.label}
                      </Badge>
                    </div>
                    <div className="surface rounded-xl p-3">
                      <p className="text-[10px] font-medium text-ink-600 uppercase tracking-wider mb-1.5">Due Date</p>
                      <p className={cn('text-sm font-medium', overdue ? 'text-coral-400' : 'text-ink-200')}>
                        {task.due_date ? formatDate(task.due_date) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Quick status changer */}
                  <div>
                    <p className="text-[10px] font-medium text-ink-600 uppercase tracking-wider mb-2">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUSES.map(s => {
                        const cfg = getStatusConfig(s)
                        const active = task.status === s
                        return (
                          <button key={s} onClick={() => updateMutation.mutate({ ...task, status: s })}
                            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                              active ? `${cfg.color} ${cfg.bg} border-current/20` : 'text-ink-500 border-ink-800 hover:border-ink-600 hover:text-ink-300')}>
                            {cfg.icon} {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div>
                    <p className="text-[10px] font-medium text-ink-600 uppercase tracking-wider mb-2">Assignees</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {memberProfiles.filter(u => assigneeUserIds.includes(u.id)).map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-ink-800 border border-ink-700 group">
                          <Avatar name={u.name} size="sm" />
                          <span className="text-xs text-ink-300">{u.name}</span>
                          <button onClick={() => removeAssigneeMutation.mutate(u.id)}
                            className="w-4 h-4 rounded-full hover:bg-ink-600 flex items-center justify-center text-ink-600 hover:text-coral-400 transition-colors opacity-0 group-hover:opacity-100">
                            <X size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add assignee from member list */}
                    <div className="flex flex-wrap gap-1.5">
                      {memberProfiles.filter(u => !assigneeUserIds.includes(u.id)).map(u => (
                        <button key={u.id} onClick={() => addAssigneeMutation.mutate(u.id)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-ink-500 hover:text-ink-200 border border-dashed border-ink-700 hover:border-ink-500 transition-all">
                          <Avatar name={u.name} size="sm" />
                          {u.name}
                        </button>
                      ))}
                      {memberProfiles.length === 0 && (
                        <p className="text-xs text-ink-700">No org members to assign</p>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <p className="text-[10px] font-medium text-ink-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MessageSquare size={10} /> Comments {comments.length > 0 && `(${comments.length})`}
                    </p>
                    <div className="space-y-3 mb-3 max-h-56 overflow-y-auto pr-1">
                      {commentsLoading ? <div className="flex justify-center py-3"><Spinner size={16} /></div>
                        : comments.length === 0 ? <p className="text-xs text-ink-700 py-2">No comments yet.</p>
                        : comments.map(c => (
                          <CommentItem key={c.id} comment={c} currentUser={user}
                            onDelete={() => deleteCommentMutation.mutate(c.id)} />
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={comment} onChange={e => setComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 h-9 px-3 rounded-lg bg-ink-950 border border-ink-700 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-volt-400/50 transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && comment.trim()) { e.preventDefault(); commentMutation.mutate(comment.trim()) } }}
                      />
                      <Button size="sm" variant="secondary" loading={commentMutation.isPending}
                        disabled={!comment.trim()} onClick={() => commentMutation.mutate(comment.trim())}>
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-ink-800 shrink-0 flex justify-between items-center">
              <Button variant="danger" size="sm"
                onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
                loading={deleteMutation.isPending}>
                <Trash2 size={12} /> Delete
              </Button>
              <p className="text-[10px] text-ink-700">ID: {task.id.slice(0, 8)}...</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Create Task Modal ─────────────────────────────────
function CreateTaskModal({ open, onClose, projectId, defaultStatus = 'todo', onCreated }) {
  const qc = useQueryClient()
  const { currentOrgId } = useAuthStore()
  const emptyForm = () => ({ title: '', description: '', due_date: '', priority: 'medium', status: defaultStatus, proj_id: projectId || '' })
  const [form, setForm]     = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [selectedAssignees, setSelectedAssignees] = useState([])

  useEffect(() => {
    if (!open) return
    setForm(f => ({ ...f, proj_id: projectId || f.proj_id, status: defaultStatus }))
    setSelectedAssignees([])
  }, [open, projectId, defaultStatus])

  const { data: members = [] } = useQuery({
    queryKey: ['members', currentOrgId],
    queryFn: () => orgApi.getMembers(currentOrgId).then(r => r.data),
    enabled: !!currentOrgId && open,
  })
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ['member-profiles', members.map(m => m.user_id).join(',')],
    queryFn: () => Promise.all(members.map(m => userApi.get(m.user_id).then(r => r.data).catch(() => null))).then(r => r.filter(Boolean)),
    enabled: members.length > 0 && open,
    staleTime: 120_000,
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await taskApi.create(data)
      const newTask = res.data
      // Add assignees after creation
      await Promise.all(selectedAssignees.map(uid => taskApi.addAssignee(newTask.id, uid).catch(() => {})))
      return newTask
    },
    onSuccess: (newTask) => {
      taskStore.addId(projectId, newTask.id)
      qc.setQueryData(['task', newTask.id], newTask)
      toast.success('Task created!')
      setForm(emptyForm())
      setErrors({})
      onCreated?.()
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim())       errs.title       = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.due_date)           errs.due_date    = 'Due date is required'
    if (Object.keys(errs).length) return setErrors(errs)
    mutation.mutate({ ...form, title: form.title.trim(), description: form.description.trim(), due_date: new Date(form.due_date).toISOString() })
  }

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" placeholder="What needs to be done?" value={form.title} onChange={set('title')} error={errors.title} autoFocus />
        <Textarea label="Description" placeholder="Add more details..." value={form.description} onChange={set('description')} error={errors.description} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={set('priority')}
            options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <Select label="Status" value={form.status} onChange={set('status')}
            options={STATUSES.map(s => ({ value: s, label: getStatusConfig(s).label }))} />
        </div>
        <Input label="Due Date" type="datetime-local" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />

        {/* Assignees picker */}
        {memberProfiles.length > 0 && (
          <div>
            <label className="text-xs font-medium text-ink-400 uppercase tracking-wider block mb-2">Assignees</label>
            <div className="flex flex-wrap gap-1.5">
              {memberProfiles.map(u => {
                const selected = selectedAssignees.includes(u.id)
                return (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border',
                      selected
                        ? 'border-volt-400/40 bg-volt-400/10 text-volt-400'
                        : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200'
                    )}>
                    <Avatar name={u.name} size="sm" />
                    {u.name}
                    {selected && <Check size={10} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create task</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Comment Item ──────────────────────────────────────
function CommentItem({ comment, currentUser, onDelete }) {
  const { data: author } = useQuery({
    queryKey: ['user-profile', comment.user_id],
    queryFn: () => userApi.get(comment.user_id).then(r => r.data),
    enabled: !!comment.user_id,
    staleTime: 5 * 60_000,
  })
  const displayName   = author?.name || currentUser?.name || 'User'
  const isCurrentUser = comment.user_id && currentUser?.id && comment.user_id === currentUser.id

  return (
    <div className="flex gap-2.5 group">
      <Avatar name={displayName} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-ink-300">{displayName}</span>
          {isCurrentUser && <span className="text-[10px] text-ink-600">(you)</span>}
          <span className="text-[10px] text-ink-700">{timeAgo(comment.created_at)}</span>
          {isCurrentUser && (
            <button onClick={onDelete} className="ml-auto opacity-0 group-hover:opacity-100 text-ink-600 hover:text-coral-400 transition-all p-0.5">
              <X size={10} />
            </button>
          )}
        </div>
        <p className="text-xs text-ink-400 leading-relaxed">{comment.text}</p>
      </div>
    </div>
  )
}