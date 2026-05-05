import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

// Gagarin TLV uses The Events Calendar (tribe_events) WordPress plugin
export async function fetchGagarinShows(days = 14): Promise<Show[]> {
  const dateFrom = new Date().toISOString().split("T")[0]
  const dateTo = new Date(Date.now() + days * 86400000).toISOString().split("T")[0]

  try {
    const url = new URL("https://gagarin.co.il/wp-json/tribe/events/v1/events")
    url.searchParams.set("start_date", dateFrom)
    url.searchParams.set("end_date", dateTo)
    url.searchParams.set("per_page", "50")

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const data = await res.json()
    const events = Array.isArray(data.events) ? data.events : []

    return events.map((event: Record<string, unknown>) => {
      const startDate = (event.start_date as string)?.split(" ")[0] ?? ""
      const startTime = (event.start_date as string)?.split(" ")[1]?.slice(0, 5)
      const image = event.image as Record<string, unknown> | false | undefined
      const imageUrl = image ? (image.url as string | undefined) : undefined

      const rawDesc = stripHtml(event.description as string ?? "")
      const description = rawDesc.slice(0, 200) || undefined

      return {
        id: randomId("gag", String(event.id)),
        artist: stripHtml(event.title as string ?? ""),
        venue: "Gagarin TLV",
        date: startDate,
        time: startTime,
        url: (event.url as string) ?? "https://gagarin.co.il",
        source: "Gagarin",
        imageUrl,
        description,
      }
    })
  } catch {
    return []
  }
}

function stripHtml(str: string): string {
  return str.replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2))))
    .replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim()
}
