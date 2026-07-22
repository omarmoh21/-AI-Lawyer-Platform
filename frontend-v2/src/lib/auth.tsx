import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from './api'
import type { AuthUser } from './api'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, phone: string, city: string, password: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await api.login(email, password)
    setUser(loggedInUser)
  }, [])

  const signup = useCallback(
    async (name: string, email: string, phone: string, city: string, password: string) => {
      const newUser = await api.signup(name, email, phone, city, password)
      setUser(newUser)
    },
    [],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
