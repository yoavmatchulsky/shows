import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

// Levontin 7 — WordPress site with events in the URL as ?sd={unix_timestamp}
export async function fetchLevontinShows(days = 3): Promise<Show[]> {
  try {
    const res = await fetch("https://levontin7.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const html = await res.text()
    return parseEvents(html, days)
  } catch {
    return []
  }
}

function parseEvents(html: string, days: number): Show[] {
  const now = Date.now()
  const cutoff = now + days * 86400000

  const seen = new Set<string>()
  const shows: Show[] = []

  // Links look like: /events/{slug}/?sd=1778356800&ed=1778371140
  const pattern = /href="(https?:\/\/levontin7\.com\/events\/([^/?#"]+)\/?[^"]*sd=(\d{9,10}))/g
  let match

  while ((match = pattern.exec(html)) !== null) {
    const url = match[1].split("&")[0].split("?")[0] + `?sd=${match[3]}`
    const slug = match[2]
    const startTs = parseInt(match[3]) * 1000

    if (startTs < now || startTs > cutoff) continue
    if (seen.has(slug)) continue
    seen.add(slug)

    const date = new Date(startTs).toISOString().split("T")[0]
    const time = new Date(startTs).toTimeString().slice(0, 5)
    const artist = decodeURIComponent(slug).replace(/-\d+$/, "").replace(/-/g, " ").trim()

    shows.push({
      id: randomId("lev", slug + date),
      artist: capitalize(artist),
      venue: "Levontin 7",
      date,
      time,
      url: `https://levontin7.com/events/${slug}/`,
      source: "Levontin 7",
    })
  }

  return shows
}

function capitalize(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}
