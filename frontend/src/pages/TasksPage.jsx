import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Calendar, MessageSquare, Trash2, MoreHorizontal
} from 'lucide-react'
import { taskApi, projectApi, commentApi } from '@/api/services'
import { taskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import {
  Button, Modal, Input, Textarea, Select, Badge,
  Spinner, EmptyState, Avatar, DropdownMenu
} from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import {
  getPriorityConfig, getStatusConfig, formatDate, isOverdue,
  extractError, timeAgo, cn
} from '@/utils/helpers'
import toast from 'react-hot-toast'

const STATUSES = ['todo', 'in_progress', 'in_review', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

// ── Tasks Page ────────────────────────────────────────
export default function TasksPage() {
  const { currentOrgId } = useAuthStore()
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const [boardKey, setBoardKey] = useState(0)  // bump to force KanbanBoard to re-read IDs

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d ? [d] : []
    }),
    enabled: !!currentOrgId,
  })

  // Default to first project once loaded
  const projId = selectedProjectId || projects[0]?.id

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track work across projects"
        actions={
          <div className="flex items-center gap-2">
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
        <EmptyState
          icon={Plus}
          title="No projects found"
          description="Create a project first to start adding tasks."
        />
      ) : (
        <KanbanBoard projectId={projId} onTaskClick={setActiveTask} boardKey={boardKey} />
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

// ── Kanban Board ──────────────────────────────────────
// No GET /tasks/all/:proj_id exists, so we:
// 1. Store created task IDs in localStorage (taskStore)
// 2. On mount, fetch each task individually via GET /tasks/:id
// 3. Keep results in React Query cache — survives navigation but not refresh
//    (refresh re-fetches from backend using the persisted IDs)
function KanbanBoard({ projectId, onTaskClick, boardKey = 0 }) {
  const qc = useQueryClient()
  const [taskIds, setTaskIds] = useState(() => taskStore.getIds(projectId))

  // Re-read IDs when projectId changes
  useEffect(() => {
    setTaskIds(taskStore.getIds(projectId))
  }, [projectId, boardKey])

  // Fetch each task individually — parallel queries
  const taskQueries = taskIds.map((id) => ({
    queryKey: ['task', id],
    queryFn:  () => taskApi.get(id).then((r) => r.data),
    staleTime: 30_000,
  }))

  // useQueries isn't imported yet — use a custom hook pattern instead
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId || taskIds.length === 0) {
      setTasks([])
      return
    }
    setLoading(true)
    Promise.all(
      taskIds.map((id) =>
        // Check cache first
        qc.getQueryData(['task', id])
          ? Promise.resolve(qc.getQueryData(['task', id]))
          : taskApi.get(id).then((r) => {
              qc.setQueryData(['task', id], r.data)
              return r.data
            }).catch(() => null) // task may have been deleted on backend
      )
    ).then((results) => {
      const valid = results.filter(Boolean)
      // Remove IDs for tasks that no longer exist on backend
      const validIds = valid.map((t) => t.id)
      taskIds.forEach((id) => {
        if (!validIds.includes(id)) taskStore.removeId(projectId, id)
      })
      setTasks(valid)
      setLoading(false)
    })
  }, [projectId, taskIds.join(',')])

  // Expose a refresh fn so mutations can trigger a reload
  useEffect(() => {
    qc.setQueryData(['tasks-refresh', projectId], { refresh: () => setTaskIds(taskStore.getIds(projectId)) })
  }, [projectId])

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  if (loading && tasks.length === 0) {
    return <div className="flex justify-center pt-12"><Spinner size={24} /></div>
  }

  return (
    <div className="flex gap-3 overflow-x-auto flex-1 pb-2 mt-1">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={grouped[status] || []}
          onTaskClick={onTaskClick}
          projectId={projectId}
          onTasksChanged={() => setTaskIds(taskStore.getIds(projectId))}
        />
      ))}
    </div>
  )
}

