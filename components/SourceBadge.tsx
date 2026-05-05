import { sourceColor } from "@/lib/sourceColors"

export default function SourceBadge({ name, count }: { name: string; count: number | string }) {
  const { bg, text } = sourceColor(name)
  const label = typeof count === "number" ? `${count} shows` : "unavailable"
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${bg} ${text}`}>
      {name} · {label}
    </span>
  )
}
