import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import TreatmentSession from "@/models/TreatmentSession"

const normalizeLabel = (label: unknown) => (typeof label === "string" ? label.trim().toLowerCase() : "")
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Extract unique keywords from a text string for fuzzy matching.
 * Strips common stopwords and returns lowercased tokens ≥ 3 chars.
 */
const STOPWORDS = new Set([
  "the", "and", "for", "was", "with", "has", "had", "are", "not", "but",
  "this", "that", "from", "into", "been", "have", "were", "will", "can",
  "may", "also", "some", "more", "than", "very", "each", "both",
  "patient", "noted", "found", "shows", "seen", "present",
])

function extractKeywords(text?: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

/**
 * Jaccard similarity coefficient: |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0
  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Keyword overlap score: proportion of query keywords found in candidate text.
 */
function keywordOverlapScore(queryKeywords: string[], candidateText?: string): number {
  if (queryKeywords.length === 0 || !candidateText) return 0
  const candidateWords = new Set(extractKeywords(candidateText))
  let hits = 0
  for (const kw of queryKeywords) {
    if (candidateWords.has(kw)) hits++
  }
  return hits / queryKeywords.length
}

// ─── Similarity weights (medical-field-inspired) ──────────────────────────
// Detection label overlap is the strongest clinical signal, followed by
// matching imaging modality, then diagnosis/complaint text overlap.
const W_DETECTION_JACCARD = 0.45
const W_IMAGE_TYPE        = 0.15
const W_DIAGNOSIS         = 0.25
const W_COMPLAINT         = 0.15

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const labelsRaw = Array.isArray(body?.labels) ? body.labels : []
  const labels = labelsRaw.map(normalizeLabel).filter(Boolean)
  const imageType = typeof body?.imageType === "string" ? body.imageType.trim() : undefined
  const diagnosis = typeof body?.diagnosis === "string" ? body.diagnosis.trim() : undefined
  const chiefComplaint = typeof body?.chiefComplaint === "string" ? body.chiefComplaint.trim() : undefined

  if (!labels.length && !diagnosis && !chiefComplaint) {
    return NextResponse.json(
      { success: false, error: "At least one of labels, diagnosis, or chiefComplaint is required" },
      { status: 400 }
    )
  }

  await dbConnect()

  // ── 1. Broad query: fetch candidate sessions that match on ANY criterion ──
  const orConditions: Record<string, unknown>[] = []

  // Match by detection labels
  if (labels.length > 0) {
    const regexes = labels.map((lbl: string) => new RegExp(`^${escapeRegExp(lbl)}$`, "i"))
    orConditions.push({
      detections: {
        $elemMatch: {
          $or: [
            { labelNormalized: { $in: labels } },
            { label: { $in: regexes } },
          ],
        },
      },
    })
  }

  // Match by image type
  if (imageType) {
    orConditions.push({ imageType })
  }

  // Match by diagnosis keywords
  const diagnosisKeywords = extractKeywords(diagnosis)
  if (diagnosisKeywords.length > 0) {
    const diagRegex = diagnosisKeywords.map((kw) => escapeRegExp(kw)).join("|")
    orConditions.push({ diagnosis: { $regex: diagRegex, $options: "i" } })
  }

  // Match by chief complaint keywords
  const complaintKeywords = extractKeywords(chiefComplaint)
  if (complaintKeywords.length > 0) {
    const compRegex = complaintKeywords.map((kw) => escapeRegExp(kw)).join("|")
    orConditions.push({ chiefComplaint: { $regex: compRegex, $options: "i" } })
  }

  if (orConditions.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  const candidates = await TreatmentSession.find({ $or: orConditions })
    .limit(50)
    .select("diagnosis chiefComplaint procedures notes prescription followUp imageUrl imageType detections reportMarkdown updatedAt")
    .lean()

  // ── 2. Score each candidate using weighted multi-criteria similarity ──
  const queryLabelSet: Set<string> = new Set(labels as string[])

  const scored = (candidates || []).map((session: any) => {
    // Detection label Jaccard similarity
    const sessionLabels: Set<string> = new Set(
      (session.detections || [])
        .map((d: any) => normalizeLabel(d?.label || d?.labelNormalized))
        .filter(Boolean) as string[]
    )
    const detectionScore = jaccardSimilarity(queryLabelSet, sessionLabels)

    // Image type match (binary: 1 or 0)
    const imageTypeScore = imageType && session.imageType === imageType ? 1 : 0

    // Diagnosis text keyword overlap
    const diagScore = keywordOverlapScore(diagnosisKeywords, session.diagnosis)

    // Chief complaint text keyword overlap
    const complaintScore = keywordOverlapScore(complaintKeywords, session.chiefComplaint)

    // Weighted total
    const relevanceScore =
      W_DETECTION_JACCARD * detectionScore +
      W_IMAGE_TYPE * imageTypeScore +
      W_DIAGNOSIS * diagScore +
      W_COMPLAINT * complaintScore

    // Matched detections for display
    const matchedDetections = (session.detections || []).filter((det: any) =>
      labels.includes(normalizeLabel(det?.label || det?.labelNormalized))
    )
    const matchedLabels = Array.from(
      new Set(
        matchedDetections
          .map((det: any) => det?.label || det?.labelNormalized)
          .filter(Boolean)
      )
    )

    const summary =
      session.diagnosis ||
      session.notes ||
      session.procedures ||
      (typeof session.reportMarkdown === "string" ? session.reportMarkdown.slice(0, 240) : undefined)

    return {
      id: String(session._id || ""),
      diagnosis: session.diagnosis || "Similar case",
      chiefComplaint: session.chiefComplaint || null,
      procedures: session.procedures || null,
      notes: session.notes || null,
      prescription: session.prescription || null,
      followUp: session.followUp || null,
      imageUrl: session.imageUrl || null,
      imageType: session.imageType || null,
      detections: session.detections || [],
      matchedLabels,
      matchedDetections,
      reportMarkdown: session.reportMarkdown || null,
      updatedAt: session.updatedAt,
      summary,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
    }
  })

  // ── 3. Sort by relevance score, filter out very low matches ──
  scored.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
  const results = scored
    .filter((r: any) => r.relevanceScore > 0.05) // Drop near-zero matches
    .slice(0, 12)

  return NextResponse.json({ success: true, data: results })
}
