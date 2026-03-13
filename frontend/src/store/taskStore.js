// Persists task IDs per project in localStorage.
// Since the API has no GET /tasks/all/:proj_id, we store the IDs ourselves
// and fetch each task individually on mount.

const KEY = (projectId) => `pm-task-ids:${projectId}`

export const taskStore = {
  getIds: (projectId) => {
    try {
      return JSON.parse(localStorage.getItem(KEY(projectId)) || '[]')
    } catch {
      return []
    }
  },

  addId: (projectId, taskId) => {
    const ids = taskStore.getIds(projectId)
    if (!ids.includes(taskId)) {
      localStorage.setItem(KEY(projectId), JSON.stringify([...ids, taskId]))
    }
  },

  removeId: (projectId, taskId) => {
    const ids = taskStore.getIds(projectId).filter((id) => id !== taskId)
    localStorage.setItem(KEY(projectId), JSON.stringify(ids))
  },
}