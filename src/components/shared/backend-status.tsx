'use client'

import { useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'starting' | 'ready'

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>('idle')
  const hideTimerRef = useRef<number | null>(null)
  const showTimerRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const resolvedRef = useRef(false)
  const statusRef = useRef<Status>('idle')

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, '')
    if (!backendBase) return

    const clearTimers = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current)
      if (retryTimerRef.current) window.clearInterval(retryTimerRef.current)
      hideTimerRef.current = null
      showTimerRef.current = null
      retryTimerRef.current = null
    }

    const markReady = () => {
      resolvedRef.current = true
      if (statusRef.current === 'starting') {
        setStatus('ready')
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = window.setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('idle')
      }
    }

    const ping = async () => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 3000)
      try {
        const res = await fetch(`${backendBase}/`, { cache: 'no-store', signal: controller.signal })
        window.clearTimeout(timeout)
        if (res.ok) {
          markReady()
          return true
        }
      } catch {
        // Keep retrying silently until the banner is shown.
      } finally {
        window.clearTimeout(timeout)
      }
      return false
    }

    void ping()

    showTimerRef.current = window.setTimeout(() => {
      if (!resolvedRef.current) {
        setStatus('starting')
      }
    }, 3000)

    retryTimerRef.current = window.setInterval(() => {
      if (!resolvedRef.current) {
        void ping()
      }
    }, 5000)

    return () => {
      clearTimers()
    }
  }, [])

  if (status === 'idle') return null

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 md:px-8">
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-sm transition-colors ${
          status === 'ready' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {status === 'ready'
          ? 'AI server is ready ✓'
          : 'AI server is starting up... This may take up to 60 seconds. You can still browse patient records.'}
      </div>
    </div>
  )
}