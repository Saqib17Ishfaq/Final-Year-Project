'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Issue = {
  id: string
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  color?: string
  mask?: number[][] | null
}

interface BoundingBoxCanvasProps {
  imageUrl: string
  issues: Issue[]
  measurements?: Measurement[]
  onMeasurementsChange?: React.Dispatch<React.SetStateAction<Measurement[]>>
  onScaleComputed?: (mmPerPixel: number) => void
  physicalWidthMm?: number
  annotationTool?: 'none' | 'measure' | 'draw-box' | 'rect' | 'circle' | 'pencil'
  shapes?: Shape[]
  onShapesChange?: React.Dispatch<React.SetStateAction<Shape[]>>
  imageType?: string | null
  showBoxes?: boolean
  showMasks?: boolean
}

type Point = { x: number; y: number }

type Measurement = {
  id: string
  start: Point
  end: Point
  lengthMm: number
}

type Shape =
  | { id: string; type: 'rect'; start: Point; end: Point; color: string }
  | { id: string; type: 'circle'; start: Point; end: Point; color: string }
  | { id: string; type: 'pencil'; points: Point[]; color: string }

type LabelTarget = {
  id: string
  left: number
  top: number
  width: number
  height: number
  tooltip: string
}

const DEFAULT_PHYSICAL_WIDTH_MM = 40.5
const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const TOOL_COLORS = {
  measure: '#0ea5e9',
  rect: '#f59e0b',
  circle: '#10b981',
  pencil: '#8b5cf6',
}

