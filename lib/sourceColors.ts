export const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  "Resident Advisor": { bg: "bg-rose-500",    text: "text-white" },
  "Levontin 7":       { bg: "bg-emerald-500", text: "text-white" },
  Ticketmaster:       { bg: "bg-sky-500",      text: "text-white" },
  "המרץ 2":           { bg: "bg-orange-500",  text: "text-white" },
  Gagarin:            { bg: "bg-violet-500",   text: "text-white" },
}

export function sourceColor(name: string) {
  return SOURCE_COLORS[name] ?? { bg: "bg-gray-600", text: "text-white" }
}
