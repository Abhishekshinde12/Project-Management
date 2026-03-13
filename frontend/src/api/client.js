import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(original))
      }

      original._retry = true
      isRefreshing = true

      try {
        // Call /auth/refresh directly (NOT /api/auth/refresh).
        // The refresh_token cookie has path="/auth/refresh" on the backend,
        // so the browser only sends it when the request URL is exactly /auth/refresh.
        // The dedicated Vite proxy rule for /auth/refresh forwards this to FastAPI
        // without any path rewriting.
        await axios.post('/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)