import { createContext, useContext, useState } from 'react'
import api from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shopspot_user')
    return saved ? JSON.parse(saved) : null
  })

  function persist(authResponse) {
    localStorage.setItem('shopspot_token', authResponse.token)
    localStorage.setItem('shopspot_user', JSON.stringify(authResponse))
    setUser(authResponse)
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    persist(res.data)
    return res.data
  }

  async function register(payload) {
    const res = await api.post('/auth/register', payload)
    persist(res.data)
    return res.data
  }

  function logout() {
    localStorage.removeItem('shopspot_token')
    localStorage.removeItem('shopspot_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
