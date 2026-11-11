// Simple rulebook for detections: description + suggested actions
export type RulebookEntry = {
  label: string;
  summary: string;
  actions: string[];
};

const RULES: Record<string, RulebookEntry> = {
  caries: {
    label: "Caries",
    summary: "Cavitated or radiolucent lesion consistent with dental caries.",
    actions: [
      "Assess depth (enamel vs dentin) and proximity to pulp.",
      "Consider remineralization for early lesions; operative restoration for cavitated lesions.",
      "Advise oral hygiene reinforcement and fluoride exposure.",
    ],
  },
  crown: {
    label: "Crown",
    summary: "Existing crown visible. Evaluate margins and periapical status.",
    actions: [
      "Check for open margins, recurrent decay, and periapical pathology.",
      "Assess occlusion and crown integrity; plan replacement if defective.",
    ],
  },
  "badly decayed": {
    label: "Badly Decayed",
    summary: "Extensive destruction suggestive of non-restorable or guarded tooth.",
    actions: [
      "Evaluate restorability (ferrule, remaining walls, crown-to-root ratio).",
      "Consider extraction vs. endo + post-core + crown depending on prognosis.",
      "Discuss risks/benefits and alternative options with patient.",
    ],
  },
  normal: {
    label: "Normal",
    summary: "No radiographic pathology detected in this region.",
    actions: [
      "Document baseline status.",
      "Routine recall and preventive care.",
    ],
  },
  rct: {
    label: "RCT",
    summary: "Root canal treated tooth observed.",
    actions: [
      "Check obturation length/density and periapical healing.",
      "Evaluate coronal seal; plan definitive restoration if temporary.",
    ],
  },
  restoration: {
    label: "Restoration",
    summary: "Existing direct or indirect restoration present.",
    actions: [
      "Inspect for recurrent decay or marginal defects.",
      "Assess contact/contour and function; schedule repair/replacement if faulty.",
    ],
  },
  infection: {
    label: "Infection",
    summary: "Findings suggest periapical or periodontal infection.",
    actions: [
      "Perform clinical tests (percussion, vitality, probing).",
      "Consider antibiotics only if systemic involvement; otherwise definitive dental treatment first.",
      "Plan endodontic therapy, periodontal intervention, or extraction based on diagnosis.",
    ],
  },
  "impacted teeth": {
    label: "Impacted Teeth",
    summary: "Impaction noted; assess angulation and proximity to adjacent structures.",
    actions: [
      "Evaluate need for surgical removal vs. monitoring.",
      "Consider CBCT if proximity to vital structures is uncertain.",
    ],
  },
  "broken down crow/ root": {
    label: "Broken Down Crow/ Root",
    summary: "Heavily broken down crown/root structure.",
    actions: [
      "Assess restorability; consider extraction if poor prognosis.",
      "If salvageable, plan endo/post-core and definitive crown with ferrule.",
    ],
  },
  "fractured teeth": {
    label: "Fractured Teeth",
    summary: "Fracture line or segment observed radiographically.",
    actions: [
      "Determine fracture extent (crown vs. root).",
      "For root fractures with poor prognosis, consider extraction; otherwise splint/restore as indicated.",
    ],
  },
  "bdc-bdr": {
    label: "BDC-BDR (Badly Decayed Crown/Root)",
    summary: "Crown and/or root extensively destroyed. Restorability is questionable.",
    actions: [
      "Assess restorability: ferrule, remaining structure, crown-to-root ratio.",
      "If restorable: RCT + post-core + crown.",
      "If non-restorable: extraction + manage infection.",
      "Consider ridge preservation if implant planned.",
      "Prescribe analgesics/antibiotics if abscess present.",
    ],
  },
};

const normalize = (label?: string) => label?.trim().toLowerCase() || "";

const stripToothSuffix = (label: string) =>
  label.replace(/\s*\(tooth\s+\d+\)/i, '').trim();

export function getRulebookEntries(labels: string[]): RulebookEntry[] {
  const seen = new Set<string>();
  const entries: RulebookEntry[] = [];
  labels.forEach((label) => {
    const stripped = stripToothSuffix(label);
    const key = normalize(stripped);
    if (key && !seen.has(key) && RULES[key]) {
      seen.add(key);
      entries.push(RULES[key]);
    }
  });
  return entries;
}
