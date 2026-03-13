import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FolderKanban, CheckSquare, Users, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { projectApi, taskApi } from '@/api/services'
import { Card, Spinner, Badge, Button } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { formatDate, getPriorityConfig, getStatusConfig, timeAgo } from '@/utils/helpers'

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
}

export default function DashboardPage() {
  const { user, currentOrgId } = useAuthStore()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const { data: projects, isLoading: projLoading } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectApi.getAll(currentOrgId).then((r) => r.data),
    enabled: !!currentOrgId,
  })

  const projectList = Array.isArray(projects) ? projects : projects ? [projects] : []

  const stats = [
    { label: 'Total Projects', value: projLoading ? '—' : projectList.length, icon: FolderKanban, color: 'text-volt-400', bg: 'bg-volt-400/10' },
    { label: 'Active Tasks', value: '—', icon: CheckSquare, color: 'text-azure-400', bg: 'bg-azure-400/10' },
    { label: 'Team Members', value: '—', icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Velocity', value: '↑ 12%', icon: TrendingUp, color: 'text-coral-400', bg: 'bg-coral-400/10' },
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
          {/* Stats row */}
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={stagger.item}>
                <Card className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <div>
                    <p className="text-xl font-display font-bold text-ink-100">{s.value}</p>
                    <p className="text-xs text-ink-500">{s.label}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent projects */}
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid lg:grid-cols-2 gap-4"
          >
            <motion.div variants={stagger.item} className="surface rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-ink-200 text-sm">Recent Projects</h2>
                <Link to="/projects" className="text-xs text-ink-500 hover:text-volt-400 flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={11} />
                </Link>
              </div>

              {projLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : projectList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-ink-600">No projects yet</p>
                  <Link to="/projects" className="text-xs text-volt-400 hover:underline mt-1 inline-block">Create your first project →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectList.slice(0, 5).map((proj) => (
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
                          <p className="text-sm font-medium text-ink-200 group-hover:text-ink-50 truncate transition-colors">{proj.name}</p>
                          <p className="text-xs text-ink-600 truncate">{proj.description}</p>
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-ink-700 group-hover:text-ink-400 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick actions */}
            <motion.div variants={stagger.item} className="surface rounded-xl p-4">
              <h2 className="font-display font-semibold text-ink-200 text-sm mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'New Project', icon: FolderKanban, to: '/projects', color: 'text-volt-400 bg-volt-400/10' },
                  { label: 'New Task', icon: CheckSquare, to: '/tasks', color: 'text-azure-400 bg-azure-400/10' },
                  { label: 'Invite Member', icon: Users, to: '/members', color: 'text-amber-400 bg-amber-400/10' },
                  { label: 'Settings', icon: Clock, to: '/settings', color: 'text-ink-400 bg-ink-400/10' },
                ].map(({ label, icon: Icon, to, color }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-ink-900 hover:bg-ink-800 border border-ink-800 hover:border-ink-700 transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                      <Icon size={15} />
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
      <Button onClick={() => navigate('/settings')}>
        Set up organization
      </Button>
    </motion.div>
  )
}
