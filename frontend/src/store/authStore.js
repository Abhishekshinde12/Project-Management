import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Backend uses httpOnly cookies for access + refresh tokens.
// The browser sends them automatically — we never touch them in JS.
// We only persist: isLoggedIn (so we know whether to show the app or /login),
// user (basic profile), and currentOrgId (workspace selection).

export const useAuthStore = create(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      currentOrgId: null,

      setLoggedIn: (user) => set({ isLoggedIn: true, user }),

      setUser: (user) => set({ user }),

      setCurrentOrg: (orgId) => set({ currentOrgId: orgId }),

      logout: () => set({ isLoggedIn: false, user: null }),
    }),
    {
      name: 'pm-auth',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        currentOrgId: state.currentOrgId,
      }),
    }
  )
)