import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

// Eventim Israel — major Israeli ticketing platform
export async function fetchEventimShows(days = 3): Promise<Show[]> {
  try {
    const url = "https://www.eventim.co.il/en/concerts?city=Tel+Aviv"
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const html = await res.text()
    return parseEventimHtml(html, days)
  } catch {
    return []
  }
}

function parseEventimHtml(html: string, days: number): Show[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const shows: Show[] = []

  // Eventim uses structured list items for events
  const itemPattern = /<(?:li|div)[^>]*class="[^"]*(?:event-item|product-item|event-card)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div)>/gi
  let match

  while ((match = itemPattern.exec(html)) !== null) {
    const card = match[1]

    const titleMatch = card.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)
    const artist = titleMatch ? stripTags(titleMatch[1]).trim() : null
    if (!artist) continue

    const venueMatch = card.match(/class="[^"]*(?:venue|location)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    const venue = venueMatch ? stripTags(venueMatch[1]).trim() : "Tel Aviv"

    const dateMatch = card.match(/datetime="([^"]+)"/) ?? card.match(/data-date="([^"]+)"/)
    let date = dateMatch?.[1]?.split("T")[0] ?? ""

    if (!date) {
      const textDateMatch = card.match(/(\d{2})[./](\d{2})[./](\d{4})/)
      if (textDateMatch) date = `${textDateMatch[3]}-${textDateMatch[2]}-${textDateMatch[1]}`
    }

    if (!date) continue

    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime()) || eventDate < today || eventDate > cutoff) continue

    const linkMatch = card.match(/href="([^"]+)"/i)
    const path = linkMatch?.[1] ?? ""
    const url = path.startsWith("http") ? path : `https://www.eventim.co.il${path}`

    const imgMatch = card.match(/<img[^>]+src="([^"]+)"/i)

    shows.push({
      id: randomId("eventim", artist + date),
      artist,
      venue,
      date,
      url,
      source: "Eventim",
      imageUrl: imgMatch?.[1],
    })
  }

  return shows
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
}
