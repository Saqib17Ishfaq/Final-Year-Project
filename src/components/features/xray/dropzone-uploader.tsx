'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useStartupStatus } from '@/components/startup-gate'
// import { uploadXray } from '@/actions/xray'

type MessageState = { kind: 'success' | 'error' | 'info'; text: string } | null

const MAX_FILE_MB = 10
const ANALYSIS_STEPS = [
  'Uploading X-Ray...',
  'Validating Image...',
  'Classifying X-Ray Type...',
  'Detecting Conditions...',
  'Analysis Complete ✓',
] as const

// Even when the backend responds quickly, hold the progress UI through this
// many milliseconds so the bar always plays through its 4 stages before
// transitioning. Tuned to land in the 5–7s "feels good" window.
const MIN_PROGRESS_MS = 5500
// Linger on the "Analysis Complete ✓" state so the user registers it before
// the panel collapses into the results view.
const COMPLETE_HOLD_MS = 600
// Step transition timestamps relative to upload start.
const STEP_TIMINGS_MS = [1300, 2700, 4200] as const

interface DropzoneUploaderProps {
  onUploadComplete?: (data: any) => void
}

export default function DropzoneUploader({ onUploadComplete }: DropzoneUploaderProps) {
  const { isReady, phase } = useStartupStatus()
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const [invalidXrayModal, setInvalidXrayModal] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [analysisStep, setAnalysisStep] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const selectedFileRef = useRef<File | null>(null)
  const progressTimersRef = useRef<number[]>([])
  const objectUrlRef = useRef<string | null>(null)
  const uploadStartedAtRef = useRef<number>(0)

  const revokePreviewUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const validateImage = (file: File) => {
    if (!file.type.startsWith('image/')) return 'Please upload an image file (JPEG/PNG/WEBP).'
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `File too large. Max ${MAX_FILE_MB}MB allowed.`
    return null
  }

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    selectedFileRef.current = null
  }

  const clearProgressTimers = () => {
    progressTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    progressTimersRef.current = []
  }

  const startAnalysisProgress = () => {
    clearProgressTimers()
    uploadStartedAtRef.current = Date.now()
    setAnalysisStep(1)
    progressTimersRef.current = STEP_TIMINGS_MS.map((delay, idx) =>
      window.setTimeout(() => setAnalysisStep((current) => Math.max(current, idx + 2)), delay),
    )
  }

  const finishAnalysisProgress = () => {
    clearProgressTimers()
    setAnalysisStep(5)
  }

  const resetAnalysisProgress = () => {
    clearProgressTimers()
    setAnalysisStep(0)
  }

  const processSelectedFile = async (file?: File | null) => {
    revokePreviewUrl()
    setPreview(null)

    if (!file) {
      selectedFileRef.current = null
      setMessage(null)
      return
    }

    const validationResult = await validateImage(file)
    if (validationResult) {
      setMessage({ kind: 'error', text: validationResult })
      selectedFileRef.current = null
      return
    }

    selectedFileRef.current = file
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPreview(objectUrl)
    setMessage(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    await processSelectedFile(file)
  }

  const stopCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
  }

  const closeCamera = () => {
    stopCameraStream()
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
    setCameraOpen(false)
    setCameraError(null)
    setCameraLoading(false)
  }

  const openCamera = () => {
    setCameraOpen(true)
  }

  const startCameraStream = async () => {
    setCameraError(null)
    setCameraLoading(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera capture is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      cameraStreamRef.current = stream
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream
        await cameraVideoRef.current.play().catch(() => undefined)
      }
    } catch (error: any) {
      setCameraError(error?.message || 'Unable to access the camera.')
    } finally {
      setCameraLoading(false)
    }
  }

  useEffect(() => {
    if (!cameraOpen) return
    void startCameraStream()
    return () => {
      stopCameraStream()
    }
  }, [cameraOpen])

  const captureCameraFrame = async () => {
    const video = cameraVideoRef.current
    if (!video || video.readyState < 2) {
      setCameraError('Camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) {
      setCameraError('Unable to prepare the camera capture.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    if (!blob) {
      setCameraError('Unable to capture an image from the camera.')
      return
    }

    const capturedFile = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
    closeCamera()
    await processSelectedFile(capturedFile)
  }

  const handleUpload = async () => {
    if (!isReady) {
      toast.info(phase === 'starting' ? 'The clinic app is still loading. Please wait a moment.' : 'The AI backend is reconnecting. You can retry shortly.')
      return
    }

    const file = selectedFileRef.current
    if (!file) {
      setMessage({ kind: 'error', text: 'Please upload or scan a valid image before uploading.' })
      return
    }

    setUploading(true)
    startAnalysisProgress()
    const formData = new FormData()
    formData.append('file', file)

    try {
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, '')
      if (!backendBase) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured. Set it to your Hugging Face Space URL.')
      }

      const analyzeUrl = `${backendBase}/analyze`

      // Call Python Backend with a timeout to avoid hanging on unreachable hosts
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        // Try to parse JSON error detail from FastAPI
        let errorMessage = `Analysis failed (HTTP ${response.status})`
        let isInvalidXray = false
        try {
          const errJson = JSON.parse(errText)
          if (errJson.detail) {
            errorMessage = errJson.detail
            // Check if this is the invalid X-ray error
            if (errorMessage.toLowerCase().includes('not appear to be a dental') || 
                errorMessage.toLowerCase().includes('invalid image')) {
              isInvalidXray = true
            }
          }
        } catch {
          if (errText) errorMessage = errText
        }
        
        // Show modal for invalid X-ray, otherwise throw error
        if (isInvalidXray) {
          setInvalidXrayModal(true)
          toast.error('This image does not appear to be a dental X-ray. Please upload a valid X-ray.')
          resetAnalysisProgress()
          setUploading(false)
          return
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Hold the progress UI open for the minimum duration even if the server
      // returned faster, so the bar visibly plays through its stages.
      const elapsed = Date.now() - uploadStartedAtRef.current
      const remaining = MIN_PROGRESS_MS - elapsed
      if (remaining > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remaining))
      }

      finishAnalysisProgress()
      // Linger on the completed state so the user sees "Analysis Complete ✓".
      await new Promise<void>((resolve) => window.setTimeout(resolve, COMPLETE_HOLD_MS))

      setMessage({ kind: 'success', text: 'Analysis successful!' })
      toast.success('Analysis complete')
      setPreview(null)
      resetFileInputs()
      revokePreviewUrl()

      if (onUploadComplete) {
        onUploadComplete(result)
      }

    } catch (error: any) {
      console.error(error)
      const timedOut = error?.name === 'AbortError'
      const friendly = timedOut
        ? 'The server is taking too long to respond. It may be starting up — please try again in 30 seconds.'
        : error?.message || 'An unexpected error occurred.'
      setMessage({ kind: 'error', text: friendly })
      toast.error(timedOut ? friendly : 'Could not connect to AI server. Please check your internet connection.')
      resetAnalysisProgress()
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Invalid X-Ray Modal */}
      {invalidXrayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-6 py-4 bg-red-50 rounded-t-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-red-800">Invalid X-Ray Image</h2>
              <button 
                onClick={() => setInvalidXrayModal(false)}
                className="ml-auto rounded-full p-1 hover:bg-red-100 transition-colors"
              >
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <p className="text-foreground mb-4">
                The uploaded image does not appear to be a valid dental X-ray.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">Please upload one of the following:</p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  <li>OPG (Orthopantomogram / Panoramic X-ray)</li>
                  <li>Periapical X-ray</li>
                  <li>Bitewing X-ray</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Our AI system requires dental radiographs to perform accurate analysis.
              </p>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4 bg-secondary rounded-b-xl">
              <button
                onClick={() => {
                  setInvalidXrayModal(false)
                  revokePreviewUrl()
                  setPreview(null)
                  resetFileInputs()
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Try Another Image
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 border-b px-5 py-4 bg-secondary/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Scan with camera</h2>
                <p className="text-sm text-muted-foreground">Frame the X-ray, then capture it to continue.</p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="ml-auto rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close camera"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-black">
                <video
                  ref={cameraVideoRef}
                  className="aspect-video w-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                    Opening camera...
                  </div>
                )}
              </div>

              {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void captureCameraFrame()}
                  disabled={cameraLoading || !!cameraError}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                  Capture Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-md border border-dashed border-border text-center">
        <h3 className="text-lg font-semibold mb-4">Upload X-Ray Scan</h3>

        <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="sr-only"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary touch-manipulation"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>

          <button
            type="button"
            onClick={openCamera}
            disabled={!isReady}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 touch-manipulation"
          >
            <Camera className="h-4 w-4" />
            Scan
          </button>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Use Upload for existing files or Scan to open your camera on supported devices.
        </p>

      {analysisStep > 0 && (
        <div className="mb-4 rounded-xl border bg-slate-50 p-4 text-left shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">AI models are processing your X-ray.</p>
              <p className="text-xs text-slate-500">This may take 15–30 seconds.</p>
            </div>
            <span className="text-xs font-medium text-slate-600">
              {analysisStep < 5 ? `${analysisStep}/4` : 'Complete'}
            </span>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-700 ease-out ${
                analysisStep < 5 ? 'shadow-[0_0_10px_rgba(59,130,246,0.55)]' : ''
              }`}
              style={{ width: `${analysisStep === 5 ? 100 : Math.min(analysisStep * 20, 80)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {ANALYSIS_STEPS.map((step, index) => {
              const stepNumber = index + 1
              const isActive = analysisStep === stepNumber
              const isComplete = analysisStep > stepNumber || analysisStep === 5
              return (
                <div
                  key={step}
                  className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                    isComplete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {step}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {preview && analysisStep === 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
          <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded shadow-sm" />
        </div>
      )}

      <div className="flex gap-2 justify-center">
        <button
          onClick={handleUpload}
          disabled={!preview || uploading || !isReady}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded text-white font-medium transition-colors touch-manipulation
            ${!preview || uploading || !isReady ? 'bg-muted-foreground cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {uploading ? 'Uploading...' : !isReady ? 'Starting...' : 'Upload Scan'}
        </button>
        
        {preview && (
          <button
             onClick={() => {
               revokePreviewUrl();
               setPreview(null);
               setMessage(null);
               resetFileInputs();
               resetAnalysisProgress();
             }}
             className="min-h-[44px] min-w-[44px] px-4 py-2 rounded border border-border hover:bg-secondary text-foreground touch-manipulation"
          >
            Cancel
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mt-4 text-sm p-2 rounded ${
            message.kind === 'success'
              ? 'bg-green-50 text-green-700'
              : message.kind === 'info'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
      </div>
    </>
  )
}
