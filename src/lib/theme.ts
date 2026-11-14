import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const listeners = new Set<() => void>()
const META: Record<Theme, string> = { dark: '#0b0a09', light: '#ece7dd' }

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
  try {
    localStorage.setItem('theme', theme)
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useTheme = () => useSyncExternalStore(subscribe, getTheme)
