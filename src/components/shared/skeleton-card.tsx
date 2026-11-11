'use client'

type SkeletonCardProps = {
  className?: string
  lines?: number
}

export default function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  return (
    <div className={`animate-pulse rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <div className="space-y-3">
        <div className="h-4 w-1/2 rounded bg-muted" />
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-3 rounded bg-muted/80" style={{ width: `${85 - index * 15}%` }} />
        ))}
      </div>
    </div>
  )
}