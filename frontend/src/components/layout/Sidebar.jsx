import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Users, Settings,
  ChevronLeft, LogOut, CheckSquare, ChevronDown
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { authApi } from '@/api/services'
import { Avatar } from '@/components/ui'
import { cn } from '@/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'  },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks'     },
  { to: '/members',   icon: Users,           label: 'Members'   },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const handleLogout = async () => {
    try { await authApi.logout() } catch (_) {}
    // ✅ Clear ALL React Query cache so the next user starts fresh
    qc.clear()
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex-shrink-0 h-screen bg-ink-950 border-r border-ink-800 flex flex-col overflow-hidden z-20"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-ink-800 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-volt-400 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-black text-ink-950 text-xs leading-none">P</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-display font-bold text-ink-100 text-lg whitespace-nowrap"
              >
                Plane
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-100 group relative',
                isActive
                  ? 'bg-volt-400/10 text-volt-400'
                  : 'text-ink-500 hover:bg-ink-800 hover:text-ink-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-volt-400 rounded-full"
                  />
                )}
                <Icon size={16} className="flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap font-medium"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-ink-800 p-2 space-y-1 flex-shrink-0">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-ink-500 hover:bg-ink-800 hover:text-ink-200 transition-colors text-sm"
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft size={16} />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs">
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <Avatar name={user.name || user.email || 'U'} size="sm" className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink-200 truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-ink-600 truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-ink-700 text-ink-600 hover:text-coral-400 transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut size={13} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.aside>
  )
}