const BASE = '/auth'

interface AuthResponse {
  token: string
  username: string
  role: 'admin' | 'player'
}

async function request(path: string, body: object): Promise<AuthResponse> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data as AuthResponse
}

export const api = {
  register: (username: string, password: string) => request('/register', { username, password }),
  login: (username: string, password: string) => request('/login', { username, password }),
}
