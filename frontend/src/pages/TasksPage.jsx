import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Calendar, MessageSquare, Trash2, ChevronDown, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { taskApi, projectApi, commentApi, userApi } from '@/api/services'
import { taskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { Button, Modal, Input, Textarea, Select, Badge, Spinner, EmptyState, Avatar } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { getPriorityConfig, getStatusConfig, formatDate, isOverdue, extractError, timeAgo, cn } from '@/utils/helpers'
import { isToday, isFuture, isPast, startOfDay, endOfDay, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const STATUSES   = ['todo', 'in_progress', 'in_review', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

// ── Tasks Page ────────────────────────────────────────
export default function TasksPage() {
  const { currentOrgId } = useAuthStore()
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [activeTask, setActiveTask]   = useState(null)
  const [boardKey, setBoardKey]       = useState(0)
  const [view, setView]               = useState('board') // 'board' | 'timeline'

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => {
      const d = r.data; return Array.isArray(d) ? d : d ? [d] : []
    }),
    enabled: !!currentOrgId,
  })

  const projId = selectedProjectId || projects[0]?.id

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track work across projects"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 bg-ink-900 rounded-lg border border-ink-800">
              {['board', 'timeline'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                    view === v ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {projects.length > 0 && (
              <select
                value={projId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-ink-800 border border-ink-700 text-sm text-ink-200 focus:outline-none focus:border-volt-400/50"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-ink-900">{p.name}</option>
                ))}
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
      ) : view === 'board' ? (
        <KanbanBoard projectId={projId} onTaskClick={setActiveTask} boardKey={boardKey} />
      ) : (
        <TimelineView projectId={projId} onTaskClick={setActiveTask} boardKey={boardKey} />
      )}

      {projId && (
        <CreateTaskModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          projectId={projId}
          defaultStatus="todo"
          onCreated={() => setBoardKey((k) => k + 1)}
        />
      )}

      <TaskDetailModal
        task={activeTask}
        onClose={() => setActiveTask(null)}
      />
    </div>
  )
}

// ── Shared task loader hook ───────────────────────────
function useProjectTasks(projectId, boardKey) {
  const qc = useQueryClient()
  const [taskIds, setTaskIds] = useState(() => taskStore.getIds(projectId))
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTaskIds(taskStore.getIds(projectId))
  }, [projectId, boardKey])

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

  const refresh = () => setTaskIds(taskStore.getIds(projectId))
  return { tasks, loading, refresh }
}

// ── Kanban Board ──────────────────────────────────────
function KanbanBoard({ projectId, onTaskClick, boardKey }) {
  const { tasks, loading, refresh } = useProjectTasks(projectId, boardKey)

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  if (loading && tasks.length === 0) return <div className="flex justify-center pt-12"><Spinner size={24} /></div>

  return (
    <div className="flex gap-3 overflow-x-auto flex-1 pb-2 mt-1">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={grouped[status] || []}
          onTaskClick={onTaskClick}
          projectId={projectId}
          onTasksChanged={refresh}
        />
      ))}
    </div>
  )
}

