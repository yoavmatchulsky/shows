import { Show } from "@/lib/types"
import { sourceColor } from "@/lib/sourceColors"
import Image from "next/image"

export default function ShowCard({ show }: { show: Show }) {
  const { bg, text } = sourceColor(show.source)

  return (
    <a
      href={show.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col rounded-2xl bg-gray-900 hover:bg-gray-800 border border-white/10 transition-colors overflow-hidden group"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-gray-800">
        {show.imageUrl ? (
          <Image src={show.imageUrl} alt={show.artist} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl">
            ♪
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4">
        <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text} mb-1`}>
          {show.source}
        </span>

        <p className="font-bold text-base leading-tight line-clamp-2 text-white">{show.artist}</p>

        <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
          <span>{show.venue}</span>
          {show.time && (
            <>
              <span className="text-gray-600">·</span>
              <span>{show.time}</span>
            </>
          )}
        </div>

        {show.description && (
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-3 leading-snug">
            {show.description}
          </p>
        )}
      </div>
    </a>
  )
}
