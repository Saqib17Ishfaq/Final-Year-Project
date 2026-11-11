'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const MODALITY_DATA = [
  { name: 'Periapical', value: 56, color: '#8c62c2' },
  { name: 'Panoramic (OPG)', value: 25, color: '#a78bda' },
  { name: 'Bitewing', value: 19, color: '#7c4dba' },
]

const TASK_DATA = [
  { name: 'Tooth Numbering', value: 58, color: '#8c62c2' },
  { name: 'Disease Detection', value: 42, color: '#a78bda' },
]

const SOURCE_DATA = [
  { name: 'Roboflow (CC BY 4.0)', value: 83, color: '#8c62c2' },
  { name: 'Mendeley Data', value: 17, color: '#7c4dba' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelTransparencyPage() {
  const [persona, setPersona] = useState<'clinician' | 'engineer'>('clinician')
  const isClinician = persona === 'clinician'

  return (
    <div className="min-h-screen pb-16">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #583d7e 0%, #8c62c2 50%, #a78bda 100%)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              OrthoAI Transparency Dashboard
            </h1>
            <p className="mt-1 text-purple-200 text-sm sm:text-base">
              {isClinician
                ? 'Understand how our AI assists your clinical workflow'
                : 'Model architecture, metrics & data provenance'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 self-start sm:self-auto">
            <span className={`text-sm font-medium transition-colors ${isClinician ? 'text-white' : 'text-purple-300'}`}>
              Clinician
            </span>
            <button
              onClick={() => setPersona(p => (p === 'clinician' ? 'engineer' : 'clinician'))}
              className="relative w-12 h-6 rounded-full bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300"
              aria-label="Toggle persona"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  !isClinician ? 'translate-x-6' : ''
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${!isClinician ? 'text-white' : 'text-purple-300'}`}>
              Data Scientist
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Intended Use ("Nutrition Label") ─────────────────────── */}
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4 bg-purple-50 dark:bg-purple-900/20">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold">i</span>
              {isClinician ? 'What This Tool Is — and What It Isn\'t' : 'Intended Use & Scope'}
            </h2>
          </div>
          <div className="p-6 space-y-3 text-sm text-foreground leading-relaxed">
            {isClinician ? (
              <>
                <p><strong>OrthoAI</strong> is a clinical decision-support tool that highlights potential anomalies on panoramic (OPG), bitewing, and periapical dental X-rays. It identifies standard anatomical structures (Teeth 11–48, FDI notation) and flags areas that may require further investigation (e.g., caries, restorations, RCT).</p>
                <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">⚠️ Important Disclaimer</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">This tool is <strong>not a replacement for clinical judgment</strong>. All AI-generated findings must be validated by a qualified dental professional before any clinical decision is made.</p>
                </div>
              </>
            ) : (
              <>
                <p><strong>Model Type:</strong> Ensemble of YOLOv8 (nano/small/medium) object detectors and MobileSAM (Segment Anything Model).</p>
                <p><strong>Task:</strong> Multi-class bounding-box detection and point-prompted instance segmentation across 38 distinct classes (32 FDI teeth + 6 disease/pathology classes including Caries, Badly Decayed, Crown, Normal, RCT, Restoration).</p>
                <p><strong>Deployment:</strong> Inference via HuggingFace Spaces (FastAPI backend). No on-device training. Model weights are frozen at deployment (ONNX/PyTorch).</p>
                <div className="mt-4 rounded-lg border-l-4 border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-4">
                  <p className="text-foreground"><strong>Scope Limitation:</strong> Performance is validated purely for 2D radiographs (OPG, Bitewing, Periapical). CBCT volumetric data, cephalometric, and extra-oral images are strictly out-of-distribution.</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Training Data Profile ────────────────────────────────── */}
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              {isClinician ? 'How the AI Was Trained' : 'Training Data Profile'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isClinician
                ? 'Trained on 4,600+ verified clinical X-rays across multiple modalities.'
                : 'Training set size: N = 4,677 unique images (excluding augmented variants).'}
            </p>
          </div>

          <div className="p-6">
            <div className="mb-4 rounded-lg border p-4 text-sm text-foreground bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              {isClinician
                ? 'Our models utilize an aggregation of open-source datasets (Mendeley Data, Roboflow Universe) covering panoramic, bitewing, and periapical views to ensure exposure to varying clinical environments.'
                : 'Aggregated datasets include Mendeley Bitewing (100 images), Mendeley Panoramic OPG (231 original / 835 augmented images), Roboflow Panoramic OPG Teeth (594 images), Roboflow Bitewing Teeth (917 images), and Roboflow Periapical (1,445 disease detection images + 1,721 tooth detection images).'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Modality Distribution */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {isClinician ? 'X-Ray Modalities' : 'Modality Distribution'}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MODALITY_DATA} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} tick={{ fill: 'var(--foreground)' }} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: 'var(--foreground)' }} />
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {MODALITY_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Task Split */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {isClinician ? 'Anatomy vs. Pathology' : 'Task Split (by Dataset Volume)'}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={TASK_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2} label={({ name, value }) => `${name} ${value}%`} fontSize={10}>
                        {TASK_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Source */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {isClinician ? 'Dataset Sources' : 'Provenance'}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SOURCE_DATA} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} tick={{ fill: 'var(--foreground)' }} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} tick={{ fill: 'var(--foreground)' }} />
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {SOURCE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Performance Metrics ──────────────────────────────────── */}
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              {isClinician ? 'How Reliable Is It?' : 'Performance Metrics (Best Models)'}
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recall */}
            <MetricCard
              value={isClinician ? 'Up to 91%' : '0.42 - 0.91'}
              label={isClinician ? 'Detection Rate' : 'Recall Range'}
              description={
                isClinician
                  ? 'The system successfully detects anatomical structures up to 91% of the time, though pathology detection varies by complexity.'
                  : 'Recall varies heavily by task: 0.9136 (OPG Teeth YOLOv8m) down to 0.4167 (BW Caries YOLOv8m).'
              }
              variant="primary"
            />

            {/* Precision */}
            <MetricCard
              value={isClinician ? 'Up to 92%' : '0.53 - 0.91'}
              label={isClinician ? 'Alert Accuracy' : 'Precision Range'}
              description={
                isClinician
                  ? 'When OrthoAI flags an anatomical feature, it is highly accurate, minimizing false structural alerts.'
                  : 'Precision peaks at 0.9152 (OPG Teeth YOLOv8s) and drops on noisy pathology tasks (0.5372 BW Caries).'
              }
              variant="light"
            />

            {/* mAP@50 */}
            <MetricCard
              value={isClinician ? 'High' : '0.54 - 0.94'}
              label={isClinician ? 'Localization Accuracy' : 'mAP@50'}
              description={
                isClinician
                  ? 'The AI accurately pinpoints the boundaries of findings on panoramic X-rays.'
                  : 'Mean Average Precision at IoU 0.50. Achieved 0.9433 on OPG tooth numbering, 0.5414 on Periapical diseases.'
              }
              variant="dark"
            />

            {/* mAP@50-95 */}
            <MetricCard
              value={isClinician ? 'Moderate' : '0.22 - 0.63'}
              label={isClinician ? 'Boundary Strictness' : 'mAP@50-95'}
              description={
                isClinician
                  ? 'The exact borders of drawn boxes may be slightly loose around irregular cavities.'
                  : 'Strict IoU thresholding shows expected degradation, peaking at 0.6359 for well-defined structures like teeth.'
              }
              variant="accent"
            />
          </div>
        </section>

        {/* ── Known Limitations ────────────────────────────────────── */}
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden" id="tour-ai-limitations">
          <div className="border-b px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10">
            <h2 className="text-lg font-semibold text-foreground">
              {isClinician ? 'When to Be Extra Cautious' : 'Known Limitations & Edge Cases'}
            </h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {(isClinician
                ? [
                    'Pathology detection (like early caries) is significantly harder for the AI than tooth numbering — always correlate with clinical probing.',
                    'Accuracy drops on underexposed or overexposed scans — ensure proper radiographic technique.',
                    'In patients with extensive metal restorations or braces, the AI may produce more false positive bounds.',
                    'The tool does not assess soft tissue conditions visible on radiographs.',
                  ]
                : [
                    'Disease detection models (Periapical / Bitewing Caries) plateau at ~0.54 mAP@50, indicating high difficulty in distinguishing subtle radiographic changes without 3D context.',
                    'Metallic occlusion artifacts (orthodontic brackets, posts, crowns) increase FP rate in affected regions.',
                    'No soft-tissue segmentation head — model is purely hard-tissue / dental-structure focused.',
                    'MobileSAM zero-shot segmentation requires precise point/box prompting; noisy YOLOv8 bounding boxes can degrade final mask quality.',
                  ]
              ).map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">!</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Privacy Guarantee ────────────────────────────────────── */}
        <section className="rounded-xl border shadow-sm overflow-hidden bg-purple-50 dark:bg-purple-900/20">
          <div className="p-6 flex items-start gap-4">
            <span className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-purple-800 dark:bg-purple-700 text-white flex items-center justify-center text-lg font-bold">🔒</span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Privacy &amp; Compliance</h2>
              <p className="text-sm text-foreground mt-1 leading-relaxed">
                {isClinician
                  ? 'Your patient data never leaves the clinic. All AI analysis runs in-memory on secure servers — no patient images or Protected Health Information (PHI) are stored, logged, or used for future training.'
                  : 'Inference is executed in ephemeral containers on HuggingFace Spaces. Input tensors are discarded post-inference (no disk I/O). No PHI is persisted, logged, or used for model fine-tuning. Architecture is stateless by design. HIPAA technical safeguard alignment maintained.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Metric Card sub-component                                          */
/* ------------------------------------------------------------------ */

type CardVariant = 'primary' | 'light' | 'dark' | 'accent'

function MetricCard({ value, label, description, variant }: { value: string; label: string; description: string; variant: CardVariant }) {
  const variantClasses: Record<CardVariant, { card: string; label: string; badge: string }> = {
    primary: {
      card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      label: 'text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-600 dark:bg-purple-500',
    },
    light: {
      card: 'bg-purple-50/60 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/60',
      label: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-400 dark:bg-purple-500',
    },
    dark: {
      card: 'bg-purple-100/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700',
      label: 'text-purple-800 dark:text-purple-300',
      badge: 'bg-purple-800 dark:bg-purple-600',
    },
    accent: {
      card: 'bg-purple-50/80 dark:bg-purple-900/15 border-purple-200 dark:border-purple-800/50',
      label: 'text-purple-700 dark:text-purple-400',
      badge: 'bg-purple-500 dark:bg-purple-500',
    },
  }
  const s = variantClasses[variant]
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md ${s.card}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wider ${s.label}`}>{label}</span>
        <span className={`text-white text-sm font-bold px-3 py-1 rounded-full ${s.badge}`}>{value}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
