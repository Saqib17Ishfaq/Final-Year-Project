'use client'

import DownloadReportButton from '@/components/features/xray/download-report-button'

const FAKE_FINDINGS = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  tooth: 'Tooth #' + (10 + i),
  finding: ['Cavity detected', 'Bone loss observed', 'Calculus buildup', 'Root resorption', 'Periapical lesion'][i % 5],
  severity: ['Mild', 'Moderate', 'Severe'][i % 3],
  confidence: Math.round(70 + (i * 7) % 29) + '%',
}))

export default function TestPdfPage() {
  return (
    <div className="space-y-4 p-4">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PDF Pagination Test</h1>
          <p className="text-gray-500 text-sm mt-1">
            30 fake findings force 2+ pages. Download and check every page has header and footer.
          </p>
        </div>
        <DownloadReportButton reportRefId="test-printable-area" patientName="Test Patient" scanId="TEST-001" />
      </div>

      <div id="test-printable-area" style={{ backgroundColor: '#ffffff', color: '#111827', padding: '16px' }}>

        <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>X-Ray Analysis Report — Test Patient</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div><span style={{ color: '#6b7280' }}>Patient Code:</span> PT-TEST-001</div>
            <div><span style={{ color: '#6b7280' }}>Appointment:</span> APT-2024-001</div>
            <div><span style={{ color: '#6b7280' }}>X-Ray Type:</span> Panoramic (OPG)</div>
            <div><span style={{ color: '#6b7280' }}>Dentist:</span> Dr. Test Doctor</div>
            <div><span style={{ color: '#6b7280' }}>Date:</span> {new Date().toLocaleDateString()}</div>
            <div><span style={{ color: '#6b7280' }}>Status:</span> Completed</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Chief Complaint', value: 'Persistent dull ache in lower left quadrant for 3 weeks, worsening with cold foods.' },
            { label: 'Diagnosis', value: 'Early periapical periodontitis on tooth 36. Secondary calculus buildup on 31-34.' },
            { label: 'Procedures', value: 'Root canal treatment on 36. Professional scaling and polishing. Fluoride application.' },
            { label: 'Prescription', value: 'Amoxicillin 500mg 3x daily for 5 days. Ibuprofen 400mg as needed. Chlorhexidine rinse.' },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.4' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            AI-Detected Findings ({FAKE_FINDINGS.length} items) — scroll forces page 2+
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>#</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Tooth</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Finding</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Severity</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {FAKE_FINDINGS.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{row.id}</td>
                  <td style={{ padding: '7px 12px', fontWeight: '500' }}>{row.tooth}</td>
                  <td style={{ padding: '7px 12px', color: '#334155' }}>{row.finding}</td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: '600',
                      backgroundColor: row.severity === 'Severe' ? '#fee2e2' : row.severity === 'Moderate' ? '#fef3c7' : '#dcfce7',
                      color: row.severity === 'Severe' ? '#dc2626' : row.severity === 'Moderate' ? '#d97706' : '#16a34a',
                    }}>{row.severity}</span>
                  </td>
                  <td style={{ padding: '7px 12px', color: '#334155' }}>{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>AI Clinical Summary</div>
          <div style={{ fontSize: '11px', color: '#1e293b', lineHeight: '1.6' }}>
            Radiographic examination reveals significant periapical changes around tooth 36 consistent with pulpal necrosis.
            Multiple areas of interproximal caries detected in the posterior region. Moderate generalized bone loss
            indicative of chronic periodontitis. Recommend immediate endodontic intervention followed by a comprehensive
            periodontal treatment plan. Patient should be recalled in 2 weeks for post-operative evaluation.
          </div>
        </div>

      </div>
    </div>
  )
}