// ── Timeline View (today / upcoming / past) ───────────
function TimelineView({ projectId, onTaskClick, boardKey }) {
  const { tasks, loading } = useProjectTasks(projectId, boardKey)

  const now = new Date()

  // Bucket tasks by due date
  const todayTasks    = tasks.filter((t) => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done')
  const upcomingTasks = tasks.filter((t) => t.due_date && isFuture(endOfDay(parseISO(t.due_date))) && !isToday(parseISO(t.due_date)) && t.status !== 'done')
  const pastTasks     = tasks.filter((t) => t.due_date && isPast(endOfDay(parseISO(t.due_date))) && t.status !== 'done')
  const doneTasks     = tasks.filter((t) => t.status === 'done')
  const noDueTasks    = tasks.filter((t) => !t.due_date && t.status !== 'done')

  if (loading && tasks.length === 0) return <div className="flex justify-center pt-12"><Spinner size={24} /></div>

  if (tasks.length === 0) return (
    <EmptyState icon={Calendar} title="No tasks yet" description="Create your first task to see it here." />
  )

  return (
    <div className="flex-1 overflow-y-auto space-y-5 mt-2 pr-1">
      {/* TODAY — always visible, highlighted */}
      <TimelineSection
        title="Today"
        count={todayTasks.length}
        tasks={todayTasks}
        onTaskClick={onTaskClick}
        accent="border-volt-400/30 bg-volt-400/5"
        emptyText="No tasks due today"
        defaultOpen
        badge={todayTasks.length > 0 ? { text: 'Due today', className: 'text-volt-400 bg-volt-400/10' } : null}
      />

      {/* OVERDUE */}
      {pastTasks.length > 0 && (
        <TimelineSection
          title="Overdue"
          count={pastTasks.length}
          tasks={pastTasks}
          onTaskClick={onTaskClick}
          accent="border-coral-500/30 bg-coral-500/5"
          emptyText=""
          defaultOpen
          badge={{ text: 'Past due', className: 'text-coral-400 bg-coral-400/10' }}
        />
      )}

      {/* UPCOMING */}
      <TimelineSection
        title="Upcoming"
        count={upcomingTasks.length}
        tasks={upcomingTasks}
        onTaskClick={onTaskClick}
        accent=""
        emptyText="No upcoming tasks"
        defaultOpen={upcomingTasks.length > 0}
      />

      {/* NO DUE DATE */}
      {noDueTasks.length > 0 && (
        <TimelineSection
          title="No due date"
          count={noDueTasks.length}
          tasks={noDueTasks}
          onTaskClick={onTaskClick}
          accent=""
          emptyText=""
          defaultOpen={false}
        />
      )}

      {/* DONE */}
      {doneTasks.length > 0 && (
        <TimelineSection
          title="Completed"
          count={doneTasks.length}
          tasks={doneTasks}
          onTaskClick={onTaskClick}
          accent=""
          emptyText=""
          defaultOpen={false}
          muted
        />
      )}
    </div>
  )
}

function TimelineSection({ title, count, tasks, onTaskClick, accent, emptyText, defaultOpen, badge, muted }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-xl border border-ink-800 overflow-hidden', accent)}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-800/40 transition-colors"
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={14} className="text-ink-500" />
        </motion.div>
        <span className={cn('font-display font-semibold text-sm', muted ? 'text-ink-500' : 'text-ink-200')}>
          {title}
        </span>
        <span className="text-xs font-mono text-ink-600 bg-ink-800 px-1.5 py-0.5 rounded">{count}</span>
        {badge && <Badge className={cn('text-[10px] ml-auto', badge.className)}>{badge.text}</Badge>}
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-ink-600 py-3 text-center">{emptyText}</p>
              ) : (
                tasks.map((task) => (
                  <TimelineTaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} muted={muted} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TimelineTaskRow({ task, onClick, muted }) {
  const priorityCfg = getPriorityConfig(task.priority)
  const statusCfg   = getStatusConfig(task.status)
  const overdue     = isOverdue(task.due_date)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group',
        muted
          ? 'border-ink-800/50 hover:border-ink-700 opacity-60 hover:opacity-100'
          : 'border-ink-800 hover:border-ink-600 bg-ink-900/50 hover:bg-ink-900'
      )}
    >
      {/* Status icon */}
      <span className={cn('text-base shrink-0', statusCfg.color)}>{statusCfg.icon}</span>

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', muted ? 'text-ink-500 line-through' : 'text-ink-200 group-hover:text-ink-50')}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-ink-600 truncate">{task.description}</p>
        )}
      </div>

      {/* Right: priority + due date */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={cn('text-[10px]', priorityCfg.color, priorityCfg.bg)}>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
          {priorityCfg.label}
        </Badge>
        {task.due_date && (
          <span className={cn('text-[10px] flex items-center gap-1', overdue ? 'text-coral-400' : 'text-ink-600')}>
            <Calendar size={9} />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Kanban Column ─────────────────────────────────────
function KanbanColumn({ status, tasks, onTaskClick, projectId, onTasksChanged }) {
  const cfg = getStatusConfig(status)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="shrink-0 w-72 flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className={`text-sm ${cfg.color}`}>{cfg.icon}</span>
        <span className="text-xs font-display font-semibold text-ink-400 uppercase tracking-wider">{cfg.label}</span>
        <span className="ml-auto text-xs text-ink-600 font-mono bg-ink-800 px-1.5 py-0.5 rounded">{tasks.length}</span>
        <button
          onClick={() => setShowCreate(true)}
          className="w-5 h-5 rounded flex items-center justify-center text-ink-600 hover:text-volt-400 hover:bg-volt-400/10 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-2 min-h-[120px]">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink-800 h-20 flex items-center justify-center">
            <p className="text-xs text-ink-700">No tasks</p>
          </div>
        )}
      </div>

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId}
        defaultStatus={status}
        onCreated={onTasksChanged}
      />
    </div>
  )
}

