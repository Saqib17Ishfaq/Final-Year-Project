'use client'

/**
 * OnboardingTour — Self-contained guided tour component.
 *
 * Renders nothing visible. On mount it checks localStorage and,
 * if the tour hasn't been completed for this role, opens the sidebar
 * and launches driver.js with the role-specific steps.
 *
 * Usage: Drop <OnboardingTour role="dentist" openSidebar={fn} /> in the layout.
 */

import { useEffect } from 'react'
import 'driver.js/dist/driver.css'
import './onboarding-tour.css'
import { initTour, TOUR_STORAGE_KEY } from '@/lib/onboarding-tour'

export function replayTour(role?: string, openSidebar?: () => void) {
  openSidebar?.()
  setTimeout(() => {
    const tour = initTour(role || 'dentist')
    tour.drive()
  }, 400)
}

interface OnboardingTourProps {
  role?: string
  openSidebar?: () => void
}

export default function OnboardingTour({ role, openSidebar }: OnboardingTourProps) {
  useEffect(() => {
    const storageKey = `${TOUR_STORAGE_KEY}_${role || 'dentist'}`
    const hasSeenTour = localStorage.getItem(storageKey)
    if (hasSeenTour) return

    // Small delay ensures the DOM is fully painted before the tour starts
    const timer = setTimeout(() => {
      // Open sidebar so tour can highlight nav items
      openSidebar?.()

      setTimeout(() => {
        const tour = initTour(role || 'dentist')
        tour.drive()
        localStorage.setItem(storageKey, 'true')
      }, 500)
    }, 800)

    return () => clearTimeout(timer)
  }, [role, openSidebar])

  return null
}
