interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  center?: boolean
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  center = true,
}: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p className="mb-3 text-sm font-bold tracking-wide text-gold-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-extrabold text-navy-950 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-navy-600">
          {description}
        </p>
      )}
    </div>
  )
}
