import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

export async function fetchHameretz2Shows(days = 14): Promise<Show[]> {
  try {
    const res = await fetch("https://hameretz2.org", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return parseCards(await res.text(), days)
  } catch {
    return []
  }
}

function parseCards(html: string, days: number): Show[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today.getTime() + days * 86400000)
  const year = today.getFullYear()

  const shows: Show[] = []

  // Each card: class="zygo-event-card ..."
  const cardRe = /class="zygo-event-card[^>]+>([\s\S]*?)(?=class="zygo-event-card|<\/section>)/g
  let m: RegExpExecArray | null

  while ((m = cardRe.exec(html)) !== null) {
    const card = m[1]

    const dateMatch = card.match(/class="event-datetime"[^>]*>(\d{2})\.(\d{2})</)
    if (!dateMatch) continue
    const date = `${year}-${dateMatch[2]}-${dateMatch[1]}`
    const eventDate = new Date(date + "T00:00:00")
    if (eventDate < today || eventDate > cutoff) continue

    const titleMatch = card.match(/class="event-title"[^>]*>([\s\S]*?)<\/h/)
    const artist = titleMatch ? stripTags(titleMatch[1]).trim() : null
    if (!artist) continue

    const linkMatch = card.match(/href="(https:\/\/tickets\.hameretz2\.org\/event\/[^"]+)"/)
    const url = linkMatch?.[1] ?? "https://hameretz2.org"

    const imgMatch = card.match(/class="event-image"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/)

    const summaryMatch = card.match(/class="event-summary"[^>]*>([\s\S]*?)<\/div>/)
    const description = summaryMatch
      ? stripTags(summaryMatch[1]).trim().slice(0, 200) || undefined
      : undefined

    shows.push({
      id: randomId("h2", artist + date),
      artist,
      venue: "המרץ 2",
      date,
      url,
      source: "המרץ 2",
      imageUrl: imgMatch?.[1],
      description,
    })
  }

  return shows
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#8211;/g, "–")
}