function KanbanColumn({ status, tasks, onTaskClick, projectId, onTasksChanged }) {
  const cfg = getStatusConfig(status)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="flex-shrink-0 w-72 flex flex-col gap-2">
      {/* Column header */}
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

      {/* Cards */}
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

      {task.description && (
        <p className="text-xs text-ink-600 line-clamp-1 mb-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn('text-[10px]', priorityCfg.color, priorityCfg.bg)}>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
          {priorityCfg.label}
        </Badge>

        {task.due_date && (
          <div className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-coral-400' : 'text-ink-600')}>
            <Calendar size={9} />
            {formatDate(task.due_date)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Create Task Modal ─────────────────────────────────
function CreateTaskModal({ open, onClose, projectId, defaultStatus = 'todo', onCreated }) {
  const qc = useQueryClient()

  const emptyForm = () => ({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: defaultStatus,
    proj_id: projectId || '',
  })

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  // Sync proj_id and status if props change while modal is closed
  useEffect(() => {
    if (!open) return
    setForm((f) => ({ ...f, proj_id: projectId || f.proj_id, status: defaultStatus }))
  }, [open, projectId, defaultStatus])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: (data) => taskApi.create(data),
    onSuccess: (res) => {
      const newTask = res.data
      // Persist ID to localStorage so it survives refresh
      taskStore.addId(projectId, newTask.id)
      // Cache the full task object so KanbanBoard can read it without a fetch
      qc.setQueryData(['task', newTask.id], newTask)
      toast.success('Task created!')
      setForm(emptyForm())
      setErrors({})
      onCreated?.()  // tell KanbanBoard to re-read IDs from localStorage
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
    if (!form.proj_id)            errs.proj_id     = 'Project is required'
    if (Object.keys(errs).length) return setErrors(errs)

    mutation.mutate({
      proj_id:     form.proj_id,
      title:       form.title.trim(),
      description: form.description.trim(),
      due_date:    new Date(form.due_date).toISOString(),
      priority:    form.priority,
      status:      form.status,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="What needs to be done?"
          value={form.title}
          onChange={set('title')}
          error={errors.title}
          autoFocus
        />
        <Textarea
          label="Description"
          placeholder="Add more details..."
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={form.priority}
            onChange={set('priority')}
            options={PRIORITIES.map((p) => ({
              value: p,
              label: p.charAt(0).toUpperCase() + p.slice(1),
            }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={set('status')}
            options={STATUSES.map((s) => ({
              value: s,
              label: getStatusConfig(s).label,
            }))}
          />
        </div>
        <Input
          label="Due Date"
          type="datetime-local"
          value={form.due_date}
          onChange={set('due_date')}
          error={errors.due_date}
        />
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
  const [comment, setComment] = useState('')
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
      // Update the individual task cache — KanbanBoard reads from here
      qc.setQueryData(['task', task.id], res.data)
      setEditingStatus(false)
      toast.success('Status updated')
      onClose()  // close so board re-renders with updated task
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => taskApi.delete(task.id),
    onSuccess: () => {
      // Remove from localStorage and React Query cache
      taskStore.removeId(task.proj_id, task.id)
      qc.removeQueries(['task', task.id])
      toast.success('Task deleted')
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => commentApi.delete(task.id),
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
        {/* Meta */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Clickable status badge to update */}
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
                    <button
                      key={s}
                      onClick={() => updateStatusMutation.mutate(s)}
                      className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-ink-800 transition-colors', cfg.color)}
                    >
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
              <Calendar size={10} /> {formatDate(task.due_date)}
              {overdue && ' · Overdue'}
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
                  taskId={task.id}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && comment.trim()) {
                  e.preventDefault()
                  commentMutation.mutate(comment.trim())
                }
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              loading={commentMutation.isPending}
              disabled={!comment.trim()}
              onClick={() => commentMutation.mutate(comment.trim())}
            >
              Send
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t border-ink-800">
          <Button
            variant="danger"
            size="sm"
            onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
            loading={deleteMutation.isPending}
          >
            <Trash2 size={12} /> Delete task
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

function CommentItem({ comment, taskId, onDelete }) {
  return (
    <div className="flex gap-2.5 group">
      <Avatar name="U" size="sm" className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-ink-300">User</span>
          <span className="text-xs text-ink-600">{timeAgo(comment.created_at)}</span>
          <button
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 text-ink-600 hover:text-coral-400 transition-all p-0.5"
          >
            <X size={11} />
          </button>
        </div>
        <p className="text-xs text-ink-400 leading-relaxed">{comment.text}</p>
      </div>
    </div>
  )
}