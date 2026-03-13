import { clsx } from 'clsx'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export const cn = (...inputs) => clsx(...inputs)

export const formatDate = (date) => {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export const timeAgo = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const isOverdue = (date) => {
  if (!date) return false
  return isPast(new Date(date))
}

export const getPriorityConfig = (priority) => {
  const map = {
    low:      { label: 'Low',      color: 'text-azure-400',  bg: 'bg-azure-400/10',   dot: 'bg-azure-400' },
    medium:   { label: 'Medium',   color: 'text-volt-400',   bg: 'bg-volt-400/10',    dot: 'bg-volt-400'  },
    high:     { label: 'High',     color: 'text-amber-400',  bg: 'bg-amber-400/10',   dot: 'bg-amber-400' },
    critical: { label: 'Critical', color: 'text-coral-400',  bg: 'bg-coral-400/10',   dot: 'bg-coral-400' },
  }
  return map[priority] || map.low
}

export const getStatusConfig = (status) => {
  const map = {
    todo:        { label: 'To Do',       color: 'text-ink-300',  bg: 'bg-ink-300/10',   icon: '○' },
    in_progress: { label: 'In Progress', color: 'text-azure-400', bg: 'bg-azure-400/10', icon: '◑' },
    in_review:   { label: 'In Review',   color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '◕' },
    done:        { label: 'Done',        color: 'text-volt-400',  bg: 'bg-volt-400/10',  icon: '●' },
  }
  return map[status] || map.todo
}

export const getProjectStatusConfig = (status) => {
  const map = {
    active:   { label: 'Active',   color: 'text-volt-400',   bg: 'bg-volt-400/10'   },
    archived: { label: 'Archived', color: 'text-ink-400',    bg: 'bg-ink-400/10'    },
  }
  return map[status] || map.active
}

export const getRoleConfig = (role) => {
  const map = {
    owner:  { label: 'Owner',  color: 'text-volt-400',  bg: 'bg-volt-400/10'  },
    admin:  { label: 'Admin',  color: 'text-azure-400', bg: 'bg-azure-400/10' },
    member: { label: 'Member', color: 'text-ink-300',   bg: 'bg-ink-300/10'   },
  }
  return map[role] || map.member
}

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

export const avatarColors = [
  'bg-volt-400/20 text-volt-400',
  'bg-azure-400/20 text-azure-400',
  'bg-coral-400/20 text-coral-400',
  'bg-amber-400/20 text-amber-400',
  'bg-ink-300/20 text-ink-300',
]

export const getAvatarColor = (name = '') => {
  const idx = name.charCodeAt(0) % avatarColors.length
  return avatarColors[idx]
}

export const extractError = (err) =>
  err?.response?.data?.detail || err?.message || 'Something went wrong'
