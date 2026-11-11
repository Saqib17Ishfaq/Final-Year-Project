'use client'

import Image from "next/image"
import { useEffect, useState } from "react"
import { clinicConfig } from "../../config/clinic.config"
import { AppLogo } from "./shared/app-logo"

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-950 px-6">
      <div className="flex flex-col items-center gap-4 text-gray-900 dark:text-gray-100 w-full max-w-sm">
        <div className="relative w-full max-w-[400px] h-32 sm:h-40">
          <AppLogo className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
