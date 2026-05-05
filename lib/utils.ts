import { Show } from "@/lib/types"
import crypto from "crypto"

export function randomId(prefix: string, seed: string): string {
  const hash = crypto.createHash("md5").update(seed).digest("hex").slice(0, 8)
  return `${prefix}_${hash}`
}

export function deduplicateShows(shows: Show[]): Show[] {
  const seen = new Map<string, Show>()

  for (const show of shows) {
    // Key: normalized artist name + date (ignores venue differences across sources)
    const key = `${normalizeArtist(show.artist)}_${show.date}`
    const existing = seen.get(key)

    if (!existing) {
      seen.set(key, show)
    } else {
      // Prefer the entry with an image or a ticket URL
      if (!existing.imageUrl && show.imageUrl) seen.set(key, { ...existing, imageUrl: show.imageUrl })
      if (!existing.url && show.url) seen.set(key, { ...seen.get(key)!, url: show.url })
    }
  }

  return Array.from(seen.values())
}

function normalizeArtist(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9֐-׿]/g, "")
}

export function groupByDate(shows: Show[]): Record<string, Show[]> {
  const groups: Record<string, Show[]> = {}
  for (const show of shows) {
    if (!groups[show.date]) groups[show.date] = []
    groups[show.date].push(show)
  }
  return groups
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return "Today"
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow"

  return date.toLocaleDateString("en-IL", { weekday: "long", month: "long", day: "numeric" })
}
