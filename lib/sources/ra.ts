import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

const TEL_AVIV_AREA_ID = 413

const EVENTS_QUERY = `
  query TLVEvents($dateFrom: DateTime!, $dateTo: DateTime!) {
    eventListings(
      filters: { areas: { eq: ${TEL_AVIV_AREA_ID} }, listingDate: { gte: $dateFrom, lte: $dateTo } }
      pageSize: 50
      page: 1
    ) {
      data {
        event {
          id
          title
          date
          venue { name }
          artists { name }
          contentUrl
          flyerFront
          content
          cost
          lineup
        }
      }
    }
  }
`

export async function fetchRAShows(days = 3): Promise<Show[]> {
  const dateFrom = new Date().toISOString().split("T")[0]
  const dateTo = new Date(Date.now() + days * 86400000).toISOString().split("T")[0]

  try {
    const res = await fetch("https://ra.co/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)",
        Referer: "https://ra.co/events/il/telaviv",
      },
      body: JSON.stringify({ query: EVENTS_QUERY, variables: { dateFrom, dateTo } }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return []
    const data = await res.json()
    const events = data?.data?.eventListings?.data ?? []

    return events.map((item: Record<string, unknown>) => {
      const event = item.event as Record<string, unknown>
      const artists = Array.isArray(event.artists)
        ? (event.artists as Array<{ name: string }>).map((a) => a.name).join(", ")
        : ""
      const title = (event.title as string) ?? ""
      const artist = artists || title

      const imageUrl = event.flyerFront as string | undefined
      const rawContent = (event.content as string) ?? ""
      const description = rawContent.replace(/<[^>]+>/g, "").trim().slice(0, 200) || undefined

      return {
        id: randomId("ra", String(event.id)),
        artist,
        venue: (event.venue as Record<string, unknown>)?.name as string ?? "Tel Aviv",
        date: (event.date as string)?.split("T")[0] ?? "",
        time: (event.date as string)?.split("T")[1]?.slice(0, 5),
        url: `https://ra.co${event.contentUrl as string}`,
        source: "Resident Advisor",
        imageUrl,
        description,
      }
    })
  } catch {
    return []
  }
}
