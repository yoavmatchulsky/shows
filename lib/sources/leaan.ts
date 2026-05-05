import { Show } from "@/lib/types"
import { randomId } from "@/lib/utils"

// Leaan (לאן) — Israeli ticketing platform
// Scrapes the music/concerts category filtered to Tel Aviv
export async function fetchLeaanShows(days = 3): Promise<Show[]> {
  try {
    const url = "https://www.leaan.co.il/he/events/music?city=tel-aviv"
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; shows-tlv/1.0)" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const html = await res.text()
    const shows = parseLeaanHtml(html, days)
    return shows
  } catch {
    return []
  }
}

function parseLeaanHtml(html: string, days: number): Show[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  const shows: Show[] = []

  // Leaan renders event cards with data attributes and structured markup
  // Match event cards by looking for common patterns
  const cardPattern = /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let match

  while ((match = cardPattern.exec(html)) !== null) {
    const card = match[1]

    const titleMatch = card.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
    const artist = titleMatch ? stripTags(titleMatch[1]).trim() : null
    if (!artist) continue

    const venueMatch = card.match(/class="[^"]*venue[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    const venue = venueMatch ? stripTags(venueMatch[1]).trim() : "Tel Aviv"

    const dateAttrMatch = card.match(/data-date="([^"]+)"/)
    const dateTextMatch = card.match(/class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    let date = dateAttrMatch?.[1] ?? ""
    if (!date && dateTextMatch) date = parseHebrewDate(stripTags(dateTextMatch[1]).trim())
    if (!date) continue

    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime()) || eventDate > cutoff) continue

    const linkMatch = card.match(/href="([^"]+)"/i)
    const path = linkMatch?.[1] ?? ""
    const url = path.startsWith("http") ? path : `https://www.leaan.co.il${path}`

    const imgMatch = card.match(/<img[^>]+src="([^"]+)"/i)

    shows.push({
      id: randomId("leaan", artist + date),
      artist,
      venue,
      date,
      url,
      source: "Leaan",
      imageUrl: imgMatch?.[1],
    })
  }

  return shows
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
}

// Basic Hebrew month mapping for date parsing if needed
function parseHebrewDate(text: string): string {
  const months: Record<string, string> = {
    ינואר: "01", פברואר: "02", מרץ: "03", אפריל: "04",
    מאי: "05", יוני: "06", יולי: "07", אוגוסט: "08",
    ספטמבר: "09", אוקטובר: "10", נובמבר: "11", דצמבר: "12",
  }
  const m = text.match(/(\d{1,2})[.\s]+([^\d\s]+)[,\s]+(\d{4})/)
  if (!m) return ""
  const month = months[m[2]]
  if (!month) return ""
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`
}
