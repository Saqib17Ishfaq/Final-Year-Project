'use client'

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useState } from 'react'
import { getStoredUser } from '@/lib/user-storage'
import { clinicConfig } from '../../../../config/clinic.config'

interface ClinicBranding { name: string; logoUrl?: string }
interface ClinicContact { address?: string; phone?: string }
interface ClinicSettings { branding: ClinicBranding; contact: ClinicContact }

async function loadImageAsBase64(
  url: string
): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const effectiveUrl = /^https?:\/\//i.test(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth; c.height = img.naturalHeight
          const ctx = c.getContext('2d')
          if (!ctx) { resolve(null); return }
          ctx.drawImage(img, 0, 0)
          const fmt = url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG'
          resolve({ data: c.toDataURL(fmt === 'PNG' ? 'image/png' : 'image/jpeg'), format: fmt })
        } catch (e) {
          console.warn('Error converting image to base64:', e)
          resolve(null)
        }
      }
      img.onerror = () => {
        console.warn('Failed to load image:', effectiveUrl)
        resolve(null)
      }
      img.src = effectiveUrl
    } catch (e) {
      console.warn('Error in loadImageAsBase64:', e)
      resolve(null)
    }
  })
}

export default function DownloadReportButton({
  reportRefId,
  patientName = 'Unknown Patient',
  scanId = '000',
  patientCode,
  appointmentId,
  xrayType,
  reportDate,
  dentistName: dentistOverride,
}: {
  reportRefId: string
  patientName?: string
  scanId?: string
  patientCode?: string
  appointmentId?: string
  xrayType?: string
  reportDate?: string
  dentistName?: string
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    const element = document.getElementById(reportRefId)
    if (!element) { alert('Report content not found!'); return }
    setIsGenerating(true)
    try {
      // Replace all canvas elements with images so html2canvas captures them
      const canvases = element.querySelectorAll('canvas')
      const canvasBackups: { canvas: HTMLCanvasElement; parent: HTMLElement; index: number }[] = []

      canvases.forEach((canvas) => {
        const parent = canvas.parentElement
        if (!parent) return

        const index = Array.from(parent.children).indexOf(canvas)
        canvasBackups.push({ canvas, parent, index })

        const dataUrl = (canvas as any).__exportAsImage?.() || canvas.toDataURL('image/png')
        const img = document.createElement('img')
        img.src = dataUrl
        img.style.display = 'block'
        img.style.width = canvas.style.width || canvas.width + 'px'
        img.style.height = canvas.style.height || canvas.height + 'px'
        canvas.parentElement?.replaceChild(img, canvas)
      })

      let clinic: ClinicSettings = { branding: { name: clinicConfig.name }, contact: {} }
      try {
        const res = await fetch('/api/clinic-settings')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) clinic = json.data as ClinicSettings
        }
      } catch { /* use defaults */ }

      const dentistName = getStoredUser()?.name || 'Dentist'
      const clinicName  = clinic?.branding?.name || clinicConfig.name
      const address     = clinic?.contact?.address || ''
      const phone       = clinic?.contact?.phone   || ''
      const logoUrl     = clinic?.branding?.logoUrl || ''
      const today       = reportDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
      const effectiveDentist = dentistOverride || dentistName

      let canvas
      try {
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
        })
      } catch (err) {
        console.error('html2canvas failed:', err)
        throw err
      } finally {
        // Restore canvases
        canvasBackups.forEach(({ canvas: orig, parent, index }) => {
          const img = parent.children[index]
          if (img) parent.replaceChild(orig, img)
        })
      }

      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const PAGE_W   = pdf.internal.pageSize.getWidth()
      const PAGE_H   = pdf.internal.pageSize.getHeight()
      const MX = 10, MT = 10, MB = 10
      const HEADER_H = 32
      const FOOTER_H = 18
      const CONTENT_X = MX
      const CONTENT_Y = MT + HEADER_H
      const CONTENT_W = PAGE_W - MX * 2
      const CONTENT_H = PAGE_H - MT - HEADER_H - FOOTER_H - MB
      // pxToMm: how many mm = 1 canvas pixel
      const pxToMm = CONTENT_W / canvas.width

      // Find the real bottom of visible content by scanning the canvas from the bottom up.
      // This trims any invisible browser padding/whitespace that html2canvas captured.
      const trimmedHeight = (() => {
        const ctx = canvas.getContext("2d")
        if (!ctx) return canvas.height
        const bg = [255, 255, 255] // white background
        for (let y = canvas.height - 1; y >= 0; y--) {
          const row = ctx.getImageData(0, y, canvas.width, 1).data
          for (let x = 0; x < row.length; x += 4) {
            if (row[x] !== bg[0] || row[x+1] !== bg[1] || row[x+2] !== bg[2]) {
              return y + 1
            }
          }
        }
        return canvas.height
      })()

      const logoImg  = logoUrl ? await loadImageAsBase64(logoUrl) : null

      const drawHeader = (pageNum: number) => {
        const hY = MT, logoW = 22, logoH = 22
        const textX = logoImg ? CONTENT_X + logoW + 3 : CONTENT_X
        if (logoImg) pdf.addImage(logoImg.data, logoImg.format, CONTENT_X, hY, logoW, logoH)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(15, 23, 42)
        pdf.text(clinicName, textX, hY + 8)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139)
        let infoY = hY + 12
        // Patient / Scan metadata lines (match test-pdf layout)
        if (patientName) { pdf.setFontSize(9); pdf.setTextColor(31,41,55); pdf.text(`Patient: ${patientName}`, textX, infoY); infoY += 5 }
        if (patientCode) { pdf.setFontSize(8); pdf.setTextColor(100,116,139); pdf.text(`Patient Code: ${patientCode}`, textX, infoY); infoY += 5 }
        if (appointmentId) { pdf.setFontSize(8); pdf.setTextColor(100,116,139); pdf.text(`Appointment: ${appointmentId}`, textX, infoY); infoY += 5 }
        if (xrayType) { pdf.setFontSize(8); pdf.setTextColor(100,116,139); pdf.text(`X-Ray Type: ${xrayType}`, textX, infoY); infoY += 5 }
        if (address) { pdf.setFontSize(8); pdf.setTextColor(100,116,139); pdf.text(address, textX, infoY); infoY += 5 }
        if (phone)   { pdf.text('Phone: ' + phone, textX, infoY) }
        pdf.setFontSize(8); pdf.setTextColor(148, 163, 184)
        pdf.text('Page ' + pageNum + ' of ' + totalPages, PAGE_W - MX, hY + 5, { align: 'right' })
        pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3)
        pdf.line(CONTENT_X, CONTENT_Y - 2, PAGE_W - MX, CONTENT_Y - 2)
      }

      const drawFooter = () => {
        const footerY = PAGE_H - MB - FOOTER_H
        const sigX1 = PAGE_W - MX - 55, sigX2 = PAGE_W - MX
        const sigCenter = (sigX1 + sigX2) / 2
        pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3)
        pdf.line(CONTENT_X, footerY, PAGE_W - MX, footerY)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139)
        pdf.text('Generated by ' + clinicName + '  \u2022  ' + today, CONTENT_X, footerY + 7)
        pdf.setFontSize(7); pdf.setTextColor(148, 163, 184)
        pdf.text('Dentist Signature', sigCenter, footerY + 7, { align: 'center' })
        pdf.setDrawColor(148, 163, 184); pdf.setLineWidth(0.3)
        pdf.line(sigX1, footerY + 11, sigX2, footerY + 11)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105)
        pdf.text(effectiveDentist, sigCenter, footerY + 15, { align: 'center' })
      }

      // Find the nearest empty (white/light) row near a target Y pixel.
      // Scans upward first so content is pushed to the next page rather than cropped.
      const findSafeBreak = (targetY: number) => {
        const scanCtx = canvas.getContext("2d")
        if (!scanCtx) return targetY
        const SEARCH_UP = 80  // scan up to 80px above the cut
        const isEmptyRow = (y: number) => {
          // Only check the middle 80% of the row — skip left/right borders
          const margin = Math.floor(canvas.width * 0.1)
          const startX = margin
          const checkW = canvas.width - margin * 2
          const row = scanCtx.getImageData(startX, y, checkW, 1).data
          let darkPixels = 0
          for (let x = 0; x < row.length; x += 4) {
            if (row[x] < 240 || row[x+1] < 240 || row[x+2] < 240) darkPixels++
          }
          // Allow up to 1% dark pixels (catches thin inner borders/shadows)
          return darkPixels < (checkW * 0.01)
        }
        // Search upward from the cut point to find a white gap between rows
        for (let offset = 0; offset <= SEARCH_UP; offset++) {
          const y = Math.floor(targetY - offset)
          if (y > 0 && isEmptyRow(y)) return y
        }
        return targetY // fallback: no gap found, cut as-is
      }

      // Build page slices dynamically: each slice ends at a safe break point
      const maxSlicePx = CONTENT_H / pxToMm
      const pageSlices: { startY: number; endY: number }[] = []
      let curY = 0
      while (curY < trimmedHeight) {
        let endY = curY + maxSlicePx
        if (endY >= trimmedHeight) {
          endY = trimmedHeight // last page — take the rest
        } else {
          endY = findSafeBreak(endY) // snap to a row gap
        }
        pageSlices.push({ startY: curY, endY })
        curY = endY
      }

      const totalPages = pageSlices.length
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage()
        drawHeader(i + 1)
        const { startY, endY } = pageSlices[i]
        const slicePx = endY - startY
        if (slicePx > 0) {
          const slice = document.createElement("canvas")
          slice.width = canvas.width; slice.height = Math.ceil(slicePx)
          const sCtx = slice.getContext("2d")
          if (!sCtx) throw new Error('Failed to get canvas context for page ' + (i + 1))
          sCtx.drawImage(canvas, 0, startY, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
          const sliceDataUrl = slice.toDataURL("image/png")
          pdf.addImage(sliceDataUrl, "PNG", CONTENT_X, CONTENT_Y, CONTENT_W, slicePx * pxToMm)
        }
        drawFooter()
      }

      pdf.save('DentalReport_' + scanId + '.pdf')

    } catch (error) {
      console.error('PDF Generation Error:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Stack:', error.stack)
      }
      alert('Failed to generate PDF. Please try again.')
    } finally { setIsGenerating(false) }
  }

  const btnBase = 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2'
  const btnCls  = isGenerating ? btnBase + ' opacity-75 cursor-wait' : btnBase

  return (
    <button onClick={generatePDF} disabled={isGenerating} className={btnCls}>
      {isGenerating ? (
        <>
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Generating...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Download Report
        </>
      )}
    </button>
  )
}
