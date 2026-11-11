"""
Dental report generator using Groq API (Kimi K2) with rule-based template fallback.
"""

from __future__ import annotations

import datetime
import json
import ast
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False


class DentalReportGenerator:
    """Generate dental visit reports via Groq (Kimi K2) with template fallback."""

    def __init__(self, model_name: Optional[str] = None, *, timeout_s: Optional[int] = None) -> None:
        self.model_name = model_name or os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct-0905")
        env_timeout = os.getenv("GROQ_TIMEOUT_S")
        resolved_timeout = timeout_s
        if resolved_timeout is None and env_timeout is not None:
            try:
                resolved_timeout = int(env_timeout)
            except ValueError:
                resolved_timeout = None
        if resolved_timeout is None:
            resolved_timeout = 30
        self.timeout_s = resolved_timeout
        try:
            self.temperature = float(os.getenv("GROQ_TEMPERATURE", "0.6"))
        except ValueError:
            self.temperature = 0.6
        self.max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "4096"))
        # Comprehensive treatment plan mappings for common dental findings
        self.treatment_plan: Dict[str, str] = {
            # Caries and decay
            "Caries": "Recommend restorative management (e.g., composite filling) and oral hygiene reinforcement.",
            "Dental Caries": "Recommend restorative management (e.g., composite filling) and oral hygiene reinforcement.",
            "Interproximal Caries": "Recommend interproximal restoration and flossing technique reinforcement.",
            "Secondary Caries": "Evaluate existing restoration; consider replacement with new restorative material.",
            
            # Periapical conditions
            "Periapical Lesion": "Consider endodontic evaluation; if symptomatic, initiate root canal therapy.",
            "Periapical Abscess": "Urgent endodontic intervention required; consider antibiotic coverage.",
            "Periapical Radiolucency": "Endodontic evaluation recommended; monitor for changes.",
            
            # Periodontal conditions
            "Periodontitis": "Debridement and scaling; reinforce periodontal maintenance and reevaluate in 4-6 weeks.",
            "Bone Loss": "Periodontal evaluation recommended; consider deep scaling and root planing.",
            "Horizontal Bone Loss": "Periodontal therapy indicated; reinforce oral hygiene practices.",
            "Vertical Bone Loss": "Periodontal surgery evaluation may be required.",
            
            # Restorations and treatments
            "Restoration": "Monitor existing restoration for integrity; no immediate intervention required.",
            "Filling": "Existing filling noted; monitor for marginal integrity.",
            "Crown": "Crown restoration present; evaluate fit and margins.",
            "Root Canal": "Endodontically treated tooth; monitor periapical status.",
            "Root Canal Treatment": "Previous endodontic therapy noted; monitor for periapical healing.",
            
            # Impacted teeth
            "Impacted": "Evaluate for extraction or orthodontic exposure based on clinical presentation.",
            "Impacted Tooth": "Surgical evaluation recommended for impacted tooth management.",
            "Impacted Wisdom Tooth": "Consider surgical extraction if symptomatic or at risk.",
            
            # Other findings
            "Missing Tooth": "Evaluate for prosthetic replacement options (implant, bridge, or removable prosthesis).",
            "Retained Root": "Surgical extraction of retained root fragment recommended.",
            "Calculus": "Professional scaling and prophylaxis recommended.",
            "Pulp Stone": "Incidental finding; no treatment required unless symptomatic.",
            "Radiopacity": "Further evaluation may be warranted to determine nature of finding.",
            "Radiolucency": "Additional imaging or clinical correlation recommended.",
            
            # BDC-BDR (combined label from model)
            "BDC-BDR": "Assess restorability; if restorable plan RCT + post-core + crown; if non-restorable, extraction indicated with ridge preservation consideration.",
        }

    def generate_report(
        self,
        detections: List[Dict[str, Any]],
        patient_name: str,
        clinical_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        clinical_data = clinical_data or {}

        # Try a concise AI analysis (3-4 sentences) for the print box.
        summary = self._generate_ai_analysis(detections, patient_name, clinical_data)
        if summary:
            return summary

        # Fallback: concise, hand-crafted analysis.
        return self._generate_template_analysis(detections, patient_name, clinical_data)

    def _generate_ai_analysis(
        self,
        detections: List[Dict[str, Any]],
        patient_name: str,
        clinical_data: Dict[str, Any],
    ) -> Optional[str]:
        findings = self._format_findings(detections)
        
        # Prepare data with defaults
        chief_complaint = clinical_data.get("chief_complaint") or "Routine dental evaluation"
        
        manual_diagnoses = clinical_data.get("manual_diagnoses")
        if isinstance(manual_diagnoses, list) and manual_diagnoses:
            diagnosis_text = ", ".join(manual_diagnoses)
        elif manual_diagnoses:
            diagnosis_text = str(manual_diagnoses)
        else:
            diagnosis_text = "To be determined"
        
        procedures = clinical_data.get("procedures_done")
        if isinstance(procedures, list) and procedures:
            procedures_text = ", ".join(procedures)
        elif procedures:
            procedures_text = str(procedures)
        else:
            procedures_text = "None performed"
        
        prescription = clinical_data.get("prescription") or "None prescribed"
        clinical_notes = clinical_data.get("clinical_notes") or "No additional notes"
        follow_up = clinical_data.get("follow_up") or "Routine follow-up in 6 months"
        
        radiographic_findings = findings if detections else "No significant pathology detected"

        prompt = f"""You are an expert dental radiologist generating a professional clinical report. Create a comprehensive yet concise dental report using the patient data provided.

PATIENT INFORMATION:
- Name: {patient_name}
- Chief Complaint: {chief_complaint}
- Clinical Diagnosis: {diagnosis_text}

AI-DETECTED RADIOGRAPHIC FINDINGS:
{radiographic_findings}

CLINICAL DATA:
- Procedures Performed: {procedures_text}
- Prescription: {prescription}
- Clinical Notes: {clinical_notes}
- Follow-up Plan: {follow_up}

GENERATE A REPORT WITH EXACTLY THESE 4 SECTIONS:

1. PRESENTATION: Write 1-2 sentences describing the patient's presenting complaint, symptoms, and initial clinical assessment. Use professional dental terminology.

2. RADIOGRAPHIC FINDINGS: Write 2-3 sentences interpreting the AI-detected findings. For each finding, mention its clinical significance, location if relevant, and confidence level.

3. CLINICAL MANAGEMENT: Write 2-3 sentences detailing the procedures performed or recommended, medications prescribed with their purpose, and any relevant clinical observations that guide treatment.

4. FOLLOW-UP: Write 1-2 sentences about expected outcomes and the recommended follow-up schedule with specific timeframes and reasons.

FORMATTING RULES:
- Start each section with its exact label in caps followed by a colon (e.g., "PRESENTATION:", "RADIOGRAPHIC FINDINGS:", "CLINICAL MANAGEMENT:", "FOLLOW-UP:")
- Use professional dental/medical terminology
- Be specific and clinically relevant
- Include all provided data naturally in the narrative
- Do not add disclaimers, headers, or extra commentary
- Use third person ("The patient..." not "You...")
- Total length: 8-10 sentences across all sections"""

        raw = self._generate_via_llm(prompt)
        if not raw:
            return None
        
        # Clean output
        result = raw.strip()
        
        # Light validation: accept if at least 2 of the 4 expected sections appear
        required_labels = ["PRESENTATION:", "RADIOGRAPHIC FINDINGS:", "CLINICAL MANAGEMENT:", "FOLLOW-UP:"]
        matched = sum(1 for label in required_labels if label in result)
        if matched < 2:
            print(f"[DentalReportGenerator] LLM output didn't match expected format ({matched}/4 sections found). Using template.", file=sys.stderr)
            return None
            
        return result

    def _generate_template_analysis(
        self,
        detections: List[Dict[str, Any]],
        patient_name: str,
        clinical_data: Dict[str, Any],
    ) -> str:
        # Prepare data with defaults (same as AI method)
        chief_complaint = clinical_data.get("chief_complaint") or "routine dental evaluation"
        
        manual_diagnoses = clinical_data.get("manual_diagnoses")
        if isinstance(manual_diagnoses, list) and manual_diagnoses:
            diagnosis_text = ", ".join(manual_diagnoses)
        elif manual_diagnoses:
            diagnosis_text = str(manual_diagnoses)
        else:
            diagnosis_text = "to be determined based on clinical findings"
        
        procedures = clinical_data.get("procedures_done")
        if isinstance(procedures, list) and procedures:
            procedures_text = ", ".join(procedures)
        elif procedures:
            procedures_text = str(procedures)
        else:
            procedures_text = "none performed during this visit"
        
        prescription = self._stringify_field(clinical_data.get("prescription")) or "none prescribed"
        clinical_notes = clinical_data.get("clinical_notes") or "no additional clinical observations"
        follow_up = clinical_data.get("follow_up") or "routine follow-up recommended in 6 months"
        
        findings = self._format_findings(detections)
        radiographic_findings = findings if detections else "no significant pathology detected"
        
        radiographic_findings = findings if detections else "no significant pathology detected"

        # Build strict format report
        sentences = [
            f"PRESENTATION: The patient {patient_name} presented with {chief_complaint.lower()}, and clinical assessment indicates {diagnosis_text.lower()}.",
            f"RADIOGRAPHIC FINDINGS: Dental radiographic analysis revealed {radiographic_findings.lower()}.",
            f"CLINICAL MANAGEMENT: Treatment included {procedures_text.lower()}, with {prescription.lower()}, and clinical observations note {clinical_notes.lower().rstrip('.')}.",
            f"FOLLOW-UP: Recommended plan includes {follow_up.lower().rstrip('.')}."
        ]

        return " ".join(sentences)

    def _format_clinical_context(self, clinical_data: Dict[str, Any]) -> str:
        fields = [
            ("Chief Complaint", clinical_data.get("chief_complaint")),
            ("Manual Diagnoses", self._format_field_list(clinical_data.get("manual_diagnoses"))),
            ("Procedures Done", self._format_field_list(clinical_data.get("procedures_done"))),
            ("Prescription", clinical_data.get("prescription")),
            ("Follow-up", clinical_data.get("follow_up")),
            ("Notes", clinical_data.get("clinical_notes")),
        ]
        lines = []
        for label, value in fields:
            if value:
                lines.append(f"- {label}: {value}")
        return "\n".join(lines) if lines else "Not provided."

    def _summarize_clinical_data(self, clinical_data: Dict[str, Any]) -> str:
        parts: List[str] = []
        if clinical_data.get("chief_complaint"):
            parts.append("Chief complaint was recorded for review.")
        manual = clinical_data.get("manual_diagnoses")
        if manual:
            descriptor = "manual diagnosis" if len(manual) == 1 else "manual diagnoses"
            parts.append(f"{len(manual)} {descriptor} were noted by the provider.")
        procedures = clinical_data.get("procedures_done")
        if procedures:
            descriptor = "procedure" if len(procedures) == 1 else "procedures"
            parts.append(f"{len(procedures)} {descriptor} were documented for the visit.")
        if clinical_data.get("prescription"):
            parts.append("A prescription was provided for the patient's care.")
        if clinical_data.get("follow_up"):
            parts.append("A follow-up plan was outlined.")
        if not parts:
            return "Not provided."
        return " ".join(parts)

    def _format_field_list(self, value: Any) -> str:
        if not value:
            return ""
        if isinstance(value, (list, tuple)):
            return "; ".join(str(v) for v in value if v)
        return str(value)

    def _format_findings(self, detections: List[Dict[str, Any]]) -> str:
        if not detections:
            return "No detections available"
        parts = []
        for det in detections:
            label = det.get("class") or det.get("label") or "Unknown finding"
            parts.append(f"{label}")
        return "; ".join(parts)

    def _clean_detections_for_prompt(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cleaned: List[Dict[str, Any]] = []
        box_keys = {"bbox", "box", "x", "y", "w", "h", "width", "height", "xmin", "ymin", "xmax", "ymax"}
        for det in detections or []:
            filtered = {}
            for k, v in det.items():
                if k in box_keys:
                    continue
                if k in {"conf", "confidence"}:
                    try:
                        percent = max(0.0, min(100.0, float(v) * 100))
                        filtered["confidence"] = f"{percent:.0f}%"
                    except Exception:
                        filtered["confidence"] = v
                    continue
                filtered[k] = v
            cleaned.append(filtered)
        return cleaned

    def _format_recommendations(self, detections: List[Dict[str, Any]]) -> str:
        if not detections:
            return "Monitor as clinically indicated."
        recs = []
        for det in detections:
            label = det.get("class") or det.get("label") or "Finding"
            plan = self.treatment_plan.get(label, "General oral health maintenance and follow-up as needed.")
            recs.append(f"- {label}: {plan}")
        return "\n".join(recs)

    def _generate_via_llm(self, prompt: str) -> Optional[str]:
        """Call Groq API using the official SDK."""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("[DentalReportGenerator] GROQ_API_KEY not set; skipping LLM call.", file=sys.stderr)
            return None

        if not HAS_GROQ:
            print("[DentalReportGenerator] groq package not installed; skipping LLM call.", file=sys.stderr)
            return None

        try:
            client = Groq(api_key=api_key, timeout=self.timeout_s)
            completion = client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a dental report formatter. You MUST follow the exact format specified. Output only the requested clinical report with no additions, disclaimers, or markdown formatting.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=self.temperature,
                max_completion_tokens=self.max_tokens,
                top_p=1,
                stream=False,
                stop=None,
            )
            text = completion.choices[0].message.content
            if not text:
                print("[DentalReportGenerator] Groq returned empty response.", file=sys.stderr)
                return None
            return text.strip()
        except Exception as exc:
            print(f"[DentalReportGenerator] Groq API call failed: {exc}", file=sys.stderr)
            return None

    def _parse_json_from_text(self, text: str) -> Optional[Any]:
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            pass

        def _json_like_to_obj(fragment: str) -> Optional[Any]:
            try:
                return json.loads(fragment)
            except Exception:
                try:
                    return ast.literal_eval(fragment)
                except Exception:
                    return None

        # Try to extract the first JSON object if wrapped in prose/code fences.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            snippet = text[start : end + 1]
            maybe = _json_like_to_obj(snippet)
            if maybe is not None:
                return maybe
        return None

    def _stringify_field(self, value: Any, default: str = "") -> str:
        if value is None:
            return default
        if isinstance(value, dict):
            parts = [f"- {k}: {v}" for k, v in value.items()]
            return "\n".join(parts) if parts else default
        if isinstance(value, (list, tuple)):
            parts = [f"- {v}" for v in value if v is not None and v != ""]
            return "\n".join(parts) if parts else default
        return str(value)


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Generate dental report")
    parser.add_argument("--input-json", help="JSON with patient_name, clinical_data, detections (optional)")
    args = parser.parse_args()

    if args.input_json:
        try:
            payload = json.loads(args.input_json)
            patient_name = payload.get("patient_name", "Patient")
            clinical_data = payload.get("clinical_data", {}) or {}
            detections = payload.get("detections", []) or []
        except Exception as exc:  # pragma: no cover
            sys.stderr.write(f"Invalid JSON input: {exc}\n")
            sys.exit(1)
    else:
        detections = [
            {"class": "Caries", "conf": 0.91},
            {"class": "Periapical Lesion", "conf": 0.83},
        ]
        clinical_data = {
            "chief_complaint": "Pain in lower left jaw",
            "manual_diagnoses": ["Symptomatic irreversible pulpitis"],
            "procedures_done": ["Periapical radiograph", "Local anesthesia"],
            "prescription": "Amoxicillin 500mg, tid x5 days",
            "follow_up": "Re-evaluate in one week",
            "clinical_notes": "Patient reports pain on biting; percussion sensitivity noted.",
        }
        patient_name = "John Doe"

    model_name = os.getenv("OLLAMA_MODEL", "llama3")
    timeout_ms = int(os.getenv("OLLAMA_TIMEOUT_MS", "15000"))
    generator = DentalReportGenerator(model_name, timeout_ms=timeout_ms)
    report = generator.generate_report(detections, patient_name, clinical_data)

    if args.input_json:
        print(json.dumps({"report": report}))
    else:
        print("\n===== Generated Report =====\n")
        print(report)
