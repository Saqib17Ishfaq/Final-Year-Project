'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
// import { useDebouncedCallback } from 'use-debounce' // note: usually good, but I will implement manual debounce to avoid extra deps for now
import { useState, useEffect } from 'react'

export default function PatientSearch({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [term, setTerm] = useState(searchParams.get('query')?.toString() || '')

  // Manual debounce to avoid installing 'use-debounce' package for just this
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (term) {
        params.set('query', term)
      } else {
        params.delete('query')
      }
      replace(`${pathname}?${params.toString()}`)
    }, 300) // 300ms delay

    return () => clearTimeout(timeoutId)
  }, [term, searchParams, pathname, replace])

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-border py-[9px] pl-10 text-sm outline-2 placeholder:text-muted-foreground"
        placeholder={placeholder}
        onChange={(e) => setTerm(e.target.value)}
        value={term}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground peer-focus:text-foreground"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    </div>
  )
}
