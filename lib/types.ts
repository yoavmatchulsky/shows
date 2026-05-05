export interface Show {
  id: string
  artist: string
  venue: string
  date: string // ISO date string
  time?: string
  url: string
  source: string
  imageUrl?: string
  description?: string
}
