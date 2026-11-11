"use client"

import { useRef, useState } from "react"

interface ProfilePictureUploadProps {
  currentImage?: string | null
  initials?: string
  userId: string
  onImageUpdated?: (newImageUrl: string) => void
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "w-16 h-16 text-lg",
  md: "w-24 h-24 text-2xl",
  lg: "w-32 h-32 text-3xl",
}

export default function ProfilePictureUpload({
  currentImage,
  initials = "",
  userId,
  onImageUpdated,
  size = "md",
}: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayImage = preview || currentImage

  const handleFileSelect = (file?: File | null) => {
    if (!file) return
    setError(null)

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null
      if (dataUrl) {
        setPreview(dataUrl)
        saveImage(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveImage = async (dataUrl: string) => {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || "Failed to save image")

      // Update sessionStorage so the header avatar updates
      if (typeof window !== "undefined") {
        const key = Object.keys(sessionStorage).find((k) => k.endsWith("_user"))
        if (key) {
          try {
            const stored = JSON.parse(sessionStorage.getItem(key) || "{}")
            stored.image = dataUrl
            sessionStorage.setItem(key, JSON.stringify(stored))
          } catch { /* ignore */ }
        }
      }

      onImageUpdated?.(dataUrl)
    } catch (err: any) {
      setError(err?.message || "Failed to save image")
      setPreview(null) // revert
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt="Profile"
            className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-primary/20`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold ring-2 ring-primary/20`}
          >
            {initials}
          </div>
        )}

        {/* Overlay on hover */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
        >
          {uploading ? "Saving…" : "Change"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload photo"}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