function TaskCard({ task, onClick }) {
  const priorityCfg = getPriorityConfig(task.priority)
  const overdue = isOverdue(task.due_date)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="bg-ink-900 border border-ink-800 hover:border-ink-600 rounded-xl p-3 cursor-pointer group transition-all hover:shadow-lg hover:shadow-ink-950/50"
    >
      <p className="text-sm text-ink-200 font-medium leading-snug mb-2 line-clamp-2">{task.title}</p>
      {task.description && <p className="text-xs text-ink-600 line-clamp-1 mb-2">{task.description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn('text-[10px]', priorityCfg.color, priorityCfg.bg)}>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
          {priorityCfg.label}
        </Badge>
        {task.due_date && (
          <div className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-coral-400' : 'text-ink-600')}>
            <Calendar size={9} /> {formatDate(task.due_date)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Create Task Modal ─────────────────────────────────
function CreateTaskModal({ open, onClose, projectId, defaultStatus = 'todo', onCreated }) {
  const qc = useQueryClient()
  const emptyForm = () => ({ title: '', description: '', due_date: '', priority: 'medium', status: defaultStatus, proj_id: projectId || '' })
  const [form, setForm]   = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setForm((f) => ({ ...f, proj_id: projectId || f.proj_id, status: defaultStatus }))
  }, [open, projectId, defaultStatus])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: (data) => taskApi.create(data),
    onSuccess: (res) => {
      const newTask = res.data
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

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" placeholder="What needs to be done?" value={form.title} onChange={set('title')} error={errors.title} autoFocus />
        <Textarea label="Description" placeholder="Add more details..." value={form.description} onChange={set('description')} error={errors.description} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={set('priority')}
            options={PRIORITIES.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <Select label="Status" value={form.status} onChange={set('status')}
            options={STATUSES.map((s) => ({ value: s, label: getStatusConfig(s).label }))} />
        </div>
        <Input label="Due Date" type="datetime-local" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create task</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Task Detail Modal ─────────────────────────────────
function TaskDetailModal({ task, onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [comment, setComment]           = useState('')
  const [editingStatus, setEditingStatus] = useState(false)

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', task?.id],
    queryFn:  () => commentApi.getAll(task.id).then((r) => r.data),
    enabled:  !!task?.id,
  })

  const commentMutation = useMutation({
    mutationFn: (text) => commentApi.create(task.id, { text }),
    onSuccess:  () => { qc.invalidateQueries(['comments', task.id]); setComment('') },
    onError:    (e) => toast.error(extractError(e)),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => taskApi.update(task.id, { ...task, status }),
    onSuccess: (res) => {
      qc.setQueryData(['task', task.id], res.data)
      setEditingStatus(false)
      toast.success('Status updated')
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => taskApi.delete(task.id),
    onSuccess: () => {
      taskStore.removeId(task.proj_id, task.id)
      qc.removeQueries(['task', task.id])
      toast.success('Task deleted')
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: () => commentApi.delete(task.id),
    onSuccess:  () => qc.invalidateQueries(['comments', task.id]),
    onError:    (e) => toast.error(extractError(e)),
  })

  if (!task) return null

  const priorityCfg = getPriorityConfig(task.priority)
  const statusCfg   = getStatusConfig(task.status)
  const overdue     = isOverdue(task.due_date)

  return (
    <Modal open={!!task} onClose={onClose} title={task.title} size="lg">
      <div className="space-y-5">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <button
              onClick={() => setEditingStatus(!editingStatus)}
              className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium font-mono cursor-pointer hover:opacity-80 transition-opacity', statusCfg.color, statusCfg.bg)}
            >
              {statusCfg.icon} {statusCfg.label} ▾
            </button>
            {editingStatus && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-ink-900 border border-ink-700 rounded-lg py-1 min-w-36 shadow-xl">
                {STATUSES.map((s) => {
                  const cfg = getStatusConfig(s)
                  return (
                    <button key={s} onClick={() => updateStatusMutation.mutate(s)}
                      className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-ink-800 transition-colors', cfg.color)}>
                      {cfg.icon} {cfg.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <Badge className={cn(priorityCfg.color, priorityCfg.bg)}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} /> {priorityCfg.label}
          </Badge>
          {task.due_date && (
            <Badge className={overdue ? 'text-coral-400 bg-coral-400/10' : 'text-ink-400 bg-ink-400/10'}>
              <Calendar size={10} /> {formatDate(task.due_date)}{overdue && ' · Overdue'}
            </Badge>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-ink-300 leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MessageSquare size={11} /> Comments {comments.length > 0 && `(${comments.length})`}
          </p>
          <div className="space-y-3 mb-3 max-h-48 overflow-y-auto pr-1">
            {commentsLoading ? (
              <div className="flex justify-center py-4"><Spinner size={16} /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-ink-600 py-2">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUser={user}
                  onDelete={() => deleteCommentMutation.mutate(c.id)}
                />
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-9 px-3 rounded-lg bg-ink-900 border border-ink-700 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-volt-400/50 transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && comment.trim()) { e.preventDefault(); commentMutation.mutate(comment.trim()) } }}
            />
            <Button size="sm" variant="secondary" loading={commentMutation.isPending} disabled={!comment.trim()}
              onClick={() => commentMutation.mutate(comment.trim())}>
              Send
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t border-ink-800">
          <Button variant="danger" size="sm"
            onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
            loading={deleteMutation.isPending}>
            <Trash2 size={12} /> Delete task
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Comment Item ──────────────────────────────────────
function CommentItem({ comment, currentUser, onDelete }) {
  // Fetch the commenter's profile to show real name
  const { data: author } = useQuery({
    queryKey: ['user-profile', comment.user_id],
    queryFn:  () => userApi.get(comment.user_id).then((r) => r.data),
    enabled:  !!comment.user_id,
    staleTime: 5 * 60 * 1000, // cache for 5 mins — names don't change often
  })

  const displayName  = author?.name || currentUser?.name || 'User'
  const isCurrentUser = comment.user_id && currentUser?.id && comment.user_id === currentUser.id

  return (
    <div className="flex gap-2.5 group">
      <Avatar name={displayName} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-ink-300">{displayName}</span>
          {isCurrentUser && <span className="text-[10px] text-ink-600">(you)</span>}
          <span className="text-xs text-ink-600">{timeAgo(comment.created_at)}</span>
          {isCurrentUser && (
            <button onClick={onDelete} className="ml-auto opacity-0 group-hover:opacity-100 text-ink-600 hover:text-coral-400 transition-all p-0.5">
              <X size={11} />
            </button>
          )}
        </div>
        <p className="text-xs text-ink-400 leading-relaxed">{comment.text}</p>
      </div>
    </div>
  )
}