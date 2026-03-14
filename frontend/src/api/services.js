import { api } from './client'

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login: (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  refresh: () => api.post('/auth/refresh'),
  logout:  () => api.post('/auth/logout'),
}

// ── Users ─────────────────────────────────────────────
export const userApi = {
  me: () => api.get('/user/me'),
  get:    (id)       => api.get(`/user/${id}/`),
  create: (data)     => api.post('/user/', data),
  update: (id, data) => api.patch(`/user/${id}`, data),
  delete: (id)       => api.delete(`/user/${id}`),
}

// ── Organizations ─────────────────────────────────────
export const orgApi = {
  getAll:       ()               => api.get('/org/'),           // GET /org/ — all orgs for current user
  get:          (id)              => api.get(`/org/${id}`),
  create:       (data)            => api.post('/org/', data),
  update:       (id, data)        => api.patch(`/org/${id}`, data),
  delete:       (id)              => api.delete(`/org/${id}`),
  // Members
  getMembers:   (orgId)           => api.get(`/org/${orgId}/members`),
  addMember:    (orgId, userId)   => api.post(`/org/${orgId}/members?user_id=${userId}`),
  removeMember: (orgId, memberId) => api.delete(`/org/${orgId}/members/${memberId}`),
}

// ── Projects ──────────────────────────────────────────
// GET /project/all/{org_id}      → list all projects for an org
// GET /project/{project_id}      → get one project  (your note says org_id but OpenAPI schema says project_id — using project_id)
// POST /project/                 → create
// PATCH /project/{project_id}    → update
// DELETE /project/{project_id}   → delete
export const projectApi = {
  getAll: (orgId)        => api.get(`/project/all/${orgId}`),
  get:    (projectId)    => api.get(`/project/${projectId}`),
  create: (data)         => api.post('/project/', data),
  update: (id, data)     => api.patch(`/project/${id}`, data),
  delete: (id)           => api.delete(`/project/${id}`),
}

// ── Tasks ─────────────────────────────────────────────
// NOTE: There is no GET /tasks/all/:proj_id endpoint.
// Tasks are added to a local cache on creation and fetched individually.
export const taskApi = {
  get:            (id)              => api.get(`/tasks/${id}`),
  create:         (data)            => api.post('/tasks/', data),
  update:         (id, data)        => api.patch(`/tasks/${id}`, data),
  delete:         (id)              => api.delete(`/tasks/${id}`),
  // Assignees
  getAssignees:   (taskId)          => api.get(`/tasks/${taskId}/assignees`),
  addAssignee:    (taskId, userId)  => api.post(`/tasks/${taskId}/assignees?user_id=${userId}`),
  removeAssignee: (taskId, userId)  => api.delete(`/tasks/${taskId}/assignees/${userId}`),
}

// ── Comments ──────────────────────────────────────────
// GET    /comments/{task_id}    → all comments for a task
// POST   /comments/{task_id}    → create comment
// PATCH  /comments/{task_id}    → update comment  (task_id in path per your API)
// DELETE /comments/{task_id}    → delete comment  (task_id in path per your API)
export const commentApi = {
  getAll: (taskId)        => api.get(`/comments/${taskId}`),
  create: (taskId, data)  => api.post(`/comments/${taskId}`, data),
  update: (taskId, data)  => api.patch(`/comments/${taskId}`, data),
  delete: (taskId)        => api.delete(`/comments/${taskId}`),
}