import { groupByDate, formatDate, deduplicateShows } from "@/lib/utils"
import { fetchRAShows } from "@/lib/sources/ra"
import { fetchLevontinShows } from "@/lib/sources/levontin"
import { fetchTicketmasterShows } from "@/lib/sources/ticketmaster"
import { fetchHameretz2Shows } from "@/lib/sources/hameretz2"
import { fetchGagarinShows } from "@/lib/sources/gagarin"
import { fillMissingImages } from "@/lib/images"
import { getCachedShows, saveShows, getCachedSources } from "@/lib/db"
import ShowCard from "@/components/ShowCard"
import SourceBadge from "@/components/SourceBadge"
import { Show } from "@/lib/types"

export const dynamic = "force-dynamic"

async function loadShows() {
  const cached = getCachedShows()
  if (cached) return { ...cached, fromCache: true }

  const days = 14

  const results = await Promise.allSettled([
    fetchRAShows(days),
    fetchLevontinShows(days),
    fetchTicketmasterShows(days),
    fetchHameretz2Shows(days),
    fetchGagarinShows(days),
  ])

  const labels = ["Resident Advisor", "Levontin 7", "Ticketmaster", "המרץ 2", "Gagarin"]
  const sources: Record<string, number | string> = {}
  const allShows: Show[] = []

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sources[labels[i]] = r.value.length
      allShows.push(...r.value)
    } else {
      sources[labels[i]] = "error"
    }
  })

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
  const shows = await fillMissingImages(deduped)

  saveShows(shows, sources)

  return { shows, sources, fromCache: false }
}

export default async function Home() {
  const { shows, sources, fromCache } = await loadShows()
  const grouped = groupByDate(shows)
  const dates = Object.keys(grouped).sort()

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent">
            Tel Aviv Shows
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">
            Music in the city, next 2 weeks
            <span className="ml-2 text-gray-600 text-xs">{fromCache ? "· cached" : "· just updated"}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(sources).map(([name, count]) => (
              <SourceBadge key={name} name={name} count={count} />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {dates.length === 0 ? (
          <p className="text-gray-400">No shows found. Check back soon.</p>
        ) : (
          dates.map((date) => (
            <section key={date} className="mb-10">
              <h2 className="text-base font-bold text-yellow-300 mb-4 border-b border-white/10 pb-2">
                {formatDate(date)}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {grouped[date].map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
