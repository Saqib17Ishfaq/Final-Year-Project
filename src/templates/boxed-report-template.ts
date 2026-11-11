export const BOXED_REPORT_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dental Treatment Report</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 10mm; }
    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      margin: 0;
      background: #f5f5f7;
      color: #0f172a;
      padding: 0;
    }
    .page {
      width: 190mm;
      background: #fff;
      padding: 14mm;
      border: 1px solid #d7dfe6;
      margin: 0 auto;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
    }
    .report-table td {
      padding: 0;
      vertical-align: top;
    }
    .header-cell,
    .body-cell,
    .footer-cell {
      width: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .logo img {
      width: 110px;
      height: auto;
    }
    .clinic-info { flex: 1; margin-left: 12px; }
    .clinic-name { display: none; }
    .clinic-subtitle { display: none; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .meta-item { color: #334155; }
    .meta-label { font-size: 9px; color: #94a3b8; letter-spacing: 0.2em; margin-bottom: 2px; font-weight: 600; }
    .section-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .section-full {
      display: block;
    }
    .card {
      border: 1px solid #e2e8f0;
      padding: 8px;
      background: #fdfefe;
      min-height: 60px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card strong { font-size: 12px; color: #0f172a; }
    .card p { margin: 3px 0 0; font-size: 11px; color: #1e293b; line-height: 1.35; }
    .imaging {
      grid-column: span 2;
      border: 1px solid #e2e8f0;
      padding: 8px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .imaging img { max-width: 100%; max-height: 200px; display: block; margin: 0 auto; }
    .imaging-note { font-size: 10px; color: #64748b; margin-top: 6px; text-align: center; font-style: italic; }
    .detections-row {
      grid-column: span 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .detections-card {
      border: 1px solid #e2e8f0;
      padding: 8px;
      background: #fdfefe;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .detections-card strong { font-size: 12px; color: #0f172a; display: block; margin-bottom: 4px; }
    .detection-list { margin: 0; padding-left: 16px; font-size: 10px; color: #334155; line-height: 1.5; }
    .detection-list li { margin-bottom: 2px; }
    .measurement-list { margin: 0; padding-left: 16px; font-size: 10px; color: #334155; line-height: 1.5; }
    .measurement-list li { margin-bottom: 2px; }
    .no-data { font-size: 10px; color: #94a3b8; font-style: italic; }
    .llm-report {
      grid-column: span 2;
      border: 1px solid #e2e8f0;
      padding: 8px;
      background: #fdfefe;
      break-inside: auto;
      page-break-inside: auto;
    }
    .llm-report .box {
      border: 1px solid #e2e8f0;
      padding: 8px;
      min-height: 80px;
      font-size: 11px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: justify;
      background: #fff;
      resize: none;
      overflow: visible;
      max-height: none;
      break-inside: auto;
      page-break-inside: auto;
    }
    .print-footer {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 12px;
      font-size: 10px;
      color: #475569;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-footer .sig-block {
      width: 160px;
    }
    .print-footer .sig-space {
      height: 10mm;
    }
    .print-footer .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      text-align: center;
    }

    @media print {
      @page { size: A4; margin: 10mm; }

      body {
        margin: 0;
        background: #fff;
        display: block !important;
      }

      .page {
        width: auto;
        min-height: auto;
        border: none;
        padding: 0;
        margin: 0;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .report-table thead {
        display: table-header-group;
      }

      .report-table tbody {
        display: table-row-group;
      }

      .report-table tfoot {
        display: table-footer-group;
      }

      .header {
        position: static;
        margin-bottom: 0;
        padding-bottom: 3mm;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }

      .section-grid,
      .section-full,
      .print-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .print-footer {
        padding-top: 3mm;
        background: #fff;
        border-top: 1px solid #e2e8f0;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <table class="report-table" role="presentation">
      <thead>
        <tr>
          <td class="header-cell">
            <div class="header">
              <div class="logo">
                <img src="{{logoSrc}}" alt="Clinic Logo" />
              </div>
              <div class="clinic-info"></div>
              <div class="meta-grid">
                <div class="meta-item">
                  <div class="meta-label">Patient</div>
                  {{patientName}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Dentist</div>
                  {{dentistName}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Date</div>
                  {{date}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Patient Code</div>
                  {{patientCode}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Age</div>
                  {{patientAge}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Gender</div>
                  {{patientGender}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">Appointment</div>
                  {{appointmentId}}
                </div>
                <div class="meta-item">
                  <div class="meta-label">X-Ray Type</div>
                  {{xrayType}}
                </div>
              </div>
            </div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="body-cell">
            <div class="section-grid">
              <div class="card">
                <strong>Chief Complaint</strong>
                <p>{{chiefComplaint}}</p>
              </div>
              <div class="card">
                <strong>Diagnosis</strong>
                <p>{{diagnosis}}</p>
              </div>
              <div class="card">
                <strong>Procedures</strong>
                <p>{{procedures}}</p>
              </div>
              <div class="card">
                <strong>Prescription</strong>
                <p>{{prescription}}</p>
              </div>
              <div class="card">
                <strong>Follow-up</strong>
                <p>{{followUp}}</p>
              </div>
              <div class="card">
                <strong>Clinical Notes</strong>
                <p>{{notes}}</p>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td class="body-cell">
            <div class="section-full imaging">
              <div class="meta-label">Radiographic Imaging (with AI Detections &amp; Annotations)</div>
              {{#if imageUrl}}
                <img src="{{imageUrl}}" alt="Annotated X-Ray" />
                <div class="imaging-note">{{imagingNote}}</div>
              {{/if}}
              {{#ifNot imageUrl}}
                <p class="no-data">No imaging provided.</p>
              {{/ifNot}}
            </div>
          </td>
        </tr>
        <tr>
          <td class="body-cell">
            <div class="section-full detections-card">
              <strong>AI-Detected Findings</strong>
              {{detectionsHtml}}
            </div>
          </td>
        </tr>
        <tr>
          <td class="body-cell">
            <div class="section-full llm-report">
              <div class="meta-label">AI Clinical Summary</div>
              <div class="box">{{llmReport}}</div>
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="footer-cell">
            <div class="print-footer">
              <div>Generated by {{clinicName}} &bull; {{date}}</div>
              <div class="sig-block">
                <div class="sig-space"></div>
                <div class="sig-line">{{dentistName}}</div>
              </div>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>
` as const
