// The signature ornament: a lapis hairline centered on a small gold-leaf
// lozenge — a restrained nod to manuscript illumination. Used once per page
// (under headers, in the hero) as the single decorative accent.
export default function Illumination({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-l from-green-600/55 to-transparent" />
      <span className="rotate-45 border border-gold-400 bg-gold-300/45 p-[3px]" />
      <span className="h-1 w-1 rotate-45 bg-green-600" />
      <span className="rotate-45 border border-gold-400 bg-gold-300/45 p-[3px]" />
      <span className="h-px flex-1 bg-gradient-to-r from-green-600/55 to-transparent" />
    </div>
  )
}
