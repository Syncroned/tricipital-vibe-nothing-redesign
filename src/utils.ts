import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(ts?: number | string): string {
  if (!ts) return ''
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(`${ts} UTC`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(ts?: number | string): string {
  if (!ts) return ''
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(`${ts} UTC`)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const difficulties = [
  { label: 'Auto', color: '#a0a0a0' },
  { label: 'Easy', color: '#3fd6e8' },
  { label: 'Normal', color: '#2fcf6e' },
  { label: 'Hard', color: '#f0ab2e' },
  { label: 'Harder', color: '#ff6d2e' },
  { label: 'Insane', color: '#ff4a5e' },
  { label: 'Easy Demon', color: '#d24fe0' },
  { label: 'Medium Demon', color: '#b04ae8' },
  { label: 'Hard Demon', color: '#9a3fc0' },
  { label: 'Insane Demon', color: '#7a4ad0' },
  { label: 'Extreme Demon', color: '#e0405a' },
]

export const levelTypes = [
  { label: 'Classic', color: '#9a7a4e' },
  { label: 'Platformer', color: '#5e8a7a' },
]

export function difficultyColor(label: string) {
  return difficulties.find((d) => d.label === label)?.color ?? '#8C8C8C'
}

export function typeColor(label: string) {
  return levelTypes.find((t) => t.label === label)?.color ?? '#8C8C8C'
}
