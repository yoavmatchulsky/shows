import { NextResponse } from "next/server"
import { fetchRAShows } from "@/lib/sources/ra"
import { fetchLevontinShows } from "@/lib/sources/levontin"
import { fetchTicketmasterShows } from "@/lib/sources/ticketmaster"
import { fetchHameretz2Shows } from "@/lib/sources/hameretz2"
import { fetchGagarinShows } from "@/lib/sources/gagarin"
import { deduplicateShows } from "@/lib/utils"

export const revalidate = 3600

export async function GET() {
  const days = 14

  const results = await Promise.allSettled([
    fetchRAShows(days),
    fetchLevontinShows(days),
    fetchTicketmasterShows(days),
    fetchHameretz2Shows(days),
    fetchGagarinShows(days),
  ])

  const allShows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + days)

  const filtered = allShows.filter((s) => {
    if (!s.date || !s.artist) return false
    const d = new Date(s.date + "T00:00:00")
    return d >= today && d <= cutoff
  })

  const deduped = deduplicateShows(filtered)
  deduped.sort((a, b) => a.date.localeCompare(b.date) || a.artist.localeCompare(b.artist))

  const sources = {
    "Resident Advisor": results[0].status === "fulfilled" ? results[0].value.length : "error",
    "Levontin 7": results[1].status === "fulfilled" ? results[1].value.length : "error",
    Ticketmaster: results[2].status === "fulfilled" ? results[2].value.length : "error",
    "המרץ 2": results[3].status === "fulfilled" ? results[3].value.length : "error",
    Gagarin: results[4].status === "fulfilled" ? results[4].value.length : "error",
  }

  return NextResponse.json({ shows: deduped, sources, fetchedAt: new Date().toISOString() })
}
