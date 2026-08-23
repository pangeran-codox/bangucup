import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import { queryClient } from '@/app/queryClient'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (val: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () => {
        queryClient.clear() // hapus semua cached query saat logout
        set({ user: null, token: null, isAuthenticated: false })
      },

      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'bangucup-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // _hasHydrated TIDAK di-persist — selalu false saat fresh load
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true)
        } else {
          useAuthStore.setState({ _hasHydrated: true })
        }
      },
    }
  )
)
