import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

const API_KEY = process.env.SONGKICK_API_KEY ?? ""

// Songkick metro area ID for Tel Aviv
const TEL_AVIV_METRO_ID = 29247

export async function fetchSongkickShows(days = 3): Promise<Show[]> {
  if (!API_KEY) return []

  const dateFrom = new Date()
  const dateTo = new Date()
  dateTo.setDate(dateTo.getDate() + days)

  const fmt = (d: Date) => d.toISOString().split("T")[0]

  const url = new URL(
    `https://api.songkick.com/api/3.0/metro_areas/${TEL_AVIV_METRO_ID}/calendar.json`
  )
  url.searchParams.set("apikey", API_KEY)
  url.searchParams.set("min_date", fmt(dateFrom))
  url.searchParams.set("max_date", fmt(dateTo))
  url.searchParams.set("per_page", "50")

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return []

  const data = await res.json()
  const events = data?.resultsPage?.results?.event
  if (!Array.isArray(events)) return []

  return events.map((event: Record<string, unknown>) => {
    const performance = Array.isArray(event.performance) ? event.performance : []
    const headliner = performance.find((p: Record<string, unknown>) => p.billing === "headline") ?? performance[0]
    const venue = event.venue as Record<string, unknown> | undefined

    return {
      id: randomId("sk", String(event.id)),
      artist: (headliner?.displayName as string) ?? "Unknown",
      venue: (venue?.displayName as string) ?? "Unknown Venue",
      date: (event.start as Record<string, unknown>)?.date as string ?? "",
      time: (event.start as Record<string, unknown>)?.time as string | undefined,
      url: (event.uri as string) ?? "",
      source: "Songkick",
      imageUrl: undefined,
    }
  })
}
