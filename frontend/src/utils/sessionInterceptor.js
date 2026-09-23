import axios from 'axios'

export const SESSION_REJECTED_EVENT = 'session-rejected'

// true when the failed request carried the given session header
const sentHeader = (error, name) => {
  const headers = error.config && error.config.headers
  if (!headers) return false
  return Boolean(typeof headers.get === 'function' ? headers.get(name) : headers[name])
}

// Installs one axios response interceptor for the whole application, before
// the first request is sent. When the API rejects a session (HTTP 401) the
// stored token is removed and a SESSION_REJECTED_EVENT tells the matching
// context to log out, so the user can sign in again. Errors carry the API's
// own generic message instead of axios's "Request failed with status code".
//
// sessions: { headerName: localStorageKey }
export const installSessionInterceptor = (sessions) =>
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const response = error.response

      if (response && response.status === 401) {
        for (const [headerName, storageKey] of Object.entries(sessions)) {
          if (sentHeader(error, headerName)) {
            localStorage.removeItem(storageKey)
            window.dispatchEvent(new CustomEvent(SESSION_REJECTED_EVENT, { detail: headerName }))
          }
        }
      }

      if (response && response.data && typeof response.data.message === 'string') {
        error.message = response.data.message
      }

      return Promise.reject(error)
    }
  )
