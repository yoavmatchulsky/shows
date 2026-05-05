import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

const API_KEY = process.env.TICKETMASTER_API_KEY ?? ""

export async function fetchTicketmasterShows(days = 3): Promise<Show[]> {
  if (!API_KEY) return []

  const now = new Date()
  const end = new Date(now.getTime() + days * 86400000)

  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z")

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json")
  url.searchParams.set("apikey", API_KEY)
  url.searchParams.set("countryCode", "IL")
  url.searchParams.set("classificationName", "music")
  url.searchParams.set("startDateTime", fmt(now))
  url.searchParams.set("endDateTime", fmt(end))
  url.searchParams.set("size", "50")
  url.searchParams.set("sort", "date,asc")

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return []

    const data = await res.json()
    const events = data?._embedded?.events
    if (!Array.isArray(events)) return []

    return events.map((event: Record<string, unknown>) => {
      const dates = event.dates as Record<string, unknown>
      const start = dates?.start as Record<string, unknown>
      const date = (start?.localDate as string) ?? ""
      const time = (start?.localTime as string)?.slice(0, 5)

      const embedded = event._embedded as Record<string, unknown> | undefined
      const venues = Array.isArray(embedded?.venues) ? embedded!.venues : []
      const venue = (venues[0] as Record<string, unknown>)?.name as string ?? "Tel Aviv"

      const attractions = Array.isArray(embedded?.attractions) ? embedded!.attractions : []
      const headliner = (attractions[0] as Record<string, unknown> | undefined)
      const artist = (headliner?.name as string) ?? (event.name as string) ?? "Unknown"

      const images = Array.isArray(event.images) ? event.images as Array<Record<string, unknown>> : []
      // Exclude _CUSTOM images — Ticketmaster uses them as generic placeholders
      const specific = images.filter((i) => !String(i.url ?? "").includes("_CUSTOM"))
      const image = specific.find((i) => String(i.url ?? "").includes("ARTIST_PAGE"))
        ?? specific.find((i) => i.ratio === "3_2" && (i.width as number) <= 305)
        ?? specific[0]

      return {
        id: randomId("tm", event.id as string),
        artist,
        venue,
        date,
        time,
        url: (event.url as string) ?? "",
        source: "Ticketmaster",
        imageUrl: image?.url as string | undefined,
      }
    })
  } catch {
    return []
  }
}
