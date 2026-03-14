import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FolderKanban, CheckSquare, Users, ArrowRight,
  Settings, Plus, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { projectApi, orgApi } from '@/api/services'
import { taskStore } from '@/store/taskStore'
import { Card, Spinner, Badge, Button, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { formatDate, getStatusConfig, getPriorityConfig, getProjectStatusConfig, cn } from '@/utils/helpers'

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function DashboardPage() {
  const { user, currentOrgId } = useAuthStore()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const { data: projects = [], isLoading: projLoading } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => {
      const d = r.data; 
      console.log(d)
      return Array.isArray(d) ? d : d ? [d] : []
    }),
    enabled: !!currentOrgId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', currentOrgId],
    queryFn: () => orgApi.getMembers(currentOrgId).then((r) => r.data),
    enabled: !!currentOrgId,
  })

  // Derive task counts from localStorage (taskStore) across all projects
  const allTaskIds = projects.flatMap((p) => taskStore.getIds(p.id))
  const totalTasks = allTaskIds.length

  // Project status breakdown
  const activeProjects   = projects.filter((p) => p.status === 'active').length
  const archivedProjects = projects.filter((p) => p.status === 'archived').length

  const stats = [
    {
      label: 'Projects',
      value: projLoading ? '—' : projects.length,
      sub: projLoading ? '' : `${activeProjects} active · ${archivedProjects} archived`,
      icon: FolderKanban,
      color: 'text-volt-400',
      bg: 'bg-volt-400/10',
      to: '/projects',
    },
    {
      label: 'Tasks',
      value: totalTasks,
      sub: 'across all projects',
      icon: CheckSquare,
      color: 'text-azure-400',
      bg: 'bg-azure-400/10',
      to: '/tasks',
    },
    {
      label: 'Members',
      value: members.length,
      sub: `${members.filter(m => m.role === 'admin').length} admin · ${members.filter(m => m.role === 'member').length} member`,
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      to: '/members',
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={`${greeting}${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋`}
          subtitle="Here's what's happening across your workspace"
          actions={
            currentOrgId && (
              <Button size="sm" onClick={() => navigate('/projects')}>
                <FolderKanban size={13} /> View projects
              </Button>
            )
          }
        />
      </motion.div>

      {!currentOrgId ? (
        <NoOrgState />
      ) : (
        <>
          {/* KPI row — 3 real stats only */}
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={stagger.item}>
                <Link to={s.to}>
                  <Card hover className="flex items-center gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
                      <s.icon size={18} className={s.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-display font-bold text-ink-50 leading-none">{s.value}</p>
                      <p className="text-xs font-medium text-ink-400 mt-0.5">{s.label}</p>
                      {s.sub && <p className="text-[10px] text-ink-600 mt-0.5 truncate">{s.sub}</p>}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Project status breakdown bar */}
          {projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
              className="surface rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-display font-semibold text-ink-400 uppercase tracking-wider">Project breakdown</p>
                <p className="text-xs text-ink-600">{projects.length} total</p>
              </div>
              {/* Status bar */}
              <div className="flex rounded-full overflow-hidden h-2 mb-3 bg-ink-800">
                {activeProjects > 0 && (
                  <div
                    className="bg-volt-400 transition-all"
                    style={{ width: `${(activeProjects / projects.length) * 100}%` }}
                  />
                )}
                {archivedProjects > 0 && (
                  <div
                    className="bg-ink-600 transition-all"
                    style={{ width: `${(archivedProjects / projects.length) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <span className="w-2 h-2 rounded-full bg-volt-400" /> Active ({activeProjects})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <span className="w-2 h-2 rounded-full bg-ink-600" /> Archived ({archivedProjects})
                </div>
              </div>
            </motion.div>
          )}

          {/* Bottom grid */}
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid lg:grid-cols-2 gap-4"
          >
            {/* Recent Projects */}
            <motion.div variants={stagger.item} className="surface rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-ink-200 text-sm">Recent Projects</h2>
                <Link to="/projects" className="text-xs text-ink-500 hover:text-volt-400 flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={11} />
                </Link>
              </div>

              {projLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-ink-600">No projects yet</p>
                  <Link to="/projects" className="text-xs text-volt-400 hover:underline mt-1 inline-block">
                    Create your first project →
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.slice(0, 5).map((proj) => {
                    const statusCfg = getProjectStatusConfig(proj.status)
                    const taskCount = taskStore.getIds(proj.id).length
                    return (
                      <Link
                        key={proj.id}
                        to={`/projects/${proj.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-ink-800 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-volt-400/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-display font-bold text-volt-400">
                              {proj.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-200 group-hover:text-ink-50 truncate transition-colors">
                              {proj.name}
                            </p>
                            <p className="text-[10px] text-ink-600">{taskCount} task{taskCount !== 1 ? 's' : ''} · {formatDate(proj.created_at)}</p>
                          </div>
                        </div>
                        <Badge className={cn('shrink-0 text-[10px]', statusCfg.color, statusCfg.bg)}>
                          {statusCfg.label}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={stagger.item} className="surface rounded-xl p-4">
              <h2 className="font-display font-semibold text-ink-200 text-sm mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'New Project',    icon: FolderKanban, to: '/projects', color: 'text-volt-400',  bg: 'bg-volt-400/10'  },
                  { label: 'New Task',       icon: CheckSquare,  to: '/tasks',    color: 'text-azure-400', bg: 'bg-azure-400/10' },
                  { label: 'Invite Member',  icon: Users,        to: '/members',  color: 'text-amber-400', bg: 'bg-amber-400/10' },
                  { label: 'Settings',       icon: Settings,     to: '/settings', color: 'text-ink-400',   bg: 'bg-ink-400/10'   },
                ].map(({ label, icon: Icon, to, color, bg }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-ink-900 hover:bg-ink-800 border border-ink-800 hover:border-ink-700 transition-all group"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                      <Icon size={15} className={color} />
                    </div>
                    <span className="text-xs text-ink-400 group-hover:text-ink-200 transition-colors font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  )
}

function NoOrgState() {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-volt-400/10 flex items-center justify-center mb-4">
        <FolderKanban size={24} className="text-volt-400" />
      </div>
      <h2 className="font-display font-bold text-xl text-ink-100 mb-2">No organization selected</h2>
      <p className="text-sm text-ink-500 max-w-xs mb-6">
        Create or join an organization to start managing projects and tasks with your team.
      </p>
      <Button onClick={() => navigate('/settings')}>Set up organization</Button>
    </motion.div>
  )
}