export default function BoundingBoxCanvas({
  imageUrl,
  issues,
  measurements = [],
  onMeasurementsChange,
  onScaleComputed,
  physicalWidthMm,
  annotationTool = 'none',
  shapes = [],
  onShapesChange,
  imageType,
  showBoxes = true,
  showMasks = true,
}: BoundingBoxCanvasProps) {
  // Intraoral films (periapical/bitewing) are physically small (~30–40mm); cap
  // their on-screen width so they don't dominate the viewport. OPG panoramics
  // span the full jaw, so the wider cap is appropriate there.
  const containerMaxWidthClass = imageType === 'Periapical' || imageType === 'Bitewing' ? 'max-w-md' : 'max-w-4xl'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageSizeRef = useRef<{ naturalWidth: number; naturalHeight: number; scale: number }>({ naturalWidth: 1, naturalHeight: 1, scale: 1 })
  const pendingStartRef = useRef<Point | null>(null)
  const mmPerPixelRef = useRef<number>(0.1)
  const draftShapeRef = useRef<Shape | null>(null)
  const [renderTick, setRenderTick] = useState(0)
  const [labelTargets, setLabelTargets] = useState<LabelTarget[]>([])
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null)

  const effectiveImageUrl = useMemo(() => {
    if (!imageUrl) return ''
    if (imageUrl.startsWith('/api/image-proxy?')) return imageUrl
    if (/^https?:\/\//i.test(imageUrl)) {
      return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    }
    return imageUrl
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = new Image()
    image.src = effectiveImageUrl
    
    image.onload = () => {
      // Responsive scaling
      const containerWidth = container.clientWidth
      const scale = containerWidth / image.naturalWidth
      imageSizeRef.current = { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, scale }

      const derivedMmPerPixel = (physicalWidthMm || DEFAULT_PHYSICAL_WIDTH_MM) / image.naturalWidth
      mmPerPixelRef.current = derivedMmPerPixel
      if (onScaleComputed) onScaleComputed(derivedMmPerPixel)
      
      canvas.width = containerWidth
      canvas.height = image.naturalHeight * scale

      // Draw Image
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

      // Calculate display scale to match drawOverlay() sizing
      // drawOverlay uses: displayScale = naturalWidth / 600
      // After browser scales it down by (containerWidth / naturalWidth), effective size = fontSize * (containerWidth / 600)
      // We draw at containerWidth, so we use: containerWidth / 600
      const displayScale = Math.max(containerWidth / 600, 1)
      const fontSize = Math.round(11 * displayScale)
      const lineWidth = Math.max(2, Math.round(2 * displayScale))
      const labelHeight = Math.round(16 * displayScale)
      const margin = Math.round(3 * displayScale)
      const labelPadding = Math.round(4 * displayScale)

      // Draw Boxes
      const fallbackColors = [
        '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#0ea5e9', '#eab308'
      ]
      const nextLabelTargets: LabelTarget[] = []
      const placedLabels: Array<{ left: number; top: number; width: number; height: number }> = []

      const rectsOverlap = (
        a: { left: number; top: number; width: number; height: number },
        b: { left: number; top: number; width: number; height: number },
      ) =>
        !(
          a.left + a.width <= b.left ||
          a.left >= b.left + b.width ||
          a.top + a.height <= b.top ||
          a.top >= b.top + b.height
        )

      // Resolve a stable color per issue so masks and boxes for the same
      // issue render in the same hue. Fallback index only advances for
      // issues that don't ship their own color.
      let fbIdx = 0
      const issueColors: string[] = issues.map((issue) =>
        issue.color || fallbackColors[fbIdx++ % fallbackColors.length],
      )

      // 1) Segmentation masks (drawn first so boxes/labels sit on top).
      if (showMasks) {
        issues.forEach((issue, i) => {
          const pts = issue.mask
          if (!pts || pts.length < 3) return
          const color = issueColors[i]
          ctx.beginPath()
          ctx.moveTo(pts[0][0] * scale, pts[0][1] * scale)
          for (let p = 1; p < pts.length; p++) {
            ctx.lineTo(pts[p][0] * scale, pts[p][1] * scale)
          }
          ctx.closePath()
          ctx.save()
          ctx.fillStyle = color
          ctx.globalAlpha = 0.28
          ctx.fill()
          ctx.restore()
          ctx.strokeStyle = color
          ctx.lineWidth = Math.max(1, Math.round(lineWidth / 2))
          ctx.stroke()
        })
      }

      if (showBoxes) issues.forEach((issue, i) => {
        // Scale coordinates
        const x = issue.x * scale
        const y = issue.y * scale
        const w = issue.width * scale
        const h = issue.height * scale

        const color = issueColors[i]

        // Box Style
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.strokeRect(x, y, w, h)

        // Label Background
        ctx.fillStyle = color
        ctx.font = `bold ${fontSize}px sans-serif`
        const text = issue.label
        const textMetrics = ctx.measureText(text)
        const labelWidth = textMetrics.width + labelPadding * 2

        // Clamp horizontally so the label doesn't run off the canvas edge.
        const labelLeft = Math.min(Math.max(x, margin), Math.max(margin, canvas.width - labelWidth - margin))

        // Prefer above the box; if it overflows top, place below.
        const stepY = labelHeight + margin
        const aboveTop = y - labelHeight - margin
        const belowTop = y + h + margin
        let labelTop = aboveTop >= margin ? aboveTop : belowTop

        // Avoid colliding with previously placed labels by shifting away from
        // the box: if we started above, walk further up; otherwise walk down.
        // Stop once we run out of room in that direction.
        const goingUp = labelTop === aboveTop
        const collides = () =>
          placedLabels.some((p) =>
            rectsOverlap({ left: labelLeft, top: labelTop, width: labelWidth, height: labelHeight }, p),
          )
        let attempts = 0
        while (collides() && attempts < 8) {
          if (goingUp) {
            if (labelTop - stepY < margin) break
            labelTop -= stepY
          } else {
            if (labelTop + stepY + labelHeight > canvas.height - margin) break
            labelTop += stepY
          }
          attempts += 1
        }
        // Final clamp into canvas bounds.
        labelTop = Math.min(Math.max(labelTop, margin), Math.max(margin, canvas.height - labelHeight - margin))

        // Leader line: connect the box to the label whenever there is a gap
        // between them (e.g. when collision avoidance pushed the label away).
        const labelBottom = labelTop + labelHeight
        const isLabelAbove = labelBottom <= y
        const isLabelBelow = labelTop >= y + h
        if (isLabelAbove || isLabelBelow) {
          const boxAnchorX = Math.max(x, Math.min(x + w, labelLeft + labelWidth / 2))
          const boxAnchorY = isLabelAbove ? y : y + h
          const labelAnchorX = labelLeft + labelWidth / 2
          const labelAnchorY = isLabelAbove ? labelBottom : labelTop
          const leaderWidth = Math.max(1, Math.round(lineWidth / 2))
          ctx.strokeStyle = color
          ctx.lineWidth = leaderWidth
          ctx.beginPath()
          ctx.moveTo(boxAnchorX, boxAnchorY)
          ctx.lineTo(labelAnchorX, labelAnchorY)
          ctx.stroke()
        }

        ctx.fillRect(labelLeft, labelTop, labelWidth, labelHeight)
        const placed = { left: labelLeft, top: labelTop, width: labelWidth, height: labelHeight }
        placedLabels.push(placed)
        nextLabelTargets.push({
          id: issue.id,
          left: labelLeft,
          top: labelTop,
          width: labelWidth,
          height: labelHeight,
          tooltip: buildFdiTooltip(text),
        })

        // Label Text
        ctx.fillStyle = 'white'
        ctx.fillText(text, labelLeft + labelPadding, labelTop + labelHeight - labelPadding)
      })

      setLabelTargets(nextLabelTargets)

      // Measurements overlay
      measurements.forEach((m) => {
        const sx = m.start.x * scale
        const sy = m.start.y * scale
        const ex = m.end.x * scale
        const ey = m.end.y * scale
        ctx.strokeStyle = '#0ea5e9'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()

        // End caps for clarity
        ctx.fillStyle = '#0ea5e9'
        ctx.beginPath()
        ctx.arc(sx, sy, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(ex, ey, 4, 0, Math.PI * 2)
        ctx.fill()

        // Label at midpoint, clamped within canvas
        const midX = (sx + ex) / 2
        const midY = (sy + ey) / 2
        const label = `${m.lengthMm.toFixed(2)} mm`
        ctx.font = 'bold 13px sans-serif'
        const metrics = ctx.measureText(label)
        const padX = 8
        const padY = 6
        const labelWidth = metrics.width + padX * 2
        const labelHeight = 22
        const clampX = Math.min(Math.max(midX - labelWidth / 2, 4), canvas.width - labelWidth - 4)
        const clampY = Math.min(Math.max(midY - labelHeight / 2, 4), canvas.height - labelHeight - 4)
        ctx.fillStyle = 'rgba(14,165,233,0.9)'
        ctx.fillRect(clampX, clampY, labelWidth, labelHeight)
        ctx.fillStyle = 'white'
        ctx.fillText(label, clampX + padX, clampY + labelHeight - padY)
      })

      const drawRect = (start: Point, end: Point, color: string) => {
        const sx = start.x * scale
        const sy = start.y * scale
        const ex = end.x * scale
        const ey = end.y * scale
        const w = ex - sx
        const h = ey - sy
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(sx, sy, w, h)
      }

      const drawCircle = (start: Point, end: Point, color: string) => {
        const sx = start.x * scale
        const sy = start.y * scale
        const ex = end.x * scale
        const ey = end.y * scale
        const cx = (sx + ex) / 2
        const cy = (sy + ey) / 2
        const dx = ex - sx
        const dy = ey - sy
        const radius = Math.sqrt(dx * dx + dy * dy) / 2
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      const drawPencil = (pts: Point[], color: string) => {
        if (pts.length < 2) return
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(pts[0].x * scale, pts[0].y * scale)
        pts.slice(1).forEach((p) => ctx.lineTo(p.x * scale, p.y * scale))
        ctx.stroke()
      }

      const drawShape = (shape?: Shape | null) => {
        if (!shape) return
        if (shape.type === 'rect') return drawRect(shape.start, shape.end, shape.color)
        if (shape.type === 'circle') return drawCircle(shape.start, shape.end, shape.color)
        if (shape.type === 'pencil') return drawPencil(shape.points, shape.color)
      }

      shapes.filter(Boolean).forEach(drawShape)
      if (draftShapeRef.current) drawShape(draftShapeRef.current)
    }
  }, [effectiveImageUrl, issues, measurements, onScaleComputed, physicalWidthMm, shapes, renderTick, showBoxes, showMasks])

  const buildFdiTooltip = (label: string) => {
    const normalized = label.trim()
    const firstDigit = normalized[0]
    const secondDigit = normalized[1]
    if (!/^\d{2}$/.test(normalized)) return `Tooth ${normalized} — FDI notation`
    return `Tooth ${normalized} — Quadrant ${firstDigit}, Position ${secondDigit} (FDI World Dental Federation Notation)`
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toImagePoint = (evt: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clickX = evt.clientX - rect.left
      const clickY = evt.clientY - rect.top
      const { scale } = imageSizeRef.current
      const imgX = clickX / (scale || 1)
      const imgY = clickY / (scale || 1)
      return { x: imgX, y: imgY }
    }

    const finalizeMeasure = (end: Point) => {
      if (!onMeasurementsChange || !pendingStartRef.current) return
      const start = pendingStartRef.current
      const dx = end.x - start.x
      const dy = end.y - start.y
      const pixels = Math.sqrt(dx * dx + dy * dy)
      const mm = (mmPerPixelRef.current || ((physicalWidthMm || DEFAULT_PHYSICAL_WIDTH_MM) / imageSizeRef.current.naturalWidth)) * pixels
      onMeasurementsChange((prev) => [...prev, { id: makeId(), start, end, lengthMm: mm }])
      pendingStartRef.current = null
    }

    const finalizeShape = (end: Point) => {
      if (!onShapesChange || !pendingStartRef.current) return
      const start = pendingStartRef.current
      let shape: Shape | null = null
      if (annotationTool === 'draw-box' || annotationTool === 'rect') {
        shape = { id: makeId(), type: 'rect', start, end, color: annotationTool === 'draw-box' ? '#f59e0b' : TOOL_COLORS.rect }
      } else if (annotationTool === 'circle') {
        shape = { id: makeId(), type: 'circle', start, end, color: TOOL_COLORS.circle }
      }
      if (shape) onShapesChange((prev) => [...prev, shape])
      pendingStartRef.current = null
      draftShapeRef.current = null
      setRenderTick((t) => t + 1)
    }

    const handlePointerDown = (evt: MouseEvent) => {
      if (annotationTool === 'none') return
      const pt = toImagePoint(evt)
      if (annotationTool === 'measure') {
        pendingStartRef.current = pt
        draftShapeRef.current = null
      } else if (annotationTool === 'pencil') {
        draftShapeRef.current = { id: makeId(), type: 'pencil', points: [pt], color: TOOL_COLORS.pencil }
      } else if (annotationTool === 'draw-box' || annotationTool === 'rect' || annotationTool === 'circle') {
        pendingStartRef.current = pt
        draftShapeRef.current = null
      }
      setRenderTick((t) => t + 1)
    }

    const handlePointerMove = (evt: MouseEvent) => {
      if (annotationTool === 'none') return
      const pt = toImagePoint(evt)
      if (annotationTool === 'pencil' && draftShapeRef.current && draftShapeRef.current.type === 'pencil') {
        draftShapeRef.current = { ...draftShapeRef.current, points: [...draftShapeRef.current.points, pt] }
      } else if ((annotationTool === 'draw-box' || annotationTool === 'rect' || annotationTool === 'circle') && pendingStartRef.current) {
        draftShapeRef.current = {
          id: 'draft',
          type: annotationTool === 'draw-box' ? 'rect' : (annotationTool === 'rect' ? 'rect' : 'circle'),
          start: pendingStartRef.current,
          end: pt,
          color: annotationTool === 'draw-box' ? '#f59e0b' : (annotationTool === 'rect' ? TOOL_COLORS.rect : TOOL_COLORS.circle),
        }
      }
      setRenderTick((t) => t + 1)
    }

    const handlePointerUp = (evt: MouseEvent) => {
      if (annotationTool === 'none') return
      const pt = toImagePoint(evt)
      if (annotationTool === 'measure') {
        finalizeMeasure(pt)
      } else if (annotationTool === 'pencil') {
        if (draftShapeRef.current && draftShapeRef.current.type === 'pencil' && onShapesChange) {
          onShapesChange((prev) => [...prev, draftShapeRef.current as Shape])
        }
        draftShapeRef.current = null
      } else {
        finalizeShape(pt)
      }
      setRenderTick((t) => t + 1)
    }

    canvas.addEventListener('mousedown', handlePointerDown)
    canvas.addEventListener('mousemove', handlePointerMove)
    canvas.addEventListener('mouseup', handlePointerUp)

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown)
      canvas.removeEventListener('mousemove', handlePointerMove)
      canvas.removeEventListener('mouseup', handlePointerUp)
    }
  }, [annotationTool, onMeasurementsChange, onShapesChange, physicalWidthMm])

  // Expose canvas for PDF export
  if (typeof window !== 'undefined' && canvasRef.current) {
    ;(canvasRef.current as any).__exportAsImage = () => canvasRef.current?.toDataURL('image/png')
  }

  return (
    <div ref={containerRef} className={`relative w-full ${containerMaxWidthClass} mx-auto shadow-lg rounded-lg overflow-hidden`}>
      <canvas ref={canvasRef} className="block w-full h-auto bg-black" />

      {labelTargets.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {labelTargets.map((target) => {
            const isActive = activeLabelId === target.id
            return (
              <button
                key={target.id}
                type="button"
                onMouseEnter={() => setActiveLabelId(target.id)}
                onMouseLeave={() => setActiveLabelId((current) => (current === target.id ? null : current))}
                onFocus={() => setActiveLabelId(target.id)}
                onBlur={() => setActiveLabelId((current) => (current === target.id ? null : current))}
                onClick={() => setActiveLabelId((current) => (current === target.id ? null : target.id))}
                aria-label={target.tooltip}
                className="pointer-events-auto absolute rounded-sm outline-none focus:ring-2 focus:ring-blue-400/80"
                style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
              >
                <span className="sr-only">{target.tooltip}</span>
              </button>
            )
          })}
          {activeLabelId && (
            <div
              className="absolute z-20 max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-lg"
              style={(() => {
                const target = labelTargets.find((item) => item.id === activeLabelId)
                if (!target) return { left: 8, top: 8 }
                const top = target.top - 56 > 8 ? target.top - 56 : target.top + target.height + 8
                const left = Math.min(Math.max(target.left, 8), Math.max(8, containerRef.current?.clientWidth ? containerRef.current.clientWidth - 288 : target.left))
                return { left, top }
              })()}
            >
              {labelTargets.find((item) => item.id === activeLabelId)?.tooltip}
            </div>
          )}
        </div>
      )}
    </div>
  )
}