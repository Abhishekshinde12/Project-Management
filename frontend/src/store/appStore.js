import { create } from 'zustand'

export const useAppStore = create((set) => ({
  sidebarCollapsed: false,
  activeProject: null,
  activeTask: null,
  taskModalOpen: false,

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setActiveProject: (p) => set({ activeProject: p }),
  setActiveTask: (t) => set({ activeTask: t }),
  openTaskModal: (task = null) => set({ taskModalOpen: true, activeTask: task }),
  closeTaskModal: () => set({ taskModalOpen: false, activeTask: null }),
}))
