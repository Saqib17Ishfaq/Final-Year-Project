export const TREATMENT_REPORT_TEMPLATE = `# Dental Treatment Report

## Patient Information
| Field | Value |
|-------|-------|
| Patient Name | {{patientName}} |
| Patient Code | {{patientCode}} |
| Age | {{patientAge}} |
| Gender | {{patientGender}} |
| Appointment ID | {{appointmentId}} |
| Attending Dentist | {{dentistName}} |
| Date of Visit | {{date}} |

## Clinical Summary

### Chief Complaint
{{chiefComplaint}}

### Diagnosis
{{diagnosis}}

### Procedures Performed
{{procedures}}

## Radiographic Findings
{{imageSection}}

## AI-Detected Findings
{{detectionsSection}}

## Clinical Notes
{{notes}}

## Prescription
{{prescription}}

## Follow-Up Plan
{{followUp}}

---
*This report was generated as part of a clinical treatment session. All findings should be correlated with clinical examination.*
`;
