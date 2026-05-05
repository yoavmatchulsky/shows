import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

const APP_ID = "shows-tlv-aggregator"

// Bandsintown v3 API — public app_id endpoint (no auth key needed for basic event search)
export async function fetchBandsintownShows(days = 3): Promise<Show[]> {
  const dateFrom = new Date()
  const dateTo = new Date()
  dateTo.setDate(dateTo.getDate() + days)

  const fmt = (d: Date) => d.toISOString().split("T")[0]

  // Search events by location using the events search endpoint
  const url = new URL("https://rest.bandsintown.com/v1.0/events/search")
  url.searchParams.set("app_id", APP_ID)
  url.searchParams.set("location", "Tel Aviv, Israel")
  url.searchParams.set("radius", "10")
  url.searchParams.set("date", `${fmt(dateFrom)},${fmt(dateTo)}`)

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return []

  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map((event: Record<string, unknown>) => {
    const offers = Array.isArray(event.offers) ? event.offers : []
    const ticketUrl = offers[0]?.url ?? (event.url as string) ?? ""
    const venue = event.venue as Record<string, unknown> | undefined

    return {
      id: randomId("bit", event.id as string),
      artist: (event.artist as Record<string, unknown>)?.name as string ?? "Unknown",
      venue: (venue?.name as string) ?? "Unknown Venue",
      date: (event.datetime as string)?.split("T")[0] ?? "",
      time: (event.datetime as string)?.split("T")[1]?.slice(0, 5),
      url: ticketUrl,
      source: "Bandsintown",
      imageUrl: (event.artist as Record<string, unknown>)?.image_url as string | undefined,
    }
  })
}
