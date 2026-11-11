'use client'

import DownloadReportButton from '@/components/features/xray/download-report-button'

const TREATMENT_SECTIONS = [
  {
    title: 'Presentation',
    body:
      'The patient presented with extensive carious lesions affecting teeth #13, #24, #25, #26, #35, #45, and #46, reporting discomfort and sensitivity. Clinical examination confirmed a large 26 mm cavitation in tooth 13, minor decay in tooth 24, deep decay in tooth 25, and a non-vital status of tooth 45.',
  },
  {
    title: 'Radiographic Findings',
    body:
      'AI analysis of the radiographs revealed no significant pathology, indicating the absence of periapical radiolucency or other hidden lesions. The confidence in this assessment is high, supporting the planned restorative and surgical interventions localized to the aforementioned teeth.',
  },
  {
    title: 'Clinical Management',
    body:
      'Procedures performed included preparation of a root canal for tooth 26, extraction of tooth 35 after administration of local anesthesia and prophylactic antibiotics, and placement of a small composite patch on tooth 46. Tooth 13 was prepared for definitive restoration of the 26 mm cavity, while tooth 24 received minimal caries removal and tooth 25 was scheduled for deep caries management.',
  },
  {
    title: 'Prescribed Medications',
    body:
      'Prescribed medications were ibuprofen 500 mg for analgesia, lidocaine 10 ml for local anesthesia, co-amoxiclav 675 mg for infection control, and brexin 100 mg as adjunctive therapy.',
  },
  {
    title: 'Follow-Up',
    body:
      'A review appointment is scheduled in three days to evaluate healing, pain control, and to finalize restorative treatment.',
  },
]

const TREATMENT_LOG = Array.from({ length: 28 }, (_, index) => ({
  step: index + 1,
  area: ['Tooth 13', 'Tooth 24', 'Tooth 25', 'Tooth 26', 'Tooth 35', 'Tooth 45', 'Tooth 46'][index % 7],
  note:
    index % 4 === 0
      ? 'Focused enamel and dentine assessment documented with photographic review and chart verification.'
      : index % 4 === 1
        ? 'Restorative margins were examined for isolation, moisture control, and caries removal completeness.'
        : index % 4 === 2
          ? 'Local anesthesia tolerance, bleeding control, and postoperative instructions were rechecked.'
          : 'Documentation updated with medication advice, recall timing, and contingency instructions for worsening pain.',
}))

export default function TestTreatmentReportPage() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Treatment Report Pagination Test</h1>
          <p className="mt-1 text-sm text-gray-500">
            Long prefilled treatment notes force a 2 to 3 page PDF so you can verify the shared header and footer on every page.
          </p>
        </div>
        <DownloadReportButton
          reportRefId="test-treatment-report-printable-area"
          patientName="Test Treatment Patient"
          patientCode="PT-TREAT-001"
          appointmentId="APT-TREAT-2026-001"
          xrayType="Treatment Report"
          scanId="TREAT-001"
          dentistName="Dr. Test Doctor"
          reportDate={new Date().toLocaleDateString()}
        />
      </div>

      <div id="test-treatment-report-printable-area" className="bg-white p-4 text-slate-900">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="mb-2 text-xl font-bold">Dental Treatment Report</h2>
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
            <div><span className="text-slate-500">Patient:</span> Test Treatment Patient</div>
            <div><span className="text-slate-500">Patient Code:</span> PT-TREAT-001</div>
            <div><span className="text-slate-500">Appointment:</span> APT-TREAT-2026-001</div>
            <div><span className="text-slate-500">Dentist:</span> Dr. Test Doctor</div>
            <div><span className="text-slate-500">Date:</span> {new Date().toLocaleDateString()}</div>
            <div><span className="text-slate-500">Status:</span> Completed</div>
          </div>
        </div>

        <div className="grid gap-3 py-4 md:grid-cols-2">
          {TREATMENT_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>
              <p className="text-sm leading-6 text-slate-800">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-md border border-slate-200 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Expanded Clinical Narrative
          </div>
          <div className="space-y-3 text-sm leading-6 text-slate-800">
            <p>
              The patient was assessed in a calm, well-lit clinical setting. Soft tissue examination, occlusal review, and sensitivity testing were performed before any intervention began. Teeth with active decay were isolated sequentially to ensure documentation remained accurate and reproducible.
            </p>
            <p>
              Tooth 13 required the most extensive preparation because of the large cavitation, and restorative planning was documented carefully to support a predictable final restoration. Tooth 24 showed limited decay, while tooth 25 demonstrated deeper involvement and therefore required a staged approach.
            </p>
            <p>
              Tooth 26 underwent root canal preparation, and the operative notes recorded access refinement, canal identification, and immediate irrigation. Tooth 35 was extracted under local anesthesia with prophylactic antibiotic coverage, and hemostasis was verified before the patient was discharged with standard postoperative instructions.
            </p>
            <p>
              The final clinical plan emphasized symptom control, preservation of remaining tooth structure, and early recall. The patient was advised to monitor swelling, avoid chewing on the affected side, and return sooner if pain intensity increased or if any bleeding persisted.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Treatment Log ({TREATMENT_LOG.length} entries)
          </div>
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Area</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {TREATMENT_LOG.map((entry) => (
                <tr key={entry.step} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-500">{entry.step}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{entry.area}</td>
                  <td className="px-3 py-2 leading-5 text-slate-700">{entry.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Summary for Print Verification
          </div>
          <p className="text-sm leading-6 text-slate-800">
            This page is intentionally long enough to span multiple pages when exported. Use the download button above to confirm the custom PDF header, page number, and footer signature block appear consistently on page one, page two, and page three if generated.
          </p>
        </div>
      </div>
    </div>
  )
}