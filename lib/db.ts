import Database from "better-sqlite3"
import path from "path"
import { Show } from "@/lib/types"

const DB_PATH = path.join(process.cwd(), "shows.db")
const TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma("journal_mode = WAL")
    _db.exec(`
      CREATE TABLE IF NOT EXISTS shows (
        id          TEXT PRIMARY KEY,
        artist      TEXT NOT NULL,
        venue       TEXT NOT NULL,
        date        TEXT NOT NULL,
        time        TEXT,
        url         TEXT,
        source      TEXT,
        image_url   TEXT,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  }
  return _db
}

export function getCachedShows(): { shows: Show[]; sources: Record<string, number | string> } | null {
  const db = getDb()
  const row = db.prepare("SELECT value FROM meta WHERE key = 'last_fetched'").get() as { value: string } | undefined
  if (!row) return null

  const age = Date.now() - parseInt(row.value)
  if (age > TTL_MS) return null

  const rows = db.prepare("SELECT * FROM shows ORDER BY date ASC, artist ASC").all() as Array<Record<string, string>>
  const shows: Show[] = rows.map((r) => ({
    id: r.id,
    artist: r.artist,
    venue: r.venue,
    date: r.date,
    time: r.time ?? undefined,
    url: r.url ?? "",
    source: r.source ?? "",
    imageUrl: r.image_url ?? undefined,
    description: r.description ?? undefined,
  }))

  const sourceCounts: Record<string, number> = {}
  for (const s of shows) {
    sourceCounts[s.source] = (sourceCounts[s.source] ?? 0) + 1
  }

  return { shows, sources: sourceCounts }
}

export function saveShows(shows: Show[], sources: Record<string, number | string>): void {
  const db = getDb()

  const insert = db.prepare(`
    INSERT OR REPLACE INTO shows (id, artist, venue, date, time, url, source, image_url, description)
    VALUES (@id, @artist, @venue, @date, @time, @url, @source, @image_url, @description)
  `)

  db.transaction(() => {
    db.prepare("DELETE FROM shows").run()
    for (const show of shows) {
      insert.run({
        id: show.id,
        artist: show.artist,
        venue: show.venue,
        date: show.date,
        time: show.time ?? null,
        url: show.url,
        source: show.source,
        image_url: show.imageUrl ?? null,
        description: show.description ?? null,
      })
    }
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_fetched', ?)").run(String(Date.now()))
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sources', ?)").run(JSON.stringify(sources))
  })()
}

export function getCachedSources(): Record<string, number | string> {
  const db = getDb()
  const row = db.prepare("SELECT value FROM meta WHERE key = 'last_sources'").get() as { value: string } | undefined
  return row ? JSON.parse(row.value) : {}
}

export function getCacheAge(): number | null {
  const db = getDb()
  const row = db.prepare("SELECT value FROM meta WHERE key = 'last_fetched'").get() as { value: string } | undefined
  return row ? Date.now() - parseInt(row.value) : null
}
