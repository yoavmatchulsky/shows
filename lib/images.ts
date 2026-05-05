import { Show } from "@/lib/types"

// Deezer public search API — no auth needed, good global + Hebrew artist coverage
async function fetchDeezerImage(artistName: string): Promise<string | undefined> {
  try {
    const url = new URL("https://api.deezer.com/search/artist")
    url.searchParams.set("q", artistName)
    url.searchParams.set("limit", "1")

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
    if (!res.ok) return undefined

    const data = await res.json()
    const artist = data?.data?.[0]
    // Deezer returns a generic silhouette for unknown artists — filter those out
    const pic: string | undefined = artist?.picture_medium
    if (!pic || pic.includes("default")) return undefined
    return pic
  } catch {
    return undefined
  }
}

// Strip common Hebrew/English event-description suffixes from Levontin-style slugs
// to get a cleaner artist name for image lookup
function extractArtistForSearch(name: string): string {
  return name
    .replace(/\s+(מופע|השקת|הופעה|לייב|live|concert|tour|album|release|ft\.|feat\.?).*/i, "")
    .trim()
}

export async function fillMissingImages(shows: Show[]): Promise<Show[]> {
  const needImage = shows.filter((s) => !s.imageUrl)
  if (needImage.length === 0) return shows

  // Deduplicate artists so we don't hit Deezer twice for the same name
  const uniqueArtists = [...new Set(needImage.map((s) => extractArtistForSearch(s.artist)))]

  const imageMap = new Map<string, string | undefined>()
  await Promise.all(
    uniqueArtists.map(async (artist) => {
      const img = await fetchDeezerImage(artist)
      imageMap.set(artist, img)
    })
  )

  return shows.map((show) => {
    if (show.imageUrl) return show
    const key = extractArtistForSearch(show.artist)
    const img = imageMap.get(key)
    return img ? { ...show, imageUrl: img } : show
  })
}
