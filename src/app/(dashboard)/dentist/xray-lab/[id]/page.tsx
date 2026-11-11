'use client'

import BoundingBoxCanvas from '@/components/features/xray/bounding-box-canvas'
import DownloadReportButton from '@/components/features/xray/download-report-button'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { colorizeIssues } from '@/lib/xray-colors'

interface Issue {
  id: string
  label: string
  confidence: number
  color: string
  x: number
  y: number
  width: number
  height: number
}

interface XrayData {
  imageUrl: string
  type: string
  issues: Issue[]
}

export default function XrayResultPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<XrayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBoxes, setShowBoxes] = useState(true)
  const [showMasks, setShowMasks] = useState(true)
  const loadedRef = useRef(false)

  const loadData = useCallback(() => {
    if (id && !loadedRef.current) {
      loadedRef.current = true
      const storedData = localStorage.getItem(`xray_result_${id}`)
      if (storedData) {
        const parsed = JSON.parse(storedData)
        setData({ ...parsed, issues: colorizeIssues(parsed?.issues || []) })
      }
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return <div>Loading analysis...</div>
  }

  if (!data) {
    return <div>Analysis not found. Please try uploading again.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <p className="text-gray-500">Scan ID: #{id}</p>
            <p className="text-blue-600 font-semibold mt-1">Detected Type: {data.type}</p>
        </div>
        <div className="flex gap-2">
             {/* Client Component handles the download logic */}
            <DownloadReportButton reportRefId="printable-report-area" scanId={id} />
            
            <button className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
                Start Treatment
            </button>
        </div>
      </div>

      {/* WRAPPER ID for PDF Generation - Using explicit HEX colors for html2canvas compatibility */}
      <div id="printable-report-area" className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 rounded-xl" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        
        {/* LEFT: Main Viewer */}
        <div className="lg:col-span-2 border rounded-lg shadow-sm overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b text-sm font-medium" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' }}>
                <span>Visual Analysis</span>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide">Layers:</span>
                    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${showBoxes ? 'bg-blue-50 border-blue-300 text-blue-800' : 'border-gray-300 text-foreground hover:bg-gray-100'}`}>
                        <input
                            type="checkbox"
                            checked={showBoxes}
                            onChange={(e) => setShowBoxes(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Boxes</span>
                    </label>
                    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${showMasks ? 'bg-purple-50 border-purple-300 text-purple-800' : 'border-gray-300 text-foreground hover:bg-gray-100'}`}>
                        <input
                            type="checkbox"
                            checked={showMasks}
                            onChange={(e) => setShowMasks(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Masks</span>
                    </label>
                </div>
            </div>
            <div className="p-2">
               <BoundingBoxCanvas
                   imageUrl={data.imageUrl}
                   issues={data.issues}
                   showBoxes={showBoxes}
                   showMasks={showMasks}
               />
            </div>
        </div>

        {/* RIGHT: Findings List */}
        <div className="space-y-4">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                <h3 className="font-semibold text-lg mb-4" style={{ color: '#1f2937' }}>Detected Issues (AI)</h3>
                <div className="space-y-3">
                    {data.issues.map((issue: Issue) => (
                        <div key={issue.id} className="flex items-start gap-3 p-3 rounded-md border shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                            <div 
                                className="w-4 h-4 mt-1 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: issue.color }}
                            />
                            <div>
                                <p className="font-medium" style={{ color: '#111827' }}>{issue.label}</p>
                                <p className="text-sm" style={{ color: '#6b7280' }}>Confidence: {Math.round(issue.confidence * 100)}%</p>
                            </div>
                        </div>
                    ))}
                    {data.issues.length === 0 && (
                        <p className="text-gray-500 italic">No issues detected.</p>
                    )}
                </div>
            </div>

             <div className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                <h3 className="font-semibold text-lg mb-2" style={{ color: '#1f2937' }}>Notes</h3>
                <div className="p-3 border rounded text-sm italic min-h-[100px]" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#4b5563' }}>
                  (Notes entered here will appear in the PDF)
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}